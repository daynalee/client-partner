/* Performance Pulse rule engine — TypeScript port of the Python detector.
   Pure functions over the raw daily series, so briefs recompute live when
   per-client goals change. Validated against the Python engine's output at
   default goals (17 dates, identical classifications). */

export type Kind =
  | 'roas_drop' | 'target_miss' | 'cpi_creep' | 'cpi_spike'
  | 'spend_shift' | 'scale_opportunity'

export interface SeriesPoint {
  date: string; spend: number; co: number
  cpa: number | null; d7: number | null; ctr: number | null; util: number | null
}
export interface CampMeta {
  org: string; game: string; campaign: string; campaign_id: string
  campaign_type: string | null; roas_target: number | null; target_cpi: number | null
}
export interface Promo { org: string; start: string; end: string; label: string }
export interface Finding {
  cid: string; org: string; name: string; kind: Kind
  evidence: string; rec: string; spend: number; risk: number; soft: boolean
}
export interface ExpectedItem { cid: string; org: string; name: string; reason: string }
export interface PortfolioRow { org: string; spend: number; wow: number; d7: number | null; tgt: number | null }
export interface Checkback { name: string; cid: string; kind: Kind; issued: string; note: string }
export interface Brief {
  act: Finding[]; watch: Finding[]; expected: ExpectedItem[]
  silent: { cid: string; org: string; name: string }[]
  portfolio: PortfolioRow[]; checkback: Checkback[]
}

/* ---- rules (mirror of rules.py) ---- */
const MIN_DAILY_SPEND = 100
const MIN_RECENT_INSTALLS = 20
const BASELINE_DAYS = 28
const RECENT_DAYS = 3
const Z_ACT = 3.0
const Z_WATCH = 2.0
const MIN_REL_DELTA = 0.15
const TARGET_BREACH_SHARE = 0.70
const TREND_DAYS = 21
const TREND_MIN_TOTAL = 0.15
const TREND_MIN_TOTAL_ALONE = 0.30
const EFF_DECAY_MIN = 0.08
const SPEND_SHIFT = 0.40
const ROAS_TARGET_SHORTFALL = 0.80
const TARGET_BREACH_DAYS = 7
const UTIL_PEGGED = 0.90
const UTIL_PEGGED_DAYS = 6
const LEARNING_MAX_AGE_DAYS = 14
const LEARNING_MIN_INSTALLS = 300
const LEARNING_AGE_CAP_DAYS = 45
const SOFT_DAYS = 4
const MAX_ACT_ITEMS = 7
const SEVERITY: Record<Kind, number> = {
  roas_drop: 1.0, target_miss: 0.9, cpi_creep: 0.8,
  spend_shift: 0.7, scale_opportunity: 0.6, cpi_spike: 0.9,
}
const REC: Record<Kind, string> = {
  roas_drop: 'Investigate ROAS decline; if auction-wide, re-test bid at -10-15%; if isolated, pull product-group / audience split to locate the source',
  cpi_creep: 'CPA drifting up with efficiency decay - classic creative fatigue; refresh Pins / rotate new imagery into top ad groups',
  cpi_spike: 'CPA jumped vs baseline; check bid changes, auction competition, or tag/feed breakage before reacting',
  spend_shift: 'Spend moved sharply vs baseline; verify with client whether intentional (flight change/pause) before diagnosing',
  scale_opportunity: 'Budget pegged with ROAS at/above goal - room to scale; propose daily-cap increase ahead of seasonal peak',
  target_miss: 'Sustained below ROAS goal on matured attribution; discuss bid/audience changes before the client flags it',
}

/* ---- small stats (match Python statistics semantics) ---- */
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const n = s.length
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}
const mad = (xs: number[], med: number) => median(xs.map((x) => Math.abs(x - med)))
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay()
const x2 = (v: number) => `${v.toFixed(2)}x`
const pct = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`

type Pt = [string, number]

function robustZ(base: number[], recent: number[]) {
  const med = median(base)
  const spread = Math.max(mad(base, med) * 1.4826, Math.abs(med) * 0.02, 1e-9)
  const se = spread / Math.sqrt(Math.max(1, recent.length))
  const rec = median(recent)
  return { z: (rec - med) / se, rel: med ? (rec - med) / med : 0, med, rec }
}

function baselineRecent(series: Pt[], exportDate: string, dowAware: boolean, recentN?: number) {
  const n = recentN ?? RECENT_DAYS
  if (series.length < n + 5) return null
  const recentPts = series.slice(-n)
  const recent = recentPts.map(([, v]) => v)
  const recentDates = new Set(recentPts.map(([d]) => d))
  // mirror of the Python engine: the baseline window is anchored at
  // BASELINE_DAYS + RECENT_DAYS regardless of the recent-window override
  const cutoff = addDays(exportDate, -(BASELINE_DAYS + RECENT_DAYS))
  const basePts = series.filter(([d]) => d >= cutoff && !recentDates.has(d))
  if (dowAware) {
    const dows = new Set([...recentDates].map(weekday))
    const dowVals = basePts.filter(([d]) => dows.has(weekday(d))).map(([, v]) => v)
    if (dowVals.length >= 4) return { base: dowVals, recent }
  }
  const vals = basePts.map(([, v]) => v)
  return vals.length >= 5 ? { base: vals, recent } : null
}

function theilSlope(series: Pt[]): number | null {
  const pts = series.slice(-TREND_DAYS)
  if (pts.length < 10) return null
  const t0 = new Date(`${pts[0][0]}T00:00:00Z`).getTime()
  const xs = pts.map(([d]) => (new Date(`${d}T00:00:00Z`).getTime() - t0) / 86400000)
  const ys = pts.map(([, v]) => v)
  const slopes: number[] = []
  for (let i = 0; i < xs.length; i++)
    for (let j = i + 1; j < xs.length; j++)
      if (xs[j] !== xs[i]) slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i]))
  return median(slopes)
}

/* ---- per-campaign as-of view ---- */
function ser(pts: SeriesPoint[], key: 'spend' | 'cpa' | 'ctr' | 'util', upTo: string): Pt[] {
  const out: Pt[] = []
  for (const p of pts) {
    if (p.date > upTo) break
    const v = p[key]
    if (v !== null && v !== undefined) out.push([p.date, v])
  }
  return out
}
function serD7Matured(pts: SeriesPoint[], upTo: string, cutoff: string): Pt[] {
  const out: Pt[] = []
  for (const p of pts) {
    if (p.date > upTo) break
    if (p.date <= cutoff && p.d7 !== null) out.push([p.date, p.d7])
  }
  return out
}

function inPromo(org: string, promo: Promo, exportDate: string) {
  const lo = addDays(exportDate, -(RECENT_DAYS + 2))
  if (promo.org !== '*' && !org.toLowerCase().includes(promo.org.toLowerCase())) return null
  return promo.start <= exportDate && promo.end >= lo ? promo.label : null
}

/* ---- the detector ---- */
export function computeBrief(
  campaigns: Record<string, CampMeta>,
  series: Record<string, SeriesPoint[]>,
  goals: Record<string, number>,
  promo: Promo,
  maturityDays: number,
  D: string,
): Brief {
  const act: Finding[] = []
  const watch: Finding[] = []
  const expected: ExpectedItem[] = []
  const silent: { cid: string; org: string; name: string }[] = []
  const cutoff = addDays(D, -maturityDays)

  for (const [cid, meta] of Object.entries(campaigns)) {
    const pts = (series[cid] ?? []).filter((p) => p.date <= D)
    if (pts.length === 0) continue
    const org = meta.org
    const name = meta.campaign
    const goal = goals[org] ?? meta.roas_target ?? 0
    const spendS = ser(pts, 'spend', D)
    const recentSpend = spendS.length ? median(spendS.slice(-7).map(([, v]) => v)) : 0

    // learning phase
    const age = Math.round((+new Date(D) - +new Date(pts[0].date)) / 86400000)
    let learn: string | null = null
    if (age < LEARNING_MAX_AGE_DAYS) learn = `age ${age}d`
    else if (age <= LEARNING_AGE_CAP_DAYS) {
      const total = pts.reduce((a, p) => a + p.co, 0)
      if (total < LEARNING_MIN_INSTALLS) learn = `only ${total} checkouts at ${age}d`
    }
    if (learn) {
      expected.push({ cid, org, name, reason: `learning phase (${learn})` })
      continue
    }

    // volume floor
    const recentCo = pts.slice(-RECENT_DAYS).reduce((a, p) => a + p.co, 0)
    if (recentSpend < MIN_DAILY_SPEND || recentCo < MIN_RECENT_INSTALLS) {
      silent.push({ cid, org, name })
      continue
    }

    let findings: [('act' | 'watch'), Kind, string][] = []
    const d7s = serD7Matured(pts, D, cutoff)

    // 1) matured ROAS level shift (7-obs recent window)
    const br = baselineRecent(d7s, D, false, 7)
    if (br) {
      const { z, rel, med, rec } = robustZ(br.base, br.recent)
      if (rel < 0 && Math.abs(rel) >= MIN_REL_DELTA) {
        const sev = Math.abs(z) >= Z_ACT || (Math.abs(rel) >= 0.25 && Math.abs(z) >= Z_WATCH)
          ? 'act' : Math.abs(z) >= Z_WATCH ? 'watch' : null
        if (sev) findings.push([sev, 'roas_drop',
          `matured 7d checkout ROAS ${x2(med)} -> ${x2(rec)} (${pct(rel)}, z=${z.toFixed(1)})`])
      }
    }

    // 2) sustained goal miss (chronic vs new); skip if the drop already tells it
    if (goal > 0 && d7s.length) {
      const recentM = d7s.slice(-TARGET_BREACH_DAYS).map(([, v]) => v)
      const thr = ROAS_TARGET_SHORTFALL * goal
      const below = recentM.filter((v) => v < thr).length
      if (recentM.length >= TARGET_BREACH_DAYS && median(recentM) < thr &&
          below >= TARGET_BREACH_SHARE * recentM.length &&
          !findings.some(([, k]) => k === 'roas_drop')) {
        const older = d7s.slice(0, -TARGET_BREACH_DAYS).slice(-21).map(([, v]) => v)
        const chronic = older.length >= 10 && median(older) < thr
        findings.push([chronic ? 'watch' : 'act', 'target_miss',
          `matured 7d checkout ROAS ${x2(median(recentM))} vs ${x2(goal)} goal for ${recentM.length}+ matured days` +
          (chronic ? ' (chronic — has missed goal all period)' : ' (new — was on goal during baseline)')])
      }
    }

    // 3) CPA creep (fatigue when CTR confirms independently)
    const cpaS = ser(pts, 'cpa', D)
    const slope = theilSlope(cpaS)
    if (slope !== null && cpaS.length) {
      const medCpa = median(cpaS.slice(-TREND_DAYS).map(([, v]) => v))
      const drift = medCpa ? (slope * TREND_DAYS) / medCpa : 0
      if (drift >= TREND_MIN_TOTAL) {
        const ctrS = ser(pts, 'ctr', D)
        const eSlope = theilSlope(ctrS)
        const medCtr = ctrS.length ? median(ctrS.slice(-TREND_DAYS).map(([, v]) => v)) : 0
        const eff = eSlope !== null && medCtr ? (eSlope * TREND_DAYS) / medCtr : 0
        if (eff <= -EFF_DECAY_MIN)
          findings.push(['act', 'cpi_creep',
            `CPA drifting ${pct(drift)} over ${TREND_DAYS}d, CTR ${pct(eff)} in step (fatigue pattern)`])
        else if (drift >= TREND_MIN_TOTAL_ALONE)
          findings.push(['act', 'cpi_spike', `CPA drifting ${pct(drift)} over ${TREND_DAYS}d`])
      }
    }

    // 4) CPA level jump
    const bj = baselineRecent(cpaS, D, true)
    if (bj && !findings.some(([, k]) => k === 'cpi_creep' || k === 'cpi_spike')) {
      const { z, rel, med, rec } = robustZ(bj.base, bj.recent)
      if (rel > MIN_REL_DELTA && Math.abs(z) >= Z_ACT)
        findings.push(['act', 'cpi_spike',
          `CPA $${med.toFixed(2)} -> $${rec.toFixed(2)} (${pct(rel)}, z=${z.toFixed(1)})`])
    }

    // 5) spend discontinuity
    const bs = baselineRecent(spendS, D, true)
    if (bs) {
      const { rel, med, rec } = robustZ(bs.base, bs.recent)
      if (Math.abs(rel) >= SPEND_SHIFT)
        findings.push(['act', 'spend_shift',
          `spend $${Math.round(med).toLocaleString()}/d -> $${Math.round(rec).toLocaleString()}/d (${pct(rel)})`])
    }

    // 6) scale opportunity
    const utilS = ser(pts, 'util', D).slice(-7)
    const pegged = utilS.filter(([, v]) => v >= UTIL_PEGGED * 100).length
    if (pegged >= UTIL_PEGGED_DAYS && goal > 0 && d7s.length) {
      const recentRoas = median(d7s.slice(-5).map(([, v]) => v))
      if (recentRoas >= goal)
        findings.push(['act', 'scale_opportunity',
          `budget >= 90% on ${pegged} of last 7 days, matured 7d checkout ROAS ${x2(recentRoas)} >= ${x2(goal)} goal`])
    }

    // promo suppression: planned events are Expected, not alarms
    const promoLabel = inPromo(org, promo, D)
    if (promoLabel) {
      const kept: typeof findings = []
      for (const f of findings) {
        const positiveSpend = f[1] === 'spend_shift' && f[2].includes('+')
        if (f[1] === 'scale_opportunity' || positiveSpend)
          expected.push({ cid, org, name, reason: `planned promo: ${promoLabel} (${f[1].replace(/_/g, ' ')})` })
        else kept.push(f)
      }
      findings = kept
    }

    const soft = (+new Date(D) - +new Date(pts[pts.length - 1].date)) / 86400000 < SOFT_DAYS
    for (const [sev, kind, evidence] of findings) {
      const item: Finding = {
        cid, org, name, kind, evidence, rec: REC[kind],
        spend: Math.round(recentSpend),
        risk: recentSpend * SEVERITY[kind],
        soft: soft && (kind === 'roas_drop' || kind === 'target_miss' || kind === 'scale_opportunity'),
      }
      ;(sev === 'act' ? act : watch).push(item)
    }
  }

  act.sort((a, b) => b.risk - a.risk)
  return {
    act: act.slice(0, MAX_ACT_ITEMS), watch, expected, silent,
    portfolio: computePortfolio(campaigns, series, goals, D, cutoff),
    checkback: [],
  }
}

function computePortfolio(
  campaigns: Record<string, CampMeta>, series: Record<string, SeriesPoint[]>,
  goals: Record<string, number>, D: string, cutoff: string,
): PortfolioRow[] {
  const orgs: Record<string, { spend: number; prev: number; d7: number[] }> = {}
  const wkLo = addDays(D, -6)
  const prevLo = addDays(D, -13)
  const prevHi = addDays(D, -7)
  for (const [cid, meta] of Object.entries(campaigns)) {
    const o = (orgs[meta.org] ??= { spend: 0, prev: 0, d7: [] })
    for (const p of series[cid] ?? []) {
      if (p.date > D) break
      if (p.date >= wkLo) o.spend += p.spend
      else if (p.date >= prevLo && p.date <= prevHi) o.prev += p.spend
      if (p.d7 !== null && p.date <= cutoff) o.d7.push(p.d7)
    }
  }
  return Object.entries(orgs)
    .map(([org, o]) => ({
      org, spend: Math.round(o.spend),
      wow: o.prev ? (o.spend - o.prev) / o.prev : 0,
      d7: o.d7.length ? median(o.d7) : null,
      tgt: goals[org] ?? null,
    }))
    .sort((a, b) => b.spend - a.spend)
}

const CB_METRIC: Record<Kind, 'd7' | 'cpa' | 'spend' | 'util'> = {
  roas_drop: 'd7', target_miss: 'd7', cpi_creep: 'cpa', cpi_spike: 'cpa',
  spend_shift: 'spend', scale_opportunity: 'util',
}
const CB_DIR: Record<Kind, number> = {
  roas_drop: 1, target_miss: 1, cpi_creep: -1, cpi_spike: -1,
  spend_shift: 0, scale_opportunity: 0,
}

function lastVals(pts: SeriesPoint[], metric: 'd7' | 'cpa' | 'spend' | 'util', upTo: string, cutoff: string): number[] {
  const out: number[] = []
  for (const p of pts) {
    if (p.date > upTo) break
    if (metric === 'd7') { if (p.d7 !== null && p.date <= cutoff) out.push(p.d7) }
    else { const v = p[metric]; if (v !== null && v !== undefined) out.push(v) }
  }
  return out.slice(-3)
}

/* All briefs for the date range, with day-over-day check-backs chained. */
export function computeAllBriefs(
  campaigns: Record<string, CampMeta>, series: Record<string, SeriesPoint[]>,
  goals: Record<string, number>, promo: Promo, maturityDays: number, dates: string[],
): Record<string, Brief> {
  const briefs: Record<string, Brief> = {}
  let prev: { date: string; act: Finding[] } | null = null
  for (const D of dates) {
    const b = computeBrief(campaigns, series, goals, promo, maturityDays, D)
    if (prev) {
      const cutPrev = addDays(prev.date, -maturityDays)
      const cutNow = addDays(D, -maturityDays)
      b.checkback = prev.act.map((f) => {
        const pts = series[f.cid] ?? []
        const m = CB_METRIC[f.kind]
        const was = lastVals(pts, m, prev!.date, cutPrev)
        const now = lastVals(pts, m, D, cutNow)
        let note = 'no fresh data on that metric yet'
        if (was.length && now.length) {
          const a = median(was), c = median(now)
          const delta = a ? (c - a) / a : 0
          const dir = CB_DIR[f.kind]
          const verdict = dir && delta * dir > 0.10 ? 'recovered/improving'
            : dir && delta * dir < -0.10 ? 'worsening' : 'unchanged'
          note = `${verdict} (${a.toFixed(2)} -> ${c.toFixed(2)})`
        }
        return { name: f.name, cid: f.cid, kind: f.kind, issued: prev!.date, note }
      })
    }
    briefs[D] = b
    prev = { date: D, act: b.act }
  }
  return briefs
}

/* Default goal per advertiser = its campaigns' modal target. */
export function defaultGoals(campaigns: Record<string, CampMeta>): Record<string, number> {
  const byOrg: Record<string, number[]> = {}
  for (const m of Object.values(campaigns))
    if (m.roas_target) (byOrg[m.org] ??= []).push(m.roas_target)
  const out: Record<string, number> = {}
  for (const [org, ts] of Object.entries(byOrg)) out[org] = median(ts)
  return out
}

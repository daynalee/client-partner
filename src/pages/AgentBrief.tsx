import { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceArea,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, Eyebrow, SectionTitle } from '../components/ui'
import { fmtUSD, fmtWeek } from '../lib/format'
import {
  computeAllBriefs, defaultGoals,
  type Brief, type CampMeta, type Kind, type Promo, type SeriesPoint,
} from '../lib/pulse'
import demoRaw from '../data/agentDemo.json'

interface Demo {
  generated: string; briefDates: string[]; maturityDays: number
  promo: Promo
  campaigns: Record<string, CampMeta>
  series: Record<string, SeriesPoint[]>
  groundTruth: Record<string, { cid: string; type: string }>
}
const demo = demoRaw as unknown as Demo
const DEFAULT_GOALS = defaultGoals(demo.campaigns)
const GOALS_KEY = 'pulse-goals-v1'

/* ---------- labels & styles ---------- */
const KIND_LABEL: Record<Kind, string> = {
  roas_drop: 'ROAS decline',
  target_miss: 'Below goal',
  cpi_creep: 'Creative fatigue',
  cpi_spike: 'CPA spike',
  spend_shift: 'Spend shift',
  scale_opportunity: 'Scale opportunity',
}
const KIND_STYLE: Record<Kind, string> = {
  roas_drop: 'bg-[#fbe9e9] text-[#a02c2c]',
  target_miss: 'bg-[#fbe9e9] text-[#a02c2c]',
  cpi_creep: 'bg-[#fdefe8] text-[#9a4a22]',
  cpi_spike: 'bg-[#fdefe8] text-[#9a4a22]',
  spend_shift: 'bg-[#fdf6e3] text-[#7a5800]',
  scale_opportunity: 'bg-[#e9f7e9] text-[#006300]',
}
const x2 = (n: number) => `${n.toFixed(2)}x`
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const AXIS = { fontSize: 11, fill: '#898781' }
const GRID = '#e1e0d9'
const BLUE = '#2a78d6'
const tooltipStyle = {
  backgroundColor: '#fcfcfb', border: '1px solid #e1e0d9',
  borderRadius: 8, fontSize: 12, color: '#0b0b0b',
}

function KindBadge({ kind }: { kind: Kind }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${KIND_STYLE[kind]}`}>
      {KIND_LABEL[kind]}
    </span>
  )
}
function CountChip({ label, n, tone }: { label: string; n: number; tone: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
      <span className={`h-2 w-2 rounded-full ${tone}`} />
      <span className="font-semibold tabular-nums text-ink">{n}</span> {label}
    </div>
  )
}

/* ---------- evidence charts ---------- */
function EvidencePanel({ cid, date, goal }: { cid: string; date: string; goal: number | null }) {
  const meta = demo.campaigns[cid]
  const cutoff = addDays(date, -demo.maturityDays)
  const pts = useMemo(
    () =>
      (demo.series[cid] ?? [])
        .filter((p) => p.date <= date)
        .map((p) => ({ ...p, d7: p.date <= cutoff ? p.d7 : null })),
    [cid, date, cutoff],
  )
  if (!meta) return null
  if (pts.length === 0) {
    return (
      <Card>
        <Eyebrow>Evidence</Eyebrow>
        <p className="mt-2 text-sm text-ink-secondary">{meta.campaign} — no delivery yet.</p>
      </Card>
    )
  }
  const promoOn = meta.org === demo.promo.org && demo.promo.start <= date
  const promoX1 = pts.find((p) => p.date >= demo.promo.start)?.date
  const promoX2 = pts.filter((p) => p.date <= demo.promo.end).at(-1)?.date
  const matX1 = pts.find((p) => p.date > cutoff)?.date
  return (
    <Card className="lg:sticky lg:top-24">
      <Eyebrow>Evidence</Eyebrow>
      <h3 className="mt-1 font-serif text-lg leading-snug text-ink">{meta.campaign}</h3>
      <div className="mt-1 text-xs text-ink-muted">
        {meta.org} · {meta.campaign_type ?? 'Conversions'}{goal ? ` · goal ${x2(goal)}` : ''}
      </div>

      <div className="mt-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Checkout ROAS · 7d cohort
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={pts} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={AXIS} tickLine={false} minTickGap={28}
              axisLine={{ stroke: '#c3c2b7' }} tickFormatter={fmtWeek} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `${v}x`} domain={[0, 'auto']} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmtWeek(String(l))}
              formatter={(v) => [`${v}x`, '7d ROAS']} />
            {matX1 && (
              <ReferenceArea x1={matX1} fill="#0b0b0b" fillOpacity={0.05}
                label={{ value: 'maturing', position: 'insideTopRight', fontSize: 10, fill: '#898781' }} />
            )}
            {promoOn && promoX1 && promoX2 && promoX1 <= promoX2 && (
              <ReferenceArea x1={promoX1} x2={promoX2} fill={BLUE} fillOpacity={0.07}
                label={{ value: demo.promo.label, position: 'insideTopLeft', fontSize: 10, fill: '#2a78d6' }} />
            )}
            {goal && (
              <ReferenceLine y={goal} stroke="#898781" strokeDasharray="4 4"
                label={{ value: `goal ${x2(goal)}`, position: 'insideBottomRight', fontSize: 10, fill: '#898781' }} />
            )}
            <Line type="monotone" dataKey="d7" stroke={BLUE} strokeWidth={2}
              dot={false} activeDot={{ r: 4 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">CPA</div>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={pts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis tick={AXIS} tickLine={false} axisLine={false}
                tickFormatter={(v: number) => `$${v}`} domain={['auto', 'auto']} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmtWeek(String(l))}
                formatter={(v) => [`$${v}`, 'CPA']} />
              <Line type="monotone" dataKey="cpa" stroke="#9a4a22" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">CTR</div>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={pts} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} tickCount={4}
                tickFormatter={(v: number) => `${Number(v).toFixed(2)}%`} domain={['auto', 'auto']} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmtWeek(String(l))}
                formatter={(v) => [`${v}%`, 'CTR']} />
              <Line type="monotone" dataKey="ctr" stroke="#52514e" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Daily spend
        </div>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={pts} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <XAxis dataKey="date" tick={AXIS} tickLine={false} minTickGap={28}
              axisLine={{ stroke: '#c3c2b7' }} tickFormatter={fmtWeek} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtUSD(v)} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmtWeek(String(l))}
              formatter={(v) => [fmtUSD(Number(v)), 'Spend']} />
            <Area type="monotone" dataKey="spend" stroke={BLUE} strokeWidth={1.5}
              fill="#cde2fb" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

/* ---------- ground truth ---------- */
const TRUTH_LABEL: Record<string, string> = {
  roas_drop: 'Planted ROAS decline',
  cpi_creep: 'Planted creative fatigue',
  learning: 'New launch (should stay quiet)',
  spend_shift: 'Planted spend cut',
  scale_opportunity: 'Planted scale opportunity',
  SILENT: 'Tiny test campaign (should stay silent)',
  'promo->Expected': 'Planned promo spike (should not alarm)',
}
function truthStatus(
  t: { cid: string; type: string }, upTo: string, briefs: Record<string, Brief>,
): string {
  const match = (cid: string) =>
    t.cid.endsWith('*') ? cid.startsWith(t.cid.slice(0, -1)) : cid === t.cid
  for (const d of demo.briefDates) {
    if (d > upTo) break
    const b = briefs[d]
    if (t.type === 'SILENT') continue
    if (t.type === 'learning' || t.type === 'promo->Expected') {
      if (b.expected.some((e) => match(e.cid))) return `in Expected since ${fmtWeek(d)} — never alarmed`
    } else if (b.act.some((a) => match(a.cid) && a.kind === t.type)) {
      return `surfaced in Act on ${fmtWeek(d)}`
    }
  }
  if (t.type === 'SILENT') return 'below volume floor — correctly silent'
  return 'not visible at this date (or at current goals)'
}

/* ---------- page ---------- */
export default function AgentBrief() {
  const dates = demo.briefDates
  const [goals, setGoals] = useState<Record<string, number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(GOALS_KEY) ?? '{}') as Record<string, number>
      return { ...DEFAULT_GOALS, ...saved }
    } catch {
      return { ...DEFAULT_GOALS }
    }
  })
  const [idx, setIdx] = useState(dates.length - 1)
  const [playing, setPlaying] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [showTruth, setShowTruth] = useState(false)

  const briefs = useMemo(
    () => computeAllBriefs(demo.campaigns, demo.series, goals, demo.promo,
      demo.maturityDays, dates),
    [goals, dates],
  )
  const date = dates[idx]
  const brief = briefs[date]
  const maxAct = Math.max(...dates.map((d) => briefs[d].act.length), 1)
  const goalsDirty = Object.keys(DEFAULT_GOALS)
    .some((o) => goals[o] !== DEFAULT_GOALS[o])

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= dates.length - 1) {
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [playing, dates.length])

  const setGoal = (org: string, v: number) => {
    const next = { ...goals, [org]: v }
    setGoals(next)
    const overrides: Record<string, number> = {}
    for (const [o, g] of Object.entries(next))
      if (g !== DEFAULT_GOALS[o]) overrides[o] = g
    localStorage.setItem(GOALS_KEY, JSON.stringify(overrides))
  }
  const resetGoals = () => {
    setGoals({ ...DEFAULT_GOALS })
    localStorage.removeItem(GOALS_KEY)
  }

  const onPage = new Set([
    ...brief.act.map((f) => f.cid), ...brief.watch.map((f) => f.cid),
    ...brief.expected.map((e) => e.cid),
  ])
  const evidenceCid =
    selected && onPage.has(selected) ? selected : brief.act[0]?.cid ?? brief.watch[0]?.cid ?? null

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Daily performance agent"
        title="Performance Pulse"
        right={
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (playing) {
                  setPlaying(false)
                  return
                }
                if (idx >= dates.length - 1) setIdx(0)
                setPlaying(true)
              }}
              className="rounded-full border border-hairline bg-surface px-4 py-1.5 text-sm font-medium text-ink hover:bg-hairline/40"
            >
              {playing ? '⏸ Pause' : '▶ Replay'}
            </button>
            <span className="font-serif text-lg tabular-nums text-ink">
              {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        }
      />

      <p className="max-w-3xl text-sm leading-relaxed text-ink-secondary">
        A daily triage of every campaign across seven advertisers: <span className="font-medium text-ink">act,
        watch, or deliberately quiet</span> (learning, planned promos, low volume).
        Scrub the timeline — and <span className="font-medium text-ink">edit any goal in the table</span> to
        see the calls recompute.
      </p>

      {/* timeline */}
      <Card className="!p-4">
        <div className="overflow-x-auto">
          <div className="flex min-w-[560px] items-end gap-1">
          {dates.map((d, i) => {
            const n = briefs[d].act.length
            const inPromo = d >= demo.promo.start && d <= demo.promo.end
            return (
              <button
                key={d}
                onClick={() => { setIdx(i); setPlaying(false) }}
                title={`${fmtWeek(d)} — ${n} action item${n === 1 ? '' : 's'}`}
                className={`group flex flex-1 flex-col items-center gap-1 ${i === idx ? '' : 'opacity-60 hover:opacity-100'}`}
              >
                <div
                  className={`w-full rounded-sm transition-all ${i === idx ? 'bg-[#2a78d6]' : n > 0 ? 'bg-[#d03b3b]/60' : 'bg-hairline'}`}
                  style={{ height: `${10 + (n / maxAct) * 34}px` }}
                />
                <span className={`text-[10px] tabular-nums ${i === idx ? 'font-semibold text-ink' : 'text-ink-muted'} ${inPromo ? 'underline decoration-dotted' : ''}`}>
                  {fmtWeek(d)}
                </span>
              </button>
            )
          })}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4 text-[11px] text-ink-muted">
          <span>Bar = action items · dotted = promo</span>
          <span>{demo.promo.label}: {fmtWeek(demo.promo.start)}–{fmtWeek(demo.promo.end)}</span>
        </div>
      </Card>

      <div className="flex flex-wrap gap-5">
        <CountChip label="act now" n={brief.act.length} tone="bg-status-critical" />
        <CountChip label="watching" n={brief.watch.length} tone="bg-status-warning" />
        <CountChip label="expected" n={brief.expected.length} tone="bg-status-good" />
        <CountChip label="below volume floor" n={brief.silent.length} tone="bg-hairline" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {/* ACT */}
          <div className="space-y-3">
            <Eyebrow>Act</Eyebrow>
            {brief.act.length === 0 && (
              <Card className="!p-4 text-sm text-ink-secondary">
                Nothing above threshold — every campaign still checked.
              </Card>
            )}
            {brief.act.map((f) => (
              <Card
                key={f.cid + f.kind}
                className={`!p-4 cursor-pointer transition-shadow hover:shadow-sm ${evidenceCid === f.cid ? 'ring-1 ring-[#2a78d6]/50' : ''}`}
              >
                <button className="block w-full text-left" onClick={() => setSelected(f.cid)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <KindBadge kind={f.kind} />
                      <span className="text-xs font-semibold text-ink">{f.org}</span>
                    </div>
                    <span className="text-xs tabular-nums text-ink-muted">~{fmtUSD(f.spend)}/day at stake</span>
                  </div>
                  <div className="mt-2 truncate text-sm font-medium text-ink" title={f.name}>{f.name}</div>
                  <div className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{f.evidence}</div>
                  <div className="mt-2 border-l-2 border-[#2a78d6]/40 pl-3 text-[13px] leading-relaxed text-ink">
                    {f.rec}
                  </div>
                  {f.soft && (
                    <div className="mt-1.5 text-[11px] italic text-ink-muted">
                      conversions still attributing — re-check in 1–2 days
                    </div>
                  )}
                </button>
              </Card>
            ))}
          </div>

          {/* WATCH */}
          {brief.watch.length > 0 && (
            <div className="space-y-2">
              <Eyebrow>Watch</Eyebrow>
              {brief.watch.map((f) => (
                <button
                  key={f.cid + f.kind}
                  onClick={() => setSelected(f.cid)}
                  className="block w-full rounded-lg border border-hairline bg-surface px-4 py-2.5 text-left text-[13px] text-ink-secondary hover:bg-hairline/30"
                >
                  <span className="font-medium text-ink">{f.org}</span> — {f.evidence}
                </button>
              ))}
            </div>
          )}

          {/* EXPECTED */}
          {brief.expected.length > 0 && (
            <div className="space-y-2">
              <Eyebrow>Expected — checked, not flagged</Eyebrow>
              {brief.expected.map((e, i) => (
                <button
                  key={e.cid + i}
                  onClick={() => setSelected(e.cid)}
                  className="block w-full rounded-lg border border-dashed border-hairline px-4 py-2.5 text-left text-[13px] text-ink-secondary hover:bg-hairline/30"
                >
                  <span className="font-medium text-ink">{e.org}</span> · {e.name}
                  <span className="text-ink-muted"> — {e.reason}</span>
                </button>
              ))}
            </div>
          )}

          {/* CHECK-BACK */}
          {brief.checkback.length > 0 && (
            <div className="space-y-2">
              <Eyebrow>Check-back on yesterday's calls</Eyebrow>
              <Card className="!p-4">
                <ul className="space-y-2 text-[13px]">
                  {brief.checkback.map((c, i) => {
                    const tone = c.note.includes('recovered') || c.note.includes('improving')
                      ? 'text-status-good-text'
                      : c.note.includes('worsening') ? 'text-[#a02c2c]' : 'text-ink-secondary'
                    return (
                      <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium text-ink">{KIND_LABEL[c.kind]}</span>
                        <span className="truncate text-ink-muted">{c.name}</span>
                        <span className={`${tone} font-medium`}>{c.note}</span>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </div>
          )}

          {/* PORTFOLIO + GOALS */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Eyebrow>Portfolio · goals are editable</Eyebrow>
              {goalsDirty && (
                <button onClick={resetGoals}
                  className="text-[11px] font-medium text-[#2a78d6] hover:underline">
                  Reset goals
                </button>
              )}
            </div>
            <Card className="!p-0 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                    <th className="px-4 py-2.5 font-semibold">Advertiser</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Spend · last 7d</th>
                    <th className="px-4 py-2.5 text-right font-semibold">WoW</th>
                    <th className="px-4 py-2.5 text-right font-semibold">ROAS · 7d cohort</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Goal ✎</th>
                  </tr>
                </thead>
                <tbody>
                  {brief.portfolio.map((p) => (
                    <tr key={p.org} className="border-b border-hairline/60 last:border-0">
                      <td className="px-4 py-2 font-medium text-ink">{p.org}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtUSD(p.spend)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${Math.abs(p.wow) >= 0.15 ? 'font-semibold text-ink' : 'text-ink-secondary'}`}>
                        {p.wow >= 0 ? '+' : ''}{Math.round(p.wow * 100)}%
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums ${p.d7 !== null && p.tgt !== null ? (p.d7 >= p.tgt ? 'text-status-good-text' : 'text-[#a02c2c]') : ''}`}>
                        {p.d7 !== null ? x2(p.d7) : '–'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="inline-flex items-center gap-0.5">
                          <input
                            type="number" step={0.1} min={0.5} max={10}
                            value={goals[p.org] ?? ''}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value)
                              if (!Number.isNaN(v)) setGoal(p.org, v)
                            }}
                            className={`w-14 rounded border bg-surface px-1.5 py-0.5 text-right tabular-nums text-[13px] outline-none focus:border-[#2a78d6] ${goals[p.org] !== DEFAULT_GOALS[p.org] ? 'border-[#2a78d6]/60 font-semibold text-[#2a78d6]' : 'border-hairline text-ink'}`}
                          />
                          <span className="text-ink-muted">x</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>

        {/* EVIDENCE */}
        <div>
          {evidenceCid
            ? <EvidencePanel cid={evidenceCid} date={date}
                goal={goals[demo.campaigns[evidenceCid]?.org] ?? null} />
            : (
              <Card>
                <Eyebrow>Evidence</Eyebrow>
                <p className="mt-2 text-sm text-ink-secondary">Select a finding to see its data.</p>
              </Card>
            )}
        </div>
      </div>

      {/* TRUTH + METHOD */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Demo transparency</Eyebrow>
            <button
              onClick={() => setShowTruth((s) => !s)}
              className="rounded-full border border-hairline px-3 py-1 text-xs font-medium text-ink hover:bg-hairline/40"
            >
              {showTruth ? 'Hide' : 'Reveal'} planted anomalies
            </button>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            Synthetic data with seven planted issues — the agent must catch each in the
            right bucket and stay quiet otherwise.
          </p>
          {showTruth && (
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {Object.values(demo.groundTruth).map((t, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-ink">{TRUTH_LABEL[t.type] ?? t.type}</span>
                  <span className="text-ink-secondary">— {truthStatus(t, date, briefs)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <Eyebrow>How it decides</Eyebrow>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-secondary">
            <li>· Deterministic rule engine, computed live in your browser.</li>
            <li>· ROAS judged on <span className="font-medium text-ink">matured cohorts only</span>.</li>
            <li>· Chronic misses go to Watch — no daily re-alarms.</li>
            <li>· Promo calendar keeps planned spikes quiet.</li>
            <li>· Ranked by <span className="font-medium text-ink">spend at stake</span>.</li>
            <li>· Goals are per-client inputs — change one and the brief recomputes.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

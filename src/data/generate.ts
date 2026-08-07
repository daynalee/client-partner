import type { Campaign, WeeklyMetrics, Objective, Audience, CreativeType, Season } from './types'

export const WEEK_ENDINGS = [
  '2026-05-17', '2026-05-24', '2026-05-31', '2026-06-07', '2026-06-14', '2026-06-21',
  '2026-06-28', '2026-07-05', '2026-07-12', '2026-07-19', '2026-07-26', '2026-08-02',
]

function hashSeed(str: string): number {
  let h = 1779033703
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface CampaignParams {
  id: string
  name: string
  objective: Objective
  audience: Audience
  creativeType: CreativeType
  productCategory: string
  season: Season
  /** weekly spend in week 1, USD */
  baseSpend: number
  /** weekly multiplicative spend trend, e.g. 1.05 = +5%/wk */
  spendTrend: number
  /** cost per 1000 impressions, USD */
  cpm: number
  /** click-through rate in week 1, e.g. 0.007 */
  baseCtr: number
  /** weekly multiplicative CTR trend */
  ctrTrend: number
  /** conversion rate in week 1, e.g. 0.025 */
  baseCvr: number
  /** weekly multiplicative CVR trend */
  cvrTrend: number
  /** average order value, USD */
  aov: number
  /** cap on weekly impressions (audience saturation), optional */
  impressionCap?: number
}

export function makeCampaign(p: CampaignParams): Campaign {
  const rand = mulberry32(hashSeed(p.id))
  const weekly: WeeklyMetrics[] = WEEK_ENDINGS.map((weekEnding, i) => {
    const jitter = () => 1 + (rand() - 0.5) * 0.1
    const spend = p.baseSpend * Math.pow(p.spendTrend, i) * jitter()
    let impressions = (spend / p.cpm) * 1000 * jitter()
    if (p.impressionCap) impressions = Math.min(impressions, p.impressionCap * jitter())
    const ctr = p.baseCtr * Math.pow(p.ctrTrend, i) * jitter()
    const cvr = p.baseCvr * Math.pow(p.cvrTrend, i) * jitter()
    const clicks = impressions * ctr
    const conversions = clicks * cvr
    const revenue = conversions * p.aov * jitter()
    return {
      weekEnding,
      spend: Math.round(spend),
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      conversions: Math.round(conversions),
      revenue: Math.round(revenue),
    }
  })
  return {
    id: p.id,
    name: p.name,
    objective: p.objective,
    audience: p.audience,
    creativeType: p.creativeType,
    productCategory: p.productCategory,
    season: p.season,
    weekly,
  }
}

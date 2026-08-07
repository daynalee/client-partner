import type { Campaign, CampaignTotals, Client, WeeklyMetrics } from '../data/types'

export function totals(weeks: WeeklyMetrics[]): CampaignTotals {
  const t = weeks.reduce(
    (acc, w) => ({
      spend: acc.spend + w.spend,
      impressions: acc.impressions + w.impressions,
      clicks: acc.clicks + w.clicks,
      conversions: acc.conversions + w.conversions,
      revenue: acc.revenue + w.revenue,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
  )
  return {
    ...t,
    ctr: t.impressions ? t.clicks / t.impressions : 0,
    cpc: t.clicks ? t.spend / t.clicks : 0,
    cvr: t.clicks ? t.conversions / t.clicks : 0,
    roas: t.spend ? t.revenue / t.spend : 0,
  }
}

export const last4 = (c: Campaign) => totals(c.weekly.slice(-4))
export const prior4 = (c: Campaign) => totals(c.weekly.slice(-8, -4))
export const allTime = (c: Campaign) => totals(c.weekly)

export function pctChange(current: number, previous: number): number {
  if (!previous) return 0
  return (current - previous) / previous
}

export interface ClientSummary {
  monthlySpend: number
  monthlyRevenue: number
  roas: number
  ctr: number
  cvr: number
  momSpend: number
  momRevenue: number
  momRoas: number
  momCtr: number
  pacingVsPlan: number
}

export function clientWeekly(client: Client): WeeklyMetrics[] {
  const n = client.campaigns[0].weekly.length
  return Array.from({ length: n }, (_, i) => {
    const rows = client.campaigns.map((c) => c.weekly[i])
    return {
      weekEnding: rows[0].weekEnding,
      spend: rows.reduce((s, r) => s + r.spend, 0),
      impressions: rows.reduce((s, r) => s + r.impressions, 0),
      clicks: rows.reduce((s, r) => s + r.clicks, 0),
      conversions: rows.reduce((s, r) => s + r.conversions, 0),
      revenue: rows.reduce((s, r) => s + r.revenue, 0),
    }
  })
}

export function clientSummary(client: Client): ClientSummary {
  const weekly = clientWeekly(client)
  const cur = totals(weekly.slice(-4))
  const prev = totals(weekly.slice(-8, -4))
  const monthlySpend = (cur.spend / 4) * (365.25 / 12 / 7)
  const monthlyRevenue = (cur.revenue / 4) * (365.25 / 12 / 7)
  return {
    monthlySpend,
    monthlyRevenue,
    roas: cur.roas,
    ctr: cur.ctr,
    cvr: cur.cvr,
    momSpend: pctChange(cur.spend, prev.spend),
    momRevenue: pctChange(cur.revenue, prev.revenue),
    momRoas: pctChange(cur.roas, prev.roas),
    momCtr: pctChange(cur.ctr, prev.ctr),
    pacingVsPlan: monthlySpend / client.monthlyPlan,
  }
}

export interface CampaignRow {
  campaign: Campaign
  current: CampaignTotals
  previous: CampaignTotals
  spendShare: number
  momRoas: number
  momCtr: number
  momSpend: number
  momRevenue: number
  wowRevenue: number
}

export function campaignRows(client: Client): CampaignRow[] {
  const clientCur = totals(clientWeekly(client).slice(-4))
  return client.campaigns
    .map((campaign) => {
      const current = last4(campaign)
      const previous = prior4(campaign)
      const lastWeek = campaign.weekly[campaign.weekly.length - 1]
      const weekBefore = campaign.weekly[campaign.weekly.length - 2]
      return {
        campaign,
        current,
        previous,
        spendShare: clientCur.spend ? current.spend / clientCur.spend : 0,
        momRoas: pctChange(current.roas, previous.roas),
        momCtr: pctChange(current.ctr, previous.ctr),
        momSpend: pctChange(current.spend, previous.spend),
        momRevenue: pctChange(current.revenue, previous.revenue),
        wowRevenue: pctChange(lastWeek.revenue, weekBefore.revenue),
      }
    })
    .sort((a, b) => b.current.spend - a.current.spend)
}

export function ctrDeclineOverWeeks(c: Campaign, weeks: number): number {
  const recent = c.weekly.slice(-weeks)
  const first = recent.slice(0, 2)
  const last = recent.slice(-2)
  const ctrOf = (w: WeeklyMetrics[]) => {
    const t = totals(w)
    return t.ctr
  }
  return pctChange(ctrOf(last), ctrOf(first))
}

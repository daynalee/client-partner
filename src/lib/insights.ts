import type { Client } from '../data/types'
import {
  campaignRows,
  clientSummary,
  ctrDeclineOverWeeks,
  pctChange,
  type CampaignRow,
  type ClientSummary,
} from './metrics'
import { fmtDelta, fmtPct, fmtRoas, fmtUSD } from './format'

export type OpportunityTag =
  | 'Budget shift'
  | 'Creative'
  | 'Audience'
  | 'Seasonal'
  | 'Measurement'
  | 'Experiment'
  | 'Catalog'

export interface Opportunity {
  id: string
  title: string
  tag: OpportunityTag
  priority: 'High' | 'Medium'
  whatsHappening: string
  whyItMatters: string
  action: string
  expectedImpact: string
}

export interface Risk {
  id: string
  title: string
  severity: 'Watch' | 'Serious'
  detail: string
}

export interface Win {
  title: string
  detail: string
}

export interface SeasonalOpportunity {
  moment: string
  window: string
  insight: string
}

export interface ClientInsights {
  summary: ClientSummary
  rows: CampaignRow[]
  opportunities: Opportunity[]
  risks: Risk[]
  wins: Win[]
  seasonal: SeasonalOpportunity[]
  execSummary: string[]
}

export function analyzeClient(client: Client): ClientInsights {
  const summary = clientSummary(client)
  const rows = campaignRows(client)
  const opportunities: Opportunity[] = []
  const risks: Risk[] = []
  const wins: Win[] = []

  const blendedRoas = summary.roas
  // "standout" excludes retargeting; its ROAS is structurally inflated by existing intent
  const sorted = [...rows].sort((a, b) => b.current.roas - a.current.roas)
  const best = sorted.find((r) => r.campaign.audience !== 'Retargeting') ?? sorted[0]

  // --- Rule: high-ROAS campaign with limited spend share -> budget shift
  for (const r of rows) {
    if (
      r.current.roas >= blendedRoas * 1.2 &&
      r.spendShare < 0.16 &&
      r.campaign.audience !== 'Retargeting' &&
      r.current.spend > 0
    ) {
      const shiftMonthly = summary.monthlySpend * 0.1
      const marginalRoas = r.current.roas * 0.85 // assume modest marginal decay
      opportunities.push({
        id: `shift-${r.campaign.id}`,
        title: `Shift budget toward ${r.campaign.name}`,
        tag: 'Budget shift',
        priority: 'High',
        whatsHappening: `${r.campaign.name} is delivering ${fmtRoas(r.current.roas)} ROAS over the last 4 weeks, ${Math.round((r.current.roas / blendedRoas - 1) * 100)}% above the ${fmtRoas(blendedRoas)} account blend, yet holds only ${fmtPct(r.spendShare, 0)} of spend.`,
        whyItMatters: `The account's most efficient dollar is being underfunded. Budget concentrated in lower-ROAS campaigns is leaving revenue on the table at the current efficiency frontier.`,
        action: `Reallocate ~${fmtUSD(shiftMonthly)}/month from the lowest-efficiency always-on campaigns into ${r.campaign.name}, stepping up 20% per week to protect delivery stability.`,
        expectedImpact: `~${fmtUSD(shiftMonthly * marginalRoas - shiftMonthly * blendedRoas * 0.9)} incremental monthly revenue at conservative marginal ROAS assumptions, with blended ROAS improving toward target.`,
      })
      break
    }
  }

  // --- Rule: creative fatigue (sustained CTR decline with meaningful spend)
  for (const r of rows) {
    const decline = ctrDeclineOverWeeks(r.campaign, 12)
    if (decline <= -0.18 && r.spendShare >= 0.1) {
      opportunities.push({
        id: `fatigue-${r.campaign.id}`,
        title: `Refresh fatigued creative on ${r.campaign.name}`,
        tag: 'Creative',
        priority: 'High',
        whatsHappening: `${r.campaign.name} CTR has declined ${fmtPct(Math.abs(decline), 0)} over the past 12 weeks (now ${fmtPct(r.current.ctr, 2)}) while spend held steady. The classic creative fatigue signature.`,
        whyItMatters: `Fatigued creative raises CPCs and drags blended efficiency; on a visual discovery platform, fresh creative is the single highest-leverage fix because users respond to newness and seasonal relevance.`,
        action: `Ship a refresh sprint: 6 to 8 new assets mixing seasonal angles and video formats, retire the bottom-quartile Pins, and move to a 4 to 6 week creative rotation cadence.`,
        expectedImpact: `Restoring CTR to its 12-week baseline would recover an estimated ${fmtUSD(r.current.spend * 0.25 * blendedRoas / 4)}+ in weekly revenue at current spend levels.`,
      })
      risks.push({
        id: `risk-fatigue-${r.campaign.id}`,
        title: `Creative fatigue: ${r.campaign.name}`,
        severity: 'Serious',
        detail: `CTR down ${fmtPct(Math.abs(decline), 0)} over 12 weeks; ROAS has followed (${fmtDelta(r.momRoas)} MoM). Without a refresh this will drag the account blend below target.`,
      })
      break
    }
  }

  // --- Rule: scaling fast but losing efficiency
  const efficiencyFlagged = new Set<string>()
  for (const r of rows) {
    if (r.momSpend > 0.25 && r.momRoas < -0.08) {
      efficiencyFlagged.add(r.campaign.id)
      opportunities.push({
        id: `efficiency-${r.campaign.id}`,
        title: `Add guardrails to ${r.campaign.name} scaling`,
        tag: 'Experiment',
        priority: 'High',
        whatsHappening: `${r.campaign.name} spend is up ${fmtDelta(r.momSpend)} month-over-month, but ROAS has slipped ${fmtDelta(r.momRoas)} to ${fmtRoas(r.current.roas)} as delivery expands into broader inventory.`,
        whyItMatters: `Some efficiency loss is normal when scaling, but unmanaged it compounds. The question is whether the marginal dollar is still incremental, not whether the average looks acceptable.`,
        action: `Hold weekly budget steps to +15%, split the audience into performance tiers with separate bids, and pair the scale-up with a geo-split incrementality test to measure true marginal return.`,
        expectedImpact: `Protects the scale trajectory while establishing the efficiency floor, and informs whether the next ${fmtUSD(summary.monthlySpend * 0.15)}/month of budget should go here or to a new audience.`,
      })
      risks.push({
        id: `risk-eff-${r.campaign.id}`,
        title: `Efficiency erosion while scaling: ${r.campaign.name}`,
        severity: 'Watch',
        detail: `Spend ${fmtDelta(r.momSpend)} MoM with ROAS ${fmtDelta(r.momRoas)}. Watch the marginal-return curve before further budget steps.`,
      })
      break
    }
  }

  // --- Rule: retargeting strong but saturated -> expand upper funnel
  // fires on efficiency (well above blend) OR dependence (large spend share);
  // in retargeting-heavy accounts the blend itself is inflated by retargeting
  for (const r of rows) {
    if (r.campaign.audience !== 'Retargeting') continue
    const impGrowth = pctChange(r.current.impressions, r.previous.impressions)
    if ((r.current.roas >= blendedRoas * 1.4 || r.spendShare > 0.35) && impGrowth < 0.08) {
      opportunities.push({
        id: `retargeting-${r.campaign.id}`,
        title: `Retargeting is saturated: grow the audience feeding it`,
        tag: 'Audience',
        priority: 'Medium',
        whatsHappening: `${r.campaign.name} runs at ${fmtRoas(r.current.roas)} ROAS but impressions grew only ${fmtPct(Math.max(impGrowth, 0), 0)} last month. The audience pool is fully saturated.`,
        whyItMatters: `Retargeting ROAS is capped by the size of the site-visitor pool. More budget here buys frequency, not reach; sustainable growth has to come from filling the top of the funnel.`,
        action: `Keep retargeting budget flat, and invest incremental dollars in lookalikes seeded from converters plus interest/keyword prospecting to expand the retargetable pool.`,
        expectedImpact: `A 25% larger visitor pool compounds through retargeting within 4 to 6 weeks, delivering growth in the account's most efficient channel without bidding against saturation.`,
      })
      break
    }
  }

  // --- Rule: healthy CTR + weak CVR -> measurement gap
  if (summary.cvr < 0.016 && summary.ctr >= 0.007) {
    opportunities.push({
      id: 'tracking-gap',
      title: 'Audit conversion tracking before optimizing anything else',
      tag: 'Measurement',
      priority: 'High',
      whatsHappening: `Account CTR is healthy at ${fmtPct(summary.ctr, 2)}, but conversion rate is only ${fmtPct(summary.cvr, 1)}, well below the 2.5 to 3.5% typical for comparable apparel advertisers with this level of engagement.`,
      whyItMatters: `When clicks are strong and conversions look weak, undercounting is as likely as underperformance. Every optimization decision made on undercounted data compounds the error, and reported ROAS understates true value.`,
      action: `Run a tracking audit: verify server-side conversion API coverage alongside the pixel, check dedup between the two, confirm the attribution windows match how the business evaluates other channels, and validate checkout events post-replatform.`,
      expectedImpact: `Comparable audits typically recover 15 to 30% of unattributed conversions, which could move reported ROAS from ${fmtRoas(summary.roas)} to ~${fmtRoas(summary.roas * 1.2)} with zero media changes.`,
    })
    risks.push({
      id: 'risk-tracking',
      title: 'Suspected conversion undercounting',
      severity: 'Serious',
      detail: `CVR of ${fmtPct(summary.cvr, 1)} against ${fmtPct(summary.ctr, 2)} CTR suggests signal loss. Reported ROAS is likely understated; treat current efficiency reads as a floor.`,
    })
  }

  // --- Rule: prospecting below blend but growing -> incrementality framing
  for (const r of rows) {
    if (r.campaign.audience !== 'Prospecting' || efficiencyFlagged.has(r.campaign.id)) continue
    if (r.current.roas < blendedRoas && r.momRevenue > 0.12) {
      opportunities.push({
        id: `prospecting-${r.campaign.id}`,
        title: `Protect ${r.campaign.name}: it looks worse than it is`,
        tag: 'Experiment',
        priority: 'Medium',
        whatsHappening: `${r.campaign.name} shows ${fmtRoas(r.current.roas)} ROAS vs the ${fmtRoas(blendedRoas)} blend, but revenue is growing ${fmtDelta(r.momRevenue)} MoM and it is the account's primary source of new customers.`,
        whyItMatters: `Last-click ROAS systematically undervalues prospecting: it seeds the retargeting pool and drives first purchases whose LTV accrues later. Cutting it to chase blended ROAS shrinks the whole funnel within a quarter.`,
        action: `Hold or grow the budget, and run a 4-week holdout incrementality test to quantify true contribution, then set a separate new-customer ROAS target rather than judging it against the blend.`,
        expectedImpact: `Establishes the real value of upper-funnel spend and typically justifies a 20 to 40% higher prospecting budget than last-click reporting alone would support.`,
      })
      break
    }
  }

  // --- Rule: strong catalog performance -> expand coverage
  for (const r of rows) {
    if (
      r.campaign.objective === 'Catalog Sales' &&
      r.campaign.creativeType === 'Collections' &&
      r.current.roas >= blendedRoas &&
      r.campaign.audience !== 'Retargeting' &&
      opportunities.length < 5
    ) {
      opportunities.push({
        id: `catalog-${r.campaign.id}`,
        title: 'Expand product catalog coverage',
        tag: 'Catalog',
        priority: 'Medium',
        whatsHappening: `${r.campaign.name} converts at ${fmtRoas(r.current.roas)} using shopping formats, confirming that catalog-driven discovery works for this brand.`,
        whyItMatters: `Shopping formats scale with feed breadth: every well-merchandised product group is a new query surface. Accounts typically monetize only a fraction of their catalog.`,
        action: `Audit feed coverage and health (titles, imagery, availability), add product groups for the top under-represented categories, and launch Collections against them.`,
        expectedImpact: `Broader catalog coverage typically adds 10 to 20% incremental shopping revenue at similar efficiency within two months.`,
      })
      break
    }
  }

  // --- Rule: seasonal campaign ramping efficiently -> lean in while the window is open
  for (const r of rows) {
    if (
      (r.campaign.season === 'Fall' || r.campaign.season === 'Holiday') &&
      r.momRevenue > 0.35 &&
      r.current.roas >= client.roasTarget &&
      r.spendShare < 0.45 &&
      !efficiencyFlagged.has(r.campaign.id)
    ) {
      opportunities.push({
        id: `seasonal-${r.campaign.id}`,
        title: `Increase investment in ${r.campaign.name} while the seasonal window is open`,
        tag: 'Seasonal',
        priority: 'High',
        whatsHappening: `${r.campaign.name} revenue is up ${fmtDelta(r.momRevenue)} month-over-month at ${fmtRoas(r.current.roas)} ROAS, scaling into the season while holding efficiency at or above the ${fmtRoas(client.roasTarget)} account target.`,
        whyItMatters: `Seasonal demand is a window, not a faucet: shoppers planning this moment are in-market now, and the same reach costs materially more once the season peaks and CPMs inflate.`,
        action: `Pull forward planned seasonal budget: step this campaign up 20 to 25% per week while ROAS holds above target, and extend top assets into additional formats to capture remaining planner demand.`,
        expectedImpact: `Capturing the seasonal curve early typically delivers 15 to 25% cheaper conversions than equivalent spend at peak, and builds engagement pools that retargeting monetizes through the season's tail.`,
      })
      break
    }
  }

  // --- Rule: below-target account still funding low-return awareness spend
  if (summary.roas < client.roasTarget * 0.9) {
    const awareness = rows.find((r) => r.campaign.objective === 'Awareness' && r.spendShare > 0.08)
    if (awareness) {
      opportunities.push({
        id: `funnel-${awareness.campaign.id}`,
        title: 'Rebalance funnel investment until efficiency recovers',
        tag: 'Budget shift',
        priority: 'Medium',
        whatsHappening: `The account is running ${fmtRoas(summary.roas)} against a ${fmtRoas(client.roasTarget)} target, while ${awareness.campaign.name} holds ${fmtPct(awareness.spendShare, 0)} of spend at ${fmtRoas(awareness.current.roas)} direct return.`,
        whyItMatters: `Awareness investment is right for the long game, but when the account is missing its efficiency commitment, every awareness dollar makes the gap look worse and erodes trust in the channel.`,
        action: `Temporarily shift half of the awareness budget into the strongest conversion campaigns, and re-enter awareness once the blend is back at target, ideally timed to the Holiday planning window where upper-funnel dollars work hardest.`,
        expectedImpact: `Moving ~${fmtUSD(awareness.current.spend * 0.5)} per month to conversion campaigns at blended efficiency adds roughly ${fmtUSD(awareness.current.spend * 0.5 * (summary.roas - awareness.current.roas))} in monthly attributed revenue, narrowing the gap to target while the tracking and creative work lands.`,
      })
    }
  }

  // --- Portfolio-level risks
  if (summary.pacingVsPlan > 1.1) {
    risks.push({
      id: 'risk-overpacing',
      title: 'Pacing ahead of plan',
      severity: 'Watch',
      detail: `Spend is tracking at ${fmtPct(summary.pacingVsPlan, 0)} of the ${fmtUSD(client.monthlyPlan)} monthly plan. Confirm the client intends to overdeliver before month-end, or throttle the fastest-scaling campaigns.`,
    })
  } else if (summary.pacingVsPlan < 0.85) {
    risks.push({
      id: 'risk-underpacing',
      title: 'Underdelivery vs plan',
      severity: 'Watch',
      detail: `Spend is tracking at ${fmtPct(summary.pacingVsPlan, 0)} of the ${fmtUSD(client.monthlyPlan)} monthly plan. Unspent budget is unrealized revenue at current ${fmtRoas(summary.roas)} efficiency.`,
    })
  }
  if (summary.roas < client.roasTarget) {
    risks.push({
      id: 'risk-roas-target',
      title: `Blended ROAS below the ${fmtRoas(client.roasTarget)} target`,
      severity: summary.roas < client.roasTarget * 0.85 ? 'Serious' : 'Watch',
      detail: `Blended ROAS is ${fmtRoas(summary.roas)} against a ${fmtRoas(client.roasTarget)} target (${fmtDelta(summary.momRoas)} MoM). The gap is concentrated in the campaigns flagged above.`,
    })
  }
  const retargetingShare = rows
    .filter((r) => r.campaign.audience === 'Retargeting')
    .reduce((s, r) => s + r.spendShare, 0)
  if (retargetingShare > 0.4) {
    risks.push({
      id: 'risk-retargeting-dependence',
      title: 'Over-reliance on retargeting',
      severity: 'Serious',
      detail: `${fmtPct(retargetingShare, 0)} of spend sits in retargeting. Reported efficiency is strong, but growth is structurally capped by the existing visitor pool, and much of that revenue would likely occur anyway.`,
    })
  }

  // --- Wins
  if (best) {
    wins.push({
      title: `${best.campaign.name} leads the account`,
      detail: `${fmtRoas(best.current.roas)} ROAS on ${fmtUSD(best.current.spend)} over the last 4 weeks (${fmtPct(best.current.ctr, 2)} CTR, ${fmtPct(best.current.cvr, 1)} CVR).`,
    })
  }
  if (summary.momRevenue > 0.08) {
    wins.push({
      title: 'Revenue momentum',
      detail: `Account revenue grew ${fmtDelta(summary.momRevenue)} month-over-month to ${fmtUSD(summary.monthlyRevenue)}/month.`,
    })
  }
  if (summary.roas >= client.roasTarget) {
    wins.push({
      title: 'Efficiency target met',
      detail: `Blended ROAS of ${fmtRoas(summary.roas)} is at or above the ${fmtRoas(client.roasTarget)} target while spending ${fmtUSD(summary.monthlySpend)}/month.`,
    })
  }
  const seasonalRamp = rows.find((r) => r.campaign.season === 'Fall' && r.momRevenue > 0.3)
  if (seasonalRamp) {
    wins.push({
      title: `${seasonalRamp.campaign.name} is ramping well`,
      detail: `Revenue up ${fmtDelta(seasonalRamp.momRevenue)} MoM at ${fmtRoas(seasonalRamp.current.roas)} ROAS as the Fall season builds.`,
    })
  }

  // --- Seasonal calendar (users plan 2 to 3 months ahead of the moment)
  const hasFall = client.campaigns.some((c) => c.season === 'Fall')
  const seasonal: SeasonalOpportunity[] = [
    {
      moment: 'Back-to-School / Campus',
      window: 'Peaking now → early September',
      insight: hasFall
        ? 'In-season demand is live. Fall/campus campaigns are already capturing it. Protect budget and creative freshness through Labor Day.'
        : 'In-season now. A fast-follow campus edit could still capture late planners through early September.',
    },
    {
      moment: 'Fall wardrobe refresh',
      window: 'Planning now, purchase peak Sep to Oct',
      insight: 'Shoppers on visual discovery platforms start saving fall outfit ideas 2 to 3 months before they buy. Fall creative running in August reaches planners before intent gets expensive.',
    },
    {
      moment: 'Holiday gifting',
      window: 'Planning begins Sep, purchase peak Nov to Dec',
      insight: 'The single biggest seasonal opportunity: brief Holiday creative and audience strategy by early September to build save/engagement pools before CPM inflation hits in November.',
    },
  ]

  const priorityOrder = { High: 0, Medium: 1 }
  opportunities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  // --- Executive summary
  const execSummary: string[] = [
    `${client.name} spent ${fmtUSD(summary.monthlySpend)} last month (${fmtPct(summary.pacingVsPlan, 0)} of plan) generating ${fmtUSD(summary.monthlyRevenue)} at ${fmtRoas(summary.roas)} blended ROAS ${summary.roas >= client.roasTarget ? 'at or above' : 'below'} the ${fmtRoas(client.roasTarget)} target.`,
    `Revenue is ${summary.momRevenue >= 0 ? 'up' : 'down'} ${fmtPct(Math.abs(summary.momRevenue), 0)} month-over-month; efficiency (ROAS) is ${summary.momRoas >= 0 ? 'up' : 'down'} ${fmtPct(Math.abs(summary.momRoas), 0)}.`,
    best
      ? `${best.campaign.name} is the strategic standout at ${fmtRoas(best.current.roas)} ROAS. Primary objective: ${client.objective.replace(/\.$/, '')}.`
      : `Primary objective: ${client.objective}`,
  ]
  const seriousRisk = risks.find((r) => r.severity === 'Serious')
  if (seriousRisk) {
    execSummary.push(`Priority risk: ${seriousRisk.title}.`)
  }
  if (opportunities[0]) {
    execSummary.push(`Top recommended move: ${opportunities[0].title}.`)
  }

  return { summary, rows, opportunities: opportunities.slice(0, 5), risks, wins, seasonal, execSummary }
}

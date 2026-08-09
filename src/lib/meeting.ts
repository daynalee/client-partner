import type { Client } from '../data/types'
import type { ClientInsights } from './insights'
import { fmtDelta, fmtPct, fmtRoas, fmtUSD } from './format'

export interface MeetingPrep {
  execSummary: string[]
  agenda: string[]
  wins: string[]
  risks: string[]
  questions: string[]
  recommendations: { title: string; detail: string }[]
  upsell: string
}

export function buildMeetingPrep(client: Client, insights: ClientInsights): MeetingPrep {
  const { summary, opportunities, risks, wins } = insights

  const questions: string[] = [
    `How is the team planning Holiday inventory and promo depth? We want media pacing to mirror stock position, not fight it.`,
    `Are there product launches or collection drops in the next 8 weeks we should build campaigns around?`,
    `How does the business measure us against other channels (platform-reported ROAS, MMM, or incrementality), and are we optimizing to the number that matters to your CFO?`,
  ]
  if (summary.cvr < 0.016) {
    questions.push(`Has anything changed on the site or checkout recently? Our click-to-conversion ratio suggests we may be losing signal, not sales.`)
  }
  if (summary.pacingVsPlan > 1.05) {
    questions.push(`We're pacing ahead of plan at strong efficiency. Is there appetite to formalize an incremental budget for Q4 rather than treating overdelivery as an accident?`)
  } else {
    questions.push(`If we can prove incremental return above ${fmtRoas(client.roasTarget)}, what would unlock incremental budget this quarter?`)
  }

  const upsell =
    summary.roas >= client.roasTarget
      ? `The account is beating its ${fmtRoas(client.roasTarget)} efficiency target at ${fmtRoas(summary.roas)}. Propose a structured incremental budget test: +${fmtUSD(client.monthlyPlan * 0.15)}/month for 8 weeks into the highest-performing campaigns, with a pre-agreed success threshold of ${fmtRoas(client.roasTarget * 0.9)} marginal ROAS. Frame it as buying knowledge of the efficiency ceiling, not just more spend.`
      : `Efficiency is below target, so lead with value recovery rather than budget: propose a measurement deep-dive (tracking audit + incrementality read). Once reported ROAS reflects true performance, revisit scaled investment for the Holiday window from a position of proof.`

  return {
    execSummary: insights.execSummary.slice(0, 5),
    agenda: [
      'Performance recap: last 4 weeks vs plan (5 min)',
      'What drove it: campaign, creative, and audience detail (10 min)',
      `Risks and how we're managing them (5 min)`,
      'Recommendations and seasonal roadmap (10 min)',
      'Budget and next steps (5 min)',
    ],
    wins: wins.map((w) => `${w.title}: ${w.detail}`),
    risks: risks.map((r) => `${r.title}: ${r.detail}`),
    questions,
    recommendations: opportunities.slice(0, 3).map((o) => ({ title: o.title, detail: o.action })),
    upsell,
  }
}

export function buildTalkingPoints(client: Client, insights: ClientInsights): string[] {
  const { summary, rows, opportunities } = insights
  const sorted = [...rows].sort((a, b) => b.current.roas - a.current.roas)
  const best = sorted.find((r) => r.campaign.audience !== 'Retargeting') ?? sorted[0]
  const points: string[] = []

  points.push(
    `Big picture: we turned ${fmtUSD(summary.monthlySpend)} into ${fmtUSD(summary.monthlyRevenue)} last month, a ${fmtRoas(summary.roas)} return, ${summary.roas >= client.roasTarget * 1.05 ? 'ahead of' : summary.roas >= client.roasTarget * 0.97 ? 'right at' : 'against'} our ${fmtRoas(client.roasTarget)} goal, with revenue ${summary.momRevenue >= 0 ? 'up' : 'down'} ${fmtPct(Math.abs(summary.momRevenue), 0)} month-over-month.`,
  )

  if (best && best.spendShare < 0.2) {
    points.push(
      `${best.campaign.name} is quietly your best performer at ${fmtRoas(best.current.roas)}, but it's only getting ${fmtPct(best.spendShare, 0)} of budget. I'd move incremental dollars there before we spend anywhere else.`,
    )
  } else if (best) {
    points.push(
      `${best.campaign.name} continues to lead at ${fmtRoas(best.current.roas)} ROAS on ${fmtUSD(best.current.spend)}, carrying the account with room to keep scaling.`,
    )
  }

  const fatigue = opportunities.find((o) => o.tag === 'Creative')
  if (fatigue) {
    points.push(
      `One thing I'm watching closely: ${fatigue.whatsHappening.split(' while ')[0].trim()}. This is a creative problem, not a media problem. A refresh sprint fixes it, and I'd rather do that now than discount our way through Q4.`,
    )
  }

  const measurement = opportunities.find((o) => o.tag === 'Measurement')
  if (measurement) {
    points.push(
      `Before we judge performance too harshly: your click volume says shoppers are engaged, but conversions aren't following at the rate we'd expect. I want us to audit tracking first. I suspect we're undercounting, which means the real story is better than the dashboard.`,
    )
  }

  points.push(
    `On seasonality: shoppers here plan 2 to 3 months ahead. Decisions we make in the next two weeks determine whether we own Holiday discovery or pay peak prices to rent it in November.`,
  )

  return points.slice(0, 5)
}

export function buildFollowUpEmail(client: Client, insights: ClientInsights): string {
  const { summary, opportunities, wins } = insights
  const recs = opportunities.slice(0, 3)
  const winLine = wins[0] ? `${wins[0].title.toLowerCase()} (${wins[0].detail.split('(')[0].trim()})` : 'continued steady performance'

  return `Subject: ${client.name} performance recap and next steps

Hi team,

Thank you for the time today. A quick recap and the actions we aligned on.

Where we are
- Last month: ${fmtUSD(summary.monthlySpend)} invested, ${fmtUSD(summary.monthlyRevenue)} in revenue, ${fmtRoas(summary.roas)} blended ROAS (${fmtDelta(summary.momRoas)} MoM).
- Highlight: ${winLine}.
- Pacing: ${fmtPct(summary.pacingVsPlan, 0)} of the ${fmtUSD(client.monthlyPlan)} monthly plan.

What we agreed
${recs.map((r, i) => `${i + 1}. ${r.title}: ${r.action.split('.')[0].trim().replace(/^./, (c) => c.toLowerCase())}.`).join('\n')}

Next steps
- Our team: implementation plan for the above within 3 business days, plus the seasonal creative brief for Holiday.
- Your team: confirm upcoming launch calendar and promo windows so we can build flighting around them.
- Together: 30-minute check-in in two weeks to review early signal.

As always, happy to walk through any of the detail behind these numbers.

Best,
Your Client Partner`
}

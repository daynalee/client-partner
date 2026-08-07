export interface ExperimentPlan {
  problem: string
  hypothesis: string
  setup: string[]
  kpi: string
  successCriteria: string
  duration: string
  decision: { ifWin: string; ifFlat: string; ifLose: string }
}

export const EXPERIMENT_PLANS: ExperimentPlan[] = [
  {
    problem: 'Low ROAS',
    hypothesis: 'Budget is over-allocated to low-efficiency segments; concentrating spend in proven audience × creative combinations will raise blended ROAS without reducing revenue.',
    setup: [
      'Rank all campaign / audience / creative cells by 4-week ROAS and spend share.',
      'Shift 20% of budget from the bottom-quartile cells into the top quartile, stepped +20% per week.',
      'Hold total budget, targeting, and landing experience constant so budget mix is the only variable.',
    ],
    kpi: 'Blended ROAS (primary); total revenue (guardrail — must not decline >5%)',
    successCriteria: 'Blended ROAS improves ≥15% vs the pre-test 4-week baseline with revenue within guardrail.',
    duration: '4 weeks (plus 1-week post-period to check for delayed-conversion effects)',
    decision: {
      ifWin: 'Make the reallocation permanent and repeat quarterly as a budget-hygiene ritual.',
      ifFlat: 'Efficiency problem is not mix-driven — escalate to creative quality and tracking-fidelity investigation.',
      ifLose: 'Revert; the low-ROAS cells were contributing assisted value. Re-run with view-through and assisted conversions in the read.',
    },
  },
  {
    problem: 'Declining CTR',
    hypothesis: 'CTR decline is driven by creative wear-out, not audience quality; introducing fresh creative concepts will restore CTR to baseline.',
    setup: [
      'Split the affected campaign 50/50 by audience: control keeps current creative, treatment gets 6+ net-new assets (new concepts, not resizes).',
      'Match budgets and bids across arms; freeze other changes for the test window.',
      'Tag assets by concept so wear-out rate per concept can be read afterward.',
    ],
    kpi: 'CTR (primary); CPC and ROAS (secondary)',
    successCriteria: 'Treatment CTR ≥20% above control, sustained across the final 2 weeks of the test.',
    duration: '3–4 weeks',
    decision: {
      ifWin: 'Roll fresh creative to 100%, and institutionalize a 4–6 week refresh cadence with a rolling production pipeline.',
      ifFlat: 'Creative is not the constraint — investigate audience saturation (frequency) and competitive CPM pressure next.',
      ifLose: 'New concepts underperformed; keep control live and re-brief creative against the top historical performers.',
    },
  },
  {
    problem: 'Creative fatigue',
    hypothesis: 'Rotating creative on a fixed cadence prevents the CTR decay we currently absorb, producing higher average engagement than run-until-dead.',
    setup: [
      'Two matched campaigns: control runs assets until performance forces a change (status quo); treatment retires every asset at 5 weeks regardless of performance.',
      'Same audiences, budget, and product focus; production pipeline briefed 2 weeks ahead so rotation never waits on assets.',
    ],
    kpi: 'Average CTR over the full period (primary); ROAS and CPC (secondary)',
    successCriteria: 'Treatment average CTR ≥15% above control across 8 weeks.',
    duration: '8 weeks (needs at least one full rotation cycle in the treatment arm)',
    decision: {
      ifWin: 'Adopt fixed-cadence rotation account-wide and size the creative production retainer accordingly.',
      ifFlat: 'Wear-out is slower than assumed — extend rotation to 8 weeks and bank the production savings.',
      ifLose: 'Retiring winners early cost performance; move to a performance-triggered rotation rule (retire at −20% CTR from peak) instead of a fixed clock.',
    },
  },
  {
    problem: 'Low conversion rate',
    hypothesis: 'The conversion gap is on the landing experience (or in measurement), not in traffic quality; improving the click-to-purchase path will raise CVR without touching media.',
    setup: [
      'First, a 3-day tracking audit (pixel + server-side API dedup, attribution windows) — if undercounting is found, stop and fix before testing.',
      'Then split traffic from the same campaign: control to current landing pages, treatment to category/collection pages matched to each creative theme.',
      'Hold audiences, bids, and creative constant.',
    ],
    kpi: 'Conversion rate (primary); revenue per click (secondary)',
    successCriteria: 'Treatment CVR ≥25% above control with stable AOV.',
    duration: '4 weeks after the tracking audit clears',
    decision: {
      ifWin: 'Route all campaigns to matched landing experiences and brief the client\'s site team on the winning patterns.',
      ifFlat: 'Landing experience is not the constraint — investigate price/assortment competitiveness and audience purchase intent next.',
      ifLose: 'Deep links underperformed the default; test a curated mid-funnel page (bestsellers) as a third arm.',
    },
  },
  {
    problem: 'Need more scale',
    hypothesis: 'The account can absorb meaningfully more budget above the current spend level while holding marginal ROAS above the efficiency floor.',
    setup: [
      'Geo-split incrementality design: in test regions, raise budget +30%; matched control regions hold current levels.',
      'Incremental budget goes to the proven top performers first, then to one new audience expansion (lookalike of converters).',
      'Pre-register the efficiency floor with the client before launch — this is the number that makes the result a decision, not a debate.',
    ],
    kpi: 'Marginal ROAS in test vs control geos (primary); total revenue lift (secondary)',
    successCriteria: 'Marginal ROAS ≥80% of the account efficiency target in test regions.',
    duration: '6 weeks',
    decision: {
      ifWin: 'Roll the +30% budget level out nationally and schedule the next ceiling test at +30% again — scale until marginal return says stop.',
      ifFlat: 'Current spend is near the efficiency frontier — shift the growth conversation to new audiences, formats, and catalog breadth instead of budget.',
      ifLose: 'Marginal dollars are not incremental at this level; hold budget and reinvest in conversion-rate and creative work to raise the frontier itself.',
    },
  },
  {
    problem: 'Seasonal launch',
    hypothesis: 'Activating seasonal creative 8–10 weeks before the purchase peak captures early planners at low CPMs and compounds into cheaper, higher-intent conversions during the peak.',
    setup: [
      'Two-phase flight: Phase 1 (weeks 1–5) consideration objective with seasonal inspiration creative (video / Idea-style formats) to build engagement pools.',
      'Phase 2 (weeks 6–10) conversion objective retargeting Phase-1 engagers plus lookalikes, with shopping formats.',
      'Control: a matched audience segment excluded from Phase 1, entering only at Phase 2 — this isolates the value of early activation.',
    ],
    kpi: 'Peak-period ROAS and CPA for early-exposed vs Phase-2-only audiences',
    successCriteria: 'Early-exposed audiences convert at ≥20% lower CPA during the peak window.',
    duration: '10 weeks spanning pre-season through peak',
    decision: {
      ifWin: 'Codify the two-phase seasonal playbook and apply it to the next major moment (Holiday) with a bigger Phase-1 budget.',
      ifFlat: 'Early activation paid for itself but no more — keep a lighter Phase 1 focused only on the cheapest engagement formats.',
      ifLose: 'Planner behavior did not materialize for this category — concentrate budget in-season and buy reach closer to the purchase window.',
    },
  },
]

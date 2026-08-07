import { useState } from 'react'
import { EXPERIMENT_PLANS } from '../lib/experiments'
import { Card, Disclaimer, Eyebrow } from '../components/ui'

export default function Experiments() {
  const [selected, setSelected] = useState(0)
  const plan = EXPERIMENT_PLANS[selected]

  return (
    <div>
      <div className="mb-8">
        <Eyebrow>Measurement &amp; testing</Eyebrow>
        <h1 className="mt-1 font-serif text-3xl text-ink">Experimentation Planner</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          Pick the business problem you're solving. The planner returns a structured test design —
          because a test without a pre-agreed decision rule is just spend with extra steps.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {EXPERIMENT_PLANS.map((p, i) => (
          <button
            key={p.problem}
            onClick={() => setSelected(i)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              i === selected
                ? 'border-ink bg-ink text-white'
                : 'border-hairline bg-surface text-ink-secondary hover:bg-hairline/40'
            }`}
          >
            {p.problem}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <Eyebrow>Hypothesis</Eyebrow>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{plan.hypothesis}</p>
          <div className="mt-5 border-t border-hairline pt-4">
            <Eyebrow>Test setup</Eyebrow>
            <ol className="mt-3 space-y-2">
              {plan.setup.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-secondary">
                  <span className="w-4 shrink-0 font-semibold tabular-nums text-ink-muted">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </Card>

        <Card>
          <div className="grid gap-4">
            <div>
              <Eyebrow>Primary KPI</Eyebrow>
              <p className="mt-1 text-sm font-medium text-ink">{plan.kpi}</p>
            </div>
            <div>
              <Eyebrow>Success criteria</Eyebrow>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{plan.successCriteria}</p>
            </div>
            <div>
              <Eyebrow>Recommended duration</Eyebrow>
              <p className="mt-1 text-sm text-ink-secondary">{plan.duration}</p>
            </div>
          </div>
          <div className="mt-5 border-t border-hairline pt-4">
            <Eyebrow>Decision framework</Eyebrow>
            <div className="mt-3 space-y-3 text-sm leading-relaxed">
              <div>
                <span className="font-semibold text-status-good-text">If it wins:</span>{' '}
                <span className="text-ink-secondary">{plan.decision.ifWin}</span>
              </div>
              <div>
                <span className="font-semibold text-[#7a5800]">If it's flat:</span>{' '}
                <span className="text-ink-secondary">{plan.decision.ifFlat}</span>
              </div>
              <div>
                <span className="font-semibold text-[#a02c2c]">If it loses:</span>{' '}
                <span className="text-ink-secondary">{plan.decision.ifLose}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-8"><Disclaimer /></div>
    </div>
  )
}

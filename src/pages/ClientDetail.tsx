import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getClient } from '../data/dataset'
import { clientWeekly, type CampaignRow } from '../lib/metrics'
import { analyzeClient } from '../lib/insights'
import { fmtDelta, fmtPct, fmtRoas, fmtUSD } from '../lib/format'
import { Card, Delta, Disclaimer, Eyebrow, HealthBadge, SectionTitle, Stat, Tag } from '../components/ui'
import { BreakdownBar, RevenueTrend, RoasTrend, SpendVsPlan } from '../components/charts'
import MeetingPrepPanel from '../components/MeetingPrepPanel'

const WEEKS_PER_MONTH = 365.25 / 12 / 7

function CampaignTable({ rows, blendedRoas }: { rows: CampaignRow[]; blendedRoas: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            <th className="py-2 pr-4 font-semibold">Campaign</th>
            <th className="py-2 pr-4 font-semibold">Objective</th>
            <th className="py-2 pr-4 font-semibold">Audience</th>
            <th className="py-2 pr-4 font-semibold">Creative</th>
            <th className="py-2 pr-4 text-right font-semibold">Spend (4wk)</th>
            <th className="py-2 pr-4 text-right font-semibold">ROAS</th>
            <th className="py-2 pr-4 text-right font-semibold">CTR</th>
            <th className="py-2 text-right font-semibold">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const strong = r.current.roas >= blendedRoas * 1.2
            const weak = r.current.roas < blendedRoas * 0.75
            return (
              <tr key={r.campaign.id} className="border-b border-hairline/60 last:border-0">
                <td className="py-2.5 pr-4">
                  <div className="font-medium text-ink">{r.campaign.name}</div>
                  <div className="text-[11px] text-ink-muted">
                    {r.campaign.productCategory} · {r.campaign.season}
                    {strong && <span className="ml-1.5 text-status-good-text">● outperforming</span>}
                    {weak && <span className="ml-1.5 text-[#a02c2c]">● underperforming</span>}
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-ink-secondary">{r.campaign.objective}</td>
                <td className="py-2.5 pr-4 text-ink-secondary">{r.campaign.audience}</td>
                <td className="py-2.5 pr-4 text-ink-secondary">{r.campaign.creativeType}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">
                  {fmtUSD(r.current.spend)}
                  <span className="ml-1 text-[11px] text-ink-muted">({fmtPct(r.spendShare, 0)})</span>
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums">
                  {fmtRoas(r.current.roas)} <Delta value={r.momRoas} />
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums">
                  {fmtPct(r.current.ctr, 2)} <Delta value={r.momCtr} />
                </td>
                <td className="py-2.5 text-right tabular-nums">{fmtUSD(r.current.revenue)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; spend: number; revenue: number }[] }) {
  const maxSpend = Math.max(...rows.map((r) => r.spend))
  return (
    <Card>
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-4 space-y-3">
        {rows
          .sort((a, b) => b.spend - a.spend)
          .map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-medium text-ink">{r.label}</span>
                <span className="tabular-nums text-ink-secondary">
                  {fmtUSD(r.spend)} · {fmtRoas(r.spend ? r.revenue / r.spend : 0)}
                </span>
              </div>
              <BreakdownBar value={r.spend} max={maxSpend} />
            </div>
          ))}
      </div>
    </Card>
  )
}

export default function ClientDetail() {
  const { clientId } = useParams()
  const client = getClient(clientId ?? '')
  const [showPrep, setShowPrep] = useState(false)
  const insights = useMemo(() => (client ? analyzeClient(client) : null), [client])

  if (!client || !insights) {
    return (
      <div className="py-16 text-center text-ink-secondary">
        Client not found. <Link to="/" className="underline">Back to portfolio</Link>
      </div>
    )
  }

  const { summary, rows } = insights
  const weekly = clientWeekly(client)

  const groupBy = (key: (r: CampaignRow) => string) => {
    const map = new Map<string, { label: string; spend: number; revenue: number }>()
    for (const r of rows) {
      const label = key(r)
      const entry = map.get(label) ?? { label, spend: 0, revenue: 0 }
      entry.spend += r.current.spend
      entry.revenue += r.current.revenue
      map.set(label, entry)
    }
    return [...map.values()]
  }

  return (
    <div>
      <Link to="/" className="text-xs font-medium text-ink-muted hover:text-ink">← Portfolio</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl text-ink">{client.name}</h1>
            <HealthBadge health={client.health} />
          </div>
          <p className="mt-1 text-sm text-ink-secondary">
            {client.descriptor} · {client.vertical} · Lead: {client.accountLead}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            <span className="font-medium text-ink">Objective:</span> {client.objective}
          </p>
        </div>
        <button
          onClick={() => {
            setShowPrep(true)
            setTimeout(() => document.getElementById('meeting-prep')?.scrollIntoView({ behavior: 'smooth' }), 50)
          }}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/85"
        >
          Prepare client meeting
        </button>
      </div>

      <Card className="mt-6">
        <Eyebrow>Executive performance summary</Eyebrow>
        <ul className="mt-3 space-y-1.5">
          {insights.execSummary.map((line, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-secondary">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-series-1" />
              {line}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="!p-4"><Stat label="Monthly spend" value={fmtUSD(summary.monthlySpend)} delta={summary.momSpend} /></Card>
        <Card className="!p-4"><Stat label="Revenue" value={fmtUSD(summary.monthlyRevenue)} delta={summary.momRevenue} /></Card>
        <Card className="!p-4"><Stat label="Blended ROAS" value={fmtRoas(summary.roas)} delta={summary.momRoas} /></Card>
        <Card className="!p-4"><Stat label="CTR" value={fmtPct(summary.ctr, 2)} delta={summary.momCtr} /></Card>
        <Card className="!p-4"><Stat label="Conv. rate" value={fmtPct(summary.cvr, 1)} /></Card>
        <Card className="!p-4"><Stat label="Pacing vs plan" value={fmtPct(summary.pacingVsPlan, 0)} /></Card>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Card>
          <Eyebrow>Spend vs plan, weekly</Eyebrow>
          <div className="mt-3"><SpendVsPlan weekly={weekly} weeklyPlan={client.monthlyPlan / WEEKS_PER_MONTH} /></div>
        </Card>
        <Card>
          <Eyebrow>ROAS trend</Eyebrow>
          <div className="mt-3"><RoasTrend weekly={weekly} target={client.roasTarget} /></div>
        </Card>
        <Card>
          <Eyebrow>Revenue trend</Eyebrow>
          <div className="mt-3"><RevenueTrend weekly={weekly} /></div>
        </Card>
      </div>

      <div className="mt-8">
        <SectionTitle eyebrow="Last 4 weeks vs prior 4" title="Campaign performance" />
        <Card><CampaignTable rows={rows} blendedRoas={summary.roas} /></Card>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Breakdown title="Creative performance: spend & ROAS" rows={groupBy((r) => r.campaign.creativeType)} />
        <Breakdown title="Audience performance: spend & ROAS" rows={groupBy((r) => r.campaign.audience)} />
      </div>

      <div className="mt-8">
        <SectionTitle eyebrow="AI growth opportunities" title="What I'd do next with this account" />
        <div className="grid gap-5 lg:grid-cols-2">
          {insights.opportunities.map((o) => (
            <Card key={o.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">{o.title}</h3>
                <div className="flex shrink-0 gap-1.5">
                  <Tag tone="blue">{o.tag}</Tag>
                  {o.priority === 'High' && <Tag tone="high">High priority</Tag>}
                </div>
              </div>
              <dl className="mt-3 space-y-2.5 text-sm leading-relaxed">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">What's happening</dt>
                  <dd className="text-ink-secondary">{o.whatsHappening}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Why it matters</dt>
                  <dd className="text-ink-secondary">{o.whyItMatters}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Recommended action</dt>
                  <dd className="text-ink-secondary">{o.action}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Expected impact</dt>
                  <dd className="text-ink-secondary">{o.expectedImpact}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <Eyebrow>Seasonal opportunities</Eyebrow>
          <div className="mt-3 space-y-4">
            {insights.seasonal.map((s) => (
              <div key={s.moment}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{s.moment}</span>
                  <span className="text-[11px] text-ink-muted">{s.window}</span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">{s.insight}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <Eyebrow>Risks</Eyebrow>
          <div className="mt-3 space-y-4">
            {insights.risks.length === 0 && (
              <p className="text-sm text-ink-secondary">No material risks flagged this period.</p>
            )}
            {insights.risks.map((r) => (
              <div key={r.id}>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${r.severity === 'Serious' ? 'bg-status-critical' : 'bg-status-warning'}`} />
                  <span className="text-sm font-semibold text-ink">{r.title}</span>
                  <span className="text-[11px] text-ink-muted">{r.severity}</span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">{r.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-10">
        {showPrep ? (
          <MeetingPrepPanel client={client} insights={insights} />
        ) : (
          <Card className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Walking into a client meeting?</h3>
              <p className="mt-0.5 text-sm text-ink-secondary">
                Generate the full prep pack: summary, agenda, talking points, and a follow-up email draft.
              </p>
            </div>
            <button
              onClick={() => setShowPrep(true)}
              className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/85"
            >
              Prepare client meeting
            </button>
          </Card>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <Disclaimer />
        <span className="shrink-0 text-[11px] tabular-nums text-ink-muted">
          MoM = last 4 weeks vs prior 4 · {fmtDelta(summary.momRevenue)} revenue
        </span>
      </div>
    </div>
  )
}

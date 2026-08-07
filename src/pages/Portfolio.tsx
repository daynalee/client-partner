import { Link } from 'react-router-dom'
import { CLIENTS } from '../data/dataset'
import { clientSummary, clientWeekly } from '../lib/metrics'
import { fmtPct, fmtRoas, fmtUSD } from '../lib/format'
import { Card, Delta, Disclaimer, Eyebrow, HealthBadge } from '../components/ui'
import { Sparkline } from '../components/charts'

export default function Portfolio() {
  const totalSpend = CLIENTS.reduce((s, c) => s + clientSummary(c).monthlySpend, 0)
  const totalRevenue = CLIENTS.reduce((s, c) => s + clientSummary(c).monthlyRevenue, 0)

  return (
    <div>
      <div className="mb-8">
        <Eyebrow>Book of business — Fashion &amp; Apparel</Eyebrow>
        <h1 className="mt-1 font-serif text-3xl text-ink">Client Portfolio</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          {CLIENTS.length} enterprise advertisers · {fmtUSD(totalSpend)} monthly investment ·{' '}
          {fmtUSD(totalRevenue)} attributed revenue · {fmtRoas(totalRevenue / totalSpend)} blended ROAS.
          Select a client for the full strategic picture.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {CLIENTS.map((client) => {
          const s = clientSummary(client)
          return (
            <Link key={client.id} to={`/client/${client.id}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-[0_2px_12px_rgba(11,11,11,0.07)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg text-ink group-hover:underline">{client.name}</h2>
                    <p className="mt-0.5 text-xs text-ink-muted">{client.descriptor}</p>
                  </div>
                  <HealthBadge health={client.health} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Monthly spend</div>
                    <div className="text-sm font-semibold tabular-nums">{fmtUSD(s.monthlySpend)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Revenue</div>
                    <div className="text-sm font-semibold tabular-nums">{fmtUSD(s.monthlyRevenue)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">ROAS</div>
                    <div className="text-sm font-semibold tabular-nums">
                      {fmtRoas(s.roas)} <Delta value={s.momRoas} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">CTR</div>
                    <div className="text-sm font-semibold tabular-nums">{fmtPct(s.ctr, 2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Conv. rate</div>
                    <div className="text-sm font-semibold tabular-nums">{fmtPct(s.cvr, 1)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Revenue MoM</div>
                    <div className="text-sm font-semibold tabular-nums"><Delta value={s.momRevenue} /></div>
                  </div>
                </div>

                <div className="mt-4 border-t border-hairline pt-3">
                  <div className="flex items-end justify-between gap-4">
                    <p className="text-xs leading-snug text-ink-secondary">
                      <span className="font-medium text-ink">Objective:</span> {client.objective}
                    </p>
                    <div className="w-24 shrink-0"><Sparkline weekly={clientWeekly(client)} /></div>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="mt-8"><Disclaimer /></div>
    </div>
  )
}

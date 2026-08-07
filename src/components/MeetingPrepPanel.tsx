import { useState } from 'react'
import type { Client } from '../data/types'
import type { ClientInsights } from '../lib/insights'
import { buildFollowUpEmail, buildMeetingPrep, buildTalkingPoints } from '../lib/meeting'
import { Card, Eyebrow, SectionTitle } from './ui'

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-secondary">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-baseline" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function MeetingPrepPanel({ client, insights }: { client: Client; insights: ClientInsights }) {
  const [copied, setCopied] = useState(false)
  const prep = buildMeetingPrep(client, insights)
  const talkingPoints = buildTalkingPoints(client, insights)
  const email = buildFollowUpEmail(client, insights)

  const copyEmail = async () => {
    await navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div id="meeting-prep" className="scroll-mt-24">
      <SectionTitle eyebrow="AI-assisted workflow" title="Meeting preparation" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <Eyebrow>Executive summary</Eyebrow>
          <div className="mt-3"><List items={prep.execSummary} /></div>
          <div className="mt-5 border-t border-hairline pt-4">
            <Eyebrow>Recommended agenda</Eyebrow>
            <ol className="mt-3 space-y-1.5">
              {prep.agenda.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-secondary">
                  <span className="w-4 shrink-0 font-semibold tabular-nums text-ink-muted">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </Card>

        <Card>
          <Eyebrow>Key wins</Eyebrow>
          <div className="mt-3"><List items={prep.wins} /></div>
          <div className="mt-5 border-t border-hairline pt-4">
            <Eyebrow>Key risks</Eyebrow>
            <div className="mt-3"><List items={prep.risks} /></div>
          </div>
        </Card>

        <Card>
          <Eyebrow>Questions to ask the advertiser</Eyebrow>
          <div className="mt-3"><List items={prep.questions} /></div>
        </Card>

        <Card>
          <Eyebrow>Strategic recommendations</Eyebrow>
          <div className="mt-3 space-y-3">
            {prep.recommendations.map((r, i) => (
              <div key={i}>
                <div className="text-sm font-semibold text-ink">{r.title}</div>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">{r.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-hairline pt-4">
            <Eyebrow>Upsell / expansion opportunity</Eyebrow>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{prep.upsell}</p>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <Eyebrow>Client talking points</Eyebrow>
          <p className="mt-1 text-xs text-ink-muted">Language you could actually say in the room.</p>
          <div className="mt-3 space-y-3">
            {talkingPoints.map((p, i) => (
              <blockquote key={i} className="border-l-2 border-series-1 pl-3 text-sm italic leading-relaxed text-ink-secondary">
                “{p}”
              </blockquote>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Eyebrow>Follow-up email draft</Eyebrow>
              <p className="mt-1 text-xs text-ink-muted">Post-meeting recap, ready to edit and send.</p>
            </div>
            <button
              onClick={copyEmail}
              className="rounded-full border border-hairline bg-page px-3 py-1 text-xs font-medium text-ink-secondary hover:bg-hairline/50"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-page p-4 font-sans text-[13px] leading-relaxed text-ink-secondary">
            {email}
          </pre>
        </Card>
      </div>
    </div>
  )
}

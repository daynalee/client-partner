import { Card, Eyebrow } from '../components/ui'

export default function About() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <Eyebrow>Portfolio project</Eyebrow>
        <h1 className="mt-1 font-serif text-3xl text-ink">About Client Partner Copilot</h1>
      </div>

      <Card>
        <p className="text-sm leading-relaxed text-ink-secondary">
          Client Partner Copilot is a portfolio prototype exploring how AI could help digital
          advertising Client Partners turn campaign performance data into strategic
          recommendations, client-ready insights, meeting preparation, and growth opportunities.
          All advertiser names and performance data are fictional and used for demonstration
          purposes only.
        </p>
      </Card>

      <Card className="mt-5">
        <Eyebrow>Why I built this</Eyebrow>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Client Partners spend a large share of their week doing manual account analysis:
          pulling reports, hunting for the story in the numbers, and reformatting it for
          meetings. The strategic thinking — what to do about the numbers, and how to say it to
          a client — is where a Client Partner actually earns their seat at the table.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          This prototype explores what happens when the analysis layer is automated: every
          recommendation, talking point, and email in this tool is derived from the underlying
          campaign data by explicit rules — the same signals an experienced Client Partner scans
          for (an underfunded winner, a fatigued creative, a saturated retargeting pool, a
          suspicious conversion rate). AI that handles that first pass frees the human for the
          part machines can't do: the client conversation.
        </p>
      </Card>

      <Card className="mt-5">
        <Eyebrow>What the recommendations are built on</Eyebrow>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-ink-secondary">
          <li>• Budget efficiency: campaigns beating the account blend on limited spend share get flagged for reallocation.</li>
          <li>• Creative health: sustained CTR decline at stable spend is treated as fatigue, not audience failure.</li>
          <li>• Funnel structure: saturated retargeting triggers upper-funnel expansion, not more retargeting budget.</li>
          <li>• Measurement first: strong clicks with weak conversions triggers a tracking audit before any media change.</li>
          <li>• Incrementality: prospecting is judged on new-customer growth and holdout tests, not last-click ROAS.</li>
          <li>• Seasonality: recommendations assume shoppers plan 2–3 months ahead of the purchase moment.</li>
        </ul>
      </Card>

      <Card className="mt-5">
        <Eyebrow>Disclaimer</Eyebrow>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Every advertiser, campaign, metric, and trend in this application is synthetic,
          generated deterministically to model realistic performance patterns in the fashion
          and apparel vertical. No real company data is used or implied. This is an independent
          portfolio project and is not affiliated with or endorsed by any advertising platform.
        </p>
      </Card>
    </div>
  )
}

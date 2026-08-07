import type { ReactNode } from 'react'
import type { Health } from '../data/types'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-hairline bg-surface p-6 ${className}`}>
      {children}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
      {children}
    </div>
  )
}

export function SectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-1 font-serif text-xl text-ink">{title}</h2>
      </div>
      {right}
    </div>
  )
}

const HEALTH_STYLES: Record<Health, { dot: string; text: string; label: string }> = {
  Healthy: { dot: 'bg-status-good', text: 'text-status-good-text', label: 'Healthy' },
  Watch: { dot: 'bg-status-warning', text: 'text-[#7a5800]', label: 'Watch' },
  'At Risk': { dot: 'bg-status-critical', text: 'text-[#a02c2c]', label: 'At risk' },
}

export function HealthBadge({ health }: { health: Health }) {
  const s = HEALTH_STYLES[health]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export function Delta({ value, goodIsUp = true }: { value: number; goodIsUp?: boolean }) {
  const up = value >= 0
  const good = up === goodIsUp
  const color = Math.abs(value) < 0.005 ? 'text-ink-muted' : good ? 'text-status-good-text' : 'text-[#a02c2c]'
  return (
    <span className={`text-xs font-medium tabular-nums ${color}`}>
      {up ? '▲' : '▼'} {Math.abs(value * 100).toFixed(0)}%
    </span>
  )
}

export function Stat({ label, value, delta, goodIsUp }: { label: string; value: string; delta?: number; goodIsUp?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-ink">{value}</span>
        {delta !== undefined && <Delta value={delta} goodIsUp={goodIsUp} />}
      </div>
    </div>
  )
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'blue' | 'high' }) {
  const styles = {
    neutral: 'bg-page text-ink-secondary border-hairline',
    blue: 'bg-[#eaf2fc] text-[#1c5cab] border-[#cde2fb]',
    high: 'bg-[#fdf0ec] text-[#a02c2c] border-[#f5d9d0]',
  }
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${styles[tone]}`}>
      {children}
    </span>
  )
}

export function Disclaimer() {
  return (
    <p className="text-xs leading-relaxed text-ink-muted">
      All advertiser names, campaigns, and performance data in this tool are fictional and
      generated for demonstration purposes only. No real company data is used.
    </p>
  )
}

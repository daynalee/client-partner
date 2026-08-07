export function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 10_000) return `$${Math.round(n / 1000)}K`
  if (Math.abs(n) >= 1_000) return `$${(n / 1000).toFixed(1)}K`
  return `$${Math.round(n)}`
}

export function fmtNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1000)}K`
  return `${Math.round(n)}`
}

export function fmtPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`
}

export function fmtDelta(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${(n * 100).toFixed(0)}%`
}

export function fmtRoas(n: number): string {
  return `${n.toFixed(1)}x`
}

export function fmtWeek(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

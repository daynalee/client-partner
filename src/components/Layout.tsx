import { NavLink, Outlet } from 'react-router-dom'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-ink text-white' : 'text-ink-secondary hover:bg-hairline/60'
  }`

export default function Layout() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-hairline bg-[#0b0b0b] px-4 py-1.5 text-center text-[11px] tracking-wide text-white/80">
        Portfolio prototype — all advertiser names and performance data are fictional (synthetic demo data)
      </div>
      <header className="sticky top-0 z-10 border-b border-hairline bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <NavLink to="/" className="flex items-baseline gap-2.5">
            <span className="font-serif text-xl tracking-tight text-ink">Client Partner Copilot</span>
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted sm:inline">
              Fashion &amp; Apparel
            </span>
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>Portfolio</NavLink>
            <NavLink to="/agent" className={navClass}>Performance Pulse</NavLink>
            <NavLink to="/experiments" className={navClass}>Experiment Planner</NavLink>
            <NavLink to="/about" className={navClass}>About</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-ink-muted">
          Client Partner Copilot — a portfolio prototype exploring AI-assisted advertiser strategy.
          Fictional data only.
        </div>
      </footer>
    </div>
  )
}

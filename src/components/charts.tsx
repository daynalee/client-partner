import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { WeeklyMetrics } from '../data/types'
import { fmtUSD, fmtWeek } from '../lib/format'

const AXIS = { fontSize: 11, fill: '#898781' }
const GRID = '#e1e0d9'
const BLUE = '#2a78d6'
const BLUE_LIGHT = '#cde2fb'

const tooltipStyle = {
  backgroundColor: '#fcfcfb',
  border: '1px solid #e1e0d9',
  borderRadius: 8,
  fontSize: 12,
  color: '#0b0b0b',
}

export function RoasTrend({ weekly, target }: { weekly: WeeklyMetrics[]; target: number }) {
  const data = weekly.map((w) => ({
    week: fmtWeek(w.weekEnding),
    roas: w.spend ? +(w.revenue / w.spend).toFixed(2) : 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: '#c3c2b7' }} interval={1} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}x`} domain={[0, 'auto']} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}x`, 'ROAS']} />
        <ReferenceLine
          y={target}
          stroke="#898781"
          strokeDasharray="4 4"
          label={{ value: `target ${target.toFixed(1)}x`, position: 'insideTopRight', fontSize: 11, fill: '#898781' }}
        />
        <Line type="monotone" dataKey="roas" stroke={BLUE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function RevenueTrend({ weekly }: { weekly: WeeklyMetrics[] }) {
  const data = weekly.map((w) => ({ week: fmtWeek(w.weekEnding), revenue: w.revenue }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: '#c3c2b7' }} interval={1} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtUSD(v)} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtUSD(Number(v)), 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke={BLUE} strokeWidth={2} fill={BLUE_LIGHT} fillOpacity={0.6} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function SpendVsPlan({ weekly, weeklyPlan }: { weekly: WeeklyMetrics[]; weeklyPlan: number }) {
  const data = weekly.map((w) => ({ week: fmtWeek(w.weekEnding), spend: w.spend }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: '#c3c2b7' }} interval={1} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtUSD(v)} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtUSD(Number(v)), 'Spend']} cursor={{ fill: '#f0efec' }} />
        <ReferenceLine
          y={weeklyPlan}
          stroke="#898781"
          strokeDasharray="4 4"
          label={{ value: `plan ${fmtUSD(weeklyPlan)}/wk`, position: 'insideTopRight', fontSize: 11, fill: '#898781' }}
        />
        <Bar dataKey="spend" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Sparkline({ weekly }: { weekly: WeeklyMetrics[] }) {
  const data = weekly.map((w) => ({ revenue: w.revenue }))
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
        <Line type="monotone" dataKey="revenue" stroke={BLUE} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function BreakdownBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[#f0efec]">
      <div
        className="h-1.5 rounded-full bg-series-1"
        style={{ width: `${Math.max(3, (value / max) * 100)}%` }}
      />
    </div>
  )
}

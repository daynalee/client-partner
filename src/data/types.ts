export type Objective = 'Awareness' | 'Consideration' | 'Conversions' | 'Catalog Sales'
export type Audience = 'Prospecting' | 'Retargeting' | 'Lookalike' | 'Interest' | 'Keyword'
export type CreativeType = 'Standard Pin' | 'Video Pin' | 'Idea Pin' | 'Collections'
export type Season = 'Spring' | 'Summer' | 'Fall' | 'Holiday' | 'Evergreen'
export type Health = 'Healthy' | 'Watch' | 'At Risk'

export interface WeeklyMetrics {
  weekEnding: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

export interface Campaign {
  id: string
  name: string
  objective: Objective
  audience: Audience
  creativeType: CreativeType
  productCategory: string
  season: Season
  weekly: WeeklyMetrics[]
}

export interface Client {
  id: string
  name: string
  descriptor: string
  vertical: string
  objective: string
  monthlyPlan: number
  roasTarget: number
  health: Health
  accountLead: string
  campaigns: Campaign[]
}

export interface CampaignTotals {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  cvr: number
  roas: number
}

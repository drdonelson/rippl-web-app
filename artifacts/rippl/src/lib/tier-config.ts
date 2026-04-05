export type TierName = 'starter' | 'rippler' | 'super_rippler' | 'rippl_legend'

export interface TierDisplay {
  name: TierName
  label: string
  icon: string
  minReferrals: number
  nextTierAt: number | null
  nextTierLabel: string | null
  color: string
  bg: string
  border: string
  progressBg: string
}

export const TIER_CONFIG: TierDisplay[] = [
  { name: 'starter',       label: 'Influencer', icon: '/assets/tiers/influencer.svg', minReferrals: 0,  nextTierAt: 3,    nextTierLabel: 'Amplifier',  color: 'text-teal-400',   bg: 'bg-teal-400/10',   border: 'border-teal-400/20',   progressBg: 'bg-teal-400/60'   },
  { name: 'rippler',       label: 'Amplifier',  icon: '/assets/tiers/amplifier.svg',  minReferrals: 3,  nextTierAt: 6,    nextTierLabel: 'Ambassador', color: 'text-sky-500',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20',    progressBg: 'bg-sky-500/60'    },
  { name: 'super_rippler', label: 'Ambassador', icon: '/assets/tiers/ambassador.svg', minReferrals: 6,  nextTierAt: 10,   nextTierLabel: 'Legend',     color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20',  progressBg: 'bg-amber-400/60'  },
  { name: 'rippl_legend',  label: 'Legend',     icon: '/assets/tiers/legend.svg',     minReferrals: 10, nextTierAt: null, nextTierLabel: null,          color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', progressBg: 'bg-purple-400/60' },
]

export function getTierConfig(tierName: string | null | undefined): TierDisplay {
  return TIER_CONFIG.find(t => t.name === tierName) ?? TIER_CONFIG[0]
}

export function getProgressMessage(tierName: string | null | undefined, totalReferrals: number): string {
  const config = getTierConfig(tierName)
  if (!config.nextTierAt) return `You've reached Legend status!`
  const remaining = config.nextTierAt - totalReferrals
  return `${remaining} more referral${remaining !== 1 ? 's' : ''} to unlock ${config.nextTierLabel} status`
}

export function getTierTooltip(tierName: string | null | undefined, totalReferrals: number): string {
  const config = getTierConfig(tierName)
  if (!config.nextTierAt) {
    return `${totalReferrals} referral${totalReferrals !== 1 ? 's' : ''} — Legend (max tier)`
  }
  const remaining = config.nextTierAt - totalReferrals
  return `${totalReferrals} referral${totalReferrals !== 1 ? 's' : ''} — ${remaining} more to unlock ${config.nextTierLabel}`
}

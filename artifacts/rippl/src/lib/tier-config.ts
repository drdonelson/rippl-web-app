export type TierName = 'starter' | 'rippler' | 'super_rippler' | 'rippl_legend'

export interface TierDisplay {
  name: TierName
  label: string
  emoji: string
  minReferrals: number
  nextTierAt: number | null
  nextTierLabel: string | null
  color: string
  bg: string
  border: string
  progressBg: string
}

export const TIER_CONFIG: TierDisplay[] = [
  { name: 'starter',       label: 'First Rippl',  emoji: '🌱', minReferrals: 0,  nextTierAt: 3,    nextTierLabel: 'Rippler',       color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20',  progressBg: 'bg-green-400/60'  },
  { name: 'rippler',       label: 'Rippler',       emoji: '🌊', minReferrals: 3,  nextTierAt: 6,    nextTierLabel: 'Super Rippler', color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20',   progressBg: 'bg-blue-400/60'   },
  { name: 'super_rippler', label: 'Super Rippler', emoji: '⚡', minReferrals: 6,  nextTierAt: 10,   nextTierLabel: 'Rippl Legend',  color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', progressBg: 'bg-yellow-400/60' },
  { name: 'rippl_legend',  label: 'Rippl Legend',  emoji: '🏆', minReferrals: 10, nextTierAt: null, nextTierLabel: null,            color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20',  progressBg: 'bg-amber-400/60'  },
]

export function getTierConfig(tierName: string | null | undefined): TierDisplay {
  return TIER_CONFIG.find(t => t.name === tierName) ?? TIER_CONFIG[0]
}

export function getProgressMessage(tierName: string | null | undefined, totalReferrals: number): string {
  const config = getTierConfig(tierName)
  if (!config.nextTierAt) return `You've reached the highest tier! 🏆`
  const remaining = config.nextTierAt - totalReferrals
  const nextEmoji = TIER_CONFIG.find(t => t.label === config.nextTierLabel)?.emoji ?? ''
  return `${remaining} more referral${remaining !== 1 ? 's' : ''} to unlock ${config.nextTierLabel} ${nextEmoji}`
}

export function getTierTooltip(tierName: string | null | undefined, totalReferrals: number): string {
  const config = getTierConfig(tierName)
  if (!config.nextTierAt) {
    return `${totalReferrals} referral${totalReferrals !== 1 ? 's' : ''} — Rippl Legend (max tier) 🏆`
  }
  const remaining = config.nextTierAt - totalReferrals
  return `${totalReferrals} referral${totalReferrals !== 1 ? 's' : ''} — ${remaining} more to unlock ${config.nextTierLabel}`
}

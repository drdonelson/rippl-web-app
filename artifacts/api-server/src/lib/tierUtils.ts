export type TierName = 'starter' | 'rippler' | 'super_rippler' | 'rippl_legend'

export interface Tier {
  name: TierName
  label: string
  emoji: string
  minReferrals: number
  rewardValue: number
  nextTierAt: number | null
  nextTierLabel: string | null
}

export const TIERS: Tier[] = [
  { name: 'starter',       label: 'First Rippl',   emoji: '🌱', minReferrals: 0,  rewardValue: 35,  nextTierAt: 3,    nextTierLabel: 'Rippler'       },
  { name: 'rippler',       label: 'Rippler',        emoji: '🌊', minReferrals: 3,  rewardValue: 50,  nextTierAt: 6,    nextTierLabel: 'Super Rippler' },
  { name: 'super_rippler', label: 'Super Rippler',  emoji: '⚡', minReferrals: 6,  rewardValue: 75,  nextTierAt: 10,   nextTierLabel: 'Rippl Legend'  },
  { name: 'rippl_legend',  label: 'Rippl Legend',   emoji: '🏆', minReferrals: 10, rewardValue: 100, nextTierAt: null, nextTierLabel: null            },
]

export function calculateTier(totalReferrals: number): Tier {
  return [...TIERS].reverse().find(t => totalReferrals >= t.minReferrals) ?? TIERS[0]
}

export function getProgressMessage(totalReferrals: number): string {
  const tier = calculateTier(totalReferrals)
  if (!tier.nextTierAt) return "You've reached Rippl Legend status! 🏆"
  const remaining = tier.nextTierAt - totalReferrals
  return `${remaining} more referral${remaining === 1 ? '' : 's'} to unlock ${tier.nextTierLabel} ${TIERS.find(t => t.label === tier.nextTierLabel)?.emoji}`
}

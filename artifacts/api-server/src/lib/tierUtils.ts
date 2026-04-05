export type TierName = 'starter' | 'rippler' | 'super_rippler' | 'rippl_legend'

export interface Tier {
  name: TierName
  label: string
  minReferrals: number
  rewardValue: number
  nextTierAt: number | null
  nextTierLabel: string | null
}

export const TIERS: Tier[] = [
  { name: 'starter',       label: 'Influencer',  minReferrals: 0,  rewardValue: 35,  nextTierAt: 3,    nextTierLabel: 'Amplifier'  },
  { name: 'rippler',       label: 'Amplifier',   minReferrals: 3,  rewardValue: 50,  nextTierAt: 6,    nextTierLabel: 'Ambassador' },
  { name: 'super_rippler', label: 'Ambassador',  minReferrals: 6,  rewardValue: 75,  nextTierAt: 10,   nextTierLabel: 'Legend'     },
  { name: 'rippl_legend',  label: 'Legend',      minReferrals: 10, rewardValue: 100, nextTierAt: null, nextTierLabel: null         },
]

export function calculateTier(totalReferrals: number): Tier {
  return [...TIERS].reverse().find(t => totalReferrals >= t.minReferrals) ?? TIERS[0]
}

export function getProgressMessage(totalReferrals: number): string {
  const tier = calculateTier(totalReferrals)
  if (!tier.nextTierAt) return 'You are now a Legend!'
  const remaining = tier.nextTierAt - totalReferrals
  return `${remaining} more referral${remaining === 1 ? '' : 's'} to unlock ${tier.nextTierLabel} status`
}

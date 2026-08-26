export type TierName = 'starter' | 'rippler' | 'super_rippler' | 'rippl_legend'

export interface Tier {
  name: TierName
  label: string
  minReferrals: number
  rewardValue: number
  nextTierAt: number | null
  nextTierLabel: string | null
}

/** Per-practice reward overrides — all optional; falls back to platform defaults. */
export interface PracticeRewards {
  tier_reward_starter?:       number | null
  tier_reward_rippler?:       number | null
  tier_reward_super_rippler?: number | null
  tier_reward_legend?:        number | null
}

export const TIERS: Tier[] = [
  { name: 'starter',       label: 'Influencer',  minReferrals: 0,  rewardValue: 35,  nextTierAt: 3,    nextTierLabel: 'Amplifier'  },
  { name: 'rippler',       label: 'Amplifier',   minReferrals: 3,  rewardValue: 50,  nextTierAt: 6,    nextTierLabel: 'Ambassador' },
  { name: 'super_rippler', label: 'Ambassador',  minReferrals: 6,  rewardValue: 75,  nextTierAt: 10,   nextTierLabel: 'Legend'     },
  { name: 'rippl_legend',  label: 'Legend',      minReferrals: 10, rewardValue: 100, nextTierAt: null, nextTierLabel: null         },
]

export function calculateTier(totalReferrals: number, practiceRewards?: PracticeRewards | null): Tier {
  const tiers: Tier[] = [
    { ...TIERS[0], rewardValue: practiceRewards?.tier_reward_starter       ?? TIERS[0].rewardValue },
    { ...TIERS[1], rewardValue: practiceRewards?.tier_reward_rippler       ?? TIERS[1].rewardValue },
    { ...TIERS[2], rewardValue: practiceRewards?.tier_reward_super_rippler ?? TIERS[2].rewardValue },
    { ...TIERS[3], rewardValue: practiceRewards?.tier_reward_legend        ?? TIERS[3].rewardValue },
  ]
  return [...tiers].reverse().find(t => totalReferrals >= t.minReferrals) ?? tiers[0]
}

export function getProgressMessage(totalReferrals: number, practiceRewards?: PracticeRewards | null): string {
  const tier = calculateTier(totalReferrals, practiceRewards)
  if (!tier.nextTierAt) return 'You are now a Legend!'
  const remaining = tier.nextTierAt - totalReferrals
  return `${remaining} more referral${remaining === 1 ? '' : 's'} to unlock ${tier.nextTierLabel} status`
}

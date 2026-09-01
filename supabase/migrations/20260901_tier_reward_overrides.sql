-- Per-practice tier reward overrides
-- Null means "use platform defaults" (35/50/75/100)
ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS tier_reward_starter       integer,
  ADD COLUMN IF NOT EXISTS tier_reward_rippler       integer,
  ADD COLUMN IF NOT EXISTS tier_reward_super_rippler integer,
  ADD COLUMN IF NOT EXISTS tier_reward_legend        integer;

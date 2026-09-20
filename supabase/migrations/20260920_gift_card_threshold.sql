ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS gift_card_balance_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gift_card_threshold_cents integer NOT NULL DEFAULT 10000;

COMMENT ON COLUMN practices.gift_card_balance_cents IS 'Running total of Tango gift card cost not yet charged to practice card (cents)';
COMMENT ON COLUMN practices.gift_card_threshold_cents IS 'Auto-charge fires when gift_card_balance_cents reaches this amount (default $100)';

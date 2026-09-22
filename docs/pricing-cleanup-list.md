# Pricing Cleanup — Files to Update on Approval

> **Status: PENDING APPROVAL** — Do not change any of these until David approves the new list pricing.
> Approved pricing: $45/ref (list), Growth $149/location/month + $25/ref, Setup $499.

---

## Inconsistencies Found

Three different prices exist across the codebase today:
- `$20/ref` — appears in practices.tsx and code defaults
- `$55/ref` — appears in pricing.tsx
- `$35/ref` — used as a soft default in some route logic

None of these match the proposed $45/ref list price.

---

## Files Requiring Changes

### 1. `artifacts/rippl/src/pages/pricing.tsx`
- **Current:** `$55` per referral displayed on public pricing page
- **Change to:** `$45` per referral
- **Line(s):** Grep for `55` in this file — likely the hero price display

### 2. `artifacts/rippl/src/pages/practices.tsx` (or similar admin page)
- **Current:** `$20` default reward or per-referral rate shown
- **Change to:** `$45` or remove hardcoded default — pull from practice config
- **Line(s):** Grep for `20` near pricing/reward context

### 3. `artifacts/api-server/src/routes/referrers.ts` — CSV import endpoint
- **Current:** Uses `reward_value_cents` from practice record; no hardcoded price
- **Action:** Verify no hardcoded default sneaked in during CSV import build

### 4. `artifacts/api-server/src/routes/referrals.ts`
- **Current:** Check for any hardcoded per-referral pricing defaults
- **Action:** Grep for `2000`, `3500`, `4500`, `5500` (cents) — remove if hardcoded

### 5. `artifacts/rippl/src/components/` — any pricing display components
- **Action:** `grep -r "55\|per referral\|\$20\|\$35" artifacts/rippl/src/components/`
- **Change:** Update any display strings to $45

### 6. `pitch/` directory — any pitch decks or materials
- **Action:** `grep -rl "\$20\|\$35\|\$55" pitch/` — update all to $45

### 7. `training/` directory
- **Action:** Check training materials for pricing references
- **Action:** `grep -rl "\$20\|\$35\|\$55" training/`

---

## New Pages to Create (after approval)

### `/deo` route
- New page in `artifacts/rippl/src/pages/deo.tsx`
- Content: pulled from `deo-value-prop.md`
- CTA: links to onboarding or mailto:david@joinrippl.com

### Pricing page consolidation
- Remove `$55` vs `$20` confusion
- Single canonical price: `$45/referral`
- Add Growth plan section: `$149/location/month + $25/ref`
- Add setup fee: `$499 (waivable)`

---

## DEO-Specific Pages (after approval)

- Add `/deo` route to React Router in `artifacts/rippl/src/App.tsx`
- Add `deo.tsx` page component
- No auth required (public marketing page)

---

## Grep Commands for Full Audit

```bash
# Find all price references in frontend
grep -rn "\$20\|\$35\|\$55\|per referral\|per_referral" artifacts/rippl/src/

# Find hardcoded cent values that might be pricing
grep -rn "2000\|3500\|4500\|5500" artifacts/api-server/src/routes/

# Find pricing references in pitch/training materials
grep -rl "20\|35\|55" pitch/ training/ docs/
```

---

_Created: 2026-09-22 · Pending approval from David_

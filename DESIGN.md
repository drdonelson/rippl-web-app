# Design System — Rippl

## Product Context
- **What this is:** A dental patient referral rewards platform — admin dashboard for dental practice staff + patient-facing pages for claiming rewards
- **Who it's for:** Two audiences — dental practice owners/staff (admin), and referring patients (public pages)
- **Space/industry:** Dental SaaS + referral marketing + rewards/gift cards
- **Project type:** B2B admin dashboard (staff-facing) + consumer reward flow (patient-facing)

---

## Aesthetic Direction

- **Direction:** Bold Celebration — quiet, data-forward admin; full-bleed celebratory patient pages
- **Decoration level:** Minimal on admin. Expressive on patient-facing pages.
- **Mood:** The dental practice feels "this was built for exactly my pain point." The patient feels "I actually won something." Two audiences, two emotional registers, one coherent brand.
- **Logo treatment:** `rip` in dark ink, `pl` in primary orange `#E0622A` — the brand's signature detail. Applied consistently across all surfaces (dark and light).
- **Research:** Category converges on white + teal/blue + Inter. No competitor designs for patient delight. Rippl's growth engine is patient excitement — the design reflects that.

---

## Typography

Load via Google Fonts and Fontshare:
```html
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,300&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Geist+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
```

| Role | Font | Weight | Use |
|------|------|--------|-----|
| Display | Fraunces | 700 | Patient reward amount, success states, milestone headlines |
| Display italic | Fraunces italic | 300 | Secondary patient page headings (e.g. "You've earned it") |
| Body / UI | DM Sans | 400/500/600 | All admin UI, labels, body text, nav, buttons |
| Data / Numbers | Geist Mono | 400/500 | Referral counts, dollar amounts in tables, timestamps |

**Font scale (admin):**
- `text-xs`: 11px — labels, timestamps, status badges
- `text-sm`: 13px — table rows, secondary info
- `text-base`: 15px — body, card content
- `text-lg`: 18px — card titles, section headers
- `text-xl`: 22px — page titles
- `text-2xl`: 28px — stat numbers (Geist Mono)

**Patient page scale:**
- Reward amount: Fraunces 700, 96–120px
- Greeting: DM Sans 500, 18–20px
- Sub-label: DM Sans 400, 16px
- CTA button: DM Sans 700, 15px

**Never use:** Inter, Roboto, Poppins, Space Grotesk, system-ui as primary. These are blacklisted.

---

## Color

**Approach:** Expressive on patient pages. Restrained on admin (one accent, neutral palette).

### Primary Brand
| Token | Hex | Use |
|-------|-----|-----|
| `--color-brand` | `#E0622A` | Logo "pl", primary admin accent, focus rings |
| `--color-brand-light` | `#F5A623` | Gradient start (claim page), amber badge backgrounds |
| `--color-brand-dark` | `#E8842A` | Gradient end (claim page), hover states |

### Admin Palette
| Token | Hex | Use |
|-------|-----|-----|
| `--color-bg` | `#ffffff` | Page background |
| `--color-surface` | `#fafafa` | Card backgrounds |
| `--color-border` | `#ebebeb` | Card borders, dividers |
| `--color-border-strong` | `#d4d4d4` | Table borders, active dividers |
| `--color-text-primary` | `#111111` | Headings, primary content |
| `--color-text-secondary` | `#666666` | Labels, secondary info |
| `--color-text-muted` | `#aaaaaa` | Timestamps, tertiary |

### Semantic
| Token | Hex | Use |
|-------|-----|-----|
| `--color-success` | `#10B981` | Completed referral dots, claimed badges |
| `--color-pending` | `#F5A623` | Pending referral dots |
| `--color-error` | `#EF4444` | Error states |
| `--color-warning` | `#F59E0B` | Warning banners |

### Patient Claim Page
| Token | Hex | Use |
|-------|-----|-----|
| Gradient start | `#F5A623` | Full-bleed background top |
| Gradient end | `#E8842A` | Full-bleed background bottom |
| Text on gradient | `#ffffff` | All text on claim page |
| CTA button bg | `#ffffff` | "Claim Your Reward" button |
| CTA button text | `#E8842A` | Button label on claim page |

CSS:
```css
.claim-page-bg {
  background: linear-gradient(145deg, #F5A623 0%, #E8842A 100%);
}
```

---

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable on admin. Generous on patient pages (breathing room = gift-like feel).

| Token | Value | Use |
|-------|-------|-----|
| `space-1` | 4px | Tight gaps, icon margins |
| `space-2` | 8px | Input padding (vertical), icon+label |
| `space-3` | 12px | Table row padding |
| `space-4` | 16px | Card padding (compact), form field gaps |
| `space-5` | 20px | Card padding (standard) |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Large section padding |
| `space-10` | 40px | Page section gaps |
| `space-12` | 48px | Patient page generous padding |

---

## Layout

| Context | Approach |
|---------|----------|
| Admin dashboard | 12-column grid, sidebar nav, max-width 1440px |
| Admin pages | Content area max-width 960px |
| Patient claim page | Centered single-column, max-width 480px, full-bleed background |
| Patient refer page | Centered, max-width 640px |

**Border radius scale:**
- `rounded-sm`: 4px — badges, inline pills
- `rounded`: 6px — small buttons, form inputs
- `rounded-md`: 8px — event cards (admin)
- `rounded-lg`: 12px — stat cards
- `rounded-xl`: 16px — primary cards, modals
- `rounded-2xl`: 20px — larger surfaces
- `rounded-full`: 9999px — avatar, status dots

---

## Motion

| Context | Approach |
|---------|----------|
| Admin | Minimal-functional — subtle fade-in on data load, no attention-seeking animation |
| Patient claim page | Expressive — count-up animation on reward amount reveal, confetti burst on successful claim |
| Patient refer page | Intentional — smooth share action feedback |

**Easing:**
- Enter: `ease-out` (elements arriving)
- Exit: `ease-in` (elements leaving)
- Move: `ease-in-out` (repositioning)

**Durations:**
- Micro: 80ms — icon swap, badge update
- Short: 180ms — hover transitions, tab switch
- Medium: 300ms — modal open, page element entrance
- Long: 500ms — count-up animation, confetti trigger
- Confetti: 700–1200ms — patient claim success moment

**Admin transitions:**
```css
transition: background-color 180ms ease-out, border-color 180ms ease-out, opacity 180ms ease-out;
```

**Patient count-up (reward reveal):**
Animate from 0 to reward amount over 600ms with `ease-out`. Start on page mount, not on button click. Reward is revealed immediately; claim is the confirmation.

---

## Component Conventions

### Logo
```
rip<span style="color: #E0622A">pl</span>
```
- Font: DM Sans 700 or Cabinet Grotesk 700
- The orange "pl" applies on all backgrounds (white admin, dark surfaces, orange claim page — use white for the whole wordmark on the gradient, with `rip` at 70% opacity white and `pl` at 100% white)

### Admin Event Row
- Left: green dot (completed) or amber dot (pending) — `8px` circle
- Patient name → referrer name in DM Sans 500
- Right: amount in Geist Mono, date in DM Sans 400 muted
- Border-bottom `#ebebeb` only (no card wrapper per row)

### Stat Cards
- Stat number: Geist Mono 600, 36–40px, `#111111`
- Stat label: DM Sans 400, 12px, `#aaaaaa`
- Card: white bg, `#ebebeb` border, `rounded-xl`, comfortable padding

### Patient CTA Button
```css
.claim-btn {
  background: #ffffff;
  color: #E8842A;
  font-family: 'DM Sans', sans-serif;
  font-weight: 700;
  font-size: 15px;
  padding: 16px 48px;
  border-radius: 9999px;
  border: none;
}
```

### Confetti (claim success)
Trigger on successful claim API response. Use `canvas-confetti` or equivalent. Colors: `['#F5A623', '#E8842A', '#ffffff', '#FCD34D']`. 200 particles, spread 80, gravity 0.8.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-06 | Base direction: Bold Celebration | Research showed every dental/referral/rewards product uses white+teal+Inter. Patient delight is untapped. |
| 2026-05-06 | Logo "pl" in orange | Warm Indie direction's signature detail — creates brand recognition without requiring a graphic logo |
| 2026-05-06 | Fraunces for display, DM Sans for UI | Fraunces only on patient reward moments (high contrast with DM Sans on admin). No one in the category uses a serif. |
| 2026-05-06 | Ditch teal entirely | Teal = healthcare/clinical. Orange = reward/value. Rippl is a rewards product, not a medical tool. |
| 2026-05-06 | Full-bleed gradient claim page | Every referral platform treats the claim page as an afterthought. Rippl's growth depends on patient delight. Make it feel like receiving a gift. |
| 2026-05-06 | Confetti + count-up on claim | The 3-second "wow" moment that makes patients tell other patients. |

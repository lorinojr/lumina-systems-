# Design

## Register

product

## Color

OKLCH everywhere. Hex literals are not allowed in components — every color flows from a token.

### Strategy

**Restrained**: tinted warm neutrals + one warm accent that holds ≤10% of any surface. The accent earns its place on primary actions (M-Pesa CTA, active sidebar tab, focus ring) — never on decorative chrome, never on whole backgrounds, never on body text.

### Rationale

The product name **Vela** — sail / candle — pulls toward water and sky. A deep, slightly desaturated blue carries that without falling into the iOS-cobalt SaaS reflex: the accent sits at hue 245 (not the 250–260 violet-leaning blue that ships with every Tailwind starter), at a lightness deep enough (`0.52`) to read as authoritative rather than playful. Neutrals are tinted toward the same hue so white is never raw — the surface feels of-a-piece with the accent, not a separate decision. Strict single-accent discipline keeps this from sliding into "blue dashboard."

### Tokens

| Token             | Value                       | Use                                                     |
|-------------------|-----------------------------|---------------------------------------------------------|
| `--color-canvas`  | `oklch(0.985 0.006 240)`    | Page background; never `#fff`                           |
| `--color-surface` | `oklch(0.965 0.010 240)`    | Cards, inputs, sticky headers                           |
| `--color-ink`     | `oklch(0.22 0.020 245)`     | Body text, numbers, dark CTAs                           |
| `--color-muted`   | `oklch(0.52 0.018 245)`     | Labels, secondary text, icon defaults                   |
| `--color-accent`  | `oklch(0.52 0.15 245)`      | Primary CTA, active state, focus ring (deep sea blue)   |
| `--color-success` | `oklch(0.60 0.14 155)`      | Sale confirmations, change due                          |
| `--color-danger`  | `oklch(0.58 0.20 27)`       | Destructive actions, out-of-stock                       |
| `--color-warning` | `oklch(0.74 0.15 75)`       | Low stock, offline pending                              |

All neutrals tinted toward hue 240–245 (cool) so white is never raw and supporting chrome shares the accent's family. Accent at hue 245 — saturated and deep enough to feel maritime, not the violet-tinged 250–260 of generic iOS blue.

### Contrast pairings (verified to meet WCAG AA)

| Foreground   | Background   | Ratio  | Pass     |
|--------------|--------------|--------|----------|
| ink          | canvas       | ~16:1  | AAA body |
| ink          | surface      | ~15:1  | AAA body |
| muted        | canvas       | ~5.3:1 | AA body  |
| accent       | canvas       | ~4.6:1 | AA body / AA UI |
| white        | accent       | ~4.2:1 | AA large / AA UI |
| white        | ink          | ~15:1  | AAA body |
| success      | canvas       | ~4.5:1 | AA body  |
| danger       | canvas       | ~4.8:1 | AA body  |

Cheap shop screens in bright fluorescent light need extra headroom — that's why ink lands at lightness 0.22 (deep, not jet) and canvas at 0.985 (off-white, not raw). The pair stays comfortable under washed-out viewing conditions.

## Typography

`Inter` for everything, `JetBrains Mono` for barcodes and the system clock. No third typeface.

### Scale

Tight, deliberate steps. Hierarchy comes from weight contrast more than size jumps.

| Role            | Size  | Weight | Notes                                       |
|-----------------|-------|--------|---------------------------------------------|
| Hero number     | 48px  | 800    | POS total. `.num` required.                 |
| Section number  | 32px  | 800    | End-of-shift revenue, reports headline      |
| Value           | 20px  | 800    | Card totals, method splits. `.num` required |
| Body            | 13px  | 500    | Default                                     |
| Cell value      | 13px  | 700–800 | Cart row prices, table cells. `.num` required |
| Label           | 10px  | 800    | Uppercase, tracking-widest. Section eyebrows |
| Kbd / barcode   | 10–11px | 500–700 | JetBrains Mono                            |

### Numerals are the UI

Every numeric display gets `font-variant-numeric: tabular-nums` (via the `.num` utility). This is non-negotiable: a cashier and an owner both need to scan columns of numbers and trust them. Proportional digits make 1.00 look narrower than 8.88 and break that trust.

Hero numbers (POS total, end-of-shift revenue) land at ≥1.6× the next-largest number on the same surface — a clear primary, not a flat dashboard.

## Elevation

Mostly flat. Depth is for guiding the eye to the next action, not for ornament.

- `subtle-shadow`: `0 2px 12px rgba(0,0,0,0.04)` — used for floating elements (toasts, suggestion dropdowns).
- Modals: `shadow-xl` + 1px hairline border. No blur.
- Cards: no shadow by default. A 1px `border-black/[0.06]` hairline is enough.

**Glassmorphism is not a default.** `backdrop-blur` is reserved for the dark scrim behind modals if at all — never on the modal panel itself, never on cards, never on chrome.

## Touch targets

44px minimum for any control a finger may touch on a tablet. Hard rule.

- Primary buttons: `≥48px` height.
- Icon buttons in the main flow (cart qty, remove): `44×44px`.
- Sidebar tabs: `44px` tap area.
- Close-icons inside modals: 28px is acceptable only because the modal scrim is also a tap target — the user can dismiss by tapping outside.
- Buttons must be **always visible**, not hover-only. Hover-reveal in a touchscreen context is a bug.

## Components

### Button

- Primary: solid `accent` background, white text, `font-black uppercase tracking-wider`, `shadow-md shadow-accent/25`. Disabled drops to `opacity-30 shadow-none`.
- Dark CTA (final confirm, "Nova venda"): solid `ink` background, white text. Same weight treatment.
- Secondary: 1px `border-black/[0.08]`, transparent background, `font-bold uppercase tracking-wider text-muted`. Hover deepens the border and adds `bg-black/[0.04]`.
- Success-finalize (cash complete, M-Pesa confirm): solid `success` background, white text. Same shape as primary.

### Field input

`field-input` utility: `bg-surface` + 1px hairline, `rounded-lg`, `text-sm font-medium`. Focus moves the border to `accent` and adds `ring-1 ring-accent/20`. No floating labels.

### Card

Default: `bg-canvas` + 1px hairline + `rounded-xl`. **No nested cards.** If a card needs internal grouping, use spacing or a hairline divider — not another card.

### Modal shell

Fixed scrim at `bg-black/50` (no blur). Panel: `bg-canvas`, `rounded-xl`, `shadow-xl`, hairline. Entry: framer-motion fade + `y: 10 → 0`, 120ms `easeOut`. No bounce.

### Number cell

The `.num` utility (added in `src/index.css`) applies tabular numerals and the `tnum` font feature. Use it on every numeric `<td>`, `<span>`, or display — not just hero totals.

## Motion

- `framer-motion` for entrance/exit on modals and toasts.
- Exponential ease-out only: `[0.22, 1, 0.36, 1]` (ease-out-quart) for everything ≥200ms. Short transitions can use `'easeOut'`.
- No bounce, no elastic, no spring overshoot.
- Animate `opacity` and `transform` only. Never animate layout properties (`width`, `height`, `padding`, `top`).
- Hover transitions: 100–150ms, `transition-colors` only.

## Banned patterns (enforced)

- `#000`, `#fff`, or any raw hex outside of `src/index.css`.
- `background-clip: text` with a gradient (gradient text).
- `border-left` / `border-right` `>1px` as decorative accents.
- `backdrop-blur-*` on any surface other than a modal scrim.
- Hero-metric template: big number + small label + icon + supporting stat, repeated four-up.
- Identical card grids: same-sized icon-and-label cards repeated as the primary layout.
- Hover-only controls in primary touchscreen flows.

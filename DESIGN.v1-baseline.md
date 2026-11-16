---
name: Son Tra ReLoop
description: Sustainable eco-tourism, GPS/QR trail checkpoint, and conservation stewardship platform for the Sơn Trà Peninsula.
colors:
  canopy-moss: "#2F5D4A"
  canopy-deep: "#254B3C"
  canopy-abyss: "#19392D"
  moss-tint: "#DCEBE3"
  moss-ink: "#173A2C"
  portal-sage: "#4A6B5D"
  portal-mist: "#E9EFEC"
  coastal-slate: "#496A73"
  coastal-tint: "#BFE9F8"
  trail-amber: "#D79B00"
  amber-deep: "#8B5000"
  amber-wash: "#FFF8E8"
  terracotta-urgency: "#C6472F"
  terracotta-wash: "#FBF1E6"
  mineral-ground: "#F8FAF7"
  mineral-surface: "#F2F5F1"
  mineral-warm: "#F7F5F0"
  surface-card: "#FFFFFF"
  border-hairline: "#C5CCC7"
  border-soft: "#E2E8E4"
  outline-strong: "#737A75"
  ink-primary: "#191C1A"
  ink-portal: "#2D3732"
  ink-secondary: "#4A514C"
  success-leaf: "#146C43"
  success-wash: "#D6F0DF"
  error-crimson: "#BA1A1A"
  error-wash: "#FFDAD6"
typography:
  display:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(2.35rem, 3.8vw, 3.35rem)"
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(1.65rem, 2.5vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Be Vietnam Pro', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0em"
  body:
    fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  label:
    fontFamily: "'Be Vietnam Pro', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "72px"
components:
  button-primary:
    backgroundColor: "{colors.canopy-moss}"
    textColor: "{colors.surface-card}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.canopy-deep}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.canopy-moss}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: "48px"
  button-urgent:
    backgroundColor: "{colors.terracotta-urgency}"
    textColor: "{colors.surface-card}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: "46px"
  input-default:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "48px"
  chip-filter:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "36px"
  chip-filter-active:
    backgroundColor: "{colors.portal-sage}"
    textColor: "{colors.surface-card}"
  card-surface:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "20px"
  nav-header:
    backgroundColor: "{colors.mineral-ground}"
    textColor: "{colors.ink-primary}"
    height: "76px"
---

# Design System: Son Tra ReLoop

## Overview

**Creative North Star: "The Living Trail Fieldbook"**

Son Tra ReLoop is built like an authoritative fieldbook for responsible trekking and ecological stewardship on the Sơn Trà Peninsula. Public entry and authentication surfaces pair editorial warmth with real, verifiable trail data—route distance, elevation, GPS checkpoint count, licensed operator identity, and live seat availability—rather than marketing hyperbole. Once inside the Tourist, Vendor, or Management Board (BQL) portals, the system shifts smoothly into a high-clarity operational register where tabular telemetry, map checkpoints, and transaction records take center stage.

Tonal mineral surfaces (`#F8FAF7`, `#F2F5F1`) and crisp hairline borders (`#C5CCC7`, `#E2E8E4`) replace heavy drop shadows and ornamental chrome. The primary canopy green (`#2F5D4A`) anchors brand trust and primary navigation actions, while terracotta (`#C6472F`) is held in reserve strictly for flash-sale urgency and booking conversion.

The system explicitly rejects luxury-resort imagery, glossy gradient surfaces, neon dark-mode telemetry, eyebrow kickers above headings, and ghost cards that stack borders beneath wide shadows.

**Key Characteristics:**
- Field-authentic mineral surfaces (`#F8FAF7`, `#F2F5F1`) paired with pure white working cards (`#FFFFFF`)
- Two-register typography: `Fraunces` editorial voice on public/auth headings, `Be Vietnam Pro` / `Roboto` with `tabular-nums` in operational portals
- Flat-by-default elevation using 1px hairline borders, reserving shadows for modals, drawers, and interactive hover lift
- Real trail proof over fabricated metrics: live schedules, GPS checkpoint counts, and 10% conservation fund transparency

## Colors

The palette draws directly from Sơn Trà's forest canopy, coastal limestone, and field safety markers, separating calm operational greens from high-urgency booking terracotta.

### Primary
- **Sơn Trà Canopy Moss** (`#2F5D4A`): Primary brand anchor, public CTA fills, active navigation indicators, input focus borders, and text-selection highlights (paired with **Moss Tint** `#DCEBE3` and **Moss Ink** `#173A2C` for containers). Hover state deepens to **Canopy Deep** (`#254B3C`) and active presses settle on **Canopy Abyss** (`#19392D`).
- **Portal Sage** (`#4A6B5D`): Operational portal primary accent inside the authenticated Tourist and BQL shells (paired with **Portal Mist** `#E9EFEC` for active sidebar items and action pills).

### Secondary
- **Coastal Slate** (`#496A73`): Tertiary/secondary informational accent for GPS checkpoint buttons and trail map controls (paired with **Coastal Tint** `#BFE9F8`).

### Tertiary
- **Trail Amber** (`#D79B00` / **Amber Deep** `#8B5000` on **Amber Wash** `#FFF8E8`): Highlights flash-sale countdown timers, warning tags, and review stars.
- **Flash-Sale Terracotta** (`#C6472F` on **Terracotta Wash** `#FBF1E6`): Reserved strictly for live flash-sale cards, urgency badges, and final booking conversion buttons (`Continue` / `Book Now`).

### Neutral
- **Mineral Limestone Ground** (`#F8FAF7`) & **Mineral Surface** (`#F2F5F1`): Primary public page backgrounds and recessed section bands (`#F7F5F0` **Mineral Warm** in portal sidebars).
- **Surface Card** (`#FFFFFF`): Elevated content containers, route cards, and form panels.
- **Hairline Border** (`#C5CCC7`), **Soft Border** (`#E2E8E4`), & **Strong Outline** (`#737A75`): Structural separation for flat cards, tables, and form inputs.
- **Ink Primary** (`#191C1A`), **Portal Ink** (`#2D3732`), & **Ink Secondary** (`#4A514C`): High-contrast text hierarchy maintaining >= 4.5:1 body legibility on light mineral grounds.
- **Status Pairs**: **Success Leaf** (`#146C43` on `#D6F0DF`) for verified states and **Error Crimson** (`#BA1A1A` on `#FFDAD6`) for validation and API error alerts.

### Named Rules
**The Scoped Terracotta Rule.** `#C6472F` is reserved strictly for flash-sale urgency, capacity scarcity indicators, and primary booking conversion CTAs—never for general navigation, informational badges, or decorative accents.

**The Grounded Contrast Rule.** Body copy and placeholder text never drop below 4.5:1 contrast against their surface; secondary text on tinted containers (`#DCEBE3`, `#E9EFEC`) shifts to hue-matched dark ink (`#173A2C`, `#2D3732`) rather than mid-gray.

## Typography

**Display Font:** `Fraunces` (fallback: `Georgia, serif`)
**Body & UI Font:** `Be Vietnam Pro` (fallback: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
**Portal Operational Font:** `Roboto`, `Be Vietnam Pro` inside authenticated Tourist (`.figma-user-shell`) and BQL Admin (`.figma-admin-shell`) portals

**Character:** `Fraunces` brings organic literary warmth to Vietnamese diacritics on public landing and authentication headlines, while `Be Vietnam Pro` and `Roboto` keep dense route telemetry, forms, and tabular dashboards crisp and scannable.

### Hierarchy
- **Display** (`700`, `clamp(2.35rem, 3.8vw, 3.35rem)`, line-height `1.14`, tracking `-0.025em`): Public hero headline on `/`.
- **Headline** (`700`, `clamp(1.65rem, 2.5vw, 2.25rem)`, line-height `1.2`, tracking `-0.02em`): Public section headers, auth card `<h1>` titles, and trek catalog headers.
- **Title** (`700`, `1.125rem`–`1.375rem`, line-height `1.3`–`1.35`): Route card titles, booking flow headings, and modal titles.
- **Body** (`400`, `0.875rem`–`0.9375rem`, line-height `1.6`, max measure `62ch`–`65ch`): Prose descriptions, checkpoint explanations, and form guidance (`1rem` inside form controls to prevent mobile zoom).
- **Label** (`600`, `0.75rem`–`0.875rem`, line-height `1.25`): Navigation links, form labels, filter chips, and button captions.

### Named Rules
**The Two-Register Type Rule.** Public and authentication pages lead with `Fraunces` headlines over `Be Vietnam Pro` body copy; authenticated operational dashboards (`UserDashboardLayout`, `AdminLayout`, `VendorPortal`) standardize on `Roboto` / `Be Vietnam Pro` without serif display ornamentation.

**The Tabular Telemetry Rule.** All prices, distances (`km`), durations (`giờ`), remaining slots, checkpoint counts, and flash-sale countdown timers use `font-variant-numeric: tabular-nums` so numbers align cleanly across rows and live updates.

## Layout

Public pages anchor to a `1280px` centered container (`padding-inline: max(1.25rem, calc((100vw - 1280px) / 2))`), while authentication pages center a `1240px` split card (`44%` media / `56%` form) on `#F2F5F1`. Authenticated portals pair a fixed `248px` left sidebar (`#F7F5F0`) with a fluid main workspace (`40px` desktop padding, `28px 24px` at `<= 1023px`, `20px 16px` at `<= 767px`).

- **Public Header Breakpoint (`1080px`):** Collapses desktop nav links and action pills into a `44px` menu button + top-anchored slide-down drawer (`z-index: 60`) with zero line wrapping above `1080px`.
- **Detail & Booking Topology (`1023px`):** Two-column route dossier (`1.6fr` content / `1fr` sticky aside on desktop) collapses cleanly to a single column below `1023px` with static aside flow.
- **Grid Rhythm:** 3-column route dispatch grid on desktop collapsing to 1 column below `1080px`, with `4.5rem` (`72px`) desktop section padding and `3rem` (`48px`) mobile section padding.

## Elevation & Depth

Surfaces rely on tonal layering (`#F8FAF7` ground, `#F2F5F1` recessed sections, `#FFFFFF` cards) separated by crisp 1px borders (`#C5CCC7` or `#E2E8E4`) rather than ambient shadow stacks. Shadows appear only on interactive hover lift, mobile drawers, toasts, and modal dialogs (`RouteMapPreview` and `PayOSPaymentModal`).

### Shadow Vocabulary
- **Level 1 (`--md-sys-elevation-level-1`)** (`box-shadow: 0 1px 2px rgb(25 28 26 / 12%), 0 1px 3px 1px rgb(25 28 26 / 8%)`): Subtle hover lift on shared `.ui-button` and `.ui-card` primitives.
- **Level 2 (`--md-sys-elevation-level-2`)** (`box-shadow: 0 2px 6px 2px rgb(25 28 26 / 10%), 0 1px 2px rgb(25 28 26 / 12%)`): Active card hover elevation (`--shadow-card-hover`).
- **Drawer & Toast Lift** (`box-shadow: 0 14px 32px rgba(25, 28, 26, 0.12)`): Mobile navigation drawer and floating `.figma-toast` notifications.
- **Modal Overlay** (`box-shadow: 0 30px 80px rgba(25, 28, 26, 0.3)`): Centered `.figma-map-modal` GPS checkpoint dialog over a `rgba(25, 28, 26, 0.66)` backdrop blur scrim.

### Named Rules
**The Single-Elevation Rule.** Declare elevation once at rest—either a 1px hairline border (`#C5CCC7` / `#E2E8E4`) OR a shadow, never both stacked on the same resting card.

## Shapes

The system contrasts friendly pill-shaped actions (`999px`) against crisp rectangular work surfaces (`12px`–`16px`).

- **Inputs & Inner Tiles (`12px` / `0.75rem`):** Form controls, timeline items, and checkpoint summary chips.
- **Public & Auth Cards (`16px` / `1rem`):** Route dispatch cards, hero photography frame, BQL governance panel, and the split auth container.
- **Portal Feature Containers (`24px` / `1.5rem`):** Authenticated dashboard banners, flash-sale panels, and tour list rows inside `.figma-user-shell`.
- **Interactive Actions & Filter Chips (`999px`):** Primary/outline buttons, header actions, difficulty filter pills, and status badges.

## Components

Controls balance crisp rectangular bounds with responsive tactile feedback (`scale(0.965)` press, `150ms`–`250ms` `cubic-bezier(0.2, 0, 0, 1)` transitions).

### Buttons
- **Shape:** Full pill (`999px`), minimum height `44px`–`48px` for primary and touch targets (`min-height: 2.5rem` floor on shared `.ui-button`).
- **Primary:** Canopy Moss (`#2F5D4A`) fill with `#FFFFFF` label (`12px 24px` padding), deepening to `#254B3C` on hover.
- **Secondary / Outline:** Transparent fill with `1.5px solid #2F5D4A` border and `#2F5D4A` text, filling to `#DCEBE3` on hover.
- **Urgent / Booking CTA:** Terracotta (`#C6472F`) fill with `#FFFFFF` label reserved for flash-sale and booking continuation buttons.
- **Focus:** `3px solid color-mix(in srgb, #2F5D4A 30%, transparent)` ring with `2px` offset.

### Chips
- **Style:** Pill (`999px`) filter chips (`36px` height, `0 18px` padding) with `1px solid #E2E8E4` border, `#FFFFFF` fill, and `#4A514C` text (`nowrap`).
- **State:** Active chip switches to `#4A6B5D` (portal) or `#2F5D4A` (public) fill with `#FFFFFF` text and `aria-pressed="true"`.

### Cards / Containers
- **Corner Style:** `16px` (`1rem`) on public/auth cards; `24px` (`1.5rem`) on authenticated `.figma-tour-row` and dashboard panels.
- **Background:** `#FFFFFF` on `#F8FAF7` / `#F2F5F1` ground.
- **Shadow Strategy:** Flat at rest (`box-shadow: none`); subtle `translateY(-2px)` and border darkening (`#2F5D4A`) on hover.
- **Border:** `1px solid #C5CCC7` (public/auth) or `1px solid #E2E8E4` (portal).
- **Internal Padding:** `20px` (`1.25rem`) on route cards; `16px` on compact list rows.

### Inputs / Fields
- **Style:** `1px solid #737A75` stroke, `#FFFFFF` fill, `12px` radius, minimum `48px` (`3rem`)–`56px` (`3.5rem`) height, `16px` (`1rem`) control font size, `caret-color: #2F5D4A`.
- **Focus:** `2px solid #2F5D4A` border (with `1px` inline padding compensation to prevent layout shift).
- **Error / Disabled:** `2px solid #BA1A1A` border on `#FFF8F7` tint with inline `role="alert"` message; disabled inputs take `#F2F5F1` background.
- **Password Toggle:** Dedicated `44px × 44px` `trailingAction` button inside the input container with `Eye` / `EyeOff` Lucide icons and `aria-pressed`.

### Navigation
- **Header:** Sticky/top `76px` bar (`#F8FAF7` / `#FFFFFF`) with `1px solid #C5CCC7` bottom border, `Fraunces` wordmark, single-line `Be Vietnam Pro` nav links (`white-space: nowrap`, active route underlined with `6px` offset), and `z-index: 50`.
- **Mobile Treatment (`<= 1080px`):** Single `44px × 44px` menu button opens a full-width slide-down drawer (`z-index: 60`) containing all nav links and auth/partner actions without occlusion.

### Trail Checkpoint Timeline & Map Dialog
- **Timeline:** Vertical sequence of `12px`-radius cards mapping real `tour.checkpoints` (`Điểm 1..N` in `tabular-nums`, checkpoint name, description, GPS scan radius in meters, and mandatory indicator).
- **Map Dialog:** `RouteMapPreview` Leaflet modal (`1040px` max width on desktop, bottom-sheet `92dvh` on mobile) with `Escape`-key dismissal, 3-column summary telemetry, and numbered checkpoint cards.

## Do's and Don'ts

### Do:
- **Do** use real API data (`tours`, `checkpoints`, `schedules`, `vendor_name`, `esg_fund_percent: 10%`) and display explicit loading, empty, or retryable error states when data is unavailable.
- **Do** apply `tabular-nums` on all distances, durations, slot counts, prices, and countdowns, and keep interactive touch targets at `>= 44px`.
- **Do** preserve `Fraunces` for public/auth headings (`<h1>`, `<h2>`) and `Be Vietnam Pro` / `Roboto` for operational portal screens.
- **Do** use `lucide-react` icons at consistent stroke weight and `::selection` / `focus-visible` palette theming.

### Don't:
- **Don't** place eyebrow/kicker labels above headings, render hero-metric stat blocks with unverified counts, or stack `border` + `box-shadow` on resting cards.
- **Don't** use `#C6472F` terracotta outside live flash-sale urgency or booking conversion flows.
- **Don't** substitute Unicode emojis (`⚠`, `🥾`, `✓`) for UI icons or invent hardcoded tour itineraries when `checkpoints` is empty.
- **Don't** reference luxury-resort themes or deferred Eco-Marketplace features in public tourist entry or auth copy.

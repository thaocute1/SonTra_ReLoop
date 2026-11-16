# Surface Brief: Tourist Entry & Trekking Discovery-to-Booking

- **Routes:** `/`, `/trekking`, `/trekking/:tourId`, `/dashboard/trekking`, `/dashboard/trekking/:tourId`
- **Mode:** Persuade (`/`, public discovery) transitioning to Operate (`/trekking/:tourId`, `/dashboard/trekking` detail, schedule, booking & PayOS checkout)
- **Visual Authority:** Inherit established Son Tra ReLoop system (`web/src/styles/tokens.css`, `web/src/index.css`)
- **Build Path:** `code` (code-first)

## Direction contract

THESIS: Replace the generic landing scaffold and static placeholder claims with a Trail-First Live Dispatch anchored in real bookable Sơn Trà routes and verifiable QR/GPS stewardship, while refusing fabricated impact counters, Marketplace promos, and login walls before browsing.

OWN-WORLD: Son Tra ReLoop forest-and-mineral palette (`#2F5D4A` primary forest, `#19392D` deep canopy, `#DCEBE3` moss tint, `#F8FAF7` mineral cream surface, `#191C1A` ink, `#4A514C` muted slate, `#C6472F` terracotta reserved strictly for live flash-sale urgency and primary booking conversion), paired with `Fraunces` editorial headlines, `Be Vietnam Pro` body/UI controls, `tabular-nums` telemetry, crisp `12–16px` surface cards with single-declared elevation, and `lucide-react` field iconography.

STORY: A visitor immediately understands Sơn Trà ReLoop as a conservation-linked trekking platform, inspects live published routes with real distance, elevation, difficulty, checkpoint count, vendor, and departure slots without creating an account first, sees how GPS/QR check-ins earn Green Points and allocate 10% to conservation, and logs in only when ready to confirm a departure slot and pay via PayOS VietQR.

FIRST VIEWPORT: Top navigation bar (`SiteHeader` aligned to Tour & Experience scope with mobile drawer) above a balanced two-column hero on `#F8FAF7`/`#FFFFFF`: left column holds the `Fraunces` display headline, concise positioning copy, and two clear actions (`Khám phá tuyến trekking` primary CTA to `/trekking` and `Bắt đầu hành trình` secondary CTA); right column holds the full-bleed Sơn Trà landscape photograph (`16px` radius, no floating fake-stat badges or eyebrows). Immediately below the fold sits the Live Routes & Next Departures dispatch strip pulled from `GET /api/v1/tours/`.

FORM: Trail-First Live Dispatch (chosen concept #1 from the surface direction round; `seed: none (unavailable)` — launcher binary unavailable in offline sandbox).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

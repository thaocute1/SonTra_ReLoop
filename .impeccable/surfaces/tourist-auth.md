# Surface Brief: Tourist Authentication Flow

- **Routes:** `/login`, `/register`, `/forgot-password`
- **Mode:** Operate (authentication and booking-return handoff inside the established Son Tra ReLoop system)
- **Visual Authority:** Inherit established Son Tra ReLoop system (`web/src/styles/tokens.css`, `web/src/index.css`)
- **Build Path:** `code`

## Direction contract

THESIS: Unify `/login`, `/register`, and `/forgot-password` into one crisp forest-and-mineral split authentication experience that preserves booking-return intent and removes stale "Sơn Trà RESort" copy, dead links, and non-functional eye icons.

OWN-WORLD: Son Tra ReLoop palette (`#2F5D4A` primary forest, `#173A2C` on-primary-container, `#F2F5F1` mineral ground, `#FFFFFF` form panel, `#C5CCC7` 1px crisp framing, `#191C1A` ink, `#4A514C` secondary ink), `Fraunces` `<h1>` display voice, `Be Vietnam Pro` labels/inputs (`16px` input text, `>= 48px` interactive targets), and consistent `lucide-react` field/toggle icons.

STORY: A visitor arriving directly or redirected from a public tour detail page sees clear confirmation of where they are returning, signs in or registers with working password visibility toggles and Google/Facebook options, and lands directly back in their intended tour booking or dashboard without dead links or resort-brand confusion.

FIRST VIEWPORT: `SiteHeader` above a 16px-radius single-bordered split card (`auth-layout`) centered on `#F2F5F1`: left side shows authentic Sơn Trà peninsula photography with a grounded caption; right side presents the `Fraunces` headline, optional booking-handoff banner, full-size accessible inputs, primary forest pill CTA, and Google/Facebook sign-in buttons above the fold.

FORM: Unified Split Auth Card extending the established Son Tra ReLoop system (`seed: none (unavailable)` — launcher binary unavailable in offline sandbox).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

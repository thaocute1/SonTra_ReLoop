# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Eco-tourists & Trekkers (Khách hàng / End-user):** Visitors and local trekkers exploring the Sơn Trà Peninsula (Đà Nẵng) who want to discover and book verified eco-tours, navigate trails safely, verify checkpoint progress via QR/GPS challenges, report environmental incidents on the peninsula, donate to conservation funds, and earn/redeem Green Points and Adventure Passport achievements.
- **Tour Operators & Guides (Vendor Tour):** Local tour companies and field guides operating on Sơn Trà who need to register for BQL approval, publish and manage trekking routes, schedules, capacities, and GPS/QR checkpoints, manage bookings and customer communications, and track revenue payouts and reconciliation.
- **Sơn Trà Peninsula Management Board (Admin / BQL) & Patrol Staff:** Public administrators and field rangers responsible for approving tour vendors, triaging and resolving field incident reports, managing community clean-up campaigns and conservation announcements, tracking conservation fund allocations, overseeing split-payment payouts to vendors, and monitoring ecological and operational metrics via an ESG dashboard.

## Product Purpose

**Son Tra ReLoop** is a sustainable eco-tourism platform for the Sơn Trà Peninsula in Đà Nẵng (developed as the PBL6 Information Systems capstone project at Da Nang University of Science and Technology). It connects trekkers, licensed local tour vendors, and the Sơn Trà Peninsula Management Board (BQL) around the **Tour & Experience** pillar: transparent eco-tour booking, on-trail QR/GPS checkpoint verification, gamified environmental stewardship (Green Points and Adventure Passport), field incident reporting, conservation fund contributions, and ESG impact oversight.

Success means tourists book verified tours and actively participate in conservation actions on the trail, vendors receive transparent booking management and payout reconciliation, and BQL gains real-time visibility into visitor activity, environmental incidents, and conservation fund impact.

## Positioning

Unlike generic OTA booking sites or standalone trail-tracking apps, Son Tra ReLoop ties commercial trekking bookings directly to verified on-site ecological stewardship and regulatory oversight on the Sơn Trà Peninsula: physical QR/GPS checkpoints along approved routes validate challenge completion to award individual and group Green Points, tourist and ranger incident reports feed directly into BQL triage workflows, and tour revenue and direct donations connect transparently to peninsula conservation funds and an administrative ESG dashboard.

## Operating Context

- **Three Role-Based Web Portals (`web/`):**
  - **Tourist Web Portal (`/`, `/dashboard/*`):** Public tour discovery, flash sales, booking and online payment, mission/challenge tracking, conservation donations, community updates, Adventure Passport profile, trip chat with vendors, incident reporting, and the ReLoop AI Assistant.
  - **Partner / Vendor Portal (`/partner/*`, `/vendor/*`):** Vendor onboarding and verification submission, tour/experience and GPS/QR checkpoint management, booking confirmation/cancellation, customer inbox, revenue/payout tracking, and vendor AI assistant.
  - **BQL / Admin & Patrol Staff Portal (`/bql-portal/login`, `/admin/*`, `/staff/dashboard`):** Single BQL entry point covering ESG impact dashboard, incident report triage and resolution, conservation fund allocation, vendor approval workflows, split-payment payout triggers, business reports, content/campaign management, mission reviews, and user governance.
- **Companion Mobile App (`mobile/`):** Flutter mobile application (`son_tra_trail_quest`) used on the trail by tourists and guides for offline-capable/field GPS tracking, safe trekking alerts, physical QR checkpoint scanning, mission verification, and Green Points / Adventure Passport access.
- **Language & Locale:** Primary operating language across current interfaces and SRS v2 is Vietnamese (`vi-VN`), serving domestic and local Đà Nẵng eco-tourism stakeholders first (multi-language support is deferred per SRS v2).

## Capabilities and Constraints

- **Confirmed Core Scope (SRS v2 — Tour & Experience Focus):**
  - Customer authentication (email/phone, Google/Facebook OAuth) and role-based access control (`Khách hàng`, `Vendor Tour`, `Patrol Staff`, `Admin/BQL`).
  - Tour search, filtering (location, difficulty, duration, price), booking, and online checkout via VNPay (domestic primary) and Stripe (international).
  - Physical trail checkpoint management with GPS coordinates and generated QR codes; individual and group Green Points accrual and redemption for tour discounts or sponsored rewards.
  - Direct conservation fund donations, environmental incident reporting (with photo, GPS location, and severity triage), and community clean-up campaign management.
  - AI Chatbot (`POST /api/v1/cms-chatbot/agent/chat/` powered by DeepSeek) for querying published tours and platform guidance.
- **Explicit Out-of-Scope / Deferred Features (SRS v2 Section 1.6 & 1.7):**
  - **Multi-vendor Circular Economy Eco-Marketplace:** Deferred to future roadmap outside the core PBL6 Tour & Experience deliverable (note: `/dashboard/marketplace` exists in current web routes as secondary/prototype UI and must not displace core Tour & Experience priorities).
  - **Peer-to-peer Gifting & Physical Logistics:** Replaced by Green Points redemption; no physical shipping logistics.
  - **Direct Banking Custody:** Payouts rely on PSP (VNPay/Stripe) split-payment/payout APIs rather than holding funds directly.
  - **Legacy BQL System Integration:** Operates as a standalone ESG & management portal rather than integrating with internal government legacy databases.
- **Technical Stack:**
  - **Web Frontend (`web/`):** React 18, Vite 5, Tailwind CSS v4, React Router v6, Leaflet / React-Leaflet for trail maps, Recharts for ESG and business analytics, Lucide React icons.
  - **Backend (`backend/`):** Python (Django + Django REST Framework) with MySQL (`PyMySQL`) and JWT authentication (note: early SRS drafts mention FastAPI, but the active repository implementation is Django/DRF).
  - **Companion Mobile (`mobile/`):** Flutter (`>=3.0.0 <4.0.0`) with `geolocator`, `image_picker`, and social auth.

## Brand Commitments

- **Canonical Product Name:** **Son Tra ReLoop** (also styled **Sơn Trà REloop** in web shell metadata; package names and README retain the working title `son-tra-trail-quest`).
- **Voice & Domain Tone:** Grounded in Sơn Trà Peninsula conservation, responsible trekking, community stewardship, and transparent governance between tourists, local operators, and the Management Board (BQL).

## Evidence on Hand

- **Requirements & Domain Specification:** `SRS_SonTraReLoop_v2 (1).docx` and extracted text in `scratch_srs_formatted.txt` / `srs_extracted.txt` (defines roles, KH-01..KH-12, VT-01..VT-06, AD-01..AD-08, HT-01..HT-04, and Green Points rules).
- **Database & API Documentation:** `db.txt`, `docs/api-contract.md`, and live Django apps under `backend/apps/` (`accounts`, `tours`, `vendors`, `challenging`, `gamification`, `flash_sales`, `orders`, `payments`, `cms_chatbot`).
- **Existing Web Implementation:** Implemented routes, layouts, and role portals under `web/src/` (`features/auth`, `features/trekking`, `features/dashboard`, `pages/partner`, `pages/vendor`, `pages/admin`, `pages/staff`).
- **Absences Not to Fabricate:** Real BQL official endorsements, verified live conservation fund totals, real partner vendor legal licences, and customer testimonials must not be fabricated as factual proof unless explicitly supplied by the team. `docs/figma-link.md` currently contains placeholder links (`<điền link>`).

## Product Principles

1. **Conservation Action Over Passive Tourism:** Every tour booking and trail journey should connect visibly to ecological stewardship—checking in at approved checkpoints, staying on safe routes, reporting hazards, and contributing to Sơn Trà's preservation.
2. **Verifiable Field Truth:** Rewards (Green Points, badges) and administrative decisions (incident resolution, vendor approvals, payouts) rely on concrete field evidence—QR/GPS checkpoint scans, geotagged incident photos, and auditable transaction records.
3. **Role Clarity Across Three Ecosystems:** Tourists, Tour Vendors, and BQL Administrators/Rangers operate in distinct contexts with different urgency and density needs; keep each portal focused on its role's core job without bleeding administrative complexity into the tourist experience.
4. **Tour & Experience First:** Prioritize the end-to-end trekking lifecycle—discovery, booking, trail checkpoint verification, Green Points redemption, incident reporting, and ESG oversight—over deferred marketplace extensions.

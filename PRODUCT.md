# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Eco-Tourists / Trekkers (Khách du lịch / Du khách):** Visitors exploring Sơn Trà Peninsula (Đà Nẵng) who want to discover and book verified eco-trekking experiences, check in at trail checkpoints via QR/GPS, complete environmental challenges ("Nhiệm vụ xanh"), earn and redeem Green Points, donate to conservation funds, and report trail or ecological incidents.
- **Tour Vendors / Partners (Đơn vị lữ hành / Đối tác):** Local tour operators managing trekking experiences ("Trải nghiệm"), departure schedules ("Chuyến khởi hành"), trail GPS checkpoints and QR codes, customer bookings ("Đơn đặt"), assigned guides, customer reviews, and revenue/payout reconciliation.
- **Management Board Administrators (Admin / Ban Quản lý Bán đảo Sơn Trà - BQL):** Public-sector and conservation administrators who vet and approve tour vendors, oversee conservation fund allocations, monitor ESG and ecological impact metrics, manage split-payment payouts, review community missions, and triage field incident reports.
- **Field Staff & Tour Guides (Nhân viên tuần tra & Hướng dẫn viên):** Patrol staff reporting on-site ecological incidents or hazards, and assigned tour guides managing live trip attendance, group GPS proximity alerts, and SOS responses in the field.

## Product Purpose

Son Tra ReLoop connects eco-tourists, local trekking operators, and the Sơn Trà Peninsula Management Board (BQL) in a unified ecosystem that makes sustainable trekking transparent, safe, and measurable. Success means tourists book verified local trekking experiences and actively participate in conservation challenges, vendors receive transparent booking and payout management, and BQL gains real-time ESG, fund, and incident visibility across the peninsula.

## Positioning

Unlike generic OTA booking sites or standalone trail-tracking apps, Son Tra ReLoop closes the loop between commercial trekking, on-trail verification, and public conservation governance: every booked tour, QR/GPS checkpoint scan, environmental mission, and split-payment conservation contribution feeds directly into traveler rewards (Green Points & Adventure Passport) and BQL's ESG and incident oversight for Sơn Trà Peninsula.

## Operating Context

- **Three-Portal Web Architecture:** A React + Vite web application serving three distinct operational contexts:
  - **Tourist Web Portal (`/` & `/dashboard/*`):** Public landing discovery, authenticated dashboard, trekking booking, flash sales, Green Points missions (`/dashboard/tasks`), community hub, Adventure Passport profile, trip inbox, and ReLoop AI assistant.
  - **Partner / Vendor Portal (`/partner/*` & `/vendor/*`):** Partner onboarding, experience and route/checkpoint builder (Leaflet/OpenStreetMap), schedule and booking management, customer inbox, and revenue tracking.
  - **BQL Admin & Staff Portal (`/bql-portal/login`, `/admin/*`, `/staff/*`):** ESG impact dashboard, field incident triage, conservation fund allocation, vendor approvals, business payouts and reports, mission verification, and content/campaign management.
- **Companion Mobile Field App (`mobile/`):** A Flutter companion app used on the trail by tourists (GPS tracking, QR checkpoint scanning, SOS, offline-capable trip view) and tour guides (roll-call attendance at departure/checkpoints/return, 100–1000m group separation alerts, and offline sync queues).
- **Real-World Trail Conditions:** Peninsula routes have intermittent cellular coverage; checkpoint verification relies on on-site QR codes and GPS coordinates, and field operations account for offline queuing and delayed synchronization.

## Capabilities and Constraints

- **Confirmed Core Scope (SRS v2):** Eco-trekking tour discovery and booking, QR/GPS checkpoint challenges, Green Points accumulation and redemption (personal and group points), direct conservation donations, field incident reporting (with photos and GPS), vendor tour/schedule/checkpoint management, and BQL ESG/fund/incident governance.
- **Secondary / Future Vision Scope:** Multi-vendor circular-economy recycled-product marketplace (Eco-Marketplace), QR product provenance passports, and peer-to-peer gifting are designated as long-term future phases in SRS v2 (though a prototype `/dashboard/marketplace` route exists in the web app).
- **Technical Stack:**
  - **Web Frontend:** React 18, Vite 5, React Router v6, Tailwind CSS v4 (`@tailwindcss/vite`), Leaflet / React-Leaflet for trail maps, Recharts for ESG and revenue analytics, Lucide icons.
  - **Backend:** Python (Django + Django REST Framework) with MySQL/PostgreSQL, JWT authentication, and DeepSeek-powered AI chat assistant (`POST /api/v1/cms-chatbot/agent/chat/`) scoped to published tour discovery.
  - **Payments & Payouts:** VNPay (domestic) and Stripe (international); the platform triggers PSP split-payment/payout APIs and records ledger state rather than holding or transferring funds directly.
- **Language & Localization:** Vietnamese (`vi`) is the primary interface language across all portals.
- **Open Product Decisions:** Exact Green Points conversion multipliers (individual vs. group bonus coefficients and point-to-discount redemption tiers) remain open pending detailed specification sign-off.

## Brand Commitments

- **Canonical Brand Name:** **Son Tra ReLoop** (also styled **Sơn Trà REloop** in web titles; repository root is `son-tra-trail-quest`).
- **Standardized Vendor Terminology (`web/src/constants/labels.js`):**
  - Product offering: **"Trải nghiệm"** (not generic item/product)
  - Scheduled departure: **"Chuyến khởi hành"** / **"Chuyến"**
  - Customer reservation: **"Đơn đặt"**
  - Portal identity: **"Cổng đối tác"** with verified role badge **"Đối tác xác minh"**
  - Difficulty tiers: **"Dễ • gia đình"**, **"Trung bình"**, **"Thử thách"**
- **Existing Brand Assets:** Logo at `web/src/assets/logo.jpg`; typography pairing loaded in `web/index.html` (`Be Vietnam Pro` for UI/body and `Fraunces` for editorial/display headings) with forest-green theme color (`#2f5d4a`).

## Evidence on Hand

- **Specifications & Documentation:** Software Requirements Specification (`SRS_SonTraReLoop_v2 (1).docx` / `scratch_srs_formatted.txt`), database schema (`db.txt`, `docs/demo-guide.sql`), API and AI chat contracts (`docs/api-contract.md`, `docs/frontend-chat-schema-handover.md`), and mobile guide workflow documentation (`docs/mobile-guide.md`).
- **Existing Assets:** Brand logo (`web/src/assets/logo.jpg`). External Figma wireframe links in `docs/figma-link.md` are currently placeholders (`<điền link>`).
- **Unverified Claims to Avoid Fabricating:** Do not invent official BQL government endorsements, audited conservation fund totals, real partner operator testimonials, or certified ecological impact figures when real database records are absent.

## Product Principles

1. **Conservation Impact Must Be Verifiable:** Every ecological claim—whether a completed trail mission, a Green Points reward, or a conservation fund allocation—anchors to concrete evidence (checkpoint QR/GPS logs, photo proof, or transaction records) rather than decorative greenwashing.
2. **Role-Specific Operational Clarity:** Tourists need inspiring discovery and effortless trail participation; Vendors need unambiguous schedule, checkpoint, and booking control; BQL Admins need high-signal ESG, incident, and payout oversight. Each portal prioritizes the exact workflow of its operator.
3. **Field-First Safety and Accountability:** Trail experiences involve real physical terrain on Sơn Trà Peninsula. Interfaces that touch schedules, guide assignments, checkpoints, and incident reports must keep safety states, attendance statuses, and location freshness unmistakable.
4. **Transparent Local Value Loop:** Make the connection between booking a tour, supporting verified local operators, and funding peninsula conservation visible at decision points without cluttering task completion.

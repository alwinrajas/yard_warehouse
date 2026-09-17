# ALU TRACK — Documentation Index

**Product:** ALU TRACK — Yard & Warehouse Inventory Tracking & Traceability System
**Tagline:** Track Every Pallet. Know Every Location.
**Domain:** Aluminium Channels / Profiles Manufacturing
**Source of truth:** BRD v1.0 — `reference/BRD-v1.0-extracted.md`

---

## Current phase

**Phases 1–3, 5, 7, 8 complete — functional analysis, specification, architecture, and the
full ALU TRACK UI/UX architecture. No code written yet.**

Implementation begins after the customer confirms the scope boundary and answers the four
gating open items: `OI-01` (barcode samples), `OI-02` (pallet uniqueness), `OI-03` (yard
layout), `OI-09` (dispatch mode).

---

## Documents

| # | Document | Covers | Status |
|---|---|---|---|
| 01 | [Requirement Analysis](01-requirement-analysis.md) | Scope boundary, confirmed requirements, ambiguities, open inputs, assumptions | Complete |
| 02 | [System Architecture](02-system-architecture.md) | Context, stack, layering, inventory core, concurrency, integration boundaries, ADRs | Complete |
| 03 | [Module Breakdown & API Modules](03-module-breakdown.md) | M0–M10 modules, API endpoint list, build order | Complete |
| 04 | [Database Entity Model](04-data-model.md) | Entities, relationships, constraints, indexes, retention | Entity model complete; DDL pending |
| 05 | [Business Rules & State Machine](05-business-rules-and-state-machine.md) | Pallet lifecycle, transition rules, validation matrices, exceptions, configuration register | Complete |
| 06 | [Admin Web Screen Specification](06-web-screen-specification.md) | Functional web screen content | Complete — **screen IDs superseded by doc 23** |
| 07 | [Role & Permission Matrix](07-permission-matrix.md) | 5 roles, ~90 permissions, scoping, password policy | Complete |
| 08 | [PDA Screen Specification](08-pda-screen-specification.md) | Functional PDA screen content | Complete — **screen IDs superseded by doc 24** |
| 09 | [Security Design](09-security-design.md) | Threat model, auth, input handling, secrets, audit, checklist | Complete |
| 10 | [Report Catalogue](10-report-catalogue.md) | All 13 BRD reports with columns, filters, permissions, indexes | Complete |
| 11 | [Barcode Specification](11-barcode-specification.md) | ERP vs location barcode, profile engine, identity rules, flow | Complete (Part A blocked on `OI-01`) |
| 12 | [Deployment Architecture](12-deployment-architecture.md) | AWS topology, environments, CI/CD, migrations, backup & recovery | Design complete; nothing provisioned |
| 13 | [Delivery Plan](13-delivery-plan.md) | Phases, gates, increments, migration, Definition of Done, risks | Complete |
| 14 | [Test Strategy](14-test-strategy.md) | Unit, feature, concurrency, PDA, web, load, acceptance mapping | Complete |
| 15 | Setup Guide | Local development setup | Pending Phase 9 |
| 16 | Release Checklist | Pre-release verification | Pending Phase 13 |
| 17 | UAT Checklist | Customer acceptance script | Pending Phase 13 |

---

### UI/UX architecture

| # | Document | Covers | Status |
|---|---|---|---|
| 20 | [UI/UX Architecture](20-uiux-architecture.md) | Design decisions UX-01…10, scope reconciliation, responsive strategy, quality gate | Complete |
| 21 | [Design System](21-design-system.md) | Visual direction, colour/type/space tokens, full component inventory, branding | Complete |
| 22 | [Information Architecture](22-information-architecture.md) | Site map, app shell, sidebar, global search, permission-aware UX, terminology | Complete |
| 23 | [Web Screens](23-web-screens.md) | 31 screens — full specs for core, structured for the rest | Complete |
| 24 | [PDA Screens](24-pda-screens.md) | 24 screens, scanner behaviour, failure states, ergonomics | Complete |
| 25 | [User Journeys & Patterns](25-user-journeys-and-patterns.md) | 8 journeys, six screen states, transaction and exception patterns | Complete |
| 26 | [Component Architecture](26-component-architecture.md) | Layering, directories, state ownership, build-enforced design rules | Complete |
| 27 | [UX Implementation Sequence](27-ux-implementation-sequence.md) | Foundation gate, U-0…U-16 screen order, review cadence | Complete |

## Reading order

**Customer / business review** → 01 → 05 (§1–3) → 25 (journeys) → 23 → 24 → 10 → 13
**Technical review** → 02 → 04 → 05 → 03 → 09 → 12 → 14
**Design / frontend review** → 20 → 21 → 22 → 23 → 24 → 26 → 27
**Before writing any backend code** → 01 (§5–8) → 05 → 04
**Before writing any frontend code** → 20 → 21 → 26 → 27 (§2 foundation gate)

---

## The three things that must not be got wrong

1. **The ERP generates pallet barcodes. This system never does.** It scans, decodes,
   validates and references them. It generates *location* barcodes only, and a reprint
   never changes a location's identity. → `11-barcode-specification.md`

2. **One pallet has at most one active current location.** Enforced by
   `inventory_current.pallet_id` being the primary key, by row locking inside every
   transaction, and by a concurrency test suite that runs on every pull request.
   → `02-system-architecture.md` §6, `14-test-strategy.md` §5

3. **History is never overwritten.** Corrections append; they do not edit. There is no code
   path that updates or deletes an inventory transaction or an audit row.
   → `05-business-rules-and-state-machine.md` §3.6

---

## Open customer inputs

Twenty items are tracked in [`01-requirement-analysis.md` §6](01-requirement-analysis.md).
Four gate implementation; the rest gate go-live. Each has a documented fallback so
development proceeds without inventing customer data.

| Gating | Item |
|---|---|
| `OI-01` | Sample ERP barcode labels, symbology, encoded structure |
| `OI-02` | Pallet uniqueness — Job+Pallet or Pallet alone |
| `OI-03` | Yard/warehouse/zone layout and location numbering convention |
| `OI-09` | Dispatch process — direct or via staging area |

Additionally, `OI-19` (operating timezone) and `OI-17` (AWS account and domains) must be
answered before go-live and before any provisioning respectively.

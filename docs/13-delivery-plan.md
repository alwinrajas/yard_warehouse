# 13 — Development Phases and Delivery Plan

**Covers:** Deliverable N
**BRD:** §20 (Data Migration), §28 (Implementation Approach)
**Status:** Baseline for review

---

## 1. Phase map

The master prompt defines 14 development phases; the BRD §28 defines 6 customer-facing
phases. They are the same work at different resolutions.

| Dev phase | Name | BRD §28 phase | Status |
|---|---|---|---|
| 1 | Requirement analysis | Phase 1 — Requirement & Site Study | **Complete** (`01-requirement-analysis.md`) |
| 2 | Functional specification | Phase 1 | **Complete** (docs 03, 05, 06, 08, 10) |
| 3 | Architecture | Phase 1 | **Complete** (docs 02, 07, 09, 12) |
| 4 | Database design | Phase 2 | **Entity model complete** (`04-data-model.md`); DDL pending |
| 5 | Business rules / state transitions | Phase 2 | **Complete** (`05-business-rules-and-state-machine.md`) |
| 6 | API specification | Phase 2 | Module list complete (`03-module-breakdown.md` §3); endpoint contracts pending |
| 7 | Web screen specification | Phase 2 | **Complete** (`06-web-screen-specification.md`) |
| 8 | PDA screen specification | Phase 3 | **Complete** (`08-pda-screen-specification.md`) |
| 9 | Backend implementation | Phase 2–4 | Not started |
| 10 | Web implementation | Phase 2–4 | Not started |
| 11 | PDA implementation | Phase 3 | Not started |
| 12 | Integration | Phase 4 | Not started |
| 13 | Testing | Phase 4–5 | Not started |
| 14 | Deployment | Phase 5–6 | Design only (`12-deployment-architecture.md`) |

---

## 2. Dependencies and gates

```
Phase 1-3 (analysis)  ──┬──► Phase 4 (DDL)  ── requires OI-02 ──► locked pallet identity
                        │
                        └──► Phase 6 (API contracts)
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
              Phase 9 (backend) ──────► Phase 10 (web)
                        │                       │
                        └──► Phase 11 (PDA) ────┘
                                    │
                                    ▼
                          Phase 12 (integration)
                                    │
                                    ▼
                          Phase 13 (testing) ── requires real PDA hardware (OI-07)
                                    │
                                    ▼
                          Phase 14 (deployment) ── requires OI-17
```

### Hard gates

| Gate | Blocks | Required input |
|---|---|---|
| G-1 | Writing the `pallets` migration | `OI-02` — pallet uniqueness. Proceeding on the default is possible, but the setting locks at first transaction, so confirming before go-live is mandatory. |
| G-2 | Activating a real barcode profile | `OI-01` — sample labels. Development proceeds on `RAW_REFERENCE`. |
| G-3 | Location master import | `OI-03` — layout and numbering convention |
| G-4 | PDA scanner integration test | `OI-07` — physical device |
| G-5 | Any AWS provisioning | `OI-17` — account, region, domains |
| G-6 | Opening stock and go-live | `OI-20` — cutover window; `OI-19` — timezone |

None of these gates blocks the start of Phase 9. Every one of them blocks go-live.

---

## 3. Implementation sequence

Each increment is shippable and demonstrable to the customer. Each is complete to the
Definition of Done (§6) before the next starts.

| # | Increment | Delivers | Demo |
|---|---|---|---|
| I-1 ✅ | Foundation | Laravel skeleton, migrations for M0+M1, RBAC, auth, audit, error envelope | A user logs in; permissions are enforced. *Docker stack and CI pipeline still outstanding.* |
| I-2 ✅ | Masters (web) | Sites, facilities, zones, locations; import with dry-run; Next.js shell, design system, data table | An admin builds the yard structure and imports locations |
| I-3 | Location barcodes | Generation, preview, batch print, reprint-with-audit, PDF labels | Labels are printed and physically affixed |
| I-4 | Inventory core | `inventory_current`, transaction ledger, state machine, idempotency, locking | **Concurrency test suite passes** — the invariant is proven before any UI exists |
| I-5 | Put-away | `POST /putaway`, PDA login + home + put-away flow | A pallet is scanned into a location and appears on the web within one poll interval |
| I-6 | Search & enquiry | Search API, PDA search, PDA location enquiry, web live inventory | An operator finds a stored pallet and drives to it |
| I-7 | Transfer | `POST /movements`, PDA transfer flow, movement history | A pallet moves; only the new location is current; history shows both |
| I-8 | Dispatch | `POST /dispatch`, PDA dispatch flow, dispatch register | A pallet is dispatched and leaves active inventory |
| I-9 | Dashboard & occupancy | KPIs, ageing, occupancy view, block/unblock | Management sees live operational state |
| I-10 | Holds & exceptions | Hold/release, exception queue, hold report | A damaged pallet is blocked from dispatch |
| I-11 | Stock verification | Session flow on PDA, review and approval on web, variance report | A cycle count finds and explains a variance |
| I-12 | Corrections | Correction workflow, corrections register, traceability view | A mis-scan is corrected; the original record is intact and visible |
| I-13 | Reports | All 13 reports with filters, pagination, export | Every BRD §14 report runs and exports |
| I-14 | Opening stock & migration | Opening-stock mode, validation, sign-off | Existing yard stock is captured |
| I-15 | Hardening & deployment | Load test, security review, AWS provisioning, backups, **restore drill**, runbooks | Staging mirrors production; a restore is proven |

I-4 before I-5 is deliberate. The invariant and its concurrency proof come before the first
screen that depends on them — the opposite order produces a demo that works and a system
that corrupts.

---

## 4. Data migration and go-live (BRD §20)

### Preparation
1. Customer supplies yard/warehouse structure and any existing location codes (`OI-03`).
2. Import facilities → zones → locations, each with a dry-run validation pass.
3. Generate location barcodes; print and **physically affix** labels.
4. Walk the yard and verify every label scans and resolves to the right location. This is a
   physical task and is the most common source of go-live delay — schedule it explicitly.
5. Create users, assign roles and facility scope.
6. Configure `CFG-01` … `CFG-20` with confirmed values. **`CFG-13` timezone and `CFG-01`
   uniqueness must be correct before any transaction is written.**

### Opening stock (BRD §20)
```
Enable CFG-17 (opening stock mode)
   │
   ├─► For each location: scan location → scan every pallet present
   │      transactions written as type = OPENING_STOCK
   │
   ├─► Progress tracked per facility and zone on screen S-43
   │
   ├─► Validation: every location visited · counts reconciled against
   │      the customer's manual records · exceptions listed and resolved
   │
   ├─► Explicit sign-off by the customer (recorded, with who and when)
   │
   └─► Disable CFG-17 → normal transactions enabled
```

Opening stock is a **cutover activity, not a background task**. Inventory must not move
during capture, or the count is wrong before it is finished. The window is `OI-20`.

### Go-live
Train operators on the physical devices · run a parallel day (scan alongside the existing
manual process) · reconcile · cut over · heightened monitoring for the first week.

---

## 5. Roles and responsibilities

| Responsibility | Owner |
|---|---|
| BRD clarification and open-item answers | Customer |
| Sample barcode labels, yard layout, PDA hardware | Customer |
| Physical label printing and affixing | Customer, with our procedure |
| Opening stock capture | Customer operators, supervised |
| AWS account and domains | Customer (`OI-17`) |
| Architecture, implementation, testing, deployment | RedMind Technologies |
| UAT execution and sign-off | Customer |

---

## 6. Definition of Done

A module is **not** done when the screen renders. It is done when all of the following are
true (master prompt §42):

- [ ] UI implemented, including loading, empty, error and forbidden states
- [ ] API implemented with the standard response envelope
- [ ] Migrations written, with the constraints from `04-data-model.md` §4
- [ ] Server-side validation on every input
- [ ] Authorisation enforced at the API, and the permission matrix test updated
- [ ] Business rules implemented in the service layer, not duplicated in the client
- [ ] Error handling covers every documented failure code
- [ ] Audit requirements satisfied and asserted by a test
- [ ] Unit tests for business rules; feature tests for endpoints; concurrency tests where the module writes inventory
- [ ] Integration verified end-to-end across API and the relevant client
- [ ] Responsive and usable at the specified breakpoints; PDA targets meet the size and contrast checks
- [ ] No console errors, no failing API calls in normal use
- [ ] No known critical security issue
- [ ] Documentation updated — including this plan's status table

---

## 7. Deliverable register (master prompt §44)

| # | Deliverable | Document | Status |
|---|---|---|---|
| 1 | Architecture document | `02-system-architecture.md` | **Complete** |
| 2 | Database ERD / documentation | `04-data-model.md` | **Entity model complete**; DDL pending Phase 4 |
| 3 | API documentation | `03-module-breakdown.md` §3 | Module list complete; per-endpoint contracts pending Phase 6 |
| 4 | Business rule / state transition documentation | `05-business-rules-and-state-machine.md` | **Complete** |
| 5 | Web screen specification | `06-web-screen-specification.md` | **Complete** |
| 6 | PDA screen specification | `08-pda-screen-specification.md` | **Complete** |
| 7 | Setup documentation | `15-setup-guide.md` | Pending Phase 9 |
| 8 | Environment configuration documentation | `12-deployment-architecture.md` §2 + `.env.example` | Partial |
| 9 | Test plan | `14-test-strategy.md` | **Complete** |
| 10 | Test cases | `14-test-strategy.md` §7 + suite | Catalogue complete; cases written per increment |
| 11 | Deployment documentation | `12-deployment-architecture.md` | **Design complete**; runbooks pending |
| 12 | User/role permission matrix | `07-permission-matrix.md` | **Complete** |
| 13 | Barcode specification | `11-barcode-specification.md` | **Complete** (Part A blocked on `OI-01`) |
| 14 | Release checklist | `16-release-checklist.md` | Pending Phase 13 |
| 15 | UAT checklist | `17-uat-checklist.md` | Pending Phase 13 |

---

## 8. Risk register

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| RK-01 | Barcode samples arrive late (`OI-01`) | Customer/LPO unavailable at scan; rework of the parsing profile | `RAW_REFERENCE` works standalone; profile is configuration, not code; raw value stored so records can be re-parsed |
| RK-02 | Pallet uniqueness confirmed late or wrongly (`OI-02`) | **Inventory corruption if wrong** | Safe default (`JOB_PALLET`); setting locks at first transaction; explicit gate G-1 |
| RK-03 | Yard Wi-Fi coverage is poor (`OI-08`) | Operators cannot transact in parts of the yard | Site survey **before** hardware purchase; offline is a scoped change request, not a silent addition |
| RK-04 | PDA hardware arrives late (`OI-07`) | Scanner integration untested | `ScannerProvider` abstraction; CameraX fallback for development; hardware testing is a named gate |
| RK-05 | Location labelling takes longer than planned | Go-live slips | Explicit task with its own schedule and verification walk |
| RK-06 | Opening stock captured while stock is moving | Wrong opening inventory | Freeze window (`OI-20`); validation and sign-off before transactions are enabled |
| RK-07 | Timezone wrong (`OI-19`) | Every daily KPI and snapshot is silently wrong | Flagged twice in `CFG-13`; verified in the release checklist |
| RK-08 | Customer expects ERP integration in phase 1 | Scope dispute | Stated in `01-requirement-analysis.md` §2.4 as `X-04`; requires explicit sign-off |
| RK-09 | Volume far exceeds `ASM-05` | Performance shortfall | Load test against confirmed `OI-06` figures before go-live; index strategy already documented |
| RK-10 | Operators share credentials in practice | Traceability lost | Single active PDA session (`CFG-20`) makes it operationally impossible, not merely forbidden |

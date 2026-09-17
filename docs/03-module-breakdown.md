# 03 — Module Breakdown and API Module List

**Phase:** 3 — Architecture (module decomposition)
**Covers:** Deliverable B (module breakdown), Deliverable H (API module list)
**Status:** Baseline for review

---

## 1. Module map

```
┌─ M0  PLATFORM ──────────────────────────────────────────────┐
│  auth · RBAC · facility scoping · settings · audit · errors │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌─ M1  MASTER DATA ────────────┴──────────────────────────────┐
│  sites · facilities · zones · locations · customers         │
│  reason codes · users · roles · location barcodes           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌─ M2  INVENTORY CORE ─────────┴──────────────────────────────┐
│  pallet identity · state machine · current inventory        │
│  transaction recorder · concurrency · idempotency           │
└───┬───────────┬───────────┬───────────┬──────────┬──────────┘
    │           │           │           │          │
┌───┴────┐ ┌────┴────┐ ┌────┴─────┐ ┌───┴────┐ ┌───┴─────────┐
│M3 Put- │ │M4 Trans-│ │M5 Dis-   │ │M6 Hold │ │M7 Stock     │
│  Away  │ │  fer    │ │  patch   │ │  /Exc. │ │  Verif.     │
└────────┘ └─────────┘ └──────────┘ └────────┘ └─────────────┘
    │           │           │           │          │
┌───┴───────────┴───────────┴───────────┴──────────┴──────────┐
│  M8 CORRECTION & REVERSAL   (privileged, audited)           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌─ M9 READ SIDE ───────────────┴──────────────────────────────┐
│  search · location enquiry · live inventory · occupancy     │
│  traceability · transaction monitor · dashboard · reports   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌─ M10 OPERATIONS ─────────────┴──────────────────────────────┐
│  imports · opening stock · exports · label printing · alerts│
└─────────────────────────────────────────────────────────────┘
```

Modules M3–M8 are the only writers to inventory state, and every one of them writes through
M2. There is no other path to change where a pallet is.

---

## 2. Module specifications

### M0 — Platform

| | |
|---|---|
| **Purpose** | Identity, permission, configuration and accountability substrate |
| **BRD** | §6, §7 (User/Role/System Config), §15, §17 |
| **Components** | `AuthService`, `PermissionRegistry`, `FacilityScope` middleware, `SettingsRepository`, `AuditLogger`, `Handler` (exception → envelope), `CorrelationId` middleware |
| **Key rules** | Individual credentials only; one active PDA token per user; every privileged action audited; settings cached in-process per request |
| **Consumed by** | Every other module |

`SettingsRepository` is the single reader of `system_settings`. No module reads a
configuration value any other way, and no business default is written as a PHP literal
outside the settings seeder.

### M1 — Master Data

| | |
|---|---|
| **Purpose** | The physical and organisational model of the yard |
| **BRD** | §7, §11.3, §18, §20 |
| **Entities** | Site, Facility, Zone, Location, LocationBarcode, Customer, ReasonCode, User, Role, Permission |
| **Key rules** | Location code and barcode value are unique per site; a location referenced by active inventory cannot be hard-deleted; deactivating an occupied location is allowed but warns and blocks new inbound; every master change is audited |
| **Notable behaviour** | Barcode **reprint preserves identity** (BRD §18). A reprint writes an `audit_log` row and increments `location_barcodes.reprint_count`; it never issues a new value. |

Facility types: `OPEN_YARD`, `CLOSED_WAREHOUSE`, `DISPATCH_AREA`, `COLLECTION_AREA`
(BRD §7). Only `OPEN_YARD` and `CLOSED_WAREHOUSE` accept normal storage put-away;
`DISPATCH_AREA` accepts staged pallets when `CFG-09 = STAGED`.

### M2 — Inventory Core

| | |
|---|---|
| **Purpose** | Owns the invariant: one pallet, one active location |
| **BRD** | §8, §12, §17 (Data Integrity), §21 |
| **Components** | `PalletResolver`, `PalletStateMachine`, `InventoryLedger`, `TransactionRecorder`, `IdempotencyGuard`, `LocationValidator`, `LockManager` |
| **Public surface** | Not exposed over HTTP. Only M3–M8 call it. |
| **Key rules** | BR-01 … BR-08; fixed lock ordering; append-only writes; no method that updates an existing transaction row exists |

`InventoryLedger` is the only class in the codebase permitted to INSERT, UPDATE or DELETE
`inventory_current`. This is enforced by an architecture test that fails the build if any
other class references the table or model.

### M3 — Put-Away

| | |
|---|---|
| **Purpose** | Bring a pallet into live inventory at a scanned location |
| **BRD** | §9.1, master prompt §8 |
| **Flow** | scan location → validate → scan pallet → resolve & display → confirm → atomic commit |
| **Rejects** | unknown/inactive/blocked location; location outside operator's facility scope; pallet already stored (409 + current location); pallet dispatched; pallet on hold; capacity exceeded when `CFG-06 = BLOCK` |
| **Writes** | `inventory_current` INSERT, `inventory_transactions` INSERT (`PUTAWAY`), pallet status → `STORED` |
| **Audit** | Transaction row carries user, device, session, timestamp, destination, reference |

### M4 — Transfer / Location Movement

| | |
|---|---|
| **Purpose** | Move a pallet between storage locations, preserving history |
| **BRD** | §9.2, master prompt §9 |
| **Flow (default `SINGLE_STEP`)** | identify pallet → show current location → scan source (verify) → physical move → scan destination → confirm → one atomic call |
| **Rejects** | pallet not currently stored; scanned source ≠ recorded location (BR-04); destination invalid/blocked/inactive; destination = source; pallet on hold without override; capacity |
| **Writes** | `inventory_current` UPDATE of `location_id`, `inventory_transactions` INSERT (`TRANSFER`) with both source and destination |
| **Note** | The old location is released by the same UPDATE. Because `pallet_id` is the primary key, a pallet cannot end up at two locations even under a lost race. |

### M5 — Dispatch

| | |
|---|---|
| **Purpose** | Verify and remove a pallet from active inventory |
| **BRD** | §9.3, master prompt §10 |
| **Flow (default `DIRECT`)** | search/scan job or pallet → show exact location → travel → scan location → scan pallet → validate → confirm dispatch |
| **Optional staging** | When `CFG-09 = STAGED`: `STORED → STAGED_FOR_DISPATCH → DISPATCHED`, with the staging area modelled as a `DISPATCH_AREA` facility |
| **Rejects** | pallet not at scanned location (409, shows real location); already dispatched; on hold/damaged unless the operator holds `dispatch.override_hold`; unknown pallet |
| **Writes** | `inventory_current` DELETE, `inventory_transactions` INSERT (`DISPATCH`), `dispatch_transaction_details` INSERT, pallet status → `DISPATCHED`, `dispatched_at` set |
| **Captures** | delivery reference (optional, `OI-16`), vehicle reference (optional), remarks, reason code where configured |

### M6 — Hold / Damaged / Exception

| | |
|---|---|
| **Purpose** | Block a pallet from normal dispatch until released |
| **BRD** | §10 (Exception/Hold), §13, §14 (Hold/Exception Report) |
| **Actions** | `HOLD`, `MARK_DAMAGED`, `FLAG_EXCEPTION`, `RELEASE` |
| **Key rules** | Requires a reason code and remarks; sets `block_state` without disturbing `lifecycle_status` or location; release requires `hold.release` permission and is a separate audited transaction; held pallets remain visible in location stock but are excluded from dispatch-eligible lists |
| **Writes** | `pallet_holds` (open/released), `inventory_transactions` INSERT, pallet `block_state` |

### M7 — Stock Verification / Cycle Count

| | |
|---|---|
| **Purpose** | Reconcile system stock against physical scans, location by location |
| **BRD** | §10, §13, §14 (Variance Report) |
| **Flow** | select/scan location → system loads expected pallets → operator scans physically present pallets → system classifies each line → submit → supervisor review → approve/reject |
| **Line outcomes** | `MATCHED`, `MISSING` (expected, not scanned), `UNEXPECTED` (scanned, recorded elsewhere or nowhere) |
| **Key rules** | Submission never auto-corrects inventory. Approval may optionally generate correction transactions (M8) for `UNEXPECTED` lines, each individually reasoned and audited. A session is immutable once submitted. |
| **States** | `DRAFT → SUBMITTED → APPROVED \| REJECTED` |

Deliberate design point: a cycle count is *evidence*, not *authority*. Letting a count
silently rewrite inventory would violate BR-06.

### M8 — Correction / Reversal

| | |
|---|---|
| **Purpose** | The only sanctioned way to fix a completed transaction |
| **BRD** | §11.5, §12 (No Silent Edits), §15 |
| **Correction types** | `PUTAWAY_LOCATION_CORRECTION`, `TRANSFER_REVERSAL`, `DISPATCH_REVERSAL`, `STATUS_CORRECTION`, `MANUAL_RELOCATION` |
| **Mandatory** | permission `correction.perform`; reason code; free-text justification; reference to the original transaction |
| **Writes** | New `inventory_transactions` row with `correction_of_transaction_id`, `previous_value` and `new_value` JSON snapshots; original row untouched |
| **Never** | UPDATEs or DELETEs a historical row. There is no code path that can. |

PDA operators do not have this permission under any role configuration shipped by default.

### M9 — Read Side

| Sub-module | BRD | Notes |
|---|---|---|
| Search | §9.4, §10 | Job / Pallet / Customer / LPO. Returns status, facility, zone, exact location, last movement, last user, ageing |
| Location Enquiry | §10 | Scan a location → list pallets recorded there |
| Live Inventory | §11.2 | Facility → Zone → Location → Pallet drill-down with full filter set |
| Location Occupancy | §11.3 | Occupied / empty / blocked / inactive; block/unblock actions |
| Transaction Monitor | §11.4 | All transaction types, filterable, with before/after values |
| Traceability | §15, §22 FR-016 | Full chronological lifecycle for one pallet |
| Dashboard | §11.1, §23 | KPIs, ageing buckets, oldest awaiting dispatch, recent activity, exception alerts |
| Reports | §14 | 13 reports — see `10-report-catalogue.md` |

All read endpoints are paginated, permission-filtered and facility-scoped. None loads a full
table. Reports run against dedicated query objects with covering indexes, never through
model hydration.

### M10 — Operations

| Sub-module | BRD | Notes |
|---|---|---|
| Master import | §20 | CSV/Excel import for facilities, zones, locations, users. Dry-run validation with a row-level error report before any commit. |
| Pallet master import | §19 | Enriches Job/Pallet records with Customer and LPO when the barcode carries only a reference (`OI-11`) |
| Opening stock | §20 | Dedicated `OPENING_STOCK` transaction type; a go-live mode gated by a setting, validated and signed off before normal transactions are enabled |
| Label printing | §18 | Location label PDF generation, preview, batch print, reprint-with-audit |
| Exports | §11.2 | Queued Excel/PDF generation, S3-stored, expiring signed download links |
| Alerts | §16 | In-app dashboard alerts for ageing, holds, exceptions, and failed/abandoned transactions. Email is optional and off by default. |

---

## 3. API module list (deliverable H)

Base path `/api/v1`. All endpoints require authentication except `POST /auth/login` and
`GET /health`. All mutating endpoints require an `Idempotency-Key` header.

### Platform
| Method | Path | Permission |
|---|---|---|
| POST | `/auth/login` | — |
| POST | `/auth/logout` | authenticated |
| GET | `/auth/me` | authenticated |
| POST | `/auth/change-password` | authenticated |
| GET | `/auth/sessions` | authenticated — own sessions only |
| DELETE | `/auth/sessions/{id}` | authenticated — own sessions only |
| GET | `/settings` | `settings.view` |
| PUT | `/settings/{key}` | `settings.edit` |
| GET | `/health` | — |

`/auth/sessions` was added during U-1: `23-web-screens.md` W-24 specifies revocable
active sessions, and the contract had no endpoint for it. The Profile screen ships without
that section until the endpoint exists rather than rendering a permanent error state.

### Masters
| Method | Path | Permission |
|---|---|---|
| GET POST | `/sites`, `/sites/{id}` (GET PUT DELETE) | `site.*` |
| GET POST | `/facilities`, `/facilities/{id}` | `facility.*` |
| GET POST | `/zones`, `/zones/{id}` | `zone.*` |
| GET POST | `/locations`, `/locations/{id}` | `location.*` |
| POST | `/locations/import` (+ `/import/validate`) | `location.import` |
| POST | `/locations/{id}/block`, `/unblock` | `location.block` |
| GET | `/locations/{id}/pallets` | `inventory.view` |
| GET | `/customers`, POST `/customers` | `customer.*` |
| GET POST | `/reason-codes` | `reasoncode.*` |
| GET POST | `/users`, `/users/{id}` | `user.*` |
| POST | `/users/{id}/activate`, `/deactivate`, `/reset-password` | `user.edit` |
| GET POST | `/roles`, `/roles/{id}` | `role.*` |
| GET | `/permissions` | `role.view` |

### Location barcodes
| Method | Path | Permission |
|---|---|---|
| GET | `/location-barcodes/{locationId}` | `location.view` |
| GET | `/location-barcodes/{locationId}/preview` | `barcode.print` |
| POST | `/location-barcodes/print` (batch) | `barcode.print` |
| POST | `/location-barcodes/{locationId}/reprint` | `barcode.reprint` |

### Pallets & inventory
| Method | Path | Permission |
|---|---|---|
| GET | `/pallets` | `pallet.view` |
| GET | `/pallets/{id}` | `pallet.view` |
| GET | `/pallets/{id}/history` | `traceability.view` |
| POST | `/pallets/resolve-barcode` | `scan.resolve` |
| POST | `/pallets/import` | `pallet.import` |
| GET | `/inventory/current` | `inventory.view` |
| GET | `/inventory/occupancy` | `inventory.view` |
| GET | `/inventory/tree` | `inventory.view` |

### Operations (write)
| Method | Path | Permission |
|---|---|---|
| POST | `/putaway/validate-location` | `putaway.perform` |
| POST | `/putaway` | `putaway.perform` |
| POST | `/movements/validate` | `transfer.perform` |
| POST | `/movements` | `transfer.perform` |
| POST | `/dispatch/validate` | `dispatch.perform` |
| POST | `/dispatch/stage` | `dispatch.stage` |
| POST | `/dispatch` | `dispatch.perform` |
| POST | `/holds` | `hold.create` |
| POST | `/holds/{id}/release` | `hold.release` |
| POST | `/corrections` | `correction.perform` |
| POST | `/opening-stock` | `openingstock.perform` |

The `validate-*` endpoints are read-only pre-checks that let the PDA reject a bad scan
before the operator commits. They are a UX affordance, never a substitute for validation
inside the committing transaction.

### Stock verification
| Method | Path | Permission |
|---|---|---|
| GET POST | `/stock-verifications` | `stockverify.view` / `.create` |
| GET | `/stock-verifications/{id}` | `stockverify.view` |
| POST | `/stock-verifications/{id}/lines` | `stockverify.create` |
| POST | `/stock-verifications/{id}/submit` | `stockverify.create` |
| POST | `/stock-verifications/{id}/approve` `/reject` | `stockverify.approve` |

### Read side
| Method | Path | Permission |
|---|---|---|
| GET | `/search` | `search.perform` |
| GET | `/transactions` | `transaction.view` |
| GET | `/transactions/{id}` | `transaction.view` |
| GET | `/audit-logs` | `audit.view` |
| GET | `/dashboard/kpis` | `dashboard.view` |
| GET | `/dashboard/ageing` | `dashboard.view` |
| GET | `/dashboard/alerts` | `dashboard.view` |
| GET | `/reports/{report}` | `report.view.{report}` |
| POST | `/exports` | `report.export` |
| GET | `/exports/{id}` | `report.export` |

---

## 4. Module → BRD FR coverage

| Module | FRs satisfied |
|---|---|
| M0 Platform | FR-001 |
| M1 Master Data | FR-002, FR-003, FR-004 |
| M2 Inventory Core | FR-007, FR-013, FR-020 |
| M3 Put-Away | FR-005, FR-006, FR-008 |
| M4 Transfer | FR-010 |
| M5 Dispatch | FR-011, FR-012 |
| M6 Hold/Exception | FR-017 |
| M7 Stock Verification | FR-018 |
| M8 Correction | FR-019 |
| M9 Read Side | FR-009, FR-014, FR-015, FR-016 |
| M10 Operations | supports §20 migration, §11.2 export, §16 alerts |

All twenty functional requirements are allocated. No module exists that is not traceable to
a BRD clause.

---

## 5. Build order

Modules are built in dependency order, each complete to the Definition of Done in
`13-delivery-plan.md` §6 before the next begins.

```
M0 → M1 → M2 → M3 → M9(search, enquiry) → M4 → M5 → M9(inventory, dashboard)
   → M6 → M7 → M8 → M9(reports, traceability) → M10
```

Rationale for this order: M3 + search is the smallest slice that is demonstrably useful to
the customer (a pallet can be put away and found). M4 and M5 complete the operational loop.
Everything after is control and visibility on top of a correct core.

# 02 — System Architecture

**Phase:** 3 — Architecture
**Depends on:** `01-requirement-analysis.md`
**Status:** Baseline for review

---

## 1. Architectural principles

1. **The database is the arbiter of truth, not the application.** Every business invariant
   that can be expressed as a constraint is expressed as a constraint (BRD §17 Data
   Integrity; master prompt §29).
2. **One business rule, one home.** Rules live in the backend service layer. The web and PDA
   clients render and guide; they never own a rule (master prompt §40).
3. **Append-only history.** Inventory transactions are never updated or deleted. Corrections
   append (BRD §12 "No Silent Edits").
4. **Online-first.** Success is reported only after the cloud commit is acknowledged
   (BRD §21).
5. **Boring infrastructure.** No Redis, no message brokers, no microservices, no event
   sourcing. A modular monolith on MySQL is the correct size for this problem.
6. **Nothing environment-specific is compiled in.** All configuration arrives through
   environment variables or the `system_settings` table.

---

## 2. Context diagram

```
   ┌──────────────────────────┐
   │  EXISTING CUSTOMER ERP   │   OUT OF SCOPE (X-04)
   │  orders / production /   │   No API. No DB link. No credentials.
   │  pallet label generation │
   └────────────┬─────────────┘
                │  physical artefact only:
                │  printed pallet label
                ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                     PHYSICAL YARD / WAREHOUSE                   │
   │   pallet labels (ERP)        location labels (THIS SYSTEM)      │
   └───────┬─────────────────────────────────────────┬───────────────┘
           │ scans                                    │ scans
           ▼                                          ▼
   ┌───────────────────┐                     ┌──────────────────────┐
   │  PDA Android App  │                     │  Label print / affix │
   │  (Kotlin)         │                     │  (operations task)   │
   └─────────┬─────────┘                     └──────────────────────┘
             │ HTTPS  Bearer token
             ▼
   ┌─────────────────────────────────────────────────┐
   │        Laravel REST API  (/api/v1)              │
   │   auth · validation · authorisation · services  │
   │   transactions · audit · reporting · exports    │
   └───────────────┬─────────────────────────────────┘
                   │ TLS
                   ▼
           ┌────────────────┐        ┌────────────────────┐
           │  MySQL 8 (RDS) │        │  S3 (exports,      │
           │  single source │        │  label PDFs, logs) │
           └────────────────┘        └────────────────────┘
                   ▲
                   │ HTTPS  Bearer token (server-side only)
   ┌───────────────┴─────────────────────────────────┐
   │   Next.js Admin Web (React + TypeScript)        │
   │   BFF route handlers hold the session cookie    │
   └─────────────────────────────────────────────────┘
             ▲
             │ HTTPS, httpOnly session cookie
        ┌────┴─────┐
        │ Browser  │  Admin · Warehouse Admin · Supervisor · Management
        └──────────┘
```

---

## 3. Integration boundaries (deliverable L)

| Boundary | Direction | Phase 1 status | Notes |
|---|---|---|---|
| ERP → this system | none | **Not integrated** | The only crossing is the *printed label*. No endpoint, table, file drop, or credential exists in the codebase. |
| ERP label → PDA | inbound, physical | In scope | Decoded by a configurable barcode profile (`11-barcode-specification.md`) |
| Pallet master enrichment | inbound, manual | In scope | CSV/Excel import when the label carries only a reference (`OI-11`) |
| This system → label printer | outbound | In scope | PDF label sheets by default; direct ZPL is an add-on pending `OI-13` |
| This system → email | outbound | Optional (BRD §16) | SES; management summaries / critical exceptions only. Off by default. |
| This system → ERP | none | **Future phase** | Deliberately unbuilt. When commissioned, it attaches at the `PalletResolver` seam (§6.3) without touching the transaction core. |

**Design seam for the future ERP phase.** All pallet identity resolution passes through a
single interface, `PalletResolver`. Phase 1 ships `LocalPalletResolver` (barcode + imported
master). A future `ErpPalletResolver` is a drop-in replacement. Nothing else in the codebase
needs to know an ERP exists. This seam costs nothing now and is the only concession made to
a phase that is explicitly out of scope.

---

## 4. Technology stack

### 4.1 Backend
| Concern | Choice | Rationale |
|---|---|---|
| Framework | Laravel 11 (PHP 8.3) | Mandated |
| API | REST, versioned under `/api/v1` | Mandated |
| Auth | Laravel Sanctum | Token auth for PDA; cookie session via BFF for web. No extra package needed. |
| Authorisation | Native RBAC + Laravel Gates/Policies | See §4.5 |
| Database | MySQL 8.0, InnoDB, `utf8mb4` | Mandated |
| Queue | `database` driver | Exports and label generation only. **No Redis.** |
| Cache | `database` driver | Low volume; avoids an extra service |
| Session | `database` driver | Web BFF sessions |
| Scheduler | Laravel scheduler in a dedicated container | Daily snapshot, ageing alerts, export cleanup |
| Excel export | `maatwebsite/excel` | Single justified dependency for BRD §11.2 |
| PDF export / labels | `barryvdh/laravel-dompdf` | Server-side PDF for reports and location labels |
| Barcode rendering | `picqer/php-barcode-generator` | Code128/QR image generation for labels |
| Logging | Monolog → JSON to stdout → CloudWatch | Structured, correlation-id tagged |

Dependency policy: the four packages above are the complete third-party list for business
functionality. Anything further requires a written justification in this document.

### 4.2 Admin Web
| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript strict |
| Data fetching | TanStack Query against Next.js BFF route handlers |
| Forms & validation | React Hook Form + Zod (schemas mirror API contracts) |
| UI system | Tailwind CSS + Radix primitives, custom enterprise design tokens |
| Tables | TanStack Table — server-side pagination, sorting, filtering |
| Charts | Recharts, restricted to the dashboard |
| Testing | Vitest (unit), Playwright (E2E) |

No component library that imposes a consumer-grade visual identity is used. The design
system is defined in `06-web-screen-specification.md` §2.

### 4.3 PDA Android
| Concern | Choice |
|---|---|
| Language | Kotlin |
| Min / target SDK | Placeholder pending `OI-07` — **do not fix until device is confirmed** |
| UI | Jetpack Compose, custom large-target industrial theme |
| Architecture | MVVM, unidirectional state, `StateFlow` |
| DI | Hilt |
| Networking | Retrofit + OkHttp + kotlinx.serialization |
| Scanner | `ScannerProvider` interface; `DataWedgeScannerProvider` default, `CameraXScannerProvider` fallback for development |
| Local storage | EncryptedSharedPreferences — **auth token and UI preferences only. No transaction queue.** |
| Testing | JUnit5 + Turbine (unit), Compose UI tests, MockWebServer (contract) |

### 4.4 Application layering (backend)

```
HTTP layer      Routes → FormRequest (validation) → Controller (thin) → Resource (response)
                        ↓ Policy / Gate (authorisation)
Domain layer    Service  ← the only place a business rule lives
                  ├── PutAwayService, TransferService, DispatchService
                  ├── HoldService, CorrectionService, StockVerificationService
                  ├── PalletResolver (identity seam)
                  ├── LocationValidator, PalletStateMachine
                  └── TransactionRecorder (append-only writer)
Data layer      Eloquent models + query objects for reporting
                  ├── Models: thin, relationships + casts only
                  └── Reports use dedicated query builders (no model hydration)
Cross-cutting   IdempotencyGuard · AuditLogger · Handler (exception → API envelope)
```

**Repository pattern is used selectively, not universally.** Eloquent is already a data
access abstraction; wrapping every model in a repository adds indirection without benefit.
Dedicated query objects are used only where reporting SQL is complex enough to deserve
isolation and its own tests.

### 4.5 Why native RBAC instead of `spatie/laravel-permission`

The BRD requires permissions **and** site/facility scoping (BR-09), which that package does
not model. Mixing package-managed permissions with hand-rolled scoping produces two
authorisation systems. A native implementation — `roles`, `permissions`,
`role_permissions`, `user_facility_access` plus Laravel's own Gate — is roughly 200 lines,
fully tested, and keeps one authorisation path.

---

## 5. Authentication design

### 5.1 PDA
- `POST /api/v1/auth/login` with username, password, `device_id`, `device_model`.
- Returns a Sanctum personal access token bound to that device, plus the effective
  permission set and facility scope.
- Token TTL is `CFG-11` (session timeout, pending `OI-15`). Idle expiry is enforced
  server-side; the PDA surfaces a clear re-login screen rather than failing silently.
- `device_id` is recorded on every transaction (BRD §15, `ASM-06`).
- **Concurrent-session policy:** one active token per user by default. A second login
  revokes the first. This is what makes "no shared credentials" real rather than a policy
  statement — two forklifts cannot run on one account at once.

### 5.2 Admin Web (BFF pattern)
- Browser posts credentials to a Next.js route handler.
- The route handler calls the Laravel API, receives the token, and stores it in an
  `httpOnly`, `Secure`, `SameSite=Strict` cookie. **The token never reaches client-side JS.**
- All browser → API traffic goes through Next.js route handlers that attach the bearer token
  server-side.
- Consequence: no CSRF token dance across origins, no token in `localStorage`, no XSS token
  theft. The Laravel API remains stateless and identical for both clients.

---

## 6. The inventory core

This is the part of the system that must not be got wrong.

### 6.1 The invariant

> **One pallet has at most one active current location.** (BR-01 / FR-007)

Enforced at three levels:

1. **Schema.** `inventory_current.pallet_id` is the PRIMARY KEY. A pallet physically cannot
   have two active location rows. A dispatched pallet has *no* row.
2. **Transaction.** Every state change runs inside `DB::transaction()` with
   `SELECT ... FOR UPDATE` on the pallet row taken **first**, before any other read. Lock
   ordering is fixed (pallet → source location → destination location, each by ascending id)
   so deadlocks cannot form between concurrent operators.
3. **Service.** `PalletStateMachine::assertTransition()` rejects any move not on the allowed
   edge list before a write is attempted.

### 6.2 Concurrency behaviour (BR-02, FR-013, FR-020)

Two operators scanning the same pallet at the same moment:

```
Operator A                          Operator B
POST /putaway  (idem key A)         POST /putaway  (idem key B)
  BEGIN                               BEGIN
  SELECT pallet FOR UPDATE ──┐        SELECT pallet FOR UPDATE ── blocks
  validate: no current row   │          …waiting…
  INSERT inventory_current   │
  INSERT inventory_transaction
  COMMIT ────────────────────┘        …acquires lock…
                                      validate: current row EXISTS
                                      → 409 Conflict
                                      → payload carries the live location,
                                        the winning user and timestamp
                                      ROLLBACK
```

Operator B's PDA shows: *"Already stored — Yard A / Zone 2 / A-02-14, by R. Kumar at
10:42."* That is the "clear refresh/error message" BRD §12 requires — a conflict response
is only useful if it tells the operator what the truth now is.

MySQL lock-wait timeout is set low (5 s) so a stuck transaction surfaces as a retryable
error rather than a frozen PDA.

### 6.3 Pallet identity

```
scanned barcode string
        ↓
BarcodeProfileParser   (configurable; default RAW_REFERENCE)
        ↓
ParsedPalletIdentity { job_number?, pallet_number?, raw_value, customer?, lpo? }
        ↓
PalletResolver
   ├── build pallet_key per CFG-01 (JOB_PALLET | PALLET_ONLY)
   ├── find existing pallet by pallet_key
   └── if absent: create (ASM-03) with whatever fields are known,
       enriching from imported pallet master when available
        ↓
Pallet (id, pallet_key, job_number, pallet_number, customer_id?, lpo?)
```

`pallet_key` is a stored, generated-at-write column with a UNIQUE index. It is never
recomputed on read, so the key of an existing pallet cannot silently change if `CFG-01` is
altered — which is itself blocked once transactions exist.

### 6.4 Idempotency (BR-08, master prompt §17)

Industrial scanners emit repeat events; forklift operators double-tap. Both are handled, at
different layers:

| Layer | Mechanism | Window |
|---|---|---|
| Scanner driver | Identical barcode within `CFG-05` ms is discarded | default 800 ms |
| PDA UI | Confirm button disabled while a request is in flight | request duration |
| API | `Idempotency-Key` header, unique per attempt | `CFG-12`, default 24 h |

The API guard stores `(idempotency_key, user_id)` with the serialised response. A replay
returns the **original** response with `Idempotency-Replayed: true` — not an error. This is
the difference between "duplicate protection" and "breaking legitimate retries after a
dropped connection": an operator whose network died mid-confirm retries and gets the real
success, not a false conflict.

Legitimate consecutive scans are never blocked, because the key is generated fresh per
user-initiated confirmation, not per barcode.

---

## 7. Transaction and audit model

Two append-only stores, with different jobs:

| | `inventory_transactions` | `audit_logs` |
|---|---|---|
| Records | Anything that moves or re-states a pallet | Everything else worth answering for |
| Examples | put-away, transfer, dispatch, hold, release, damage, correction, opening stock | master create/edit, user activate/deactivate, role change, barcode reprint, login/logout, manual-override use, export |
| Write path | `TransactionRecorder`, inside the business transaction | `AuditLogger`, via model observers + explicit calls |
| Mutable | Never | Never |

A single `inventory_transactions` table is used rather than separate
`movement_transactions` / `dispatch_transactions` tables. Rationale: every one of those is
"a pallet changed state at a time, by a user, from somewhere to somewhere". Splitting them
forces every traceability query (FR-016) and every register report to `UNION` across tables,
and makes the chronological lifecycle view — the BRD's central traceability requirement —
harder to get right and slower. Dispatch-specific fields live in a 1:1
`dispatch_transaction_details` table, so nothing is duplicated and nothing is crammed into a
generic column. This is a deliberate, justified deviation from the table list in master
prompt §29, which is framed as "at minimum consider".

---

## 8. Error and response contract

Every endpoint returns the same envelope. Clients have one parser and one error path.

```jsonc
// success
{ "success": true, "data": { }, "meta": { "pagination": { } } }

// failure
{
  "success": false,
  "error": {
    "code": "PALLET_ALREADY_STORED",       // stable, machine-readable
    "message": "Pallet is already stored.", // operator-safe, shown on the PDA
    "details": { "location_code": "A-02-14", "stored_by": "R. Kumar",
                 "stored_at": "2026-09-16T10:42:11+04:00" },
    "trace_id": "01J8X…"                    // correlates to server logs
  }
}
```

| HTTP | Used for |
|---|---|
| 200 / 201 | Success |
| 401 | Unauthenticated / token expired |
| 403 | Authenticated but not permitted (incl. facility scope) |
| 404 | Unknown barcode, pallet, or location |
| 409 | Business conflict — already stored, already dispatched, lost race |
| 422 | Validation failure |
| 423 | Pallet on hold / location blocked |
| 429 | Rate limited |
| 500 | Unexpected — generic message only, `trace_id` for support |

Stack traces, SQL, and internal identifiers are never returned. `APP_DEBUG=false` is
asserted by a production smoke test, not left to discipline.

---

## 9. Real-time inventory (BRD §32)

After a committed PDA transaction the web must show the new state.

**Phase 1 mechanism:** authenticated polling with HTTP caching.
- Dashboard and live-inventory endpoints return `ETag` + `Last-Modified`.
- The web client polls on a `CFG-14` interval (default 15 s) and only when the tab is
  visible.
- Unchanged data returns `304 Not Modified` — a few bytes, no query execution beyond a
  cheap watermark lookup.

This meets the requirement with zero added infrastructure and no Redis. It is honest about
what it is: near-real-time, bounded by the poll interval.

**Documented upgrade path (not phase 1):** Laravel Reverb on a single container, `database`
queue driver, broadcasting `InventoryChanged` events. Reverb needs no Redis at single-node
scale. This is only worth doing if the customer states an operational need for sub-second
web updates — it is not needed for the flows in the BRD.

---

## 10. Repository layout

```
/
├── api/                        Laravel backend
│   ├── app/
│   │   ├── Domain/             business logic, by bounded area
│   │   │   ├── Inventory/      services, state machine, recorder
│   │   │   ├── Masters/
│   │   │   ├── Barcode/        profiles, parsers, label generation
│   │   │   ├── Verification/
│   │   │   └── Reporting/      query objects, exporters
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/
│   │   │   ├── Requests/
│   │   │   ├── Resources/
│   │   │   └── Middleware/     Idempotency, FacilityScope, AuditContext
│   │   ├── Models/
│   │   ├── Policies/
│   │   └── Support/            envelope, exceptions, correlation id
│   ├── database/{migrations,seeders,factories}/
│   ├── routes/api_v1.php
│   └── tests/{Unit,Feature,Concurrency}/
│
├── web/                        Next.js admin
│   ├── src/app/(auth)/ (dashboard)/ api/    BFF route handlers
│   ├── src/components/{ui,data-table,forms,layout}/
│   ├── src/lib/{api-client,permissions,format}/
│   └── tests/{unit,e2e}/
│
├── pda/                        Android
│   └── app/src/main/java/.../{ui,domain,data,scanner,di}/
│
├── infra/
│   ├── docker/                 Dockerfiles + compose for local dev
│   ├── aws/                    IaC + task definitions
│   └── github/                 reusable workflow fragments
│
└── docs/                       these documents
```

Three deployable artefacts, one repository. A monorepo is correct here: the API contract
changes in lockstep with two clients, and a single PR must be able to change all three.

---

## 11. Environments

| | Development | Staging | Production |
|---|---|---|---|
| Runs on | Docker Compose, developer machine | AWS, reduced size | AWS |
| Database | MySQL 8 container | RDS single-AZ | RDS Multi-AZ |
| Data | Demo seeders | Anonymised/synthetic | Real |
| `APP_DEBUG` | true | false | false |
| Barcode profile | `RAW_REFERENCE` | as confirmed | as confirmed |
| Deployed by | — | auto on merge to `develop` | manual approval on tag |

Full detail in `12-deployment-architecture.md`.

---

## 12. Architecture decision record

| ID | Decision | Rejected alternative | Because |
|---|---|---|---|
| AD-01 | Modular monolith | Microservices | One team, one database, one transaction boundary. Distribution would make BR-01 harder, not easier. |
| AD-02 | Polling for live web data | WebSockets / Redis | Meets the requirement, no new infrastructure, explicitly directed by master prompt §32 |
| AD-03 | Single `inventory_transactions` table | Per-type transaction tables | Traceability and registers are the core read patterns; UNION-ing them is slower and more error-prone |
| AD-04 | Lifecycle status separate from block state | Single status enum | Preserves location during hold; release has a defined destination state (`ASM-01`) |
| AD-05 | Pessimistic locking on the pallet row | Optimistic version column | Contention is on a single hot row for a few hundred ms; pessimistic is simpler and gives a better operator message |
| AD-06 | `database` queue driver | Redis / SQS | Only exports and label PDFs are queued; volume is trivial |
| AD-07 | BFF cookie pattern for web auth | Token in `localStorage` | Removes XSS token theft and cross-origin CSRF complexity in one move |
| AD-08 | Native RBAC | `spatie/laravel-permission` | Facility scoping is required and unsupported there; two auth systems is worse than 200 lines |
| AD-09 | Online-only PDA | Offline queue | BRD §25 excludes it; offline without agreed conflict rules would break BR-01 |
| AD-10 | Monorepo | Three repositories | Contract changes must be atomic across API and both clients |

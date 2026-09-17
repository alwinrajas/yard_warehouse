# 14 — Test Strategy and Test Plan

**Phase:** 13 — Testing
**Covers:** Deliverable O
**BRD:** §27 (Acceptance Criteria), master prompt §35
**Status:** Baseline for review

---

## 1. Principle

> A feature is not complete because the UI works.

The riskiest behaviour in this system — two operators acting on one pallet at the same
moment — is invisible in manual testing and cannot be caught by a UI walkthrough. It is
tested with real parallel processes against a real MySQL instance, and that suite runs on
every pull request.

---

## 2. Test pyramid

```
                    ┌─────────────────┐
                    │   Manual UAT    │  customer-executed, BRD §27
                    ├─────────────────┤
                    │   E2E (Playwright, instrumented Android)
                    ├─────────────────┤
                    │   CONCURRENCY   │  ← real MySQL, parallel processes
                    │   (the critical layer for this system)
                    ├─────────────────┤
                    │  Feature / API  │  Pest, full HTTP stack
                    ├─────────────────┤
                    │  Unit           │  state machine, validators, parsers
                    └─────────────────┘
```

The concurrency band sits unusually high in the pyramid on purpose. For most systems it is a
niche concern; here it is FR-013, FR-020, BR-01 and BR-02 — the core of what the customer is
buying.

---

## 3. A — Unit tests

Pure logic, no database, fast.

| Area | Cases |
|---|---|
| `PalletStateMachine` | Every allowed transition succeeds; **every disallowed transition throws**. Table-driven from the same constant the documentation is generated from. |
| `BarcodeProfileParser` | Each strategy against valid, malformed, empty, truncated and control-character input |
| `PalletResolver` | `pallet_key` generation under both `CFG-01` values; identity stability |
| `LocationValidator` | active / inactive / blocked / wrong type / out of scope / capacity at `OFF`, `WARN`, `BLOCK` |
| Ageing calculator | Bucket boundaries at exactly 7, 8, 15, 16, 30, 31 days; timezone boundary at midnight |
| `PermissionRegistry` | Code format; no duplicates; every permission referenced by a route exists |
| Response envelope | Success and error serialisation for every error code |
| Idempotency hashing | Same payload → same hash; different payload → different hash |

**Coverage target: 90% of `app/Domain`.** Coverage elsewhere is not a target — it is a
diagnostic.

---

## 4. B — Feature / API tests

Full HTTP stack against a real MySQL database.

### Authentication
- Valid login returns a token, permission set and facility scope
- Invalid credentials return 401 with no user enumeration
- Inactive user cannot log in
- Locked account rejected until lockout expires
- `PDA_OPERATOR` cannot log in to web; `VIEWER` cannot log in to PDA
- Token expiry returns 401 with the expected code
- New PDA login revokes the previous token (`CFG-20`)
- Deactivating a user immediately invalidates their active token

### Authorisation
- **Generated matrix test:** every role × every permission-guarded endpoint, asserting 403 where the role lacks the permission and 2xx where it holds it
- Facility scope: a user scoped to Yard A receives 403 for a Yard B location
- Scope applies to list endpoints (Yard B records absent, not merely hidden)
- **Scope applies to exports** — the export file contains no out-of-scope rows
- The four deliberate denials in `07-permission-matrix.md` §3.4 each asserted individually

### Put-away
- Happy path: creates `inventory_current`, writes the transaction, sets status
- Rejects: unknown location · inactive location · blocked location (with reason returned) · wrong location type · out-of-scope location
- Rejects: already stored → **409 carrying the current location, user and timestamp**
- Rejects: already dispatched · pallet in `EXCEPTION`
- Capacity: allowed at `OFF`, warns at `WARN`, rejects at `BLOCK`
- Unknown pallet barcode auto-creates the pallet (`ASM-03`)
- Idempotent replay returns the original response, not a duplicate transaction
- Exactly one transaction row is written per successful call

### Transfer
- Happy path: updates location, preserves `putaway_at`, writes a transaction with both source and destination
- Rejects: source mismatch → 409 with the real location
- Rejects: pallet not in inventory · same source and destination · invalid destination
- Permitted while `ON_HOLD`; rejected while `EXCEPTION`
- **After transfer, exactly one `inventory_current` row exists** and it names the new location
- The previous location appears in history and nowhere in current inventory

### Dispatch
- Happy path: deletes `inventory_current`, writes transaction + details, sets `DISPATCHED`
- Rejects: pallet not at the scanned location → 409 with the real location
- Rejects: already dispatched → 409 with the original dispatch date and user
- Rejects: on hold → 423 with the hold reason; succeeds with `dispatch.override_hold` and writes an `override.used` audit row
- Staging mode: direct dispatch rejected when `CFG-09 = STAGED`
- Dispatched pallet is absent from live inventory and present in full history

### Holds, verification, corrections
- Hold requires reason and remarks; sets `block_state` without changing location or lifecycle status
- Release requires `hold.release`; closes the hold; writes a transaction
- Held pallet is excluded from dispatch-eligible lists but present in location stock
- Verification: expected set frozen at start; correct classification of matched/missing/unexpected; session immutable after submit; approval does not silently move inventory
- Correction: requires permission, reason and justification; **original transaction row is byte-identical afterwards**; new row carries before/after values and the link
- Dispatch reversal re-creates the inventory row and restores `STORED`

### Read side
- Search by job, pallet, customer, LPO; multiple pallets per job all returned
- Location enquiry lists exactly the pallets recorded there
- Pagination: page boundaries, total counts, stable ordering
- Dashboard KPIs match directly-computed control queries
- Ageing buckets sum to the total active pallet count
- Every report returns data, honours filters, paginates and exports
- Daily snapshot identity holds: `opening + putaway − dispatch = closing`
- `ETag`/`304` behaviour on dashboard and inventory endpoints

---

## 5. C — Concurrency tests

**The most important suite in the project.** Real MySQL, real parallel processes, no mocks.
Each scenario runs for N iterations to expose timing-dependent failures.

| ID | Scenario | Assertion |
|---|---|---|
| TC-CONC-01 | Two operators put away the **same pallet** to different locations simultaneously | Exactly one 201 and one 409. One `inventory_current` row. One `PUTAWAY` transaction. The 409 names the winning location. |
| TC-CONC-02 | Two operators put away **different pallets** to the same location | Both succeed. Location holds two pallets (or the second is rejected if `CFG-06 = BLOCK` and capacity is 1). |
| TC-CONC-03 | Two operators dispatch the same pallet simultaneously | Exactly one 200 and one 409. One `DISPATCH` transaction. No double dispatch. |
| TC-CONC-04 | Transfer and dispatch of the same pallet simultaneously | One succeeds; the other returns 409 with the current state. State is internally consistent. |
| TC-CONC-05 | Two transfers of the same pallet to different destinations | One wins. Exactly one current row. Exactly one `TRANSFER` transaction. |
| TC-CONC-06 | The same request replayed 10× with one idempotency key | One transaction. Ten identical responses. Nine flagged as replays. |
| TC-CONC-07 | The same idempotency key with a **different** payload | 422. No second transaction. |
| TC-CONC-08 | Put-away and hold on the same pallet simultaneously | Both outcomes internally consistent; no lost update to `block_state` |
| TC-CONC-09 | Two holds placed on one pallet simultaneously | Exactly one open hold (DC-12) |
| TC-CONC-10 | 5 operators × 20 sequential transactions each, interleaved | Zero invariant violations; no deadlocks; all 100 transactions recorded exactly once |
| TC-CONC-11 | Transfer into a location that is blocked concurrently | Either succeeds before the block or is rejected after; never lands in a blocked location |
| TC-CONC-12 | Dispatch reversal while another operator puts the pallet away | Exactly one current row afterwards |

**The invariant check runs after every concurrency test:**
```sql
SELECT pallet_id, COUNT(*) FROM inventory_current GROUP BY pallet_id HAVING COUNT(*) > 1;
-- must return zero rows, always
```
It cannot return rows — `pallet_id` is the primary key. The assertion exists so that if
someone ever changes that key, the failure is immediate and unmissable rather than
discovered in production.

Deadlock detection: any `SQLSTATE 40001` during these tests fails the suite. Lock ordering
(CC-03) is what prevents them, and this is how that claim is kept honest.

---

## 6. D — PDA tests

| Layer | Coverage |
|---|---|
| Unit | ViewModel state transitions; scan debounce at, just under and just over `CFG-05`; idempotency key lifecycle (reused across retries, fresh per confirm) |
| Contract | MockWebServer: 201 success · 409 conflict (assert the "current truth" screen renders the real location) · 423 blocked · 401 mid-flow · 500 · timeout → retry → unconfirmed screen |
| Instrumented | `FakeScannerProvider` injects: valid barcode · invalid barcode · repeated identical scan · wrong barcode type · empty · overlong |
| Flow | Complete put-away, transfer, dispatch, stock check and enquiry journeys |
| UX (automated) | Touch targets ≥ 64 dp; primary actions ≥ 88 dp; contrast ≥ 7:1; no flow requires typing on the happy path |
| Network | Airplane-mode transitions; loss mid-confirm; recovery; **success is never displayed without a `txn_ref`** |
| Device | On the confirmed hardware (`OI-07`): scanner trigger, sunlight legibility, gloved operation, battery over a shift |

The last row cannot be automated and cannot be skipped. It is a scheduled field session, not
a checkbox.

---

## 7. E — Web tests

| Layer | Coverage |
|---|---|
| Unit (Vitest) | Formatters, permission helpers, filter serialisation, Zod schemas |
| Component | Data table sorting/pagination/selection; filter bar; all four page states |
| E2E (Playwright) | Login per role · dashboard KPIs match the API · live inventory filter and drill-down · export download and content · master CRUD · location block/unblock · hold and release · correction with confirmation · traceability timeline · **navigation hidden for unpermitted roles** · forbidden state on direct URL access |
| Accessibility | axe-core on every screen; keyboard-only completion of primary journeys |
| Responsive | 1280 / 1024 / 768 breakpoints |

---

## 8. F — Regression and non-functional

| Type | Approach |
|---|---|
| Regression | Full automated suite on every PR. Every production defect gets a failing test before it gets a fix. |
| Load | k6 against staging at `OI-06` volumes: 5 concurrent PDA operators at realistic scan cadence; 20 concurrent web users; report generation under load. **Target: p95 ≤ 800 ms for scan endpoints.** |
| Soak | 4-hour run at operational load; watch for connection leaks, memory growth and queue backlog |
| Query plan | `EXPLAIN` assertions for every report and hot-path query; a plan regression fails the build |
| Security | Automated: secret scan, dependency audit, the permission matrix suite, an `APP_DEBUG=false` assertion. Manual: pre-go-live review against `09-security-design.md` §10 |

---

## 9. Acceptance criteria verification (BRD §27, master prompt §43)

Each criterion maps to an automated test. UAT confirms them with the customer on real
hardware; it does not discover them.

| # | Acceptance criterion | Verified by |
|---|---|---|
| 1 | Pallet put away by scanning location + pallet | TC-PUT-01 (API) + PDA flow test |
| 2 | Web immediately shows the correct current location | TC-PUT-05 + E2E poll assertion |
| 3 | Stored pallet searchable by job/pallet | TC-SRCH-01..04 |
| 4 | PDA shows the current exact location | PDA search flow test |
| 5 | Pallet transferable old → new location | TC-TRF-01 |
| 6 | Only the new location remains current | TC-TRF-06 + invariant check |
| 7 | Old movement remains in history | TC-TRF-07, TC-TRC-02 |
| 8 | Dispatch requires valid location + pallet verification | TC-DSP-03, TC-DSP-04 |
| 9 | Dispatch removes the pallet from active inventory | TC-DSP-01, TC-DSP-08 |
| 10 | Complete history remains available | TC-TRC-01 |
| 11 | Simultaneous operators cannot duplicate, double-dispatch or conflict | **TC-CONC-01 … TC-CONC-12** |
| 12 | Management can view live inventory, location stock, history, ageing, dashboard | TC-DASH-*, TC-RPT-* |
| 13 | Users access only permitted modules/actions | Permission matrix suite (all roles × all permissions) |

---

## 10. Test data

| Rule | Reason |
|---|---|
| Factories generate all test data | No fixture drift |
| Seeders contain reference data only — permissions, roles, settings, reason-code categories | Nothing customer-specific reaches an environment by accident |
| Demo data is explicitly named `DEMO-*` and lives in a separate seeder | Impossible to mistake for real data |
| **No mock data in any production code path** | Master prompt §40 |
| Staging data is anonymised or synthetic | Real customer data does not leave production |
| Each concurrency test creates and tears down its own isolated fixtures | Parallel test runs cannot interfere |

---

## 11. Entry and exit criteria

**Entry to system testing:** all increments through I-13 meet the Definition of Done; unit
and feature suites green; concurrency suite green; no open critical defect.

**Exit from system testing (go-live readiness):**
- [ ] All automated suites green on the release candidate
- [ ] Concurrency suite green over 10 consecutive runs (timing-dependent failures do not reproduce every time)
- [ ] Load test meets the p95 target at confirmed volumes
- [ ] Security checklist (`09-security-design.md` §10) complete
- [ ] **Restore drill executed and recorded** (`12-deployment-architecture.md` §7)
- [ ] All 13 acceptance criteria demonstrated on real hardware
- [ ] UAT signed off by the customer
- [ ] Zero open critical or high defects
- [ ] Opening stock captured, validated and signed off

# 05 — Pallet Lifecycle, State Machine and Business Rules

**Phase:** 5 — Business rules and state transitions
**Covers:** Deliverable D (pallet lifecycle/state machine), Deliverable E (transaction/business-rule matrix)
**Status:** Baseline for review

---

## 1. The two-axis state model

BRD §8 lists seven statuses in one sequence. Implemented as two orthogonal axes and
recombined for display (`ASM-01`, AMB-02).

### Axis 1 — `lifecycle_status` (where the pallet is)

| Value | Meaning | Has `inventory_current` row? |
|---|---|---|
| `AT_COLLECTION_POINT` | Known to the system, not yet stored | No |
| `STORED` | At a storage location, live inventory | **Yes** |
| `IN_MOVEMENT` | Picked, not yet dropped — only when `CFG-08 = TWO_STEP` | Yes (still at source) |
| `STAGED_FOR_DISPATCH` | Picked into a dispatch area — only when `CFG-09 = STAGED` | Yes (at the staging location) |
| `DISPATCHED` | Left the premises. Terminal. | **No** |

### Axis 2 — `block_state` (whether it may move)

| Value | Meaning | Blocks dispatch? | Blocks transfer? |
|---|---|---|---|
| `NONE` | Normal | No | No |
| `ON_HOLD` | Quality/commercial hold (BRD §13) | Yes | No — it may still be relocated |
| `DAMAGED` | Physically damaged | Yes | No |
| `EXCEPTION` | Data or process exception awaiting supervisor action | Yes | Yes |

Transfer remains permitted under `ON_HOLD` and `DAMAGED` on purpose: a held pallet still has
to be moved out of a lane that needs clearing. What a hold prevents is the pallet *leaving*,
which is what the BRD asks for.

### Display mapping (what users see)

```
if block_state != NONE  ->  display block_state   ("On Hold", "Damaged", "Exception")
else                    ->  display lifecycle_status
```

The seven BRD status names are exactly reproduced. Users, reports, filters and exports never
see the two-axis structure; it is an implementation detail that keeps location and
blocking independent.

---

## 2. Lifecycle state machine

```
                        ┌──────────────────────┐
     (barcode scanned   │ AT_COLLECTION_POINT  │
      or pallet         └───────────┬──────────┘
      imported)                     │ PUTAWAY
                                    │ OPENING_STOCK
                                    ▼
      CORRECTION ┌───────────────────────────────────┐
      (relocate) │             STORED                │◄──────┐
        ─────────►│  (has exactly one location row)  │       │
                 └──┬────────────┬──────────┬────────┘       │
                    │            │          │                │
         TRANSFER   │            │ STAGE    │ DISPATCH       │ TRANSFER
        (SINGLE_STEP│            │ (CFG-09  │ (CFG-09        │ (arrival,
         self-loop) │            │ =STAGED) │  =DIRECT)      │  TWO_STEP)
                    │            ▼          │                │
                    │  ┌──────────────────┐ │        ┌───────┴────────┐
                    │  │STAGED_FOR_DISPATCH│ │        │  IN_MOVEMENT   │
                    │  └────────┬──────────┘ │        │ (CFG-08        │
                    │           │ DISPATCH   │        │  =TWO_STEP)    │
                    │           │            │        └────────────────┘
                    │           │  ┌─────────┘                ▲
                    │           ▼  ▼                          │ TRANSFER_PICK
                    │     ┌────────────────┐                  │
                    └────►│   DISPATCHED   │                  │
                          │   (terminal)   │──────────────────┘
                          └───────┬────────┘   (no path back except:)
                                  │
                                  │ CORRECTION: DISPATCH_REVERSAL
                                  │ (privileged, reasoned, audited)
                                  ▼
                               STORED
```

### Allowed transitions

| From | To | Trigger | Permission | Conditions |
|---|---|---|---|---|
| `AT_COLLECTION_POINT` | `STORED` | `PUTAWAY` | `putaway.perform` | location valid/active/unblocked/in scope; no existing inventory row; capacity ok |
| *(no record)* | `STORED` | `PUTAWAY` | `putaway.perform` | pallet auto-created (`ASM-03`) |
| *(no record)* | `STORED` | `OPENING_STOCK` | `openingstock.perform` | go-live mode active |
| `STORED` | `STORED` | `TRANSFER` | `transfer.perform` | scanned source = recorded location; destination valid and ≠ source; `block_state != EXCEPTION` |
| `STORED` | `IN_MOVEMENT` | `TRANSFER_PICK` | `transfer.perform` | only when `CFG-08 = TWO_STEP` |
| `IN_MOVEMENT` | `STORED` | `TRANSFER_DROP` | `transfer.perform` | destination valid |
| `STORED` | `STAGED_FOR_DISPATCH` | `STAGE` | `dispatch.stage` | only when `CFG-09 = STAGED`; `block_state = NONE` or override |
| `STORED` | `DISPATCHED` | `DISPATCH` | `dispatch.perform` | only when `CFG-09 = DIRECT`; scanned location = recorded location; `block_state = NONE` or `dispatch.override_hold` |
| `STAGED_FOR_DISPATCH` | `DISPATCHED` | `DISPATCH` | `dispatch.perform` | same block rules |
| `STAGED_FOR_DISPATCH` | `STORED` | `CORRECTION` | `correction.perform` | staging cancelled; reason required |
| `DISPATCHED` | `STORED` | `CORRECTION` (`DISPATCH_REVERSAL`) | `correction.perform` | reason + remarks + original transaction reference mandatory |

Every other transition is rejected by `PalletStateMachine::assertTransition()` before any
write occurs. The allowed-edge list above is a single constant in the codebase; the table
here and that constant are kept in sync by a test that reads both.

### `block_state` transitions

| From | To | Trigger | Permission |
|---|---|---|---|
| `NONE` | `ON_HOLD` | `HOLD` | `hold.create` |
| `NONE` | `DAMAGED` | `MARK_DAMAGED` | `hold.create` |
| `NONE` | `EXCEPTION` | `FLAG_EXCEPTION` | `hold.create` |
| `ON_HOLD` / `DAMAGED` / `EXCEPTION` | `NONE` | `RELEASE` | `hold.release` |
| any blocked | any other blocked | *not allowed* | — release first, then re-apply |

A block cannot be applied to a `DISPATCHED` pallet. Holding something that has already left
the premises is meaningless and would produce a pallet that reports as blocked forever.

---

## 3. Transaction / business-rule matrix (deliverable E)

Legend for validation order: checks run **top to bottom**, and the first failure returns.
Order matters — the operator should be told the most actionable problem first.

### 3.1 PUT-AWAY (BRD §9.1, FR-005/006/008)

| # | Validation | Failure | HTTP | Error code |
|---|---|---|---|---|
| 1 | Authenticated, `putaway.perform` | reject | 403 | `PERMISSION_DENIED` |
| 2 | Idempotency key present and unused | replay original | 200 | *(replayed)* |
| 3 | Location barcode resolves | reject | 404 | `LOCATION_NOT_FOUND` |
| 4 | Location `is_active` | reject | 422 | `LOCATION_INACTIVE` |
| 5 | Location not `is_blocked` | reject | 423 | `LOCATION_BLOCKED` (returns block reason) |
| 6 | Location type accepts storage | reject | 422 | `LOCATION_TYPE_INVALID` |
| 7 | Location within operator's facility scope | reject | 403 | `FACILITY_OUT_OF_SCOPE` |
| 8 | Pallet barcode resolves or is creatable | reject | 404 | `PALLET_BARCODE_UNREADABLE` |
| 9 | **Lock pallet row `FOR UPDATE`** | — | — | — |
| 10 | Pallet has no `inventory_current` row | reject | **409** | `PALLET_ALREADY_STORED` + current location, user, timestamp |
| 11 | Pallet `lifecycle_status != DISPATCHED` | reject | 409 | `PALLET_ALREADY_DISPATCHED` |
| 12 | `block_state != EXCEPTION` | reject | 423 | `PALLET_BLOCKED` |
| 13 | Capacity, when `CFG-06 = BLOCK` | reject | 422 | `LOCATION_CAPACITY_EXCEEDED` |
| — | **COMMIT:** insert `inventory_current`, insert transaction, update pallet | — | 201 | — |

Writes, in one transaction: `inventory_current` INSERT · `inventory_transactions` INSERT
(`PUTAWAY`, destination set, source null) · `pallets` status → `STORED`, `first_putaway_at`
if null, `last_movement_at`, `last_action_by`.

### 3.2 TRANSFER (BRD §9.2, FR-010)

| # | Validation | Failure | HTTP | Error code |
|---|---|---|---|---|
| 1 | `transfer.perform` | reject | 403 | `PERMISSION_DENIED` |
| 2 | Idempotency | replay | 200 | — |
| 3 | Pallet resolves | reject | 404 | `PALLET_NOT_FOUND` |
| 4 | **Lock pallet row** | — | — | — |
| 5 | Pallet has an `inventory_current` row | reject | 409 | `PALLET_NOT_IN_INVENTORY` |
| 6 | Scanned source = recorded location (BR-04) | reject | 409 | `SOURCE_LOCATION_MISMATCH` + real location |
| 7 | `block_state != EXCEPTION` | reject | 423 | `PALLET_BLOCKED` |
| 8 | Destination resolves | reject | 404 | `LOCATION_NOT_FOUND` |
| 9 | Destination active, unblocked, right type, in scope | reject | 422/423/403 | as put-away |
| 10 | Destination ≠ source | reject | 422 | `SAME_LOCATION` |
| 11 | Capacity when `BLOCK` | reject | 422 | `LOCATION_CAPACITY_EXCEEDED` |
| — | **COMMIT:** update `inventory_current.location_id`, insert transaction | — | 200 | — |

Writes: `inventory_current` UPDATE (location + denormalised facility/zone/site + `stored_at`;
**`putaway_at` is not touched**, so ageing survives relocation) · `inventory_transactions`
INSERT (`TRANSFER`, both source and destination) · `pallets.last_movement_at`,
`last_action_by`.

The old location is released by the same UPDATE. There is no window in which two rows exist,
because there is only ever one row.

### 3.3 DISPATCH (BRD §9.3, FR-011/012)

| # | Validation | Failure | HTTP | Error code |
|---|---|---|---|---|
| 1 | `dispatch.perform` | reject | 403 | `PERMISSION_DENIED` |
| 2 | Idempotency | replay | 200 | — |
| 3 | Pallet resolves | reject | 404 | `PALLET_NOT_FOUND` |
| 4 | **Lock pallet row** | — | — | — |
| 5 | Not already dispatched | reject | 409 | `PALLET_ALREADY_DISPATCHED` + dispatch date/user |
| 6 | Has an `inventory_current` row | reject | 409 | `PALLET_NOT_IN_INVENTORY` |
| 7 | Scanned location = recorded location | reject | 409 | `PALLET_NOT_AT_LOCATION` + real location |
| 8 | `block_state = NONE`, else `dispatch.override_hold` | reject | 423 | `PALLET_ON_HOLD` + hold reason |
| 9 | Staging rule: if `CFG-09 = STAGED`, status must be `STAGED_FOR_DISPATCH` | reject | 422 | `STAGING_REQUIRED` |
| — | **COMMIT:** delete `inventory_current`, insert transaction + details, set status | — | 200 | — |

Writes: `inventory_current` DELETE (FR-012 — leaves active inventory) ·
`inventory_transactions` INSERT (`DISPATCH`, source set, destination null) ·
`dispatch_transaction_details` INSERT · `pallets.lifecycle_status = DISPATCHED`,
`dispatched_at`, `last_action_by`.

When `dispatch.override_hold` is exercised, an additional `audit_log` row with
`event = override.used` is written, carrying the hold reason that was overridden and the
justification text. BRD §21 requires manual overrides to be restricted and audited.

### 3.4 HOLD / RELEASE (BRD §13, FR-017)

| Action | Preconditions | Mandatory inputs | Writes |
|---|---|---|---|
| `HOLD` / `MARK_DAMAGED` / `FLAG_EXCEPTION` | pallet not `DISPATCHED`; no open hold | reason code, remarks | `pallet_holds` INSERT (`is_open=1`), transaction INSERT, `pallets.block_state` |
| `RELEASE` | an open hold exists | release reason code, remarks | `pallet_holds` UPDATE (close), transaction INSERT, `block_state = NONE` |

`pallet_holds` is the one place a row is updated after creation — closing a hold. The
history of *that* change is still in the transaction ledger, so nothing is lost.

### 3.5 STOCK VERIFICATION (BRD §13, FR-018)

| Step | Rule |
|---|---|
| Start | Location must be active; one open `DRAFT` session per location at a time |
| Expected set | Snapshot of `inventory_current` for that location, frozen at session start |
| Scan | Each scanned pallet classified against the frozen expected set |
| Classification | in both → `MATCHED`; expected only → `MISSING`; scanned only → `UNEXPECTED` (records where the system thought it was) |
| Submit | Session becomes immutable; counts computed and stored |
| Review | `stockverify.approve` required; approver may generate corrections for `UNEXPECTED` lines |
| **Never** | Approval does not silently move inventory. Each correction is an explicit, reasoned, audited transaction (BR-06) |

If inventory changes during an open session (another operator legitimately moves a pallet),
the variance is reported against the frozen snapshot and the review screen shows the
intervening transactions so the supervisor can see it was a real movement, not a loss.

### 3.6 CORRECTION (BRD §11.5, §12, FR-019)

| Rule | Enforcement |
|---|---|
| Requires `correction.perform` | Policy — never granted to `PDA_OPERATOR` in shipped role config |
| Requires a reason code of category `CORRECTION` | Validation |
| Requires free-text justification, min 10 characters | Validation |
| Requires the original transaction id | Validation + FK |
| Original row is never modified | No update path exists in `TransactionRecorder` |
| New row records before and after | `previous_values` / `new_values` JSON |
| Appears in the pallet timeline as a correction, linked to what it corrected | `correction_of_transaction_id` |

Correction types and their effect:

| Type | Effect |
|---|---|
| `PUTAWAY_LOCATION_CORRECTION` | Moves a pallet to the location it should have been put away at |
| `TRANSFER_REVERSAL` | Returns a pallet to its pre-transfer location |
| `DISPATCH_REVERSAL` | Re-creates the `inventory_current` row; status `DISPATCHED → STORED` |
| `STATUS_CORRECTION` | Fixes a wrong `block_state` |
| `MANUAL_RELOCATION` | Used after stock verification finds a pallet physically elsewhere |

---

## 4. Concurrency rules (BR-02, FR-013, FR-020)

| Rule | Implementation |
|---|---|
| CC-01 | Every state-changing operation runs inside one `DB::transaction()` |
| CC-02 | The pallet row is locked `FOR UPDATE` **before any validation read** |
| CC-03 | Lock order is fixed: pallet → locations by ascending id. No cycle is possible, so no deadlock between operators. |
| CC-04 | `innodb_lock_wait_timeout = 5` — a blocked request fails fast and retryably rather than hanging a forklift |
| CC-05 | Idempotency key checked and reserved inside the same transaction |
| CC-06 | Conflict responses carry the *current truth* — location, user, timestamp — not just an error |
| CC-07 | No business decision is made from a read taken outside the lock |
| CC-08 | `validate-*` endpoints are advisory only; the committing endpoint re-validates everything |

CC-08 is the rule that makes the PDA's pre-check safe. The pre-check exists so the operator
learns about a blocked location before lifting the pallet — but nothing is trusted from it.

---

## 5. Exception scenarios (BRD §21, master prompt §25)

| # | Scenario | System response | Code | Audit |
|---|---|---|---|---|
| A | Pallet scanned for put-away but already stored | Reject; show current facility/zone/location, who stored it, when | 409 `PALLET_ALREADY_STORED` | Failed attempt logged |
| B | Wrong pallet scanned at dispatch location | Reject; show the pallet's real location and the expected pallet | 409 `PALLET_NOT_AT_LOCATION` | Failed attempt logged |
| C | Pallet physically moved but transaction never completed | Surfaces via stock verification (`MISSING` / `UNEXPECTED`) and search; resolved by supervisor correction | — | Correction audited |
| D | Destination location blocked or inactive | Reject before the pallet is dropped; show block reason | 423 `LOCATION_BLOCKED` / 422 `LOCATION_INACTIVE` | — |
| E | Two operators scan the same pallet simultaneously | First commit wins; second gets conflict with current state | 409 | Both attempts logged |
| F | Damaged / unreadable **location** barcode | Manual location selection, restricted to `scan.manual_override`; or reprint via `barcode.reprint` | — | `override.used` / `barcode.reprinted` |
| G | Damaged / unreadable **pallet** barcode | Manual search and selection, restricted to `scan.manual_override`; ERP label reprint is a customer process outside this system | — | `override.used` with justification |
| H | Network interruption during confirm | **No success shown.** PDA displays "Not confirmed — checking…", then re-sends with the same idempotency key. Either the original result returns, or a clear failure. | — | — |
| I | Token expired mid-operation | Clear re-login prompt; the in-progress scan data is preserved so the operator does not re-scan | 401 | Login logged |
| J | Duplicate scanner event (< `CFG-05` ms) | Silently ignored at the scanner driver; no request sent | — | — |
| K | Operator retries a confirm they already completed | Idempotent replay returns the original success | 200 | — |

Scenario H is the one that most often gets implemented wrongly. The PDA's confirm button
transitions to a *pending* state, not a success state. Success is rendered only on a `2xx`
carrying a `txn_ref`. If the request times out, the app retries with the same idempotency
key up to `CFG-15` times, then shows an explicit "unconfirmed — check on the web or re-scan"
message. It never guesses.

---

## 6. Ageing calculation

| Item | Rule |
|---|---|
| Basis | `inventory_current.putaway_at` — the first entry into inventory, **not** the last transfer |
| Why | The customer's question is "how long has this stock been sitting here", which an internal relocation does not reset |
| Units | Whole days, computed in the application timezone (`CFG-13`, `OI-19`) |
| Buckets | `CFG-04`, default `0-7`, `8-15`, `16-30`, `>30` (BRD §11.1) |
| Threshold alert | `CFG-07`, default 30 days (BRD §23 "Ageing > Threshold") |
| Dispatched pallets | Excluded from ageing; their dwell time is reported separately in the Dispatch Register |

---

## 7. Configuration register (deliverable M)

Every value below lives in `system_settings`. None is a PHP literal outside the seeder.

| ID | Key | Type | Default | Open input | Notes |
|---|---|---|---|---|---|
| CFG-01 | `pallet.uniqueness_rule` | ENUM | `JOB_PALLET` | `OI-02` | **Locks after first transaction** |
| CFG-02 | `barcode.active_profile` | STRING | `RAW_REFERENCE` | `OI-01` | Pallet barcode decoding |
| CFG-03 | `barcode.location_symbology` | ENUM | `CODE128` | `OI-13` | Location label symbology |
| CFG-04 | `ageing.buckets` | JSON | `[7,15,30]` | `OI-10` | Bucket upper bounds |
| CFG-05 | `scan.duplicate_window_ms` | INT | `800` | — | Scanner debounce |
| CFG-06 | `location.capacity_enforcement` | ENUM | `OFF` | `OI-04` | `OFF` / `WARN` / `BLOCK` |
| CFG-07 | `ageing.alert_threshold_days` | INT | `30` | `OI-10` | Dashboard alert |
| CFG-08 | `transfer.mode` | ENUM | `SINGLE_STEP` | — | `TWO_STEP` enables `IN_MOVEMENT` |
| CFG-09 | `dispatch.mode` | ENUM | `DIRECT` | `OI-09` | `STAGED` enables staging |
| CFG-10 | `password.policy` | JSON | min 12, mixed case, digit, symbol, 5 attempts, 15 min lockout | `OI-15` | **Placeholder — confirm** |
| CFG-11 | `session.idle_timeout_minutes` | INT | `480` | `OI-15` | **Placeholder — confirm** |
| CFG-12 | `idempotency.ttl_hours` | INT | `24` | — | Key retention |
| CFG-13 | `app.timezone` | STRING | **placeholder** | `OI-19` | **Must be confirmed before go-live — affects every "today" KPI** |
| CFG-14 | `web.poll_interval_seconds` | INT | `15` | — | Live update cadence |
| CFG-15 | `pda.retry_attempts` | INT | `3` | — | Confirm retry on timeout |
| CFG-16 | `dispatch.require_delivery_reference` | BOOL | `false` | `OI-16` | |
| CFG-17 | `openingstock.mode_enabled` | BOOL | `false` | `OI-20` | Go-live only |
| CFG-18 | `report.default_page_size` | INT | `50` | `OI-10` | |
| CFG-19 | `alerts.email_enabled` | BOOL | `false` | — | BRD §16 optional |
| CFG-20 | `auth.single_active_pda_session` | BOOL | `true` | — | Enforces "no shared credentials" |
| CFG-21 | `barcode.location_pattern` | STRING | `LOC-{site}-{facility}-{zone}-{seq}` | `OI-03` | System-generated location codes; ignored for `CUSTOMER_PROVIDED` |

`CFG-13` is flagged twice on purpose. A wrong timezone silently corrupts every "Today
Put-Away", "Today Dispatch" and daily snapshot figure, and it is the kind of error that is
only noticed a month after go-live.

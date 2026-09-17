# 10 — Report Catalogue

**Phase:** 7 — Screen specification (reporting)
**Covers:** Deliverable J
**BRD:** §14, §11.2
**Status:** Baseline for review

---

## 1. Shared behaviour

Every report shares one shell and one contract.

| Aspect | Rule |
|---|---|
| Endpoint | `GET /api/v1/reports/{code}` |
| Permission | `report.view.{code}` (see `07-permission-matrix.md` §3.6) |
| Scope | Site and facility scope applied server-side, to results **and** exports |
| Pagination | Mandatory, server-side. Default `CFG-18` (50), maximum 200. |
| Sorting | Server-side on indexed columns only. Unindexed sorts are rejected, not silently slow. |
| Date ranges | Required where marked. Maximum span validated to protect the database. |
| Export | `POST /exports` queues XLSX or PDF; file lands in S3; user receives a signed, expiring link |
| Export scope | Exports the **filtered** set, not the page and not the whole table |
| Empty state | Names the filters in force and offers to clear them |
| Column set | Fixed per report below. Column visibility is a client preference; the data contract does not change. |
| Timezone | All dates rendered in `CFG-13` (`OI-19`) |
| Formats | `OI-10` — the customer may require specific layouts; the column sets below are the BRD-derived baseline |

Every report is backed by a dedicated query object with a covering index (see
`04-data-model.md` §5) and an `EXPLAIN` assertion in the test suite.

---

## 2. The thirteen reports

### R-01 · Current Inventory Report
**BRD §14 row 1** — all active pallets.

| | |
|---|---|
| Source | `inventory_current` ⋈ `pallets` ⋈ `locations` ⋈ `zones` ⋈ `facilities` |
| Columns | Pallet No. · Job No. · Customer · LPO · Facility · Zone · Location · Status · Block state · Put-away date · Ageing (days) · Last movement · Last action user |
| Filters | Facility · Zone · Location · Job · Pallet · Customer · LPO · Status · Block state · Ageing bucket · Put-away date range |
| Sort | Ageing desc (default) · Put-away date · Location · Pallet |
| Permission | `report.view.current_inventory` |
| Index | `inventory_current.IDX(facility_id, zone_id, location_id)`, `IDX(site_id, putaway_at)` |

### R-02 · Location-wise Stock Report
**BRD §14 row 2** — inventory grouped by yard/warehouse/zone/location, including empties.

| | |
|---|---|
| Grouping | Facility → Zone → Location |
| Columns | Facility · Zone · Location · Location type · Status (occupied/empty/blocked/inactive) · Pallet count · Capacity · Utilisation % · Oldest pallet ageing |
| Filters | Facility · Zone · Occupancy state · Location type · Show empty locations (toggle, default on) |
| Notes | Empty locations are included by default — the operational question this report answers is usually "where can I put something", not "what is stored" |
| Permission | `report.view.location_stock` |

### R-03 · Job-wise Pallet Report
**BRD §14 row 3** — all pallets under a Job Number (BR-10).

| | |
|---|---|
| Columns | Job No. · Pallet No. · Customer · LPO · Status · Facility · Zone · Location · Put-away date · Ageing · Dispatch date |
| Filters | Job No. (supports multiple) · Customer · Status · Include dispatched (toggle) |
| Summary row | Per job: total pallets · stored · dispatched · on hold — answering "is this job fully shipped?" directly |
| Permission | `report.view.job_pallet` |

### R-04 · Customer / LPO-wise Stock Report
**BRD §14 row 4**

| | |
|---|---|
| Grouping | Customer → LPO → Job → Pallet |
| Columns | Customer · LPO · Job No. · Pallet count · Oldest ageing · Facilities involved |
| Filters | Customer · LPO · Facility · Ageing bucket |
| Caveat | Only meaningful once Customer/LPO are populated — either from the barcode or by import (`OI-01`, `OI-11`). The report states plainly when a large share of rows have no customer data rather than showing misleading blanks. |
| Permission | `report.view.customer_lpo_stock` |

### R-05 · Put-Away Register
**BRD §14 row 5** — all inbound transactions.

| | |
|---|---|
| Source | `inventory_transactions` where `type IN (PUTAWAY, OPENING_STOCK)` |
| Columns | Date/time · Txn ref · Job No. · Pallet No. · Customer · Destination location · Facility · Zone · Operator · Device · Channel |
| Filters | Date range (**required**) · Operator · Facility · Zone · Location · Job · Pallet · Type |
| Summary | Count by day, by operator, by facility |
| Index | `inventory_transactions.IDX(type, created_at)` |
| Permission | `report.view.putaway_register` |

### R-06 · Location Movement Register
**BRD §14 row 6** — source-to-destination history.

| | |
|---|---|
| Source | `inventory_transactions` where `type IN (TRANSFER, STAGE)` |
| Columns | Date/time · Txn ref · Job No. · Pallet No. · **Source location** · **Destination location** · Reason · Remarks · Operator · Device |
| Filters | Date range (required) · Operator · Source facility/location · Destination facility/location · Job · Pallet · Reason code |
| Permission | `report.view.movement_register` |

### R-07 · Dispatch Register
**BRD §14 row 7**

| | |
|---|---|
| Source | `inventory_transactions` ⋈ `dispatch_transaction_details` where `type = DISPATCH` |
| Columns | Dispatch date/time · Txn ref · Job No. · Pallet No. · Customer · LPO · Source location · Delivery reference · Vehicle reference · Operator · Dwell days (put-away → dispatch) · Remarks |
| Filters | Date range (required) · Customer · LPO · Job · Operator · Source facility · Delivery reference |
| Summary | Count and average dwell by day, customer and operator |
| Permission | `report.view.dispatch_register` |

### R-08 · Complete Pallet Traceability Report
**BRD §14 row 8, FR-016** — the chronological lifecycle of one pallet.

| | |
|---|---|
| Input | One pallet (by pallet key, pallet number, or scanned barcode) |
| Output | Header: full pallet identity, current state, total dwell. Then every transaction in order: sequence · date/time · action · from → to · previous status → new status · user · device/session · reason · remarks · txn ref · correction link |
| Rendering | Corrections are shown inline and visually tied to the transaction they corrected, so the record reads as a narrative rather than a list of rows |
| Filters | None — it is a single-subject report |
| Export | PDF (formatted as an audit document with a generation timestamp and the generating user) |
| Index | `inventory_transactions.IDX(pallet_id, created_at)` |
| Permission | `report.view.pallet_traceability` |

### R-09 · Ageing Report
**BRD §14 row 9**

| | |
|---|---|
| Source | `inventory_current` ⋈ `pallets` |
| Columns | Pallet No. · Job No. · Customer · LPO · Location · Put-away date · **Ageing days** · Bucket · Status |
| Buckets | `CFG-04`, default 0–7 / 8–15 / 16–30 / >30 (BRD §11.1) |
| Views | Detail list and bucket summary with counts and percentages per facility |
| Filters | Facility · Zone · Customer · Bucket · Minimum ageing days |
| Basis | `putaway_at` — first entry into inventory, not last movement (`05-business-rules-and-state-machine.md` §6) |
| Permission | `report.view.ageing` |

### R-10 · Operator Activity Report
**BRD §14 row 10**

| | |
|---|---|
| Source | `inventory_transactions` grouped by user |
| Columns | Operator · Role · Put-aways · Transfers · Dispatches · Holds · Stock checks · Corrections · Total · First activity · Last activity · Devices used |
| Filters | Date range (required) · Operator · Facility · Action type |
| Detail | Drill into one operator's full transaction list |
| Index | `inventory_transactions.IDX(user_id, created_at)` |
| Permission | `report.view.operator_activity` (withheld from `VIEWER` by default) |

### R-11 · Stock Verification Variance Report
**BRD §14 row 11, FR-018**

| | |
|---|---|
| Source | `stock_verifications` ⋈ `stock_verification_lines` |
| Columns | Session ref · Date · Location · Facility · Expected · Scanned · Matched · **Missing** · **Unexpected** · Variance % · Operator · Status · Reviewer · Review date |
| Line detail | Per pallet: expected/scanned flags, outcome, where the system believed an unexpected pallet was, and any correction raised |
| Filters | Date range · Facility · Location · Status · Variance greater than N |
| Permission | `report.view.verification_variance` |

### R-12 · Hold / Exception Report
**BRD §14 row 12**

| | |
|---|---|
| Source | `pallet_holds` ⋈ `pallets` ⋈ `inventory_current` |
| Columns | Pallet No. · Job No. · Customer · Hold type · Reason · Remarks · Current location · Placed by · Placed at · **Days on hold** · Released by · Released at · Status |
| Filters | Hold type · Reason code · Open/released/all · Facility · Date range · Days-on-hold threshold |
| Permission | `report.view.hold_exception` |

### R-13 · Daily Stock Movement Summary
**BRD §14 row 13** — the reconciliation report.

| | |
|---|---|
| Source | `daily_stock_snapshots`, backed by `inventory_transactions` |
| Columns | Date · Site · Facility · **Opening** · Put-away (+) · Transfers in · Transfers out · Dispatch (−) · **Closing** · Reconciliation check |
| Identity | `Opening + Put-away − Dispatch = Closing` per facility, per day (BRD §13 "Daily Closing Snapshot") |
| Reconciliation | The check column flags any day where the identity does not hold — which should be never, and is the report's real purpose |
| Filters | Date range (required) · Site · Facility |
| Generation | Scheduled job at the `CFG-13` day boundary. Historical days are read from the snapshot table, not recomputed. |
| Permission | `report.view.daily_movement_summary` |

---

## 3. Export

| Item | Rule |
|---|---|
| Formats | XLSX (all reports), PDF (all reports), CSV (data-oriented reports) |
| Execution | Queued job on the `database` driver. Never synchronous — a large export must not hold an HTTP worker. |
| Storage | S3 with server-side encryption, object key namespaced by requesting user |
| Delivery | Pre-signed URL, expiring in 1 hour |
| Retention | Files deleted after 7 days by S3 lifecycle policy |
| Headers | Every export carries report name, generation timestamp (with timezone), the filters applied, the generating user, and the scope in force. An export whose provenance is ambiguous is a liability in an audit. |
| Row limit | 100,000 rows per export; above that the user is asked to narrow the filters |
| Audit | Every export writes an `audit_log` row (`export.generated`) with the report code and filter JSON |

---

## 4. Report → BRD traceability

| Report | BRD §14 row | FR |
|---|---|---|
| R-01 Current Inventory | 1 | FR-015 |
| R-02 Location-wise Stock | 2 | FR-015 |
| R-03 Job-wise Pallet | 3 | FR-015 |
| R-04 Customer/LPO-wise Stock | 4 | FR-015 |
| R-05 Put-Away Register | 5 | FR-015 |
| R-06 Location Movement Register | 6 | FR-015 |
| R-07 Dispatch Register | 7 | FR-015 |
| R-08 Pallet Traceability | 8 | **FR-016** |
| R-09 Ageing | 9 | FR-014 |
| R-10 Operator Activity | 10 | FR-015 |
| R-11 Verification Variance | 11 | **FR-018** |
| R-12 Hold / Exception | 12 | **FR-017** |
| R-13 Daily Movement Summary | 13 | FR-015 |

All thirteen BRD-required reports are specified. None has been added beyond the BRD, and
none omitted.

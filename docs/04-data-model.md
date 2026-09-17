# 04 — Database Entity Model

**Phase:** 4 — Database design (entity catalogue and relationships)
**Covers:** Deliverable C
**Engine:** MySQL 8.0, InnoDB, `utf8mb4_0900_ai_ci`
**Status:** Baseline for review — full DDL follows in the migration set

---

## 1. Conventions

| Convention | Rule |
|---|---|
| Primary keys | `id` `BIGINT UNSIGNED AUTO_INCREMENT` |
| Foreign keys | `{singular}_id`, always with an explicit FK constraint |
| Timestamps | `created_at`, `updated_at` on every table |
| Actor columns | `created_by`, `updated_by` → `users.id` on master tables |
| Soft deletes | `deleted_at` on **master data only**. Never on transactional or audit tables. |
| Booleans | `TINYINT(1)` via Eloquent casts |
| Enumerations | MySQL `ENUM` for closed sets that carry business logic; reference tables for customer-editable sets |
| Money/quantity | `DECIMAL(12,3)` — never `FLOAT` |
| Time | `TIMESTAMP` stored UTC; presentation timezone from `CFG-13` (`OI-19`) |
| JSON snapshots | `JSON` columns for before/after values in audit rows |

**Deletion policy.** Masters are soft-deleted and are refused deletion entirely while
referenced by active inventory. Transactional and audit tables have no delete path in the
application at all — not a soft one, not a hard one.

---

## 2. Entity catalogue

### 2.1 Platform & security

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| employee_code | VARCHAR(50) | unique, nullable |
| name | VARCHAR(150) | |
| username | VARCHAR(100) | **UNIQUE** |
| email | VARCHAR(190) | unique, nullable |
| password | VARCHAR(255) | bcrypt |
| role_id | BIGINT FK → roles | `ASM-02` |
| site_id | BIGINT FK → sites | nullable = all sites |
| is_active | TINYINT(1) | default 1 |
| must_change_password | TINYINT(1) | default 1 on creation/reset |
| password_changed_at | TIMESTAMP | for policy enforcement |
| last_login_at | TIMESTAMP | nullable |
| failed_login_attempts | SMALLINT | lockout counter |
| locked_until | TIMESTAMP | nullable |
| deleted_at | TIMESTAMP | soft delete |

Indexes: `UNIQUE(username)`, `IDX(role_id)`, `IDX(site_id, is_active)`

#### `roles`
`id`, `code` UNIQUE (`SUPER_ADMIN`, `YARD_ADMIN`, `SUPERVISOR`, `PDA_OPERATOR`, `VIEWER`),
`name`, `description`, `is_system` (system roles cannot be deleted), `is_active`, timestamps.

#### `permissions`
`id`, `code` UNIQUE (`putaway.perform`), `module`, `action`, `description`.
Seeded from the `PermissionRegistry`; not user-editable.

#### `role_permissions`
`role_id` FK, `permission_id` FK, `UNIQUE(role_id, permission_id)`.

#### `user_facility_access`
`user_id` FK, `facility_id` FK, `UNIQUE(user_id, facility_id)`.
Empty set = access to all facilities within the user's site (BR-09).

#### `personal_access_tokens`
Sanctum standard, extended with `device_id VARCHAR(100)`, `device_model VARCHAR(120)`,
`app_version VARCHAR(30)`, `last_ip VARCHAR(45)`. Index `IDX(tokenable_id, device_id)`.

#### `system_settings`
`id`, `key` UNIQUE, `value` TEXT, `data_type` ENUM(`STRING`,`INT`,`BOOL`,`JSON`,`ENUM`),
`group`, `label`, `description`, `allowed_values` JSON nullable, `is_locked` TINYINT(1),
`updated_by`, timestamps.

`is_locked` protects settings that must not change after go-live — `CFG-01` (pallet
uniqueness) sets it automatically once the first inventory transaction is written.

#### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| event | VARCHAR(80) | `master.updated`, `user.deactivated`, `barcode.reprinted`, `login.failed`, `override.used`, `export.generated` |
| auditable_type / auditable_id | VARCHAR(120) / BIGINT | polymorphic target, nullable |
| user_id | BIGINT FK | nullable for failed logins |
| ip_address | VARCHAR(45) | |
| user_agent | VARCHAR(255) | |
| device_id | VARCHAR(100) | nullable |
| old_values / new_values | JSON | nullable |
| context | JSON | reason, remarks, correlation id |
| created_at | TIMESTAMP | **no `updated_at` — rows are never modified** |

Indexes: `IDX(auditable_type, auditable_id)`, `IDX(user_id, created_at)`, `IDX(event, created_at)`

### 2.2 Location hierarchy

#### `sites`
`id`, `code` UNIQUE, `name`, `address` TEXT, `timezone` (nullable, falls back to `CFG-13`),
`is_active`, `deleted_at`, timestamps, `created_by`, `updated_by`.

#### `facilities`
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| site_id | BIGINT FK → sites | |
| code | VARCHAR(30) | `UNIQUE(site_id, code)` |
| name | VARCHAR(150) | |
| type | ENUM | `OPEN_YARD`, `CLOSED_WAREHOUSE`, `DISPATCH_AREA`, `COLLECTION_AREA` |
| description | TEXT | nullable |
| is_active | TINYINT(1) | |
| deleted_at | TIMESTAMP | |

#### `zones`
`id`, `facility_id` FK, `code` with `UNIQUE(facility_id, code)`, `name`, `description`,
`sequence` INT (display ordering, BRD §7), `is_active`, `deleted_at`, timestamps.

#### `locations`
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| site_id | BIGINT FK | denormalised from facility for scoped queries; kept consistent by the service layer |
| facility_id | BIGINT FK | |
| zone_id | BIGINT FK | nullable — a facility may have no zones |
| code | VARCHAR(60) | human-readable Location ID, `UNIQUE(site_id, code)` |
| description | VARCHAR(255) | nullable |
| location_type | ENUM | `STORAGE`, `STAGING`, `COLLECTION`, `DISPATCH` |
| capacity | SMALLINT UNSIGNED | **nullable** — null means "not defined" (`OI-04`) |
| is_active | TINYINT(1) | |
| is_blocked | TINYINT(1) | temporary operational block (BRD §11.3) |
| blocked_reason_id | BIGINT FK → reason_codes | nullable |
| blocked_by / blocked_at | BIGINT / TIMESTAMP | nullable |
| sequence | INT | pick-path ordering |
| deleted_at | TIMESTAMP | |

Indexes: `UNIQUE(site_id, code)`, `IDX(facility_id, zone_id, is_active)`,
`IDX(is_active, is_blocked)`

`is_active` and `is_blocked` are separate: *inactive* is a master-data state (decommissioned,
mis-created); *blocked* is an operational state (maintenance, unsafe, full). Both refuse
inbound movement, but they are reported and reversed differently, and the BRD lists them as
distinct occupancy categories in §11.3.

#### `location_barcodes`
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| location_id | BIGINT FK | **UNIQUE** — one barcode identity per location |
| barcode_value | VARCHAR(100) | **UNIQUE across the whole table** |
| symbology | ENUM | `CODE128`, `CODE39`, `QR`, `DATAMATRIX` (`CFG-03`) |
| source | ENUM | `SYSTEM_GENERATED`, `CUSTOMER_PROVIDED` (BRD §7) |
| first_printed_at | TIMESTAMP | nullable |
| last_printed_at | TIMESTAMP | nullable |
| reprint_count | INT | default 0 |
| timestamps | | |

This table is the enforcement of BRD §18: the barcode value is a row here, reprinting only
touches `last_printed_at` and `reprint_count`, and there is no service method that rewrites
`barcode_value`. Changing it requires an explicit, separately-permissioned master change
that writes an `audit_log` with both old and new values.

### 2.3 Reference data

#### `customers`
`id`, `code` UNIQUE, `name`, `is_active`, `deleted_at`, timestamps. Optional per BRD §7 —
populated by import or captured from the barcode when available.

#### `reason_codes`
`id`, `code` UNIQUE, `name`, `category` ENUM(`TRANSFER`, `DISPATCH_CANCEL`, `CORRECTION`,
`HOLD`, `DAMAGE`, `LOCATION_BLOCK`, `OTHER`), `requires_remarks` TINYINT(1), `is_active`,
`deleted_at`, timestamps. Seeded with the categories named in BRD §7; individual codes are
customer-editable.

### 2.4 Inventory

#### `pallets`
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| pallet_key | VARCHAR(160) | **UNIQUE** — canonical identity per `CFG-01` |
| job_number | VARCHAR(80) | nullable when profile is `RAW_REFERENCE` |
| pallet_number | VARCHAR(80) | nullable likewise |
| raw_barcode_value | VARCHAR(255) | exactly what was scanned, always stored |
| barcode_profile | VARCHAR(50) | which profile decoded it |
| customer_id | BIGINT FK | nullable |
| customer_name_raw | VARCHAR(150) | nullable — as read from the label, before matching |
| lpo_number | VARCHAR(80) | nullable |
| lifecycle_status | ENUM | `AT_COLLECTION_POINT`, `STORED`, `IN_MOVEMENT`, `STAGED_FOR_DISPATCH`, `DISPATCHED` |
| block_state | ENUM | `NONE`, `ON_HOLD`, `DAMAGED`, `EXCEPTION` (`ASM-01`) |
| site_id | BIGINT FK | nullable until first put-away |
| first_putaway_at | TIMESTAMP | nullable — ageing basis |
| last_movement_at | TIMESTAMP | nullable |
| last_action_by | BIGINT FK → users | nullable |
| dispatched_at | TIMESTAMP | nullable |
| quantity / weight_kg | DECIMAL(12,3) | **nullable, unused until `OI-05` is answered** |
| profile_code / bundle_count | VARCHAR(60) / INT | **nullable, unused until `OI-05`** |
| timestamps | | no soft delete — pallets are historical records |

Indexes: `UNIQUE(pallet_key)`, `IDX(job_number)`, `IDX(pallet_number)`,
`IDX(customer_id, lpo_number)`, `IDX(lifecycle_status, block_state)`,
`IDX(raw_barcode_value)`, `IDX(first_putaway_at)`

The optional columns exist but are hidden from every UI and export until `OI-05` is
confirmed. Adding nullable columns now avoids a later migration on a large table; exposing
them before confirmation would fabricate a requirement.

#### `inventory_current` — the invariant table
| Column | Type | Notes |
|---|---|---|
| pallet_id | BIGINT | **PRIMARY KEY**, FK → pallets |
| location_id | BIGINT FK → locations | NOT NULL |
| zone_id | BIGINT FK | denormalised, NOT NULL-able where zone exists |
| facility_id | BIGINT FK | denormalised |
| site_id | BIGINT FK | denormalised |
| stored_at | TIMESTAMP | when it arrived at *this* location |
| putaway_at | TIMESTAMP | when it first entered inventory (ageing basis) |
| last_transaction_id | BIGINT FK → inventory_transactions | |
| last_action_by | BIGINT FK → users | |
| updated_at | TIMESTAMP | |

Indexes: `PRIMARY(pallet_id)`, `IDX(location_id)`, `IDX(facility_id, zone_id, location_id)`,
`IDX(site_id, putaway_at)`, `IDX(putaway_at)`

> **This table is the physical enforcement of BR-01 / FR-007.**
> `pallet_id` being the primary key makes "one pallet in two locations" unrepresentable.
> A dispatched pallet has **no row**, which is also what makes "remove from active
> inventory" (FR-012) a delete rather than a status flag that reports must remember to
> filter on.

The facility/zone/site columns are denormalised deliberately: occupancy, dashboard KPIs and
location-wise stock all aggregate at those levels, and this removes three joins from the
hottest read path. They are written only by `InventoryLedger`, from the location row, inside
the same transaction — so they cannot drift.

#### `inventory_transactions` — append-only ledger
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| txn_ref | VARCHAR(30) | **UNIQUE**, human-readable, e.g. `PA-20260916-000148` |
| type | ENUM | `PUTAWAY`, `TRANSFER`, `DISPATCH`, `STAGE`, `HOLD`, `RELEASE`, `MARK_DAMAGED`, `FLAG_EXCEPTION`, `CORRECTION`, `OPENING_STOCK` |
| pallet_id | BIGINT FK | NOT NULL |
| source_location_id | BIGINT FK | nullable (put-away has none) |
| destination_location_id | BIGINT FK | nullable (dispatch/hold have none) |
| previous_lifecycle_status | ENUM | nullable |
| new_lifecycle_status | ENUM | nullable |
| previous_block_state | ENUM | nullable |
| new_block_state | ENUM | nullable |
| previous_values / new_values | JSON | nullable — full before/after for corrections |
| reason_code_id | BIGINT FK | nullable, mandatory for hold/correction/damage |
| remarks | VARCHAR(500) | nullable |
| user_id | BIGINT FK | **NOT NULL** (BR-07) |
| device_id | VARCHAR(100) | nullable (web has none) |
| token_id | BIGINT | session identity (`ASM-06`) |
| channel | ENUM | `PDA`, `WEB`, `SYSTEM` |
| idempotency_key | VARCHAR(80) | nullable, indexed |
| correction_of_transaction_id | BIGINT FK → self | nullable |
| correlation_id | VARCHAR(40) | ties to application logs |
| created_at | TIMESTAMP(3) | millisecond precision for ordering |

**No `updated_at`. No `deleted_at`. No update path in the application.**

Indexes: `UNIQUE(txn_ref)`, `IDX(pallet_id, created_at)` *(the traceability query)*,
`IDX(type, created_at)`, `IDX(user_id, created_at)`, `IDX(destination_location_id, created_at)`,
`IDX(source_location_id, created_at)`, `IDX(created_at)`, `IDX(correction_of_transaction_id)`

#### `dispatch_transaction_details`
`id`, `inventory_transaction_id` FK **UNIQUE**, `delivery_reference` (nullable, `OI-16`),
`vehicle_reference` (nullable), `dispatched_from_location_id` FK, `customer_id` FK nullable,
`lpo_number` nullable, `remarks`, `created_at`.

1:1 extension of the dispatch row. Keeps dispatch-specific fields out of the generic ledger
without duplicating the ledger itself.

#### `pallet_holds`
`id`, `pallet_id` FK, `hold_type` ENUM(`HOLD`,`DAMAGED`,`EXCEPTION`), `reason_code_id` FK,
`remarks`, `placed_by` FK, `placed_at`, `placed_transaction_id` FK,
`released_by` FK nullable, `released_at` nullable, `release_reason_code_id` FK nullable,
`release_remarks` nullable, `released_transaction_id` FK nullable, `is_open` TINYINT(1).

Index: `IDX(pallet_id, is_open)`, plus a partial-uniqueness guard enforced in the service
layer (one open hold per pallet).

#### `idempotency_keys`
`id`, `key` VARCHAR(80), `user_id` FK, `endpoint` VARCHAR(120), `request_hash` CHAR(64),
`response_status` SMALLINT, `response_body` JSON, `created_at`, `expires_at`.
`UNIQUE(key, user_id)`, `IDX(expires_at)` for scheduled pruning.

`request_hash` matters: replaying the same key with a *different* payload is a client bug and
returns `422`, rather than silently returning someone else's result.

### 2.5 Stock verification

#### `stock_verifications`
`id`, `reference` UNIQUE, `location_id` FK, `facility_id` FK, `site_id` FK,
`status` ENUM(`DRAFT`,`SUBMITTED`,`APPROVED`,`REJECTED`),
`expected_count`, `scanned_count`, `matched_count`, `missing_count`, `unexpected_count`,
`started_by` FK, `started_at`, `submitted_at` nullable, `reviewed_by` FK nullable,
`reviewed_at` nullable, `review_remarks` nullable, `device_id` nullable, timestamps.

#### `stock_verification_lines`
`id`, `stock_verification_id` FK, `pallet_id` FK nullable (null = scanned but unresolvable),
`scanned_barcode_value` nullable, `expected` TINYINT(1), `scanned` TINYINT(1),
`outcome` ENUM(`MATCHED`,`MISSING`,`UNEXPECTED`),
`system_location_id` FK nullable (where the system thought an unexpected pallet was),
`scanned_at` nullable, `correction_transaction_id` FK nullable, timestamps.
`UNIQUE(stock_verification_id, pallet_id)` where `pallet_id` is not null.

### 2.6 Operations support

#### `import_batches`
`id`, `type` ENUM(`FACILITY`,`ZONE`,`LOCATION`,`USER`,`PALLET`,`OPENING_STOCK`),
`original_filename`, `stored_path`, `status` ENUM(`VALIDATING`,`VALIDATED`,`FAILED`,`COMMITTED`),
`total_rows`, `valid_rows`, `error_rows`, `error_report_path` nullable,
`uploaded_by` FK, `committed_by` FK nullable, `committed_at` nullable, timestamps.

#### `export_jobs`
`id`, `report_code`, `format` ENUM(`XLSX`,`PDF`,`CSV`), `filters` JSON,
`status` ENUM(`QUEUED`,`PROCESSING`,`READY`,`FAILED`), `row_count` nullable,
`file_path` nullable, `expires_at`, `requested_by` FK, `error_message` nullable, timestamps.

#### `daily_stock_snapshots`
`id`, `snapshot_date` DATE, `site_id` FK, `facility_id` FK nullable,
`opening_count`, `putaway_count`, `transfer_in_count`, `transfer_out_count`,
`dispatch_count`, `closing_count`, `generated_at`.
`UNIQUE(snapshot_date, site_id, facility_id)`.

Written by a scheduled job at the configured day boundary (`CFG-13`, `OI-19`). This backs the
Daily Stock Movement Summary (BRD §14) without recomputing history on every report run.

#### `barcode_profiles`
`id`, `code` UNIQUE, `name`, `strategy` ENUM(`RAW_REFERENCE`,`DELIMITED`,`FIXED_WIDTH`,
`REGEX`,`GS1`), `config` JSON, `symbology` ENUM, `is_active`, `is_default`, timestamps.

Ships with exactly one active row: `RAW_REFERENCE`. Additional profiles are configured — not
coded — once `OI-01` is answered. See `11-barcode-specification.md`.

---

## 3. Relationship summary

```
sites 1──n facilities 1──n zones 1──n locations 1──1 location_barcodes
  │              │                        │
  │              └── user_facility_access ─┘ (n──n users)
  │
  └──n users n──1 roles n──n permissions

customers 1──n pallets
reason_codes 1──n inventory_transactions
             1──n pallet_holds
             1──n locations (blocked_reason_id)

pallets 1──0..1 inventory_current ──n──1 locations
        1──n    inventory_transactions ──n──1 users
        1──n    pallet_holds
        1──n    stock_verification_lines

inventory_transactions 1──0..1 dispatch_transaction_details
inventory_transactions 1──n    inventory_transactions  (correction_of_transaction_id)

locations 1──n stock_verifications 1──n stock_verification_lines
```

---

## 4. Critical constraints register

| ID | Constraint | Implementation | Guards |
|---|---|---|---|
| DC-01 | One pallet, at most one active location | `PRIMARY KEY (pallet_id)` on `inventory_current` | BR-01, FR-007 |
| DC-02 | Pallet identity is unique | `UNIQUE(pallet_key)` on `pallets` | AMB-01 |
| DC-03 | Location barcode value globally unique | `UNIQUE(barcode_value)` on `location_barcodes` | BRD §18 |
| DC-04 | One barcode identity per location | `UNIQUE(location_id)` on `location_barcodes` | BRD §18 |
| DC-05 | Location code unique within a site | `UNIQUE(site_id, code)` on `locations` | BRD §7 |
| DC-06 | Every inventory transaction has an actor | `user_id NOT NULL` + FK | BR-07 |
| DC-07 | Transaction references are unique | `UNIQUE(txn_ref)` | BRD §15 |
| DC-08 | A request cannot be applied twice | `UNIQUE(key, user_id)` on `idempotency_keys` | BR-08 |
| DC-09 | Username unique | `UNIQUE(username)` on `users` | BRD §6 |
| DC-10 | No orphan inventory | FK `inventory_current.location_id` → `locations.id` `RESTRICT` | data integrity |
| DC-11 | History cannot be deleted | FK `ON DELETE RESTRICT` throughout + no application delete path | BR-06 |
| DC-12 | One open hold per pallet | Service-layer check under the pallet row lock | BRD §13 |

`DC-12` is the only invariant on this list not expressible as a native MySQL 8 constraint
(it needs a partial unique index). It is enforced inside the same `FOR UPDATE` lock that
protects every other pallet mutation, and is covered by a dedicated concurrency test.

---

## 5. Index strategy for the hot paths

| Query | Index used |
|---|---|
| Resolve scanned pallet barcode | `pallets.UNIQUE(pallet_key)` / `IDX(raw_barcode_value)` |
| Resolve scanned location barcode | `location_barcodes.UNIQUE(barcode_value)` |
| Is this pallet already stored? | `inventory_current` PK lookup |
| What is at this location? | `inventory_current.IDX(location_id)` |
| Pallet lifecycle history | `inventory_transactions.IDX(pallet_id, created_at)` |
| Search by job number | `pallets.IDX(job_number)` |
| Search by customer + LPO | `pallets.IDX(customer_id, lpo_number)` |
| Occupancy by facility/zone | `inventory_current.IDX(facility_id, zone_id, location_id)` |
| Ageing buckets | `inventory_current.IDX(site_id, putaway_at)` |
| Today's transactions by type | `inventory_transactions.IDX(type, created_at)` |
| Operator activity report | `inventory_transactions.IDX(user_id, created_at)` |

Every report in `10-report-catalogue.md` is checked against this list during Phase 4; any
report without a covering index gets one before it ships. `EXPLAIN` output for each is
captured in the test suite so a regression in query plan fails the build rather than
surfacing as a slow page months later.

---

## 6. Data retention

| Data | Retention | Basis |
|---|---|---|
| `inventory_transactions` | Indefinite | Traceability requirement (BRD §15) |
| `audit_logs` | Indefinite pending `OI-18` | Auditability requirement |
| `pallets` | Indefinite | Historical records |
| `idempotency_keys` | `CFG-12`, default 24 h | Pruned nightly |
| `export_jobs` + files | 7 days, then S3 lifecycle deletion | Operational |
| `import_batches` + files | 90 days | Operational |
| `personal_access_tokens` | Pruned when expired | Security |

No retention figure here is presented as agreed. `OI-18` must confirm them.

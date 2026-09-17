# 07 — Role and Permission Matrix

**Phase:** 3 — Architecture (authorisation model)
**Covers:** Deliverable I
**BRD:** §6, §7 (Role & Permission Master), §12 (Facility/Location Permission)
**Status:** Baseline for review

---

## 1. Model

```
user ──1:1── role ──n:n── permissions        (ASM-02: one role per user)
  │
  └──n:n── facilities  (user_facility_access; empty = all facilities in the user's site)
  └──n:1── site        (null = all sites — Super Admin only)
```

Authorisation is evaluated in three layers, all server-side:

1. **Permission** — does the role hold `putaway.perform`?
2. **Site scope** — is the target record within the user's site?
3. **Facility scope** — is the target facility in the user's facility access list?

A request must pass all three. The web and PDA clients use the same permission list only to
decide what to *render*; they are never the enforcement point (master prompt §40).

Permission code format: `{module}.{action}`. Actions follow BRD §7: `view`, `create`,
`edit`, `delete`, `approve`, `correct`, `print`, `export`, plus operation-specific verbs
(`perform`, `release`, `block`, `reprint`, `import`, `override_hold`, `manual_override`).

---

## 2. Roles

| Code | Name | BRD §6 description |
|---|---|---|
| `SUPER_ADMIN` | Super Admin | Full configuration, all masters, users/roles, transactions, corrections, reports, audit, system settings |
| `YARD_ADMIN` | Warehouse / Yard Admin | Location setup, inventory monitoring, stock verification, transaction monitoring, reports, approved corrections |
| `SUPERVISOR` | Warehouse In-charge / Supervisor | Operational dashboard, search, assignment, exceptions, stock verification, transaction approvals as permitted |
| `PDA_OPERATOR` | Forklift / PDA Operator | Put-away, transfer, dispatch, search and permitted scan-based functions **only** |
| `VIEWER` | Management / Viewer | Dashboard and read-only MIS/report access |

All five are `is_system = true`: they cannot be deleted, and their codes cannot change.
Their *permission sets* are editable by a Super Admin, and every such change is audited.

---

## 3. Permission matrix

Legend: **✔** granted · **—** not granted

### 3.1 Platform

| Permission | SUPER_ADMIN | YARD_ADMIN | SUPERVISOR | PDA_OPERATOR | VIEWER |
|---|:--:|:--:|:--:|:--:|:--:|
| `auth.login_web` | ✔ | ✔ | ✔ | — | ✔ |
| `auth.login_pda` | ✔ | ✔ | ✔ | ✔ | — |
| `settings.view` | ✔ | ✔ | — | — | — |
| `settings.edit` | ✔ | — | — | — | — |
| `audit.view` | ✔ | ✔ | — | — | — |
| `audit.export` | ✔ | — | — | — | — |

`PDA_OPERATOR` has no web login at all. A forklift operator has no business on the admin
console, and removing the login path removes an entire class of risk rather than relying on
an empty navigation menu.

### 3.2 Master data

| Permission | SUPER_ADMIN | YARD_ADMIN | SUPERVISOR | PDA_OPERATOR | VIEWER |
|---|:--:|:--:|:--:|:--:|:--:|
| `site.view` / `.create` / `.edit` / `.delete` | ✔✔✔✔ | ✔——— | ✔——— | ——— | ✔——— |
| `facility.view` / `.create` / `.edit` / `.delete` | ✔✔✔✔ | ✔✔✔— | ✔——— | ——— | ✔——— |
| `zone.view` / `.create` / `.edit` / `.delete` | ✔✔✔✔ | ✔✔✔— | ✔——— | ——— | ✔——— |
| `location.view` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `location.create` / `.edit` | ✔✔ | ✔✔ | —— | —— | —— |
| `location.delete` | ✔ | — | — | — | — |
| `location.import` | ✔ | ✔ | — | — | — |
| `location.block` | ✔ | ✔ | ✔ | — | — |
| `customer.view` / `.create` / `.edit` | ✔✔✔ | ✔✔✔ | ✔—— | ——— | ✔—— |
| `reasoncode.view` / `.create` / `.edit` | ✔✔✔ | ✔✔✔ | ✔—— | ✔—— | —— |
| `barcode.print` | ✔ | ✔ | ✔ | — | — |
| `barcode.reprint` | ✔ | ✔ | ✔ | — | — |

`location.block` reaches Supervisor because blocking an unsafe lane is an operational
decision that cannot wait for an administrator.

### 3.3 Users and roles

| Permission | SUPER_ADMIN | YARD_ADMIN | SUPERVISOR | PDA_OPERATOR | VIEWER |
|---|:--:|:--:|:--:|:--:|:--:|
| `user.view` | ✔ | ✔ | ✔ | — | — |
| `user.create` / `.edit` | ✔✔ | ✔✔ | —— | —— | —— |
| `user.reset_password` | ✔ | ✔ | — | — | — |
| `user.delete` | ✔ | — | — | — | — |
| `role.view` | ✔ | ✔ | — | — | — |
| `role.create` / `.edit` / `.delete` | ✔✔✔ | ——— | ——— | ——— | ——— |

Only Super Admin can change what a role may do. A Yard Admin can create users and assign
existing roles, but cannot grant a role powers it did not have — which prevents privilege
escalation by an administrator who is not meant to hold it.

### 3.4 Inventory operations

| Permission | SUPER_ADMIN | YARD_ADMIN | SUPERVISOR | PDA_OPERATOR | VIEWER |
|---|:--:|:--:|:--:|:--:|:--:|
| `scan.resolve` | ✔ | ✔ | ✔ | ✔ | — |
| `scan.manual_override` | ✔ | ✔ | ✔ | **—** | — |
| `putaway.perform` | ✔ | — | ✔ | ✔ | — |
| `transfer.perform` | ✔ | — | ✔ | ✔ | — |
| `dispatch.perform` | ✔ | — | ✔ | ✔ | — |
| `dispatch.stage` | ✔ | — | ✔ | ✔ | — |
| `dispatch.override_hold` | ✔ | — | ✔ | **—** | — |
| `hold.create` | ✔ | ✔ | ✔ | — | — |
| `hold.release` | ✔ | ✔ | ✔ | — | — |
| `correction.perform` | ✔ | ✔ | **—** | **—** | — |
| `openingstock.perform` | ✔ | ✔ | ✔ | — | — |

Four cells carry the weight of BRD §11.5 and §21:

- **`correction.perform` is denied to Supervisor and Operator.** The BRD allows "authorized
  supervisors/admins"; the shipped default is the more restrictive reading. A customer who
  wants supervisors to correct can grant it in S-40 — deliberately, and it will be audited.
- **`scan.manual_override` and `dispatch.override_hold` are denied to Operators.** These are
  the damaged-barcode and held-pallet escapes from BRD §21 rows F, G and dispatch
  validation. If an operator could self-authorise them, scan verification would be optional
  in practice. Pending `OI-14`.

### 3.5 Read, reporting and verification

| Permission | SUPER_ADMIN | YARD_ADMIN | SUPERVISOR | PDA_OPERATOR | VIEWER |
|---|:--:|:--:|:--:|:--:|:--:|
| `dashboard.view` | ✔ | ✔ | ✔ | — | ✔ |
| `inventory.view` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `search.perform` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `pallet.view` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `pallet.import` | ✔ | ✔ | — | — | — |
| `traceability.view` | ✔ | ✔ | ✔ | — | ✔ |
| `transaction.view` | ✔ | ✔ | ✔ | *own only* | ✔ |
| `stockverify.view` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `stockverify.create` | ✔ | ✔ | ✔ | ✔ | — |
| `stockverify.approve` | ✔ | ✔ | ✔ | — | — |
| `report.view.*` | ✔ | ✔ | ✔ | — | ✔ |
| `report.export` | ✔ | ✔ | ✔ | — | ✔ |

`transaction.view` for `PDA_OPERATOR` is scoped to their own transactions, backing the
PDA's Recent Activity screen (BRD §10) without exposing other operators' work.

### 3.6 Report-level permissions

Each of the 13 reports has its own `report.view.{code}` permission, so a customer can, for
example, withhold the Operator Activity report from supervisors. Defaults:

| Report | SUPER_ADMIN | YARD_ADMIN | SUPERVISOR | VIEWER |
|---|:--:|:--:|:--:|:--:|
| `current_inventory` | ✔ | ✔ | ✔ | ✔ |
| `location_stock` | ✔ | ✔ | ✔ | ✔ |
| `job_pallet` | ✔ | ✔ | ✔ | ✔ |
| `customer_lpo_stock` | ✔ | ✔ | ✔ | ✔ |
| `putaway_register` | ✔ | ✔ | ✔ | ✔ |
| `movement_register` | ✔ | ✔ | ✔ | ✔ |
| `dispatch_register` | ✔ | ✔ | ✔ | ✔ |
| `pallet_traceability` | ✔ | ✔ | ✔ | ✔ |
| `ageing` | ✔ | ✔ | ✔ | ✔ |
| `operator_activity` | ✔ | ✔ | ✔ | — |
| `verification_variance` | ✔ | ✔ | ✔ | — |
| `hold_exception` | ✔ | ✔ | ✔ | ✔ |
| `daily_movement_summary` | ✔ | ✔ | ✔ | ✔ |

---

## 4. Scoping rules (BR-09)

| Rule | Behaviour |
|---|---|
| SC-01 | `users.site_id = NULL` means all sites. Reserved for `SUPER_ADMIN`. |
| SC-02 | An empty `user_facility_access` set means all facilities **within the user's site**, not all facilities everywhere. |
| SC-03 | Scope applies to reads and writes alike. A supervisor scoped to Yard A cannot see, report on, or act on Yard B. |
| SC-04 | Scope is applied by a global query scope in the backend, not by client-side filtering. |
| SC-05 | An out-of-scope target returns `403 FACILITY_OUT_OF_SCOPE` — the same response as "not permitted", so scope cannot be used to probe for the existence of other facilities. |
| SC-06 | Reports and exports are scoped identically. Export is a common leak path and is tested explicitly. |

---

## 5. Enforcement and verification

| Layer | Mechanism |
|---|---|
| Route | `auth:sanctum` + `permission:{code}` middleware |
| Controller | Laravel Policy per resource for record-level decisions |
| Query | Global scope injecting site/facility predicates |
| Client | Permission list returned by `/auth/me`; drives rendering only |

**Verification.** A generated feature test asserts, for every one of the ~90 permissions and
every one of the 5 roles, that an endpoint requiring that permission returns 403 for roles
that lack it and 2xx for roles that hold it. The matrix above is the fixture; if a developer
grants a permission in code without updating this document, the test fails. The document and
the implementation cannot drift.

A second test asserts the four deliberate denials in §3.4 specifically, so relaxing them is
always a conscious act with a failing test to acknowledge.

---

## 6. Password and session policy

| Item | Value | Source |
|---|---|---|
| Hashing | bcrypt, cost 12 | Laravel default |
| Minimum length | 12 characters | `CFG-10` — **placeholder, `OI-15`** |
| Complexity | mixed case + digit + symbol | `CFG-10` — **placeholder** |
| Reuse | last 3 passwords blocked | `CFG-10` |
| Failed attempts | 5, then 15-minute lockout | `CFG-10` |
| Forced change | on first login and after admin reset | `users.must_change_password` |
| Web session idle timeout | `CFG-11`, default 480 min | **placeholder, `OI-15`** |
| PDA token TTL | `CFG-11` | idle expiry enforced server-side |
| Concurrent PDA sessions | 1 per user (`CFG-20`) | enforces "no shared credentials" |

None of these values is presented as agreed. They are working defaults that must be
confirmed under `OI-15` before go-live.

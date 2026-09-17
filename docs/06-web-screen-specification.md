# 06 — Admin Web Screen Specification

**Phase:** 7 — Admin Web screen specification
**Covers:** Deliverable F (web application screen list)
**Status:** Baseline for review

---

## 1. Information architecture

```
┌ Sidebar ────────────────┬ Header: site selector · search · user menu ─────┐
│ Dashboard               │                                                 │
│                         │                                                 │
│ OPERATIONS              │   Content region                                │
│  Live Inventory         │   ┌───────────────────────────────────────────┐ │
│  Location Occupancy     │   │ Page title · breadcrumb · primary actions │ │
│  Search & Trace         │   ├───────────────────────────────────────────┤ │
│  Transactions           │   │ Filter bar (collapsible, URL-synced)      │ │
│  Holds & Exceptions     │   ├───────────────────────────────────────────┤ │
│  Stock Verification     │   │ Data table — dense, sortable, paginated   │ │
│  Corrections            │   │                                           │ │
│                         │   └───────────────────────────────────────────┘ │
│ REPORTS                 │                                                 │
│  (13 reports)           │   Detail opens in a right-hand drawer, not a    │
│                         │   new page, so filter context is never lost.    │
│ MASTERS                 │                                                 │
│  Sites · Facilities     │                                                 │
│  Zones · Locations      │                                                 │
│  Location Barcodes      │                                                 │
│  Customers · Reasons    │                                                 │
│                         │                                                 │
│ ADMINISTRATION          │                                                 │
│  Users · Roles          │                                                 │
│  Imports · Opening Stock│                                                 │
│  Settings · Audit Log   │                                                 │
└─────────────────────────┴─────────────────────────────────────────────────┘
```

Navigation items render only when the user holds the governing permission. An empty section
header is never shown.

---

## 2. Design system

The BRD does not specify visual design; the master prompt specifies what to avoid. These are
the rules the implementation follows.

| Aspect | Rule |
|---|---|
| Density | Data tables at 36 px row height, 13 px type. This is an operations tool; whitespace costs rows on screen. |
| Colour | Neutral greys as the base. Colour is reserved for **status meaning only** — never decoration. |
| Status colours | Stored = slate · In Movement = amber · Staged = blue · Dispatched = green · On Hold = orange · Damaged/Exception = red · Blocked/Inactive = grey |
| Typography | One family, three weights, five sizes. Tabular numerals for all quantity and count columns. |
| Elevation | Two levels only: base and overlay. No decorative shadows. |
| Cards | Only for dashboard KPIs. Tables and forms sit directly on the page. |
| Charts | Dashboard only, maximum three. |
| Gradients | None. |
| Icons | Functional only, 16 px, never as the sole label of an action. |
| Motion | 150 ms for state changes. No entrance animation on data. |
| Responsive | ≥1280 px full layout · 768–1279 px collapsed sidebar · <768 px read-only card view for supervisors on tablets |
| Keyboard | `/` focus search · `f` filter bar · `Esc` close drawer · arrow keys navigate rows · `Enter` open detail |

Every screen implements four states without exception: **loading** (skeleton matching the
final layout, never a spinner over blank space), **empty** (explains why it is empty and
what to do), **error** (shows the error code, a plain-language message and a retry), and
**forbidden** (explicit "you do not have permission", never a blank page or a silent
redirect).

---

## 3. Screen catalogue

44 screens. Each entry gives purpose, roles, key elements, actions and API dependency.
Detailed field-level specs are produced per screen immediately before implementation, per
master prompt §41.

### 3.1 Dashboard

| S-01 | **Operational Dashboard** |
|---|---|
| Purpose | Live operational visibility (BRD §11.1, §23) |
| Roles | All (content filtered by permission and facility scope) |
| KPI tiles | Total Active Pallets · Open Yard Stock · Closed Warehouse Stock · Today Put-Away · Today Dispatch · Today Transfers · Empty Locations · Occupied Locations · Ageing > Threshold · Hold/Exception Count |
| Panels | Stock by facility (bar) · Stock by status (bar) · Ageing buckets 0-7/8-15/16-30/>30 (bar) · Occupancy summary (occupied/empty/blocked/inactive) · Oldest 10 pallets awaiting dispatch (table) · Last 20 transactions (table) · Exception alerts (list) |
| Interaction | Every tile and every chart segment is a link into a pre-filtered Live Inventory or Transactions view. A KPI you cannot drill into is decoration. |
| Refresh | Polls `CFG-14` (15 s) when tab visible; shows "updated 12s ago"; manual refresh available |
| API | `GET /dashboard/kpis`, `/dashboard/ageing`, `/dashboard/alerts` |
| Empty state | Pre-go-live: "No inventory yet. Start with Opening Stock or the first put-away." |

### 3.2 Operations

| ID | Screen | Purpose / key elements |
|---|---|---|
| S-02 | **Live Inventory** | Table of every active pallet. Columns: Pallet No., Job No., Customer, LPO, Status, Facility, Zone, Location, Put-away date, Ageing (days), Last movement, Last user. Filters: facility, zone, location, job, pallet, customer, LPO, status, ageing bucket, date range. Server-side pagination + sort. Export Excel/PDF (`report.export`). Row click → S-05. |
| S-03 | **Inventory Tree** | Facility → Zone → Location → Pallets drill-down (BRD §11.2). Counts at every level. Lazy-loaded per node. |
| S-04 | **Location Occupancy** | Grid and list view of every location with occupancy state (occupied / empty / blocked / inactive), current count vs capacity where defined. Filters by facility, zone, state. Actions: block, unblock, activate, deactivate — each requires a reason code and confirmation dialog. |
| S-05 | **Pallet Detail (drawer)** | Identity, current location, status, hold state, ageing, full attribute set. Tabs: Overview · Timeline · Holds · Transactions. Actions by permission: Hold, Release, Correct. |
| S-06 | **Pallet Traceability** | Full chronological lifecycle (FR-016). Vertical timeline: every transaction with type, source, destination, user, device, timestamp, reason, remarks, transaction reference. Corrections rendered inline, visually linked to what they corrected. Export PDF. |
| S-07 | **Search & Trace** | Unified search by Job / Pallet / Customer / LPO. Results grouped by job when a job has multiple pallets. Shows status, exact location, ageing, last user. |
| S-08 | **Transaction Monitor** | All transactions, newest first. Filters: date/time range, user, action type, facility, location, job, pallet, channel. Row → S-09. |
| S-09 | **Transaction Detail (drawer)** | Transaction ID, action, job, pallet, source, destination, user, device/session, timestamp, reason, remarks, before/after values, linked correction chain. |
| S-10 | **Holds & Exceptions** | All open and historical holds. Filters: type, reason, facility, ageing of hold. Actions: Release (`hold.release`), bulk release with a single reason. |
| S-11 | **Create Hold (modal)** | Pallet (pre-filled or searched), hold type, reason code, mandatory remarks, confirmation. |
| S-12 | **Stock Verification List** | All sessions with status, location, counts, variance, reviewer. Filters: status, location, date, operator. |
| S-13 | **Stock Verification Detail** | Expected vs scanned lines with outcome badges. Variance summary. Approve/Reject (`stockverify.approve`) with remarks. For `UNEXPECTED` lines, optional per-line correction generation with individual reason. |
| S-14 | **Corrections Register** | Every correction with original transaction, type, reason, justification, performer, timestamp. Read-only. |
| S-15 | **Create Correction (modal)** | Original transaction reference, correction type, new values, reason code, mandatory justification (min 10 chars), **two-step confirmation** showing a before/after diff. |
| S-16 | **Exception Queue** | Pallets in `EXCEPTION` state and transactions that failed validation repeatedly (BRD §13 "Unlocated/Exception Queue"). Supervisor worklist. |
| S-17 | **Bulk Job View** | All pallets under one Job Number with per-pallet status and location; shows explicitly whether any remain stored after a partial dispatch (BRD §13). |

### 3.3 Reports

| S-18 … S-30 | **13 report screens** — one per BRD §14 report. Shared shell: filter panel, results table, pagination, export buttons, saved-filter support. See `10-report-catalogue.md` for each report's columns, filters and permission. |

### 3.4 Masters

| ID | Screen | Notes |
|---|---|---|
| S-31 | **Sites** | List + create/edit drawer. Code, name, address, timezone, status. |
| S-32 | **Facilities** | List + create/edit. Site, code, name, type (Open Yard / Closed Warehouse / Dispatch Area / Collection Area), description, status. |
| S-33 | **Zones** | List + create/edit. Facility, code, name, description, sequence, status. |
| S-34 | **Locations** | List with filters (facility, zone, type, status, blocked, occupancy). Create/edit: facility, zone, code, description, type, capacity (optional), sequence, status. Bulk generate by pattern. Deletion refused while occupied, with an explanatory dialog. |
| S-35 | **Location Import** | Upload CSV/Excel → **dry-run validation showing a row-by-row error report** → explicit commit. Template download. Nothing is written until commit. |
| S-36 | **Location Barcodes** | Per-location barcode value, symbology, source, print history, reprint count. Preview. Batch print selection → PDF label sheet. Reprint (`barcode.reprint`) with a confirmation that states plainly: *"This reprints the same barcode value. Location identity will not change."* |
| S-37 | **Customers** | Optional master (BRD §7). List + create/edit + import. |
| S-38 | **Reason Codes** | List + create/edit by category. `requires_remarks` toggle. |

### 3.5 Administration

| ID | Screen | Notes |
|---|---|---|
| S-39 | **Users** | List with role, site, facility scope, status, last login. Create/edit: name, employee code, username, email, role, site, facility access, status. Actions: activate, deactivate, force password reset. Password is never displayed or emailed in plain text. |
| S-40 | **Roles & Permissions** | Role list; permission matrix editor grouped by module with view/create/edit/approve/correct/print/export columns. System roles are protected from deletion. Changing a role shows how many users are affected before saving. |
| S-41 | **System Settings** | Grouped configuration editor (`CFG-01` … `CFG-20`). Each setting shows its description, allowed values, and current value. Locked settings are visibly locked with the reason. Every change is audited. |
| S-42 | **Data Imports** | Import batch history with status, row counts, error reports, who committed. |
| S-43 | **Opening Stock** | Go-live mode. Location-by-location capture, progress tracking, validation summary, explicit sign-off that enables normal transactions (BRD §20). |
| S-44 | **Audit Log** | All non-inventory audited events. Filters: event type, user, entity, date range. Detail shows old/new value JSON rendered as a readable diff. Read-only, no delete. |

---

## 4. Cross-cutting behaviour

| Concern | Rule |
|---|---|
| Filters | Serialised into the URL. A filtered view is shareable and survives refresh and back-navigation. |
| Pagination | Server-side always. No screen fetches an unbounded set. Default page size `CFG-18`. |
| Export | Queued server-side; user gets a notification and a download link when ready. Large exports never block the UI. |
| Permission | Actions the user cannot perform are **not rendered**. If one is reached directly by URL, the API's 403 is shown as an explicit forbidden state. |
| Destructive actions | Confirmation dialog naming the specific record and consequence. Deactivating an occupied location states how many pallets are affected. |
| Facility scope | Applied server-side. The UI shows the active scope in the header so a supervisor always knows what they are and are not seeing. |
| Timestamps | Displayed in `CFG-13` timezone with the zone abbreviation shown. Relative time ("2h ago") only as a secondary hint, never alone. |
| Errors | The API error `code` is surfaced in a copyable detail line alongside the human message, so support conversations are precise. |
| Optimistic UI | Not used for inventory actions. State changes render only after the server confirms — the same rule as the PDA (BRD §21). |

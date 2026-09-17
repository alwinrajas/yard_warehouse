# 23 — Web Screen Hierarchy and Specification

**Covers:** Deliverable 5 (web screen hierarchy)
**Screen count:** 31 (25 required by §41, plus 6 sub-screens)
**Status:** Full §40 specifications for the increment-1 and increment-2 screens; structured
specifications for the remainder, each completed in full immediately before implementation
(§36).

---

## 1. Coverage against §41

| §41 | Screen | ID | Spec |
|---|---|---|---|
| 1 | Login | W-00 | Full |
| 2 | Dashboard | W-01 | Full |
| 3 | Live Inventory | W-02 | Full |
| 4 | Pallet Detail | W-03 | Full |
| 5 | Location Occupancy | W-04 (+ W-05 detail) | Full |
| 6 | Transaction Monitoring | W-07 (+ W-08 detail) | Structured |
| 7 | Put-Away | W-12 | Full |
| 8 | Location Movement | W-13 | Structured |
| 9 | Dispatch | W-14 | Full |
| 10 | Stock Verification | W-15 (+ W-16 review) | Structured |
| 11 | Exceptions / Holds | W-17 | Structured |
| 12 | Controlled Correction / Reversal | W-18 (+ W-19 new) | Full |
| 13 | Reports | W-09 (+ W-10 viewer) | Structured |
| 14 | Audit | W-11 | Structured |
| 15 | Site / Plant Master | W-20 | Structured |
| 16 | Facility Master | W-21 | Structured |
| 17 | Zone Master | W-22 | Structured |
| 18 | Location Master | W-23 (+ W-23a import) | Structured |
| 19 | Location Barcode Management | W-23b | Structured |
| 20 | User Master | W-27 | Structured |
| 21 | Role & Permission | W-28 | Structured |
| 22 | Customer Reference | W-25 | Structured |
| 23 | Reason Code Master | W-26 | Structured |
| 24 | System Configuration | W-29 | Structured |
| 25 | Profile / Account | W-24 | Structured |
| — | Job View | W-06 | Structured |
| — | Opening Stock | W-30 | Structured |

### Supersedes
These `W-nn` identifiers replace the `S-nn` identifiers in
`06-web-screen-specification.md`, which remains valid for its functional content. Mapping:
`S-01→W-01`, `S-02→W-02`, `S-03→W-04`, `S-04→W-04`, `S-05→W-03`, `S-06→W-03 timeline tab`,
`S-07→global search`, `S-08→W-07`, `S-09→W-08`, `S-10/S-11→W-17`, `S-12/S-13→W-15/W-16`,
`S-14/S-15→W-18/W-19`, `S-16→W-17 exception tab`, `S-17→W-06`, `S-18…S-30→W-09/W-10`,
`S-31…S-38→W-20…W-26`, `S-39→W-27`, `S-40→W-28`, `S-41→W-29`, `S-42→W-23a`, `S-43→W-30`,
`S-44→W-11`.

---

## 2. W-00 · Login

| | |
|---|---|
| **Purpose** | Authenticate a user and establish their role, site and facility scope |
| **Roles** | Unauthenticated. `PDA_OPERATOR` is rejected with a specific message. |
| **Entry** | Application root, or any deep link while unauthenticated (target preserved) |
| **Primary task** | Sign in and land on the right screen |

**Layout** — Split, 50/50 at `lg`+, single column below `md`.
Left: graphite-950 panel carrying the ALU TRACK lock-up, the tagline *Track Every Pallet.
Know Every Location.*, and a single subtle isometric line illustration of a rack elevation.
No photography, no stock imagery. Right: white panel, form centred at 360 px.

**Information hierarchy** — Wordmark → "Sign in" (h1) → username → password → error slot →
primary button → environment chip (staging only) → version.

| | |
|---|---|
| **Fields** | Username (autofocus, `autocomplete=username`) · Password (`current-password`, reveal toggle) · Remember this device (checkbox, extends refresh only, never the token TTL) |
| **Primary action** | **Sign in** — full width, `lg`, anodic-600 |
| **Secondary** | "Forgot password?" → static text naming the administrator contact. **No self-service reset** — accounts are administrator-managed (`07-permission-matrix.md`). |
| **Validation** | Client: both fields required. Server is authoritative. |
| **API** | `POST /api/v1/auth/login` via the Next.js BFF route handler; token is set as an `httpOnly` cookie and never touches client JS |
| **Permission** | `auth.login_web` |
| **Loading** | Button enters loading state, form disabled, 10 s timeout |
| **Error** | Inline `Alert danger` above the button, distinguishing: invalid credentials · account inactive · account locked (with the remaining lockout time) · **no web access for this role** ("Your account is for the ALU TRACK PDA application") · server unreachable. Never a generic "login failed". |
| **Success** | Redirect to the preserved deep link, else the role landing page (`22` §6) |
| **Forced change** | If `must_change_password`, redirect to a change-password step before anything else |
| **Audit** | `login.success`, `login.failed`, `login.locked` |
| **Responsive** | Below `md`, the brand panel collapses to a header strip |
| **Accessibility** | `<form>` with a submit button; errors in an `aria-live="assertive"` region; labels not placeholders |
| **Components** | `Input`, `Button`, `Alert`, `Logo` |

---

## 3. W-01 · Dashboard

| | |
|---|---|
| **Purpose** | Communicate the operational state of the yard and surface what needs attention |
| **Roles** | All web roles; content filtered by permission and scope |
| **Entry** | Post-login landing; logo click |
| **Primary task** | Answer *what is happening, where is stock, what needs attention* in under ten seconds |

### Layout

```
┌─ Operational Overview ───────────────── Al-Noor Plant · updated 8s ago  ⟳ ──┐
│                                                                             │
│ ┌──────────┬──────────┬──────────┬──────────┐   ┌─── NEEDS ATTENTION ─────┐ │
│ │ ACTIVE   │ OPEN YARD│ CLOSED WH│ AGEING   │   │ ⚠ 3 pallets on hold     │ │
│ │  3,847   │  2,104   │  1,743   │ >30d  62 │   │   2 blocked locations   │ │
│ │  ▲ 42    │          │          │  ▲ 8     │   │ ⚠ 1 verification review │ │
│ └──────────┴──────────┴──────────┴──────────┘   │ ⚠ 62 pallets > 30 days  │ │
│ ┌──────────┬──────────┬──────────┬──────────┐   │ ⚠ 1 correction today    │ │
│ │TODAY PUT │TODAY DISP│TODAY TRNS│ HOLD/EXC │   │                         │ │
│ │   128    │    94    │    37    │    3     │   │  each row → filtered view│ │
│ └──────────┴──────────┴──────────┴──────────┘   └─────────────────────────┘ │
│                                                                             │
│ ┌─ Stock by facility ────────┐ ┌─ Ageing ──────┐ ┌─ Location utilisation ─┐ │
│ │ Open Yard A   ▓▓▓▓▓▓ 1,402 │ │ 0–7   ▓▓▓ 2211│ │  Occupied  1,610       │ │
│ │ Open Yard B   ▓▓▓    702   │ │ 8–15  ▓▓  984 │ │  Empty       390       │ │
│ │ Warehouse B   ▓▓▓▓   1,201 │ │ 16–30 ▓   590 │ │  Blocked       2       │ │
│ │ Warehouse C   ▓▓     542   │ │ >30   ▓    62 │ │  Inactive      8       │ │
│ └────────────────────────────┘ └───────────────┘ └────────────────────────┘ │
│                                                                             │
│ ┌─ Oldest awaiting dispatch ──────────┐ ┌─ Recent activity ───────────────┐ │
│ │ PAL-09912  JOB-8401  WH-B-01-004 47d│ │ 10:42 ⊕ PAL-10245 → YD-A-03-018 │ │
│ │ PAL-09918  JOB-8401  WH-B-01-005 47d│ │ 10:41 ⇥ PAL-10199 dispatched    │ │
│ │ … 8 more                            │ │ 10:39 ⇄ PAL-10203 A-02→A-05     │ │
│ └─────────────────────────────────────┘ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

| | |
|---|---|
| **KPIs** | Row 1 — state: Total Active · Open Yard · Closed Warehouse · Ageing > threshold. Row 2 — flow: Today Put-Away · Today Dispatch · Today Transfers · Hold/Exception. State above flow, because "what is here" precedes "what moved". |
| **Attention rail** | Right column, full height of the KPI block. Only non-zero items render. When everything is clear it shows a single calm line: "Nothing needs attention." That is a real and useful answer. |
| **Charts** | Exactly three, all horizontal bars — facility, ageing, utilisation. No pie, no donut, no gauge, no line. Each bar is a link. |
| **Panels** | Oldest awaiting dispatch (top 10, ageing-coloured) · Recent activity (last 20, `ActivityFeed`) |
| **Drill-through** | Every tile, bar, rail item and row links to a pre-filtered W-02, W-04, W-07 or W-17 (UX-06) |
| **Filters** | Facility (respects scope) · comparison period for deltas. Nothing else — a dashboard with a filter bar is a report. |
| **API** | `GET /dashboard/kpis`, `/dashboard/ageing`, `/dashboard/alerts` |
| **Refresh** | `ETag` poll every `CFG-14` (15 s) while the tab is visible. "updated 8s ago" plus a manual refresh. Changed values animate a single 160 ms colour pulse — enough to notice, not enough to distract. |
| **Loading** | Skeletons in the exact tile and chart geometry. No spinner, no layout shift. |
| **Empty** | Pre-go-live: "No inventory recorded yet." with actions Import Locations / Start Opening Stock, by permission. |
| **Error** | Per-panel. One failing endpoint degrades one panel, with a retry — it never blanks the dashboard. |
| **Permission** | `dashboard.view`. Panels requiring `transaction.view` or `stockverify.approve` are absent without them. |
| **Responsive** | `xl/lg` 4-col KPI + rail · `md` 2-col, rail moves below · `sm` single column, charts become ranked lists |
| **Accessibility** | Charts have an accessible table equivalent behind a "View as table" toggle; polled updates announced politely |
| **Components** | `KpiCard`, `Chart`, `ActivityFeed`, `AgeingIndicator`, `PalletIdentity`, `LocationRef`, `EmptyState`, `Skeleton` |

---

## 4. W-02 · Live Inventory

| | |
|---|---|
| **Purpose** | The primary inventory workspace — find, filter, inspect and act on stored pallets |
| **Roles** | All web roles (read); actions by permission |
| **Entry** | Sidebar · every dashboard drill-through · search "view all results" |
| **Primary task** | Narrow 3,800 pallets to the handful that matter, then act |

| | |
|---|---|
| **Columns** | Pallet ‹P1› · Job ‹P1› · Customer ‹P2› · LPO ‹P3› · Facility ‹P2› · Zone ‹P3› · **Location ‹P1›** · Status ‹P1› · Put-Away ‹P3› · Last Movement ‹P2› · Ageing ‹P1› · Last User ‹P3› · row actions ‹P1›. Priority ranks drive responsive hiding (`20` §7). |
| **Rendering** | Pallet via `PalletIdentity`, location via `LocationRef`, status via `StatusBadge`, ageing via `AgeingIndicator`. No raw strings. |
| **Filters** | Facility · Zone · Location · Status · Block state · Ageing bucket · Customer · LPO · Job · Put-away date range. Inline on `lg`+, popover on `md`, sheet on `sm`. Active filters render as removable chips with a count and Clear all. **URL-synced.** |
| **Search** | Toolbar search across pallet, job, customer, LPO. Debounced 250 ms. |
| **Sorting** | Indexed columns only: ageing (default, desc), put-away, last movement, location, pallet |
| **Row actions** | View detail (drawer) · View timeline · Copy pallet number · Transfer ‹`transfer.perform`› · Dispatch ‹`dispatch.perform`› · Place hold ‹`hold.create`› |
| **Bulk** | Selection checkboxes; bulk hold and bulk export only. **No bulk move or bulk dispatch** — those require physical verification per pallet and a bulk control invites exactly the error the system exists to prevent. |
| **Primary action** | Export ‹`report.export`› |
| **API** | `GET /inventory/current` with filter, sort and page params |
| **Loading** | Table skeleton with correct column widths; filter bar stays live and interactive |
| **Empty — no data** | "No pallets in inventory yet." + Start Opening Stock / Record Put-Away by permission |
| **Empty — no results** | "No pallets match these filters." + the active filter list + **Clear all filters** (UX-10) |
| **Error** | Inline panel with the error code, plain message and Retry; filters preserved |
| **Forbidden** | Explicit state naming `inventory.view` |
| **Density** | Default 40 px; compact and comfortable available and persisted per user |
| **Responsive** | `sm` switches to record cards carrying pallet, location, status, ageing |
| **Audit** | Exports write `export.generated` |
| **Components** | `DataTable`, `DataTableToolbar`, `FilterBar`, `Pagination`, `PalletIdentity`, `LocationRef`, `StatusBadge`, `AgeingIndicator`, `Drawer`, `EmptyState` |

---

## 5. W-03 · Pallet Detail (drawer)

| | |
|---|---|
| **Purpose** | Everything known about one pallet, and its complete lifecycle |
| **Roles** | All web roles (read); actions by permission |
| **Entry** | Any `PalletIdentity` anywhere in the product; global search; deep link `?pallet=` |
| **Primary task** | Confirm where a pallet is and understand how it got there |

### Anatomy

```
┌─────────────────────────────────────────────────────────── ✕ ─┐
│  PAL-10245                                    ● Stored         │  hero identity
│  JOB-8817 · Gulf Aluminium Industries · LPO-44912              │
├────────────────────────────────────────────────────────────────┤
│  CURRENT LOCATION                                              │
│  ▦ YD-A-03-018        Open Yard A › Zone A › Row 03            │  LocationRef hero
│  Stored 4 days  ·  put away 12 Sep 2026, 08:14  ·  R. Kumar    │
├────────────────────────────────────────────────────────────────┤
│  [Transfer]  [Dispatch]  [Place hold]              [⋯ more]    │  action bar
├────────────────────────────────────────────────────────────────┤
│  Overview │ Timeline │ Holds │ Transactions                    │
├────────────────────────────────────────────────────────────────┤
│  ● Dispatch          —                        pending          │
│  │                                                             │
│  ● Transfer          14 Sep 09:12  ·  R. Kumar  ·  PDA-04      │
│  │   YD-A-01-004  →  YD-A-03-018                               │
│  │   Reason: Lane consolidation                                │
│  │                                                             │
│  ● Put-Away          12 Sep 08:14  ·  R. Kumar  ·  PDA-04      │
│  │   →  YD-A-01-004                    TXN  PA-20260912-000148 │
│  │                                                             │
│  ○ At Collection Point   12 Sep 07:55                          │
└────────────────────────────────────────────────────────────────┘
```

| | |
|---|---|
| **Hero** | Pallet number in `mono-lg`, status badge, job · customer · LPO beneath. The identity is the drawer header and stays fixed while tabs scroll. |
| **Current location** | `LocationRef` hero variant with dwell time, put-away timestamp and last actor. If dispatched, this block is replaced by a dispatched summary (date, destination reference, operator). If held, a `signal-warning` band carries the hold reason and who placed it. |
| **Overview tab** | Grouped `StatPanel`s: Identity · Location & dwell · Source data (raw barcode value, barcode profile, whether customer/LPO were decoded or imported) · Optional attributes, rendered **only if `OI-05` is confirmed and populated** |
| **Timeline tab** | `Timeline`. Newest first, current state pinned. Each node: action icon, `MovementDirection`, actor, device, timestamp, reason, remarks, `TransactionRef`. Corrections render as an indented branch attached to the transaction they corrected — never as a peer row, because a correction is a statement *about* a transaction. |
| **Holds tab** | Open and historical holds: type, reason, remarks, placed by/at, released by/at, duration |
| **Transactions tab** | Flat table of the same events for filtering and export |
| **Actions** | Transfer · Dispatch · Place hold / Release hold · Correct ‹`correction.perform`, inside `PrivilegedAction`› · Print traceability PDF · Copy pallet number. Actions blocked by state are **shown disabled with a tooltip reason** ("Cannot dispatch — on hold since 14 Sep"). |
| **API** | `GET /pallets/{id}`, `/pallets/{id}/history` |
| **Loading** | Hero renders instantly from the row data already in hand; body streams. The drawer never opens blank. |
| **Error** | Body-level error with retry; hero remains |
| **Permission** | `pallet.view`; timeline requires `traceability.view` |
| **Responsive** | Full-screen sheet below `md` |
| **Accessibility** | Focus trapped, `Esc` closes, focus returns to the originating row; timeline is an ordered list |
| **Components** | `Drawer`, `PalletIdentity`, `LocationRef`, `StatusBadge`, `Timeline`, `MovementDirection`, `StatPanel`, `Tabs`, `PrivilegedAction` |

---

## 6. W-04 · Location Occupancy

| | |
|---|---|
| **Purpose** | Understand where stock sits and where space is available, spatially |
| **Roles** | All web roles; block/unblock by permission |
| **Entry** | Sidebar · dashboard utilisation chart · any `LocationRef` |
| **Primary task** | See the shape of the yard at a glance; find space; find problems |

### The zone board — the product's signature screen

Not a table (§10 of the mandate). Each zone is a panel; each location is a cell.

```
┌─ Open Yard A ───────────────── 412 locations · 76% utilised ── [Board │ List] ┐
│                                                                              │
│  ZONE A · Row 01        ZONE A · Row 02        ZONE A · Row 03               │
│  ▣▣▣▣ ▣▣□□ □□□□         ▣▣▣▣ ▣▣▣▣ ▣▣□□         ▣▣▣▣ ⊠⊠▣▣ ▣▣▣▣               │
│  001      008     012   001      008     012   001      008     012          │
│                                                                              │
│  ZONE B · Row 01        ZONE B · Row 02                                      │
│  ▣▣▣▣ ▣▣▣▣ ▣▣▣□         ░░░░ ▣▣▣▣ ▣▣□□                                       │
│                                                                              │
│  ▣ occupied   □ empty   ⊠ blocked   ░ inactive   ◎ ring = ageing > 30d       │
└──────────────────────────────────────────────────────────────────────────────┘
```

| | |
|---|---|
| **Cell** | 20 px square, 2 px gap, `location.*` token fill. Occupied cells scale opacity with utilisation where capacity is defined. An ageing ring overlays cells holding stock past `CFG-07`. Hover → popover with code, pallet count, oldest ageing, top 3 pallets. Click → W-05 drawer. |
| **Grouping** | Site → Facility (tabs) → Zone (panels) → Row (rows of cells). Row grouping is derived from the location code pattern (`CFG-21`) and falls back to a simple flow when no pattern is configured — it never guesses a layout it cannot derive. |
| **Views** | **Board** (default) and **List** (`DataTable`: location, facility, zone, type, state, pallet count, capacity, utilisation, oldest ageing, blocked reason). Both consume the same filters. |
| **Filters** | Facility · Zone · State (occupied/empty/blocked/inactive) · Location type · Has ageing stock · Utilisation range |
| **Actions** | Block ‹`location.block`, reason required› · Unblock · Activate / Deactivate ‹`location.edit`› · Print label ‹`barcode.print`› · Export. Multi-select supports bulk block/unblock with one reason. |
| **Safety** | Blocking an occupied location is permitted but the confirmation names the pallet count and states that existing stock is unaffected while new inbound is refused. Deactivating an occupied location is refused, with the count and a link to those pallets. |
| **API** | `GET /inventory/occupancy`, `POST /locations/{id}/block` · `/unblock` |
| **Loading** | Cell-grid skeleton per zone; zones stream in independently |
| **Empty** | "No locations configured for this facility." + Add Location / Import Locations by permission |
| **Performance** | Virtualised above 500 cells; zone panels render lazily on scroll |
| **Responsive** | `md` cells 16 px · `sm` board unavailable, List view only, with a notice |
| **Accessibility** | The board is a labelled grid with per-cell `aria-label` ("YD-A-03-018, occupied, 1 pallet, oldest 4 days"); arrow-key navigation; state conveyed by pattern as well as colour |
| **Components** | `OccupancyBoard`, `LocationHierarchy`, `DataTable`, `FilterBar`, `ConfirmDialog`, `Drawer` |

---

## 7. W-12 · Put-Away (manual, web)

| | |
|---|---|
| **Purpose** | Record a put-away without a PDA scan, for the fallback cases the BRD names |
| **Roles** | Supervisor, Yard Admin, Super Admin (`putaway.perform` + web login) |
| **Entry** | Sidebar → Operations; from a pallet that failed a PDA transaction |
| **Primary task** | Place a known pallet into a known location, safely and accountably |

**Standing notice**, `Alert info`, always visible at the top:
*"Manual entry — no scan verification. Use the ALU TRACK PDA where possible. This
transaction will be recorded as web-channel without a device reference."*

### Flow — `ProgressSteps`, three steps, one panel

```
①  Location  ──────  ②  Pallet  ──────  ③  Confirm
```

| Step | Content |
|---|---|
| **1 · Location** | `ScanField` accepting a scanned or typed location barcode, plus a `Combobox` location picker. On resolve: `LocationRef` hero, facility/zone, current occupancy vs capacity, state. Invalid, inactive, blocked or out-of-scope locations are rejected here with an `ExceptionPanel` naming the reason — before the user invests in step 2. |
| **2 · Pallet** | `ScanField` for the ERP pallet barcode, plus search by job/pallet. On resolve: `PalletIdentity` hero with job, customer, LPO — or, under the `RAW_REFERENCE` profile, the reference with an explicit "details not encoded on label" note. Never blank fields pretending to be data. |
| **3 · Confirm** | Side-by-side summary: pallet ↔ destination, `MovementDirection` style. Optional reason and remarks. Primary **Confirm put-away**. |

| | |
|---|---|
| **Validation** | Client mirrors the server's ordered checks for fast feedback; the server is authoritative (`05-business-rules-and-state-machine.md` §3.1) |
| **API** | `POST /putaway/validate-location` (advisory) → `POST /putaway` with a fresh `Idempotency-Key` |
| **Pending** | Button → "Committing transaction…", form locked. **No optimistic state** (UX-09). |
| **Success** | `TransactionResult`: ✓ Pallet stored · `TransactionRef` · pallet · location · timestamp · actions **Put away another** (location retained) / **View pallet** / **Done** |
| **Failure** | `ExceptionPanel` with the real state and real actions. For `PALLET_ALREADY_STORED`: headline "Pallet already stored", body naming the current location, actor and time, actions View pallet / Transfer instead / Cancel. |
| **Permission** | `putaway.perform`; manual location selection additionally requires `scan.manual_override` |
| **Audit** | Transaction with `channel = WEB`, no `device_id`; manual override writes `override.used` |
| **Responsive** | Single column below `lg`; hidden below `md` with a message directing to the PDA |
| **Components** | `ProgressSteps`, `ScanField`, `Combobox`, `LocationRef`, `PalletIdentity`, `MovementDirection`, `TransactionResult`, `ExceptionPanel`, `Alert` |

---

## 8. W-14 · Dispatch (manual, web)

Same shell and standing notice as W-12. Four steps, because dispatch is irreversible.

```
①  Find pallet  ──  ②  Verify location  ──  ③  Details  ──  ④  Confirm
```

| Step | Content |
|---|---|
| **1 · Find** | Search by job, pallet, customer or LPO. Results grouped by job, showing every pallet with status, exact location, ageing. **Ineligible pallets are shown greyed with the reason, not hidden** — the user needs to know why the pallet they were sent for cannot go (§14 of the mandate). |
| **2 · Verify location** | The pallet's recorded location as a `LocationRef` hero, with a confirmation that this is the location being dispatched from. Mismatch handling is the emphasis of this step. |
| **3 · Details** | Delivery reference (required when `CFG-16`) · vehicle reference · reason code · remarks |
| **4 · Confirm** | Full summary. Confirm button styled `danger`-adjacent and labelled **Confirm dispatch — this cannot be undone**, with a note that reversal requires an administrative correction. |

| | |
|---|---|
| **Wrong-location error** | Rendered exactly as §14 of the mandate requires — not "Error": headline **Wrong location**, then `Expected: YD-A-03-018` / `Scanned: YD-B-02-004` as a two-row comparison in `mono`, with actions View pallet / Go to expected location / Cancel |
| **Hold error** | `423` → headline "Pallet is on hold", the hold reason, who placed it and when, actions View hold / Request release. If the user holds `dispatch.override_hold`, an additional `PrivilegedAction` block offers override with a mandatory justification. |
| **API** | `POST /dispatch/validate` → `POST /dispatch` |
| **Success** | ✓ Pallet dispatched · `TransactionRef` · pallet · source location · delivery reference · timestamp · **Next pallet on this job** if any remain stored |
| **Permission** | `dispatch.perform`; override requires `dispatch.override_hold` |
| **Audit** | `channel = WEB`; override writes `override.used` with justification |
| **Components** | As W-12 plus `PrivilegedAction`, `StatusBadge` |

---

## 9. W-18 / W-19 · Corrections

| | |
|---|---|
| **Purpose** | The only sanctioned way to fix a completed transaction, and the register of every one performed |
| **Roles** | Yard Admin, Super Admin (`correction.perform`). Supervisors and operators are excluded by default (`07-permission-matrix.md` §3.4). |
| **Entry** | Sidebar → Operations · from a transaction detail · from a stock verification review |
| **Primary task** | Correct a mistake without destroying the record of it |

### W-18 · Corrections register
Read-only `DataTable`: date/time · `TransactionRef` of the correction · type · pallet ·
original `TransactionRef` · reason code · justification (truncated, tooltip) · performed by.
Filters: date range, type, reason, performer, pallet. Row → drawer showing the `AuditDiff`
and both transactions side by side.

### W-19 · New correction — the privileged path

Entire form wrapped in `PrivilegedAction` (UX-08): amber-bordered surface, eyebrow
**Administrative action**, and a persistent explanatory line: *"The original transaction will
be preserved. This creates a new, audited correction record."*

| | |
|---|---|
| **Fields** | Original transaction (`Combobox`, searchable by reference or pallet) · Correction type (`PUTAWAY_LOCATION_CORRECTION` · `TRANSFER_REVERSAL` · `DISPATCH_REVERSAL` · `STATUS_CORRECTION` · `MANUAL_RELOCATION`) · New value, rendered per type (a location picker, a status select) · Reason code (category `CORRECTION`) · Justification (**required, min 10 characters**, counter shown) |
| **Confirmation** | Two-step. Step 2 shows an `AuditDiff` — current state vs resulting state, changed keys highlighted — and requires typing the pallet number to proceed. |
| **Validation** | Type must be legal for the original transaction's type and the pallet's current state; the server re-validates the full state machine |
| **API** | `POST /corrections` |
| **Success** | ✓ Correction recorded · new `TransactionRef` · link to the pallet timeline, where the correction now appears as a branch on the original |
| **Failure** | `ExceptionPanel`; nothing is written |
| **Never** | No screen anywhere in ALU TRACK offers direct editing of a current location, a status or a transaction row. This is the only path, and it always appends. |
| **Audit** | Transaction with `correction_of_transaction_id`, `previous_values`, `new_values`; notification to Yard Admin and Super Admin |
| **Components** | `PrivilegedAction`, `Combobox`, `AuditDiff`, `ConfirmDialog`, `DataTable`, `Drawer` |

---

## 10. Structured specifications — remaining screens

Each row carries the operationally decisive facts. The full §40 template is completed for
each screen immediately before it is built, per §36 and `13-delivery-plan.md`.

| ID | Screen | Purpose · primary task | Key elements | Primary action | Permission | Notable states |
|---|---|---|---|---|---|---|
| **W-05** | Location Detail (drawer) | What is in this location, and is it usable | `LocationRef` hero · state · capacity/utilisation · barcode value + preview · pallet list with ageing · recent transactions | Block / Unblock | `location.view` | Empty: "This location is currently empty." + nearest available locations |
| **W-06** | Job View | Is this job fully shipped | Job header with pallet counts by status · pallet table · dispatch progress bar | Export | `pallet.view` | Highlights pallets remaining after a partial dispatch |
| **W-07** | Transaction Monitor | What has happened, filterable | `DataTable`: time · `TransactionRef` · type · pallet · `MovementDirection` · user · channel · device · reason. Type filter as segmented control. | Export | `transaction.view` | Live-appends new rows with a "3 new" pill rather than jumping the scroll |
| **W-08** | Transaction Detail (drawer) | Everything about one transaction | Header with type + ref + outcome · pallet · source→destination · actor, device, session, channel · reason, remarks · before/after `AuditDiff` · correction chain | View pallet | `transaction.view` | Correction chain rendered as linked cards |
| **W-09** | Reports index | Choose a report | 13 report cards grouped Inventory / Movement / Control, each with a one-line purpose and last-run time | Open | `report.view.*` | Reports without permission are absent |
| **W-10** | Report viewer | Run, read and export a report | Shared shell: filter panel (report-specific) · results `DataTable` · summary strip · pagination · Export XLSX/PDF. Report definitions are declarative (`10-report-catalogue.md`). | Export | per-report | Required-filter state: "Select a date range to run this report." |
| **W-11** | Audit Log | Compliance evidence | `DataTable`: time · event · entity · actor + role · IP/device · summary of change. Drawer → full `AuditDiff`. Filters: event, user, entity type, date. | Export | `audit.view` | Read-only; no delete control exists anywhere |
| **W-13** | Location Movement (manual) | Move a pallet, web fallback | 3 steps: identify pallet → verify source → destination + confirm. `MovementDirection` dominant throughout (UX-04). | Confirm move | `transfer.perform` | `SOURCE_LOCATION_MISMATCH` → expected/actual comparison, same pattern as W-14 |
| **W-15** | Stock Verification list | Which counts are open and which need review | `DataTable`: reference · location · status · expected/scanned/variance · operator · reviewer. Variance rendered with `signal-warning` when non-zero. | New verification | `stockverify.view` | Badge in sidebar when reviews await this user |
| **W-16** | Verification review | Approve or reject a count | Summary strip (expected/scanned/matched/missing/unexpected) · line table with outcome badges · **intervening transactions panel** showing legitimate movements during the session · per-line correction option | Approve / Reject | `stockverify.approve` | Approval never silently moves stock; each correction is explicit and reasoned |
| **W-17** | Exceptions & Holds | What is blocked and why | Tabs: Open holds · Damaged · Exception queue · Blocked locations. Table: pallet · type · reason · remarks · location · placed by · **days on hold** (ageing-coloured). | Release hold | `hold.create` / `hold.release` | Empty: "No pallets are on hold." — a genuinely good answer, styled calmly |
| **W-20** | Sites | Define plants | List + drawer form: code, name, address, timezone, status | New site | `site.*` | Deletion refused while facilities exist |
| **W-21** | Facilities | Define yards and warehouses | List + drawer: site, code, name, **type** (Open Yard / Closed Warehouse / Dispatch Area / Collection Area), description, status. Type rendered as a labelled icon everywhere. | New facility | `facility.*` | Type change refused once locations hold stock |
| **W-22** | Zones | Subdivide facilities | List + drawer: facility, code, name, description, sequence, status. Sequence is drag-to-reorder. | New zone | `zone.*` | — |
| **W-23** | Locations | The location master | List with filters (facility, zone, type, status, blocked, occupancy) + drawer: facility, zone, code, description, type, capacity (optional, `OI-04`), sequence, status. **Bulk generate by pattern** with a live preview of the codes that will be created. | New location | `location.*` | Delete refused while occupied, naming the pallet count with a link |
| **W-23a** | Location Import | Bring in an existing yard layout | Upload → **dry-run validation with a row-by-row error report** → explicit commit. Template download. Nothing is written before commit. | Commit import | `location.import` | Validation result is its own state: valid/invalid row counts, downloadable error file |
| **W-23b** | Location Barcodes | Generate, print, reprint | List: location, barcode value (`mono`), symbology, source, first/last printed, **reprint count**. Preview panel renders the actual label. Batch select → PDF sheet. | Print labels | `barcode.print` / `barcode.reprint` | Reprint confirmation states verbatim: *"This reprints the same barcode value. The location identity will not change."* (`11-barcode-specification.md` LB-03) |
| **W-24** | Profile / Account | Manage my own account | Read-only identity (name, username, employee code, role, site, facility scope) · change password · preferences (density, page size, sidebar state, landing page) · active sessions with device and last-used, each revocable | Change password | authenticated | Role and scope are **not** editable here — that is W-27 |
| **W-25** | Customers | Optional customer reference | List + drawer: code, name, status. Import supported. | New customer | `customer.*` | Notice when a large share of pallets have no customer data (`OI-01`/`OI-11`) |
| **W-26** | Reason Codes | Control the vocabulary of why | List grouped by category (Transfer, Dispatch cancel, Correction, Hold, Damage, Location block, Other) + drawer: code, name, category, `requires_remarks`, status | New reason code | `reasoncode.*` | System categories cannot be deleted |
| **W-27** | Users | Manage accounts | List: name, username, role, site, facility scope, status, last login. Drawer form with role select and facility multi-select. Actions: activate, deactivate, force password reset. | New user | `user.*` | Deactivation warns that active PDA sessions end immediately. Passwords are never shown or emailed. |
| **W-28** | Roles & Permissions | Define what each role may do | Role list + permission matrix editor grouped by module, columns view/create/edit/approve/correct/print/export. Shows **how many users are affected** before saving. System roles protected from deletion. | Save permissions | `role.*` | Changing a permission set is audited and diffed |
| **W-29** | System Settings | Configure business behaviour | Grouped editor for `CFG-01`…`CFG-21` with description, allowed values, current value, and the open item each depends on. **Locked settings render visibly locked with the reason** (e.g. `CFG-01` after the first transaction). | Save | `settings.edit` | Every change writes an audit row with old and new values |
| **W-30** | Opening Stock | Establish inventory at go-live | Go-live mode banner · per-facility/zone progress · location-by-location capture · validation summary · exceptions list · **explicit customer sign-off that enables normal transactions** | Capture location | `openingstock.perform` | Only available while `CFG-17` is on; the screen states plainly that normal transactions are disabled until sign-off |

---

## 11. Applied to every screen

- Loading, empty, no-results, error, forbidden and success states — all six, always
- Design-system components only; no local styling
- URL-synced filters, sort and pagination
- Server-side pagination; no unbounded fetch
- Permission-aware rendering with the server as authority
- Confirmation dialogs naming the specific record and the consequence
- Identifiers in `mono`; locations via `LocationRef`; statuses via `StatusBadge`
- Nothing rendered as changed before the server confirms
- Keyboard-operable end to end; `axe-core` clean

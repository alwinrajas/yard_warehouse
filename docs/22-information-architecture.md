# 22 — Information Architecture, Navigation and Application Shell

**Covers:** Deliverable 3 (information architecture), Deliverable 4 (navigation), Deliverable 11 (permission-aware UX)
**Status:** Baseline for review

---

## 1. Organising principle

Navigation is grouped by **what the user is trying to do**, not by which database table
backs the screen. The five operational questions from
[20-uiux-architecture.md](20-uiux-architecture.md) §4 map directly onto the sidebar groups:

| Group | Answers |
|---|---|
| *(ungrouped top)* Dashboard | What is happening now? What needs attention? |
| **Inventory** | Where is stock? What is in this location? |
| **Operations** | Post a transaction; resolve an exception |
| **Insights** | What happened, and who did it? |
| **Configuration** | How is the yard and the system set up? |

A generic "Masters" bucket containing ten CRUD screens is the signature of an admin
template. Here the masters sit under Configuration, are ordered by the hierarchy they
describe, and are visually de-emphasised — they are visited during setup, not during a
shift.

---

## 2. Site map

```
ALU TRACK
│
├── Login                                              W-00   (unauthenticated)
│
├── Dashboard                                          W-01
│
├── INVENTORY
│   ├── Live Inventory                                 W-02
│   │     └── Pallet Detail            (drawer)        W-03
│   │           └── Timeline / Holds / Transactions  (tabs)
│   ├── Location Occupancy                             W-04
│   │     └── Location Detail          (drawer)        W-05
│   └── Job View                       (from search)   W-06
│
├── OPERATIONS
│   ├── Put-Away          (manual)                     W-12
│   ├── Location Movement (manual)                     W-13
│   ├── Dispatch          (manual)                     W-14
│   ├── Stock Verification                             W-15
│   │     └── Verification Detail / Review             W-16
│   ├── Exceptions & Holds                             W-17
│   └── Corrections                                    W-18
│         └── New Correction           (privileged)    W-19
│
├── INSIGHTS
│   ├── Transactions                                   W-07
│   │     └── Transaction Detail       (drawer)        W-08
│   ├── Reports                                        W-09
│   │     └── Report Viewer  (13 reports)              W-10
│   └── Audit Log                                      W-11
│
├── CONFIGURATION
│   ├── Sites                                          W-20
│   ├── Facilities                                     W-21
│   ├── Zones                                          W-22
│   ├── Locations                                      W-23
│   │     ├── Location Import                          W-23a
│   │     └── Location Barcodes                        W-23b
│   ├── Customers                                      W-25
│   ├── Reason Codes                                   W-26
│   ├── Users                                          W-27
│   ├── Roles & Permissions                            W-28
│   ├── System Settings                                W-29
│   └── Opening Stock       (go-live only)             W-30
│
└── Profile / Account       (top bar menu)             W-24
```

Screen IDs are re-based to `W-nn` here and supersede the `S-nn` identifiers in
`06-web-screen-specification.md`. The mapping is in
[23-web-screens.md](23-web-screens.md) §2.

---

## 3. Application shell

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▣ ALU TRACK  │ ⌄ Al-Noor Plant — Yard A   │ ⌕ Search pallet, job, location… │
│              │                            │      ⌘K    │ 🔔 3 │ AK Supervisor│
├────────────┬─────────────────────────────────────────────────────────────────┤
│            │  Inventory › Live Inventory                                     │
│ ▤ Dashboard│  ┌────────────────────────────────────────────────────────────┐ │
│            │  │ Live Inventory                          [Export] [Columns] │ │
│ INVENTORY  │  │ 3,847 pallets across 2 facilities                          │ │
│ ▦ Live Inv.│  ├────────────────────────────────────────────────────────────┤ │
│ ▩ Occupancy│  │ ⌕ …   Facility ⌄  Zone ⌄  Status ⌄  Ageing ⌄   ⊘ Clear (2) │ │
│            │  ├────────────────────────────────────────────────────────────┤ │
│ OPERATIONS │  │ PALLET      JOB       CUSTOMER   LOCATION    STATUS   AGE  │ │
│ ⊕ Put-Away │  │ PAL-10245   JOB-8817  Gulf Alu…  YD-A-03-018 ● Stored  4d  │ │
│ ⇄ Movement │  │ PAL-10246   JOB-8817  Gulf Alu…  YD-A-03-019 ● Stored  4d  │ │
│ ⇥ Dispatch │  │ PAL-10102   JOB-8790  Emirates…  WH-B-02-011 ▲ On Hold 22d │ │
│ ✓ Stock Ver│  │ …                                                          │ │
│ ⚠ Exceptions│ │                                                            │ │
│ ⟲ Corrections│ ├────────────────────────────────────────────────────────────┤ │
│            │  │ 25 ⌄  ·  1–25 of 3,847        ‹ 1 2 3 … 154 ›              │ │
│ INSIGHTS   │  └────────────────────────────────────────────────────────────┘ │
│ ≡ Transact.│                                                                 │
│ ▤ Reports  │                                                                 │
│ ⛨ Audit    │                                                                 │
│            │                                                                 │
│ CONFIG   ⌄ │                                                                 │
│            │                                                                 │
│ ‹ Collapse │                                                                 │
└────────────┴─────────────────────────────────────────────────────────────────┘
```

### 3.1 Top bar — 56 px, `e1`, white, 1 px bottom border

| Slot | Behaviour |
|---|---|
| **Logo lock-up** | Mark + wordmark. Links to Dashboard. Mark only when the sidebar is collapsed. |
| **Site / facility selector** | Shows the user's active scope. A dropdown only when the user has access to more than one; otherwise a static, non-interactive label. Changing scope re-scopes every screen and is announced. This is the answer to "which yard am I looking at?" and it must never be ambiguous. |
| **Global search** | 420 px on `xl`, collapses to an icon on `md`. `⌘K` / `Ctrl-K` from anywhere. See §5. |
| **Notifications** | Bell with an unread count. Popover lists operational events only (§7). |
| **User menu** | Initials avatar, name, **role chip**. Menu: Profile, Change password, Preferences, Sign out. The role chip is always visible — a user should never be unsure which permissions they are operating under. |

### 3.2 Sidebar — 264 px expanded / 64 px rail

| Aspect | Specification |
|---|---|
| Surface | graphite-0, 1 px right border. Not a dark slab — it must not visually dominate. |
| Group labels | `overline`, graphite-500, 24 px above, non-interactive |
| Item | 36 px, 13 px label, 16 px icon, 8 px gap, 6 px radius |
| Hover | graphite-50 fill |
| Active | anodic-50 fill, anodic-700 label, **2 px anodic-600 left indicator**, icon in anodic-600 |
| Collapsed | Icons centred; tooltip on hover after 400 ms; group labels become 1 px dividers |
| Persistence | Collapsed state stored per user in `localStorage` |
| Configuration group | Collapsible, **collapsed by default** for non-admin roles |
| Footer | Collapse toggle · app version · environment chip (staging only, amber) |
| Badges | Numeric badge on Exceptions & Holds and on Stock Verification when items await this user's action. Nothing else carries a badge — a sidebar of counters is noise. |

### 3.3 Content region

`PageHeader` (breadcrumb · title · one-line context, e.g. "3,847 pallets across 2
facilities" · action slot, right-aligned) → `FilterBar` → content → pagination.

The one-line context under every page title is deliberate: it tells the user what they are
looking at *and* confirms the scope in force, in the place they are already looking.

---

## 4. Navigation rules

| Rule | Behaviour |
|---|---|
| N-01 | A nav item the user lacks permission for is **not rendered**. An empty group header is never shown. |
| N-02 | Every view's full state — filters, sort, page, open drawer — lives in the URL. Views are shareable and survive refresh and back-navigation. |
| N-03 | Detail opens in a drawer over the list (UX-05). The drawer's identity is a URL parameter, so a drawer can be linked to directly. |
| N-04 | Browser back closes a drawer before it leaves the page. |
| N-05 | Breadcrumbs reflect the IA, not navigation history. |
| N-06 | Cross-links are everywhere: a pallet links to its location, a location to its pallets, a transaction to both, a user to their activity. Dead-end screens are a defect. |
| N-07 | Unsaved form changes prompt before navigation, including browser navigation. |
| N-08 | Deep-linking to a screen the user cannot access renders the explicit forbidden state — never a silent redirect to Dashboard. |

---

## 5. Global search

The fastest path to the product's most common question: *where is this pallet?*

```
⌘K  →  ┌─────────────────────────────────────────────────┐
       │ ⌕ PAL-10245                                     │
       ├─────────────────────────────────────────────────┤
       │ PALLETS                                         │
       │  ▣ PAL-10245   JOB-8817 · Gulf Aluminium        │
       │    ● Stored · YD-A-03-018 · Open Yard › Zone A  │
       │    4 days · last moved by R. Kumar              │
       ├─────────────────────────────────────────────────┤
       │ JOBS                                            │
       │  ▤ JOB-8817    6 pallets · 4 stored · 2 dispatched│
       ├─────────────────────────────────────────────────┤
       │ LOCATIONS                                       │
       │  ▦ YD-A-03-018  Open Yard › Zone A · 1 pallet   │
       └─────────────────────────────────────────────────┘
         ↑↓ navigate   ↵ open   ⇥ filter by type   esc close
```

| Aspect | Behaviour |
|---|---|
| Searches | Pallet number · Job number · Customer · LPO · Location code |
| Ranking | Exact identifier match first, then prefix, then partial. A pallet result outranks a job result for an identical score — the pallet is what the user is standing in front of. |
| Result content | **The answer, not a link.** A pallet result shows its status and exact location inline, so in the common case the user never opens anything. |
| Latency | Debounced 250 ms, cancellable, first result < 300 ms |
| Empty | "No match for `PAL-9999`. Check the pallet number, or search by job or customer." |
| Scope | Constrained to the user's site and facility access, silently |
| Keyboard | `⌘K` open · `↑↓` navigate · `↵` open · `⇥` cycle type filter · `esc` close |
| Recents | Last 5 searches per user, shown on open before typing |

---

## 6. Permission-aware UX

Rendering follows the permission set returned by `/auth/me`. **The server is the
authority** (`07-permission-matrix.md`); the client only avoids showing users things they
cannot use.

| Situation | Treatment |
|---|---|
| No permission for a module | Nav item absent; direct URL renders `EmptyState variant="forbidden"` with the required permission named and a "Request access" mailto to the administrator |
| No permission for an action | Button absent. Not disabled — a disabled button the user can never enable is a dead control that invites a support call. |
| Action permitted but blocked by state | Button **present and disabled**, with a tooltip stating the reason ("Cannot dispatch — pallet is on hold"). The distinction from the row above matters: this is temporary and actionable. |
| Out of facility scope | Records simply absent from lists. Direct access returns the same forbidden state as "no permission", so scope cannot be used to probe for other facilities. |
| Privileged action available | Rendered inside `PrivilegedAction` — visually distinct, reason required (UX-08) |
| Role context | Role chip always visible in the top bar; Configuration group collapsed by default for non-admins |

### Role landing pages

| Role | Lands on | Rationale |
|---|---|---|
| Super Admin | Dashboard | Full oversight |
| Yard Admin | Dashboard | Operational oversight |
| Supervisor | Dashboard, attention rail expanded | Their day starts with exceptions |
| Management / Viewer | Dashboard, read-only | The only screen they need |
| PDA Operator | **No web access** — login returns a clear message directing them to the PDA | `07-permission-matrix.md` §3.1 |

---

## 7. Notifications

Operational signal only. A notification centre that fills with routine events is ignored
within a week, which makes it worse than none.

| Event | Who receives it | Priority |
|---|---|---|
| Stock verification submitted, awaiting review | Users with `stockverify.approve` in scope | Normal |
| Variance above threshold found | Supervisors, Yard Admin | High |
| Pallet held or marked damaged | Supervisors in scope | Normal |
| Location blocked | Yard Admin | Normal |
| Pallet exceeds ageing threshold (`CFG-07`) | Supervisors, daily digest, not per pallet | Low |
| Correction performed | Yard Admin, Super Admin | High |
| Manual override used (`override.used`) | Yard Admin, Super Admin | High |
| Export ready | Requesting user only | Low |
| **No inventory transaction in 60 min during working hours** | Supervisors, Yard Admin | **Critical** |

Not notified: every put-away, transfer and dispatch. Those are the Transaction Monitor's job.

Delivery: in-app popover, grouped by day, unread count on the bell. Email only for `High`
and `Critical`, and only when `CFG-19` is enabled.

---

## 8. Terminology

One word per concept, everywhere — UI, reports, exports, PDA, error messages, documentation.

| Use | Never |
|---|---|
| Pallet | Item, unit, package, SKU |
| Location | Bin, slot, position, spot |
| Facility | Warehouse (when it may be a yard), store, building |
| Zone | Area, section, block |
| Put-Away | Inbound, receive, check-in, store |
| Movement / Transfer | Relocate, shift, reposition |
| Dispatch | Check-out, ship, outbound, release |
| Hold | Freeze, lock, quarantine |
| Correction | Edit, fix, adjust, amend |
| Stock Verification | Cycle count, stock take, audit |
| Transaction | Entry, record, log, movement record |
| Job Number | Order, work order, batch |

"Release" is reserved exclusively for lifting a hold, which is why "release" is not used for
dispatch. Overloading it would make the Hold report ambiguous.

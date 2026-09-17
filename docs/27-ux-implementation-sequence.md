# 27 — UI/UX Implementation Sequence

**Covers:** Deliverable 13 (screen implementation sequence)
**Status:** Baseline for review

---

## 1. The rule

> Build the system before the screens. Build the shell before the pages.
> Build one screen completely before building two screens partially.

§44 of the mandate is explicit: tokens, shell, navigation, typography, core components,
tables, forms, status, overlays and notifications come first. Nothing below reorders that.

---

## 2. Foundation — before any screen exists

| # | Deliverable | Done when |
|---|---|---|
| F-1 | **Design tokens** — `tokens.css`, Tailwind theme, `status.ts`, `Tokens.kt` generated from shared JSON | A token page renders every colour, type step, spacing, radius, elevation and status. The `no-hex-literals` check is active. |
| F-2 | **Typography and icon set** — self-hosted Inter + JetBrains Mono subsets, Lucide | Identifiers render in mono with tabular figures everywhere (UX-01) |
| F-3 | **Application shell** — `AppShell`, `TopBar`, `Sidebar`, `PageHeader`, `Breadcrumbs` | Shell renders at all five breakpoints with collapse, persistence and correct active state |
| F-4 | **Navigation + permission gating** — `PermissionGate`, `usePermission`, generated permission codes | Nav renders differently for all five roles; a direct URL to a forbidden screen shows the explicit state |
| F-5 | **Form system** — `Input`, `Select`, `Combobox`, `DatePicker`, `Checkbox`, `Switch`, `Textarea`, RHF + Zod wiring, unsaved-change guard | A reference form demonstrates inline validation, server-error mapping and the navigation guard |
| F-6 | **Table system** — `DataTable`, `DataTableToolbar`, `FilterBar`, `Pagination`, URL state | A reference table demonstrates server-side sort/filter/page, all four states, density, column control, responsive priority collapse |
| F-7 | **Status system** — `StatusBadge`, `AgeingIndicator`, `PalletIdentity`, `LocationRef`, `MovementDirection`, `TransactionRef` | Every status renders with dot + icon + label; `axe` clean; the same statuses render identically on PDA |
| F-8 | **Overlay system** — `Drawer`, `Modal`, `ConfirmDialog`, `DropdownMenu`, `Tooltip`, `Popover` | Focus trapping, `Esc` ordering, focus restoration and URL-addressable drawers all verified |
| F-9 | **Feedback system** — `Toast`, `Alert`, `EmptyState`, `Skeleton`, `ExceptionPanel`, `TransactionResult`, `ProgressSteps` | `ExceptionPanel` renders every error code in `25` §5 from a fixture of real API envelopes |
| F-10 | **PDA foundation** — theme, `ActionTile`, `ScanTarget`, `ResultScreen`, `ErrorPanel`, `ScannerProvider` + fake | A harness screen scans a fake barcode and renders success and failure with all four feedback channels |

**Gate:** F-1 to F-10 are complete and reviewed before W-01 begins. This is the single
decision that determines whether the product looks designed or assembled.

### Status

F-1 to F-9 are **implemented** (web). Review them at `/foundation`.
F-10 (PDA foundation) is **not started** — it is an Android deliverable and is additionally
gated on `OI-07`, the confirmed device and scanner SDK.

Deferred from F-5 with a stated reason: `Combobox`, `MultiSelect`, `DatePicker` and
`DateRangePicker`. `Combobox` was built in U-2, which is the first increment that needs to
pick one facility out of many. `MultiSelect`, `DatePicker` and `DateRangePicker` are still
unbuilt — no U-2 screen needs a date range or a multi-value filter, and building them
without a consumer risks building the wrong thing.

---

## 3. Screen sequence

Each increment lines up with the functional increments in `13-delivery-plan.md` §3, so the
UI and its API arrive together and nothing is built against a stub.

| # | Increment | Screens | Why here |
|---|---|---|---|
| **U-0** ✅ | Foundation | — | §2 above |
| **U-1** ✅ | Access | W-00 Login · W-24 Profile · shell live · W-01 route (body in U-9) | The first thing anyone sees; also proves auth, permissions and the shell end to end |
| **U-2** ✅ | Yard setup | W-20 Sites · W-21 Facilities · W-22 Zones · W-23 Locations · W-23a Import | Nothing can be stored until the yard exists. Also the first real exercise of the form and table systems. |
| **U-3** | Labels | W-23b Location Barcodes | Labels must be printed and affixed before any physical operation. Long lead time — start early. |
| **U-4** | Read the inventory | W-02 Live Inventory · W-03 Pallet Detail · global search | The product's core view. Built against real put-away data from the API increment, never against fixtures. |
| **U-5** | First transaction | **PDA D-00 … D-08** (login, home, put-away, result) · W-12 Put-Away | The moment ALU TRACK becomes real: a scanned pallet appears on the web within one poll. |
| **U-6** | Find it | **PDA D-15 … D-17** (search, result, enquiry) | Completes the operator's minimum viable day: store a pallet, then find it |
| **U-7** | Move it | **PDA D-13, D-14** · W-13 Movement | Proves `MovementDirection` (UX-04) on both platforms |
| **U-8** | Ship it | **PDA D-09 … D-12** · W-14 Dispatch | Completes the operational loop and the wrong-location exception pattern |
| **U-9** | See it | W-01 Dashboard · W-04 Occupancy · W-05 Location Detail | **Deliberately late.** A dashboard built before real transaction data is a mock-up. The occupancy board needs real distribution to be tuned. |
| **U-10** | Control it | W-17 Exceptions & Holds · **PDA D-21** · W-07 Transactions · W-08 Detail | Supervisory layer over a working operation |
| **U-11** | Verify it | W-15 · W-16 · **PDA D-18 … D-20** | Depends on real inventory to count |
| **U-12** | Correct it | W-18 · W-19 | Depends on real transactions to correct. `PrivilegedAction` gets its only real use here. |
| **U-13** | Report it | W-09 · W-10 (13 reports) · W-11 Audit | One shared shell; the reports are declarative definitions, not 13 screens |
| **U-14** | Administer it | W-25 Customers · W-26 Reason Codes · W-27 Users · W-28 Roles · W-29 Settings | Low frequency, high permission. Correct last. |
| **U-15** | Go live | W-30 Opening Stock · **PDA D-22 Recent, D-23 Status** | Cutover tooling, needed only at go-live |
| **U-16** | Polish | Accessibility pass · responsive pass · performance pass · empty-state copy review · full design-system audit | Every screen re-reviewed against the quality gate as a set, not individually |

---

## 4. Why the dashboard is built ninth

It is the screen customers ask to see first and the one most often built first, which is why
so many enterprise dashboards are decorative.

A dashboard is a set of *entry points into working views* (UX-06). Until W-02, W-04, W-07
and W-17 exist, every tile is a dead end and every drill-through is a guess. Until real
transactions exist, the ageing distribution, the facility split and the "needs attention"
thresholds are invented — and thresholds invented against fake data are wrong in ways nobody
notices until go-live.

Built ninth, every tile links somewhere real and every threshold is tuned against actual
yard data. If a demo is needed earlier, U-4 (Live Inventory with real stock) demonstrates the
product more honestly than a dashboard of fabricated numbers.

---

## 5. Definition of Done — UI additions

In addition to `13-delivery-plan.md` §6 and the quality gate in `20-uiux-architecture.md` §6:

- [ ] Uses design-system components only — zero one-off styling
- [ ] All six states implemented (loading, empty-none, empty-filtered, error, forbidden, success)
- [ ] Verified at `xl`, `lg`, `md`, `sm`
- [ ] Keyboard-operable end to end; `axe-core` clean
- [ ] Every identifier in `mono`; every location via `LocationRef`; every status via `StatusBadge`
- [ ] Filters, sort and page reflected in the URL
- [ ] Permission-gated rendering verified for all five roles
- [ ] Nothing renders as changed before the server confirms
- [ ] Empty-state and error copy reviewed for tone — plain, specific, actionable
- [ ] Screenshot added to the visual regression suite

---

## 6. Review cadence

| Review | When | Against |
|---|---|---|
| Token review | End of U-0 | `21-design-system.md` §2–4 |
| Component review | End of U-0 | `21-design-system.md` §5, accessibility baseline |
| Screen review | Each screen, before merge | Quality gate `20` §6 |
| Increment review | End of each U-n | The journeys in `25` §2 that the increment enables |
| **Full design audit** | End of U-16 | Every screen side by side — consistency of density, spacing, terminology, empty-state tone and status treatment across the whole product |
| Customer presentation | After U-9 and after U-16 | Whether it reads as a commercial product |

The full design audit at U-16 is the one that catches drift. Screens reviewed individually
always pass; the same screens viewed as a set reveal the six different ways "no results" got
worded and the four different table densities that crept in.

---

## 7. What is deliberately deferred

| Deferred | Until | Why |
|---|---|---|
| Dark theme on web | Customer request | Tokens are theme-ready. Shipping two themes doubles visual QA for no stated need. |
| Saved filter presets | After go-live | Real usage should determine which presets are worth saving |
| Dashboard personalisation | After go-live | Tile arrangement should be tuned against observed use, not guessed |
| Charts beyond the three | Never, without justification | §5 and §7 of the mandate |
| Mobile web (<768) transaction posting | Not planned | That is what the PDA is for; the screens explicitly direct users there |
| Real-time WebSocket push | Customer request | Polling meets the requirement without infrastructure (`02-system-architecture.md` AD-02) |

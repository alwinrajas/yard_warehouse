# 20 — ALU TRACK UI/UX Architecture

**Product:** ALU TRACK — Yard & Warehouse Inventory Tracking & Traceability System
**Tagline:** Track Every Pallet. Know Every Location.
**Phase:** 7–8 — Experience architecture (precedes any screen implementation)
**Status:** Baseline for review

---

## 1. Deliverable map

| § | Required deliverable | Document |
|---|---|---|
| 1 | Complete UI/UX architecture | **This document** |
| 2 | Design system | [21-design-system.md](21-design-system.md) |
| 3 | Application information architecture | [22-information-architecture.md](22-information-architecture.md) |
| 4 | Navigation structure | [22-information-architecture.md](22-information-architecture.md) §3–5 |
| 5 | Web screen hierarchy | [23-web-screens.md](23-web-screens.md) |
| 6 | PDA screen hierarchy | [24-pda-screens.md](24-pda-screens.md) |
| 7 | User journeys | [25-user-journeys-and-patterns.md](25-user-journeys-and-patterns.md) §2 |
| 8 | Component architecture | [26-component-architecture.md](26-component-architecture.md) |
| 9 | Responsive strategy | **This document** §7 |
| 10 | State / interaction patterns | [25-user-journeys-and-patterns.md](25-user-journeys-and-patterns.md) §3–6 |
| 11 | Permission-aware UX | [22-information-architecture.md](22-information-architecture.md) §6 |
| 12 | Enterprise visual direction | [21-design-system.md](21-design-system.md) §1–2 |
| 13 | Screen implementation sequence | [27-ux-implementation-sequence.md](27-ux-implementation-sequence.md) |

---

## 2. Scope reconciliation against the BRD specs

This UI/UX mandate adds five screens that the earlier functional specification did not
contain. They are real additions, not restatements:

| Required (§41) | Status before | Resolution |
|---|---|---|
| #1 Login | **Missing** | Added as W-00 |
| #7 Put-Away (web) | **Missing** — PDA only | Added as W-12, **supervisor-assisted**, see below |
| #8 Location Movement (web) | **Missing** — PDA only | Added as W-13, supervisor-assisted |
| #9 Dispatch (web) | **Missing** — PDA only | Added as W-14, supervisor-assisted |
| #25 Profile / Account | **Missing** | Added as W-24 |

### Note on web-based inventory transactions

The BRD describes put-away, movement and dispatch as scan-driven PDA operations (§9, §10).
A web screen that posts the same transactions without a physical scan is a real capability
with a real risk: it is the exact path by which "scan verification" becomes optional in
practice.

It is delivered as asked, with the following constraints, which cost nothing operationally
and preserve the BRD's control model:

- These screens are gated on the **same** permissions as the PDA (`putaway.perform`,
  `transfer.perform`, `dispatch.perform`), which `PDA_OPERATOR` holds but which — per
  `07-permission-matrix.md` §3.1 — cannot be exercised on web because that role has no web
  login. In practice these screens are for Supervisors and Admins.
- Every transaction posted from them is recorded with `channel = WEB` and **no `device_id`**,
  so the Operator Activity report and the audit trail distinguish a scanned transaction from
  a keyed one at a glance.
- The UI states plainly at the top of each: *"Manual entry — no scan verification. Use the
  PDA where possible."*
- Their intended, legitimate uses are the ones the BRD already names: damaged-barcode
  fallback (§21 rows F and G), opening-stock capture (§20), and supervisor recovery from an
  abandoned transaction (§21 row C).

If the customer would rather these screens not exist at all, removing them is a
configuration decision, not a rework.

---

## 3. Who uses what

The product is two applications with one shared vocabulary, not one application rendered at
two sizes.

| | **Admin Web** | **Industrial PDA** |
|---|---|---|
| Users | Super Admin, Yard Admin, Supervisor, Management/Viewer | Forklift/PDA Operator, Supervisor |
| Posture | Seated, two hands, large monitor, unhurried | Standing or seated in a forklift, one hand, gloved, moving |
| Session | Minutes to hours | 5–20 seconds per transaction |
| Primary verb | **Understand** | **Do** |
| Input | Keyboard and mouse | Hardware scan trigger |
| Density | High — information is the product | Minimal — one decision per screen |
| Failure cost | Re-run a filter | A pallet is lost, or a wrong truck is loaded |
| Theme | Light | Dark, high contrast |

These are opposite design problems. The design system shares tokens, semantics and
terminology across them; it does not share layouts, density or components.

---

## 4. The five questions each surface answers

Every screen in ALU TRACK exists to answer one of five operational questions. A screen that
does not clearly answer one of them is removed.

| Question | Surface |
|---|---|
| **Where is this pallet?** | Global search → Pallet Detail; PDA Search |
| **What is in this location?** | Location Occupancy → zone board; PDA Location Enquiry |
| **What is happening right now?** | Dashboard; Transaction Monitor |
| **What needs my attention?** | Dashboard attention rail; Exceptions & Holds; Stock Verification review |
| **What happened, and who did it?** | Pallet Timeline; Transaction Detail; Audit |

This is also the navigation grouping rationale in
[22-information-architecture.md](22-information-architecture.md).

---

## 5. Design decisions that shape everything downstream

These are the choices that make ALU TRACK look and behave like an operations platform rather
than an admin template. They are decided once, here, and are not revisited per screen.

### UX-01 · Identifiers are typographically special
Pallet numbers, job numbers, location codes and transaction references are rendered in a
monospaced face with tabular figures, at a slightly tighter tracking, in every context —
tables, drawers, PDA screens, PDFs, labels.

*Why:* `YD-A-03-018` and `YD-A-03-Ol8` are indistinguishable in a proportional face at 13px,
and an operator misreading a location code walks to the wrong lane. Monospace also makes
columns of codes scan vertically, which is how people actually read a location list. This
single decision does more for the industrial feel of the product than any amount of styling.

### UX-02 · Neutral is the normal state
`Stored` — the state 95% of inventory is in — is rendered in neutral graphite, not green.
Colour is spent only on states that need action or attention.

*Why:* If the common case is coloured, colour stops meaning anything. A screen where
everything is green tells you nothing; a screen where three rows are amber tells you exactly
where to look.

### UX-03 · Location is a first-class object, not a string
Every location reference renders through one component that shows the code prominently and
its `Facility › Zone` context quietly, with occupancy state as a dot. It is clickable
everywhere it appears.

*Why:* The single most common user intent in a WMS is "take me to that location". Making it
a plain text cell forces a search.

### UX-04 · Movement is shown as direction, never as two fields
Source and destination always render as a directional pair with an explicit arrow, source in
neutral and destination in brand colour, on web and PDA alike.

*Why:* §13 of the mandate. Two labelled fields require reading; a direction is understood
pre-attentively. This matters most on the PDA, where the operator glances rather than reads.

### UX-05 · Detail opens in a drawer, not a page
Pallet, transaction, location and hold details open in a right-hand drawer over the current
list. The list, its filters and its scroll position survive.

*Why:* The dominant workflow is "scan a list, inspect several rows, act on one". Navigating
away and back loses context and costs a re-query each time.

### UX-06 · The dashboard is a set of entry points, not a report
Every KPI tile, every chart segment and every ageing bucket is a link into a pre-filtered
working view. No number on the dashboard is a dead end.

*Why:* §7 of the mandate asks the dashboard to answer "what needs attention?" — an answer is
only useful if you can act on it in one click.

### UX-07 · Errors state the truth, not the failure
Every rejected operation renders as a structured explanation: what happened, the actual
current state, and the available next actions as real buttons.

*Why:* §14 and §15 of the mandate. The API already returns the current truth in the 409
payload (`02-system-architecture.md` §8); the UI's job is to render it as something the
operator can act on, not as a red toast that says "Error".

### UX-08 · Privileged actions look privileged
Corrections, reversals, hold overrides and manual (unscanned) transactions use a distinct
visual treatment — a bordered "administrative action" surface, an explicit reason field, and
a two-step confirmation showing a before/after diff.

*Why:* §16 of the mandate, and BRD §11.5. If correcting inventory looks like editing a row,
it will be treated like editing a row.

### UX-09 · Nothing is optimistic
No inventory state renders as changed until the server confirms. Buttons enter an explicit
pending state; success is rendered only alongside a transaction reference.

*Why:* BRD §21 and §12 of the mandate. This is a correctness rule expressed as a UI rule,
and it applies identically to web and PDA.

### UX-10 · Empty is a state with a cause
Every empty view distinguishes *"nothing exists yet"* from *"your filters excluded
everything"* from *"this location is genuinely empty"*, and offers the matching action.

*Why:* §23 of the mandate. "No data" is the most common place an enterprise UI stops helping.

---

## 6. Quality gate

Applied to every screen before it is considered done, in addition to the functional
Definition of Done in `13-delivery-plan.md` §6.

- [ ] Uses only design-system components and tokens — no one-off styling
- [ ] The primary action is unambiguous and visually dominant
- [ ] Information hierarchy readable at a glance from one metre away
- [ ] Loading, empty, error, forbidden and success states all implemented
- [ ] Permission-aware: unavailable actions are absent, not disabled without explanation
- [ ] Every identifier uses the mono treatment (UX-01)
- [ ] Every location uses the location component (UX-03)
- [ ] Every status uses a semantic token, never a literal colour (UX-02)
- [ ] No status conveyed by colour alone — icon or text always accompanies
- [ ] Keyboard-operable end to end; visible focus on every interactive element
- [ ] Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI boundaries
- [ ] No unnecessary field is shown by default (progressive disclosure)
- [ ] Nothing renders as changed before the server confirms (UX-09)
- [ ] Looks like a commercial product, not a generated CRUD screen

---

## 7. Responsive strategy

**Desktop-first.** This is an operations console used on fixed workstations and control-room
monitors. Tablet is supported for supervisors walking the floor. Phone is not a target for
the web app — that is what the PDA is for.

| Breakpoint | Width | Layout |
|---|---|---|
| `xl` | ≥ 1600 px | Sidebar expanded (264 px). Content max 1560 px, centred. Filter bar inline. Drawer 560 px. Dashboard 4-column KPI row. |
| `lg` | 1280–1599 px | **Design target.** Sidebar expanded. Filters inline. Drawer 520 px. Dashboard 4-column. |
| `md` | 1024–1279 px | Sidebar auto-collapses to icon rail (64 px) with tooltips. Filters collapse into a popover. Drawer 480 px. Dashboard 2-column. Lower-priority table columns hidden per the column-priority list. |
| `sm` | 768–1023 px | Sidebar becomes an overlay drawer. Filters in a full-height sheet. Detail drawer becomes full-screen. Tables switch to the **record-card layout** — not a horizontally scrolling table. Dashboard single column. |
| `<768` | — | Read-only card view for supervisors. Transaction-posting screens are hidden with an explicit message directing the user to the PDA. |

### Rules
- Tables never scroll horizontally on `sm`. Each row becomes a card carrying the three
  priority-1 columns plus status; the rest are in the detail drawer.
- Every table column carries a **priority rank** (1–3) in its definition; the responsive
  behaviour is derived from it, not hand-coded per screen.
- The application shell is fluid; only the content region is max-width constrained, so a
  4K monitor shows more rows rather than more empty margin.
- Zoom to 200% must remain usable — verified, not assumed.
- Touch targets on tablet ≥ 44 px; the table switches to comfortable density automatically
  on coarse pointers (`@media (pointer: coarse)`).

---

## 8. Performance as an experience requirement

| Surface | Budget | Technique |
|---|---|---|
| Initial shell paint | < 1.5 s | Next.js App Router, server components for static chrome, no blocking fonts |
| Route transition | < 200 ms perceived | Prefetched routes, skeletons matching final layout |
| Table page | < 500 ms | Server-side pagination, filtering and sorting. Never client-side over a large set. |
| Filter apply | < 400 ms | Debounced, request-cancelling, URL-synced |
| Global search | < 300 ms to first result | Debounced 250 ms, server-ranked, cancellable |
| Drawer open | Instant | Header renders from the row data already in hand; body streams in |
| Dashboard refresh | Invisible | `ETag` polling; a `304` never repaints |

Virtualisation is used only where a view legitimately renders more than ~200 rows at once —
the location occupancy board and the traceability timeline. Everywhere else, pagination is
the correct answer and virtualisation is complexity without benefit.

---

## 9. What this architecture explicitly rejects

| Rejected | Instead |
|---|---|
| A component library with its own visual identity (MUI, Ant, Chakra) | Radix primitives (unstyled, accessible) + our tokens. The design system is ours. |
| Cards as the default container | Tables and panels on the page surface. Cards only for dashboard KPIs. |
| A chart for every metric | Three charts total on the dashboard, each earning its place |
| Colour-coded rows | Status badges in a dedicated column; row colour reserved for selection and hover |
| Modal dialogs for detail | Drawers (UX-05). Modals only for confirmation and short forms. |
| Client-side global state library | TanStack Query for server state, URL for view state, React state for ephemeral UI. Redux/Zustand solve a problem this app does not have. |
| Dark mode on web in phase 1 | Tokens are theme-ready; a dark theme is a token swap when the customer asks. Shipping two themes doubles visual QA for no stated need. |
| Toast notifications for errors on inventory actions | Inline structured error panels (UX-07). Toasts are for background events only. |

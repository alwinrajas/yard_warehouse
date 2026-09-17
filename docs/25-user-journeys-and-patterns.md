# 25 — User Journeys and Interaction Patterns

**Covers:** Deliverable 7 (user journeys), Deliverable 10 (state / interaction patterns)
**Status:** Baseline for review

---

## 1. The five personas

| Persona | Role | Device | Day shaped by | Success feels like |
|---|---|---|---|---|
| **Rajesh** — forklift operator | `PDA_OPERATOR` | PDA, in a forklift, gloved | A queue of pallets and a list of dispatches | Fifteen seconds per pallet, no ambiguity, no re-scanning |
| **Anil** — warehouse supervisor | `SUPERVISOR` | Web at a desk, PDA on the floor | Exceptions, counts, and questions from dispatch | Finding the one problem pallet before it becomes a delay |
| **Fatima** — yard administrator | `YARD_ADMIN` | Web | Master data, corrections, reports | A yard whose digital map matches the physical one |
| **Khalid** — operations manager | `VIEWER` | Web, often on a large monitor | Morning review, customer queries | Answering "where is Gulf Aluminium's order?" in ten seconds |
| **Sara** — system administrator | `SUPER_ADMIN` | Web | Users, roles, settings, audit | Knowing every privileged action is accounted for |

---

## 2. Journeys

### J-01 · Rajesh stores a pallet *(the highest-frequency journey in the product)*

```
Pallet arrives at the collection point with its ERP label
   │
   ▼
D-02 Home → PUT-AWAY                                    1 tap
   │
   ▼
D-04 Scan location   ── trigger ──►  ✓ YD-A-03-018      1 scan
   │                                 validated in 200 ms
   ▼
D-05 Scan pallet     ── trigger ──►  ✓ PAL-10245        1 scan
   │                                 JOB-8817 · Gulf Aluminium
   ▼
D-07 Confirm         ── tap ──────►  COMMITTING…        1 tap
   │
   ▼
D-08 ✓ PALLET STORED  ·  PA-20260916-000148
   │
   └──► NEXT PUT-AWAY  (location retained)              1 tap → back to D-05
```

**Four interactions, two of them scans.** Total: 12–15 seconds. The location is retained on
repeat, so the second pallet into the same lane costs three interactions.

*Failure branch:* the pallet is already stored → D-08 renders the current location, who
stored it and when, with **Transfer instead** as a real action. Rajesh resolves it himself
without calling anyone.

### J-02 · Rajesh dispatches against a delivery order

```
Holds a printed DO listing JOB-8817
   │
D-02 → DISPATCH → D-10 search "JOB-8817"
   │   6 pallets: 4 stored, 2 already dispatched
   │   the 2 dispatched are greyed with the reason — he can see the job is half-shipped
   ▼
Selects PAL-10245 → D-11 NAVIGATE
   │   YD-A-03-018 at 32 sp — the only thing on screen while he drives
   ▼
D-04 scan location  ✓ arrived at the right place
   ▼
D-05 scan pallet    ✓ correct pallet at that location
   ▼
D-12 delivery reference → D-07 confirm → D-08 ✓ DISPATCHED
   │
   └──► NEXT PALLET ON THIS JOB   ← 3 remain
```

*Failure branch:* he scans the wrong pallet at the right location → **WRONG PALLET**, with
the scanned pallet's actual location and the expected pallet named. He walks three bays
across instead of loading the wrong customer's stock onto a truck.

### J-03 · Anil resolves a dispatch that cannot proceed

```
Dispatch office calls: "PAL-10102 for Emirates Extrusion isn't loading."
   │
⌘K → "PAL-10102"                                        2 seconds
   │   result shows inline: ▲ On Hold · WH-B-02-011
   │   ── he already has the answer without opening anything
   ▼
↵ → W-03 Pallet Detail
   │   warning band: On Hold — Quality check — placed by Q. Hassan, 14 Sep
   │   Holds tab: full reason and remarks
   ▼
Calls quality, gets clearance
   ▼
Release hold → reason code + remarks → confirm
   ▼
Pallet returns to ● Stored, dispatch proceeds
   │   the hold and its release are both permanently in the timeline
```

The journey's value is in the first two seconds: global search returns *the answer*, not a
link (UX-06, `22` §5).

### J-04 · Khalid answers a customer query

```
Customer emails: "Where is our LPO-44912?"
   │
W-02 Live Inventory → filter LPO = LPO-44912             1 filter
   │   6 pallets, grouped view available
   ▼
Reads: 4 stored across 2 zones, ageing 4–6 days, 2 dispatched
   ▼
Export XLSX → attaches to reply                          1 click
```

Under two minutes, no help from operations. This is the journey that justifies the product
to management.

### J-05 · Fatima corrects a mis-scanned put-away

```
Rajesh reports: "I stored PAL-10301 but scanned the wrong location."
   │
W-07 Transactions → filter user = R. Kumar, today
   ▼
Finds PA-20260916-000162 → W-08 detail → Create correction
   ▼
W-19 — the screen looks different: amber border, "Administrative action"
   │   Type: Put-away location correction
   │   New location: YD-A-03-018
   │   Reason: Operator scan error   Justification: "Confirmed physically…"
   ▼
Confirm step 2 — AuditDiff, before/after — types PAL-10301 to proceed
   ▼
✓ Correction recorded · CR-20260916-000009
   │
   └──► pallet timeline now shows the correction as a branch on the original
        put-away. The original row is untouched. Sara is notified.
```

### J-06 · Anil runs a cycle count

```
W-15 → New verification → location WH-B-02-011
   ▼  (moves to the floor, PDA)
D-18 scan location → expected 8 pallets
   ▼
D-19 scans physically present pallets → 7 matched, 1 missing, 1 unexpected
   ▼
D-20 review → SUBMIT FOR REVIEW  (final)
   ▼  (back at the desk)
W-16 review
   │   the intervening-transactions panel shows the "missing" pallet was
   │   legitimately transferred out 20 minutes into the count
   │   → not a loss. The unexpected pallet is real and needs a correction.
   ▼
Raises a MANUAL_RELOCATION correction for the unexpected pallet → Approve
```

The intervening-transactions panel is what stops a routine count from generating a false
loss report, and it exists because a frozen expected-set makes concurrent movement look like
variance.

### J-07 · Sara onboards a new operator

```
W-27 Users → New user
   │   name, employee code, username, role = PDA Operator,
   │   site, facility access = Open Yard A
   ▼
Save → temporary password shown once, never emailed
   ▼
Operator signs in on the PDA → forced password change → Home
   │   only the tiles his role permits are present
   ▼
W-11 Audit Log records user.created and login.success
```

### J-08 · Go-live opening stock

```
Sara enables CFG-17 → banner appears across the product
   ▼
Fatima imports locations (W-23a) → dry-run → 412 valid, 3 errors → fixes → commit
   ▼
Labels printed (W-23b) and physically affixed; verification walk
   ▼
Operators capture location by location (D-18 style) → W-30 tracks progress per zone
   ▼
Validation summary: every location visited, counts reconciled, exceptions resolved
   ▼
Customer sign-off recorded → CFG-17 off → normal transactions enabled
```

---

## 3. The six screen states

Every screen implements all six. A screen missing one is not done.

| State | Rule | Anti-pattern |
|---|---|---|
| **Loading** | Skeleton matching the final geometry exactly. Filters and chrome stay interactive. Named progress for multi-step operations ("Checking pallet…"). | Spinner over a blank page; layout shift on arrival |
| **Empty — nothing yet** | Explains that nothing exists and offers the creating action | "No data" |
| **Empty — no results** | Distinguishes itself from the above, lists the active filters, offers **Clear all** | The same message as "nothing yet" |
| **Error** | Plain-language message + stable error code + `trace_id` + Retry. Context (filters, form input) preserved. | Raw exception text; losing the user's input |
| **Forbidden** | Explicit statement naming the required permission and how to request it | Blank page, or a silent redirect to Dashboard |
| **Success** | Transaction reference always shown; the next likely action offered | A toast that disappears before it is read |

---

## 4. The transaction interaction pattern

Every inventory-changing action on both platforms follows one shape.

```
IDLE ──► INPUT ──► VALIDATING ──► READY ──► PENDING ──► COMMITTED
                        │                      │            │
                        ▼                      ▼            ▼
                    REJECTED              UNCONFIRMED   (result)
                (structured panel)       (explicit, never success)
```

| State | Web | PDA |
|---|---|---|
| Input | `ScanField` / picker | Hardware trigger, scan target region |
| Validating | Inline field state | Named progress list (D-06) |
| Ready | Summary with `MovementDirection` | Confirm screen, 88 dp button |
| **Pending** | Button "Committing transaction…", form locked | Button "COMMITTING TRANSACTION…", trigger disabled |
| Committed | `TransactionResult` with reference | Full-screen result with reference |
| Rejected | `ExceptionPanel` | Full-screen error, no auto-dismiss |
| Unconfirmed | Explicit warning + check instructions | Explicit UNCONFIRMED screen |

**No state between Ready and Committed renders as success.** This is UX-09, and it is a
correctness rule expressed in the interface.

---

## 5. The exception pattern

Every rejection answers three questions in order (§15 of the mandate):

```
┌────────────────────────────────────────────┐
│ ⚠  PALLET ALREADY STORED          ← WHAT   │
│                                            │
│    This pallet is currently stored at      │
│                                  ← WHY     │
│    ▦ WH-A-03-018                           │
│       Warehouse A › Zone 03                │
│       Stored by R. Kumar, 12 Sep 08:14     │
│                                            │
│    [View pallet] [Transfer instead] [Cancel]  ← WHAT NEXT
└────────────────────────────────────────────┘
```

The "why" is populated directly from the API error envelope's `details` object
(`02-system-architecture.md` §8) — the server already returns the current truth, and the UI's
only job is to render it as something actionable.

### Catalogue

| Error code | What | Why (from `details`) | What next |
|---|---|---|---|
| `PALLET_ALREADY_STORED` | Pallet already stored | current location, actor, timestamp | View pallet · Transfer instead |
| `PALLET_ALREADY_DISPATCHED` | Already dispatched | dispatch date, actor, reference | View pallet · View dispatch |
| `PALLET_NOT_AT_LOCATION` | **Wrong location** | `Expected: …` / `Scanned: …` comparison | Go to expected location · View pallet |
| `SOURCE_LOCATION_MISMATCH` | Pallet is not here | recorded location | Go to recorded location |
| `LOCATION_BLOCKED` | Location blocked | block reason, actor, date | Choose another location |
| `LOCATION_INACTIVE` | Location not in use | — | Choose another location |
| `LOCATION_CAPACITY_EXCEEDED` | Location full | current count / capacity | Choose another location |
| `PALLET_ON_HOLD` | Pallet on hold | hold type, reason, actor, date | View hold · Request release · *Override* (if permitted) |
| `FACILITY_OUT_OF_SCOPE` | Outside your facilities | the scope in force | Contact supervisor |
| `PERMISSION_DENIED` | Not permitted | required permission | Request access |
| *conflict (409, lost race)* | Another user acted first | winning user, action, timestamp, resulting state | Refresh · View pallet |
| *timeout* | Not confirmed | — | Check Recent Activity · Retry |

**Never rendered to a user:** SQL text, exception class names, stack traces, HTTP status
numbers alone, or the word "Error" without a noun.

---

## 6. Confirmation tiers

Friction is proportional to consequence — and only to consequence.

| Tier | Applies to | Pattern |
|---|---|---|
| **0 — none** | Filtering, sorting, navigating, opening a drawer | Immediate |
| **1 — inline confirm** | Put-away, transfer | The flow's own confirm step showing the summary |
| **2 — dialog** | Dispatch, hold, release, block location, deactivate user | `ConfirmDialog` naming the specific record and the consequence |
| **3 — typed confirmation** | Correction, dispatch reversal, permission change, deleting a master | Two-step with `AuditDiff`, requires typing the record identifier |

Tier 3 is deliberately slow. These are the actions that rewrite what the system says
happened, and a moment's friction is the cheapest control available.

---

## 7. Live-update pattern

| Surface | Behaviour |
|---|---|
| Dashboard | `ETag` poll every `CFG-14` (15 s) while visible. Changed values pulse once for 160 ms. "updated 8s ago" plus manual refresh. |
| Transaction monitor | Polls; new rows are **announced as a "3 new" pill**, not inserted into the user's scroll position |
| Live inventory | Polls the total only; the table refreshes on explicit action. A table that reorders itself under the cursor is hostile. |
| Drawers | Never auto-refresh while open. A stale banner appears if the underlying record changed, with a Refresh action. |

The rule throughout: **new information is offered, never imposed.** Nothing moves under the
user's hands.

---

## 8. Keyboard model (web)

| Key | Action |
|---|---|
| `⌘K` / `Ctrl-K` | Global search |
| `/` | Focus the current table's search |
| `f` | Open filters |
| `Esc` | Close drawer, popover or dialog — innermost first |
| `↑` `↓` | Navigate table rows |
| `↵` | Open the focused row |
| `⌘↵` | Submit the focused form |
| `g` then `d` / `i` / `o` / `t` | Go to Dashboard / Inventory / Occupancy / Transactions |
| `?` | Keyboard shortcut reference |

Every shortcut is discoverable from `?`, and nothing is shortcut-only.

# 24 — PDA Screen Hierarchy and Specification

**Covers:** Deliverable 6 (PDA screen hierarchy)
**Platform:** Native Android, Kotlin, Jetpack Compose, industrial PDA with integrated scanner
**Status:** Baseline for review. Supersedes the `P-nn` IDs in `08-pda-screen-specification.md`,
whose functional content remains valid.

---

## 1. The governing constraint

The operator is in a forklift, gloved, one-handed, possibly in direct sunlight, and the
transaction takes fifteen seconds. Every decision below follows from that, and from one
rule:

> **Scan first. Type never. Guess nothing.**

The PDA is not a small web app. It shares ALU TRACK's tokens, status semantics and
vocabulary; it shares no layouts, no density and no components.

---

## 2. Screen hierarchy

```
D-00  Splash / Connectivity check
  └── D-01  Login
        └── D-02  Home
              ├── PUT-AWAY      D-03 → D-04 Scan Location → D-05 Scan Pallet
              │                      → D-06 Validation → D-07 Confirm → D-08 Result
              ├── DISPATCH      D-09 → D-10 Find → D-11 Navigate → D-04 → D-05
              │                      → D-06 → D-12 Dispatch details → D-08
              ├── MOVE          D-13 → D-05 Identify → D-04 Verify source
              │                      → D-04 Destination → D-14 Confirm move → D-08
              ├── SEARCH        D-15 → D-16 Pallet result
              ├── LOCATION ENQ. D-17
              ├── STOCK CHECK   D-18 → D-19 Scan lines → D-20 Review & submit → D-08
              ├── EXCEPTION/HOLD D-21                    (permission-gated)
              ├── RECENT        D-22
              └── STATUS        D-23  Network / sync / diagnostics
```

Screens D-04, D-05, D-06 and D-08 are **shared across flows**, parameterised by the flow that
invoked them. One scan screen, one validation screen, one result screen — which is why the
feedback is identical everywhere, which is why operators learn the device in a shift.

### Coverage against §42

| §42 | Screen | ID |
|---|---|---|
| 1 Login | Login | D-01 (+ D-00 splash) |
| 2 Home | Action grid | D-02 |
| 3 Put-Away | Flow entry | D-03 |
| 4 Scan Location | Shared scan screen | D-04 |
| 5 Scan Pallet | Shared scan screen | D-05 |
| 6 Put-Away Validation | Shared validation | D-06 |
| 7 Put-Away Confirmation | Confirm | D-07 |
| 8 Transaction Success | Shared result | D-08 |
| 9 Dispatch | Flow | D-09 … D-12 |
| 10 Location Movement | Flow | D-13, D-14 |
| 11 Search Pallet | Search | D-15, D-16 |
| 12 Location Enquiry | Enquiry | D-17 |
| 13 Stock Verification | Flow | D-18 … D-20 |
| 14 Exception / Hold | Hold actions | D-21 |
| 15 Recent Activity | Own transactions | D-22 |
| 16 Network / Sync Status | Diagnostics | D-23 |

---

## 3. Visual system

| Aspect | Value |
|---|---|
| Canvas | `--graphite-950` `#11161F` |
| Surface | `#1B2230`, 1 px `#2A3342` border, 8 dp radius |
| Header | `--anodic-900` `#112B4D`, 56 dp, ALU TRACK mark + operator + connectivity chip |
| Text | Primary `#F6F8FA` · Secondary `#9AA7B8`. Contrast ≥ 7:1 throughout. |
| Body type | 16 sp minimum. Action tiles 20 sp. |
| Identifiers | JetBrains Mono. Scan results 28 sp. **Location code on navigate: 32 sp.** |
| Touch targets | ≥ 64 dp. Primary confirm actions 88 dp, full width, bottom-anchored. |
| Status | Same `status.*` tokens, lightened one step for dark surfaces |
| Motion | 120 ms only |

### Feedback — always all four channels

| Outcome | Colour | Icon | Sound | Haptic |
|---|---|---|---|---|
| Scan accepted | anodic | ✓ | short click | 40 ms |
| Transaction success | success | ✓ large | rising two-tone | 200 ms |
| Warning | warning | ! | single beep | 150 ms |
| Error / rejected | danger | ✗ large | low buzz | 500 ms double |

Success screens auto-dismiss after 3 s — the operator is already driving. **Errors and
warnings never auto-dismiss.** They require a deliberate tap, so a failure cannot be missed
while looking away.

---

## 4. Core screens

### D-01 · Login

Full-bleed graphite-950. ALU TRACK lock-up, then two 64 dp fields and an 88 dp button.

| | |
|---|---|
| **Fields** | Username (autofocus) · Password |
| **Captures** | `device_id`, `device_model`, `app_version` — sent with the login and recorded on every subsequent transaction |
| **Primary action** | **SIGN IN**, 88 dp |
| **Errors, distinguished** | invalid credentials · account inactive · account locked (with remaining time) · **no PDA access for this role** · server unreachable · app update required. A generic "login failed" is not acceptable — an operator at the far end of a yard needs to know whether to call the supervisor or move closer to an access point. |
| **Session** | One active PDA session per user (`CFG-20`). A second login elsewhere states plainly: "Signed out — your account was used on another device." |
| **Permission** | `auth.login_pda` |

### D-02 · Home

```
┌──────────────────────────────────────────┐
│ ▣ ALU TRACK        R. Kumar  ● Connected │  56 dp header
│                    Operator · Open Yard A│
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────┬──────────────────┐ │
│  │        ⊕         │        ⇥         │ │
│  │     PUT-AWAY     │     DISPATCH     │ │  128 dp tiles
│  ├──────────────────┼──────────────────┤ │
│  │        ⇄         │        ⌕         │ │
│  │       MOVE       │      SEARCH      │ │
│  ├──────────────────┼──────────────────┤ │
│  │        ✓         │        ▦         │ │
│  │   STOCK CHECK    │  LOCATION ENQ.   │ │
│  └──────────────────┴──────────────────┘ │
│                                          │
│  ⚠ HOLD / EXCEPTION        (if permitted)│  64 dp
│                                          │
├──────────────────────────────────────────┤
│  ≡ Recent (12)   ⚙ Status      ⏻ Sign out│  64 dp
└──────────────────────────────────────────┘
```

Tiles the role lacks are **hidden, not disabled**. The header carries operator name, role,
facility scope and connectivity at all times — the operator should never wonder who they are
signed in as or whether the device can reach the server.

### D-04 · Scan Location *(shared)*

```
┌──────────────────────────────────────────┐
│ ‹ PUT-AWAY                    ● Connected│
│ ①━━━━━ ② ───── ③                        │  ProgressSteps
├──────────────────────────────────────────┤
│                                          │
│         SCAN STORAGE LOCATION            │  20 sp
│                                          │
│   ┌────────────────────────────────┐     │
│   │                                │     │  scan target
│   │      ▯▯▯  awaiting scan  ▯▯▯   │     │  ≥ 160 dp
│   │                                │     │
│   └────────────────────────────────┘     │
│                                          │
│   pull the trigger to scan               │  secondary
│                                          │
├──────────────────────────────────────────┤
│  ⌕ Select location manually   (if permitted)
└──────────────────────────────────────────┘
```

On decode, the same region becomes the resolved state:

```
   ┌────────────────────────────────┐
   │  ✓  YD-A-03-018                │  32 sp mono
   │     Open Yard A › Zone A       │  16 sp
   │     ● 0 of 2 occupied          │
   └────────────────────────────────┘
              [ CONTINUE ]              88 dp
```

Rejections render in place as a full-panel error with the reason — *Location blocked ·
Maintenance · blocked by A. Khan, 14 Sep* — and a single **Scan another location** action.
The operator learns this before lifting the pallet, which is the entire point of validating
the location first.

Manual selection appears only with `scan.manual_override`, is visually flagged, and writes
an `override.used` audit row.

### D-05 · Scan Pallet *(shared)*

Identical geometry. The confirmed location persists as a fixed banner at the top, so the
operator can always see what they are scanning into. On resolve:

```
   ┌────────────────────────────────┐
   │  ✓  PAL-10245                  │  28 sp mono
   │     JOB-8817                   │
   │     Gulf Aluminium Industries  │
   │     LPO-44912                  │
   └────────────────────────────────┘
```

Under the `RAW_REFERENCE` barcode profile, customer and LPO render as an explicit
*"not encoded on label"* note rather than blank rows. Blank fields look like missing data;
a note explains why they are absent.

### D-06 · Validation *(shared)*

Shown only while the server is checked. Named progress, never a bare spinner:

```
   ✓  Location verified
   ⟳  Checking pallet…
   ○  Confirming availability
```

If validation fails, this screen becomes the error state directly — the operator never
reaches a confirm screen for a transaction that cannot succeed.

### D-07 · Confirm Put-Away

```
┌──────────────────────────────────────────┐
│ ‹ PUT-AWAY                    ● Connected│
│ ①━━━━━ ②━━━━━ ③━━━━━                     │
├──────────────────────────────────────────┤
│              CONFIRM STORAGE             │
│                                          │
│   PALLET                                 │
│   PAL-10245                              │  24 sp mono
│   JOB-8817 · Gulf Aluminium              │
│                                          │
│              ↓                           │  MovementDirection
│                                          │
│   STORE AT                               │
│   YD-A-03-018                            │  32 sp mono, anodic
│   Open Yard A › Zone A                   │
│                                          │
├──────────────────────────────────────────┤
│        ✓  CONFIRM STORE                  │  88 dp, full width
│           Cancel                         │  48 dp, ghost
└──────────────────────────────────────────┘
```

On tap the button becomes **COMMITTING TRANSACTION…** with a progress indicator and is
disabled; the scan trigger is disabled too. This is a pending state, not a success state
(UX-09).

### D-08 · Result *(shared)*

```
┌──────────────────────────────────────────┐
│                                          │
│                   ✓                      │  64 dp glyph, success
│                                          │
│            PALLET STORED                 │  24 sp
│                                          │
│   Pallet     PAL-10245                   │  mono
│   Location   YD-A-03-018                 │  mono
│   Time       10:42                       │
│   Status     ● STORED                    │
│   Reference  PA-20260916-000148          │  mono, 13 sp
│                                          │
├──────────────────────────────────────────┤
│        NEXT PUT-AWAY                     │  88 dp — keeps the location
│        BACK TO HOME                      │  64 dp, ghost
└──────────────────────────────────────────┘
```

**NEXT PUT-AWAY retains the confirmed location**, because operators fill a lane in sequence
and re-scanning the same location for every pallet is the single most common wasted action
in a WMS.

Failure renders the same frame in `signal-danger` with the structured explanation — what
happened, the current truth, the available actions:

```
                   ✗
          PALLET ALREADY STORED

   This pallet is currently stored at:

   WH-A-03-018
   Warehouse A › Zone 03

   Stored by R. Kumar, 12 Sep 08:14

        VIEW PALLET
        TRANSFER INSTEAD
        CANCEL
```

---

## 5. Flow screens

| ID | Screen | Content and emphasis |
|---|---|---|
| **D-03** | Put-Away entry | Skipped by default — selecting PUT-AWAY goes straight to D-04. Exists as a distinct route so a resumed or deep-linked flow has an entry point. |
| **D-09** | Dispatch entry | Straight to D-10. |
| **D-10** | Find pallet | Search by job, pallet, customer or LPO — the operator arrives holding a Delivery Order, so search precedes scanning here. Results grouped by job. **Ineligible pallets shown greyed with the reason**, never hidden. Each row: `PalletIdentity` + `LocationRef` + ageing. |
| **D-11** | Navigate | The screen read while driving. Location code at **32 sp**, facility and zone beneath, pallet identity small. Nothing else on screen. A single **I'M AT THIS LOCATION** action leads to D-04. |
| **D-12** | Dispatch details | Delivery reference (required when `CFG-16`) · vehicle reference · remarks. Minimal typing; numeric keypad where the format allows. |
| **D-13** | Move entry | Straight to D-05 (identify pallet), then D-04 twice — source verification, then destination. |
| **D-14** | Confirm move | `MovementDirection` **vertical and dominant** (UX-04): source in graphite, large arrow, destination in anodic at 32 sp. The operator must be able to read the direction at a glance without parsing labels. |
| **D-15** | Search | Segmented input type (Pallet / Job / Customer / LPO), scan-to-search supported. Recent searches shown before typing. |
| **D-16** | Pallet result | `PalletIdentity` hero · `StatusBadge` · `LocationRef` hero · ageing · last movement · permitted actions (Transfer, Dispatch, Hold) starting the relevant flow with the pallet pre-selected |
| **D-17** | Location enquiry | Scan a location → header with code, facility/zone, `n of m occupied` → list of pallets: pallet number, job, customer, status, put-away date, ageing. Empty: **"This location is empty."** with **Scan another location** (UX-10) |
| **D-18** | Stock check — start | Scan or select the location; confirms the expected count before the operator begins |
| **D-19** | Stock check — scanning | Live tally `12 of 18 scanned` with a progress bar; three counters — matched, missing, unexpected. Missing pallets stay listed so the operator can look again before submitting. |
| **D-20** | Stock check — review | Grouped lines by outcome with badges; variance summary; **SUBMIT FOR REVIEW** with a warning that submission is final |
| **D-21** | Hold / Exception | Permission-gated (`hold.create`). Scan or select pallet → choose Hold / Damaged / Exception → reason code (large tap list, not a dropdown) → remarks → confirm. Release requires `hold.release`. |
| **D-22** | Recent activity | The operator's own last 50 transactions: type icon, pallet, location, time, reference. Read-only. Answers "did that last one go through?" without a phone call. |
| **D-23** | Status / diagnostics | Server reachability and latency · app version · device id · signed-in user · token expiry · scanner status · **test scan** tool. This is the screen support asks the operator to open. |

---

## 6. Scanner behaviour

```
hardware trigger → ScannerProvider (DataWedge default)
  → debounce: identical value within CFG-05 (800 ms) → DISCARD silently
  → context check: expected barcode type for this step?
  → resolve via API → update → advance
```

| Rule | Behaviour |
|---|---|
| SC-01 | Identical barcode within `CFG-05` discarded before any request |
| SC-02 | A **different** barcode processes immediately — consecutive legitimate scans are never blocked |
| SC-03 | Wrong barcode type for the step → warning naming what was expected ("That is a location barcode. Scan the pallet label.") |
| SC-04 | Re-scanning the same location re-displays; it does not re-submit |
| SC-05 | Trigger disabled entirely while a confirmation request is in flight |
| SC-06 | Unreadable or unknown codes display the raw decoded value so the operator can read it to a supervisor |

The SC-01/SC-02 distinction is the one that matters in the field: a naive debounce that
blocks *all* scans for a fixed window makes an operator filling a lane wait between pallets,
and they will start double-triggering to compensate — producing exactly the duplicate events
the debounce was meant to prevent.

---

## 7. Network and failure states

| Situation | Behaviour |
|---|---|
| Online | Header chip `● Connected`, graphite |
| Weak | `◐ Weak signal`, amber. Actions still permitted; latency shown on D-23. |
| Offline | `○ No connection`, danger. **Action tiles disabled** with "No connection — transactions cannot be recorded." |
| Request in flight | Button → "COMMITTING TRANSACTION…", trigger disabled |
| Timeout | Automatic retry with the **same idempotency key**, up to `CFG-15` (3), with a visible attempt counter |
| Retries exhausted | Explicit **UNCONFIRMED** screen — *"This transaction was not confirmed. Check Recent Activity or the web console before scanning again."* Never a success. Never a silent failure. |
| Token expired mid-flow | Re-login prompt that **preserves the in-progress scan data** and returns to the same step |
| Server 5xx | Error screen with the `trace_id` shown, for support |

There is no local transaction queue (`X-08` in `01-requirement-analysis.md`). Queueing
offline movements without agreed conflict rules would break the one-pallet-one-location
invariant the first time two operators acted on the same pallet from different devices.

---

## 8. Ergonomics checklist

- [ ] All touch targets ≥ 64 dp; primary confirm actions ≥ 88 dp, bottom-anchored
- [ ] Text contrast ≥ 7:1; no type below 16 sp
- [ ] Every flow completable with the hardware trigger plus one thumb
- [ ] No typing required on any happy path
- [ ] No status conveyed by colour alone — icon and text always present
- [ ] Sound and haptics independently disableable, never the only channel
- [ ] Screen timeout extended while a transaction flow is open
- [ ] Back from any step returns to a safe state with no partial write
- [ ] Legible in direct sunlight — **field-verified on the confirmed device, not assumed**
- [ ] Hardware scanner only in production builds; no continuous camera use

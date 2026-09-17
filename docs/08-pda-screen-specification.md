# 08 — PDA Screen Specification

**Phase:** 8 — PDA screen specification
**Covers:** Deliverable G
**BRD:** §10, §17 (Usability, Device Compatibility), §21
**Status:** Baseline for review

---

## 1. Operating context

The user is wearing gloves, sitting in a forklift, in an open yard that may be in direct
sunlight, holding a rugged device one-handed while the other hand is on a control. Reading a
form is expensive; scanning is cheap. Every design rule below follows from that.

| Constraint | Consequence |
|---|---|
| Gloved operation | Minimum touch target 64 dp. Primary actions 88 dp tall. |
| Sunlight | High-contrast palette, ≥7:1 for all text. No thin type below 16 sp. |
| One-handed | All primary actions in the lower 40% of the screen, reachable by thumb. |
| Noise and movement | Feedback is triple-channel: colour + sound + vibration. Never colour alone. |
| Cost of error | Every state-changing action has an explicit confirm step showing what will happen. |
| No keyboard | Typing is a fallback, never a step in the happy path. |
| Online-only (`X-08`) | Connectivity state is always visible. No action is permitted while offline. |

Device, Android version and scanner SDK are pending `OI-07`. The scanner is behind a
`ScannerProvider` interface so the concrete implementation is a one-file change.

---

## 2. Visual and feedback system

| Element | Specification |
|---|---|
| Theme | Dark base (`#0F1419`), high-contrast surfaces. Reduces glare and battery drain. |
| Success | Full-screen green panel · ✓ glyph · rising two-tone beep · 200 ms vibration · transaction reference shown large |
| Error | Full-screen red panel · ✗ glyph · low buzz · 500 ms double vibration · error message in plain language · the current truth (e.g. real location) shown |
| Warning | Amber panel · single beep · 150 ms vibration · requires explicit acknowledgement |
| Scan target area | Top third of screen, minimum 120 dp tall, shows the decoded value at 24 sp |
| Progress | Every flow shows "Step 1 of 3" with a segmented bar |
| Pending state | Confirm button becomes a spinner labelled **"Confirming — do not close"**. It is not a success state. |
| Connectivity | Persistent status chip in the header: online / weak / offline |
| Session | Operator name and shift-elapsed time always visible in the header |

Result screens auto-dismiss after 3 seconds on success (the operator is already driving),
but **never** on error or warning — those require a deliberate tap, so a failure cannot be
missed while looking away.

---

## 3. Screen catalogue

19 screens.

### P-01 — Splash / Connectivity Check
Verifies API reachability and app version before login. If the server is unreachable, shows
a plain "Cannot reach server" screen with a retry and the configured endpoint — not a
generic crash. Blocks entry if a mandatory app update is required.

### P-02 — Login
Username + password, large fields, numeric-friendly keyboard where applicable. Captures
`device_id` and `device_model`. On success stores the token in EncryptedSharedPreferences.
Errors distinguish: wrong credentials · account inactive · account locked · no PDA
permission · server unreachable. Generic "login failed" is not acceptable — an operator at
the far end of a yard needs to know whether to call the supervisor or move closer to the
access point.

### P-03 — Home / Action Grid
Six large tiles, two columns (BRD §10):

```
┌─────────────────┬─────────────────┐
│    PUT-AWAY     │    DISPATCH     │
├─────────────────┼─────────────────┤
│   MOVE / TRANSFER│     SEARCH     │
├─────────────────┼─────────────────┤
│  LOCATION ENQUIRY│   STOCK CHECK  │
└─────────────────┴─────────────────┘
   Recent Activity  ·  Status  ·  Logout
```

Tiles the operator's role does not permit are hidden, not disabled. Header shows operator
name, facility scope and connectivity.

### Put-Away flow (BRD §9.1)

| ID | Screen | Content |
|---|---|---|
| P-04 | **Scan Location** | Prompt "Scan storage location". Large scan area. On decode: calls `POST /putaway/validate-location`; shows Location code, facility, zone, current occupancy, capacity if defined. Rejects inactive/blocked/out-of-scope immediately with the reason. Manual entry available only with `scan.manual_override`. |
| P-05 | **Scan Pallet** | Shows confirmed location as a persistent banner. Prompt "Scan pallet label". On decode: resolves identity and shows Job No., Pallet No., Customer, LPO — or, under the `RAW_REFERENCE` profile, the reference with an explicit "details not encoded on label" note rather than blank fields. |
| P-06 | **Confirm Put-Away** | Side-by-side summary: pallet ↔ location. Single full-width **CONFIRM STORE** button (88 dp). A secondary Cancel. On tap: pending state, `POST /putaway` with a fresh idempotency key. |
| P-07 | **Result** | Success: transaction reference, location, timestamp, and a **"Put away another"** action that returns to P-04 with the location retained — because operators typically fill one lane in sequence. Error: the specific reason and the current truth (e.g. "Already stored at A-02-14 by R. Kumar, 10:42"). |

### Transfer flow (BRD §9.2)

| ID | Screen | Content |
|---|---|---|
| P-08 | **Identify Pallet** | Scan the pallet, or search by job/pallet number. Shows current facility, zone, location, status, ageing. |
| P-09 | **Verify Source** | Prompt "Scan the location you are taking it from". Compares to the recorded location; a mismatch is rejected with both values shown side by side, so the operator can see exactly what is wrong. |
| P-10 | **Scan Destination** | Prompt "Scan the new location". Validates active, unblocked, in scope, not equal to source, capacity. |
| P-11 | **Confirm Transfer** | `FROM → TO` summary with pallet identity. Single **CONFIRM MOVE** button. One atomic `POST /movements` (`CFG-08 = SINGLE_STEP`). |
| P-12 | **Result** | As P-07, with "Move another pallet from this location". |

### Dispatch flow (BRD §9.3)

| ID | Screen | Content |
|---|---|---|
| P-13 | **Find Pallet** | Search by Job No., Pallet No., Customer or LPO — the operator arrives holding a Delivery Order, so search comes before scanning here. Results list every pallet of the job with status, exact location and ageing, so partial dispatches are visible. Dispatch-ineligible pallets (held/damaged) are shown greyed with the reason, not hidden — the operator needs to know why the pallet they were sent for cannot go. |
| P-14 | **Navigate** | Large display of Facility / Zone / Location for the selected pallet. This is the screen the operator reads while driving: location code at 48 sp. |
| P-15 | **Scan Location** | Confirms arrival at the right place before the pallet is touched. |
| P-16 | **Scan Pallet** | Validates that this pallet is recorded at this location. A wrong pallet is rejected with its real location and the expected pallet named (BRD §21 row B). |
| P-17 | **Confirm Dispatch** | Full pallet summary, optional delivery reference and remarks (`CFG-16` may make the reference mandatory). Confirm button is visually distinct (green, full width) because this is irreversible without a privileged correction. |
| P-18 | **Result** | Transaction reference, dispatch timestamp. On success, offers "Next pallet on this job" if any remain stored. |

When `CFG-09 = STAGED`, P-17 offers **STAGE** and the flow repeats later with **DISPATCH**
from the staging area.

### Supporting screens

| ID | Screen | Content |
|---|---|---|
| P-19 | **Search** | Job / Pallet / Customer / LPO (BRD §9.4). Results grouped by job. Each row: pallet no., status badge, facility/zone/location, ageing. Tap → detail with full attributes and recent history. From detail, permitted actions (transfer, dispatch) can be started directly. |
| P-20 | **Location Enquiry** | Scan a location → list of every pallet recorded there: pallet no., job no., customer, status, put-away date, ageing (BRD §10, §12 of master prompt). Shows count vs capacity. |
| P-21 | **Stock Check** | Scan location → expected list loaded and frozen → scan each physical pallet → live tally of matched / missing / unexpected → review → submit. Progress shown as `12 of 18 scanned`. Missing pallets remain listed so the operator can look again before submitting. Submission is final. |
| P-22 | **Recent Activity** | The operator's own last 50 transactions with type, pallet, location, time and reference. Read-only. Lets an operator verify "did that last one go through?" without calling the office. |
| P-23 | **Status / Diagnostics** | Server reachability, response latency, app version, device id, logged-in user, token expiry, scanner status and a test-scan tool. This is the screen support asks the operator to open. |

---

## 4. Scanner handling (BRD §10, master prompt §17)

```
Hardware trigger
      │
      ▼
ScannerProvider  (DataWedge intent broadcast by default)
      │
      ▼
Debounce: identical value within CFG-05 ms → DISCARD silently
      │
      ▼
Context check: is this barcode type expected on this screen?
      │  location expected but pallet scanned → warning, not an error
      ▼
Resolve (API) → update UI → advance step
```

| Rule | Behaviour |
|---|---|
| SC-01 | Identical barcode within `CFG-05` (800 ms) is discarded before any request is made |
| SC-02 | A *different* barcode always processes immediately — consecutive legitimate scans are never blocked |
| SC-03 | Scanning the wrong barcode type for the current step gives a warning that names what was expected |
| SC-04 | Re-scanning the same location on P-04 is idempotent at the UI level — it re-displays, it does not re-submit |
| SC-05 | The trigger is disabled entirely while a confirmation request is in flight |
| SC-06 | Unreadable/unknown barcodes show the raw decoded value so the operator can read it out to a supervisor |

The distinction between SC-01 and SC-02 is the one that matters in practice: naive
debouncing that blocks *all* scans for a fixed window makes an operator filling a lane wait
between pallets, and they will start double-triggering to compensate.

---

## 5. Network and failure handling (BRD §21 row H)

| Situation | Behaviour |
|---|---|
| Request in flight | Pending state, trigger disabled, "Confirming — do not close" |
| Timeout | Automatic retry with the **same** idempotency key, up to `CFG-15` (3) attempts, with a visible attempt counter |
| All retries exhausted | Explicit **UNCONFIRMED** screen: "This transaction was not confirmed. Check Recent Activity or the web console before re-scanning." Never a success, never a silent failure. |
| Connectivity lost before action | Action tiles disabled with "No connection — cannot record transactions" |
| Token expired mid-flow | Re-login prompt that **preserves the in-progress scan data**, returning the operator to the same step afterwards |
| Server 5xx | Error screen with the `trace_id` displayed, for support |

The app has no local transaction queue (`X-08`). This is a deliberate correctness decision:
queueing offline movements without agreed conflict rules would break BR-01 the first time
two operators acted on the same pallet from different devices.

---

## 6. Accessibility and ergonomics checklist

- [ ] All touch targets ≥ 64 dp; primary actions ≥ 88 dp
- [ ] Text contrast ≥ 7:1 against its background
- [ ] No information conveyed by colour alone (icon + text accompany every status colour)
- [ ] Sound and vibration independently disableable, and never the only feedback channel
- [ ] Screen readable at arm's length in direct sunlight (field-verified, not assumed)
- [ ] Every flow completable with the hardware trigger plus one thumb
- [ ] No flow requires typing on the happy path
- [ ] Back navigation from any step returns to a safe state without partial writes
- [ ] Screen timeout extended during an open transaction flow
- [ ] Battery: no continuous camera use; hardware scanner only in production builds

---

## 7. Testing hooks

| Area | Approach |
|---|---|
| Scanner | `FakeScannerProvider` injects barcode values in instrumented tests — valid, invalid, repeated, wrong-type, malformed |
| Network | MockWebServer scenarios: success, 409 conflict, 423 blocked, timeout, 500, token expiry mid-flow |
| Idempotency | Assert the same key is reused across retries, and a new key is generated per user-initiated confirm |
| Concurrency | Contract tests against a live API instance asserting the 409 payload renders the correct "current truth" screen |
| UX | Compose UI tests asserting minimum touch-target sizes and contrast ratios as automated checks, not review opinions |

# ALU TRACK

**Yard & Warehouse Inventory Tracking & Traceability System**
*Track Every Pallet. Know Every Location.*

Cloud-based pallet tracking for an aluminium channels / profiles manufacturing operation —
from the production collection point, through put-away and internal movement, to verified
dispatch, with complete traceability.

**Status: analysis, specification, architecture and UI/UX architecture complete.
No implementation code yet.**

---

## What this system is

Tracks the physical location of every produced pallet, in real time, across open yards and
closed warehouses, using barcode scanning from industrial Android PDAs and a cloud admin
web console.

```
Production Collection Point → Put-Away → Stored Location
    → Internal Movement → Pick / Dispatch → History & Reporting
```

**Components**
- Cloud Admin Web Application — Next.js, React, TypeScript
- Industrial PDA Mobile Application — native Android, Kotlin
- Cloud REST API — Laravel, PHP
- Centralised MySQL database
- Location barcode generation, printing and management

---

## What this system is not

- It does **not** generate pallet barcodes. The customer's existing ERP does that, and
  continues to. This system scans, decodes, validates and references those labels.
- It does **not** integrate with the ERP. There is no API, no database link, no credential.
  That is a separately scoped future phase.
- It does **not** handle production planning, order creation, transport, or proof of
  delivery beyond the dispatch status.
- It does **not** operate offline. Every transaction blocks on a confirmed cloud commit.

See [`docs/01-requirement-analysis.md`](docs/01-requirement-analysis.md) §2.4 for the full
exclusion list.

---

## Documentation

Start at **[`docs/README.md`](docs/README.md)** for the full index and reading order.

| Purpose | Document |
|---|---|
| What was agreed, what is open, what we refuse to assume | [01 Requirement Analysis](docs/01-requirement-analysis.md) |
| How it is built | [02 System Architecture](docs/02-system-architecture.md) |
| The data model and its constraints | [04 Database Entity Model](docs/04-data-model.md) |
| Pallet lifecycle and every validation rule | [05 Business Rules & State Machine](docs/05-business-rules-and-state-machine.md) |
| Who can do what | [07 Permission Matrix](docs/07-permission-matrix.md) |
| The two barcode concepts | [11 Barcode Specification](docs/11-barcode-specification.md) |
| How it gets proven correct | [14 Test Strategy](docs/14-test-strategy.md) |
| Plan, gates and risks | [13 Delivery Plan](docs/13-delivery-plan.md) |
| How it looks and behaves | [20 UI/UX Architecture](docs/20-uiux-architecture.md) |
| The design system | [21 Design System](docs/21-design-system.md) |
| Every web screen | [23 Web Screens](docs/23-web-screens.md) |
| Every PDA screen | [24 PDA Screens](docs/24-pda-screens.md) |
| What gets built, in order | [27 UX Implementation Sequence](docs/27-ux-implementation-sequence.md) |

The BRD is the source of truth throughout:
[`docs/reference/BRD-v1.0-extracted.md`](docs/reference/BRD-v1.0-extracted.md).

---

## Core invariant

> **One pallet has at most one active current location.**

Enforced by the database (`inventory_current.pallet_id` is the primary key), by row-level
locking inside every state-changing transaction, and by a twelve-scenario concurrency suite
that runs real parallel processes against real MySQL on every pull request.

---

## Awaiting customer input

Four items gate implementation and are tracked in
[`docs/01-requirement-analysis.md`](docs/01-requirement-analysis.md) §6:

- `OI-01` — sample ERP barcode labels, symbology and encoded structure
- `OI-02` — is `Job Number + Pallet Number` or `Pallet Number` alone globally unique?
- `OI-03` — yard/warehouse/zone layout and location numbering convention
- `OI-09` — dispatch process: direct, or via a staging area?

Sixteen further items gate go-live. Each has a documented fallback, so nothing is invented
in the meantime.

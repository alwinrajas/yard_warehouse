# 21 — ALU TRACK Design System

**Covers:** Deliverable 2 (design system), Deliverable 12 (enterprise visual direction)
**Consumed by:** every web screen and every PDA screen
**Status:** Baseline for review

---

## 1. Visual direction

**Premium · Industrial · Enterprise · Modern.**

The reference points are precision manufacturing equipment and control-room software, not
consumer SaaS. The aesthetic comes from *restraint and accuracy* — exact alignment, a narrow
palette, disciplined typography — rather than from decoration.

| Principle | Expression |
|---|---|
| **Graphite over white** | The canvas is a cool near-white (`#F6F8FA`), panels are pure white. This reads as an instrument, not a document. |
| **Anodised blue as the only brand colour** | Used for primary actions, active navigation and destination emphasis. Nothing else. |
| **Colour is information** | Every non-neutral colour on screen carries operational meaning. There is no decorative colour anywhere in the product. |
| **Hairline structure** | 1 px cool-grey borders define regions. Shadows are used for *layering* (drawers, popovers) and never for emphasis. |
| **Tight radii** | 4–8 px. Rounded enough to feel modern, square enough to feel like equipment. |
| **Mono for identity** | Every machine-readable identifier is monospaced (UX-01). This is the product's typographic signature. |
| **Motion as feedback** | 120–220 ms, ease-out. Motion confirms a state change. Nothing animates on arrival. |

**Explicitly avoided:** gradients, glassmorphism, large decorative shadows, pill-shaped
buttons, oversized radii, illustrations, emoji, neon accents, multi-colour charts, gauge
dials, and any colour not on the token list.

---

## 2. Colour tokens

Tokens are generated from `design-tokens/tokens.json` into a Tailwind v4 `@theme` block.
Tailwind's default palette is wiped, so an off-system colour does not resolve at all.
**No component contains a literal hex value**, and ESLint fails the build if one appears.

### 2.1 Neutral — Graphite (cool-tinted)

| Token | Hex | Use |
|---|---|---|
| `--graphite-0` | `#FFFFFF` | Panel, table, drawer surfaces |
| `--graphite-25` | `#FBFCFD` | Table row hover |
| `--graphite-50` | `#F6F8FA` | **App canvas**, table header |
| `--graphite-100` | `#EDF0F4` | Subtle fills, disabled surfaces, skeletons |
| `--graphite-200` | `#DDE3EA` | **Default border**, dividers |
| `--graphite-300` | `#C3CCD8` | Input border, strong dividers |
| `--graphite-400` | `#9AA7B8` | **Non-text only** — decorative icons, disabled controls. At 2.4:1 it must never carry text. |
| `--graphite-500` | `#647183` | Secondary text, placeholder text, column headers. Darkened from `#6F7E92` to clear 4.5:1 on both surfaces. |
| `--graphite-600` | `#536074` | Body text secondary, icons |
| `--graphite-700` | `#3D4859` | Body text |
| `--graphite-800` | `#2A3342` | Headings |
| `--graphite-900` | `#1B2230` | Primary text, high-emphasis numerals |
| `--graphite-950` | `#11161F` | PDA canvas |

### 2.2 Brand — Anodic Blue

| Token | Hex | Use |
|---|---|---|
| `--anodic-50` | `#EEF4FB` | Selected row, active nav background, info surface |
| `--anodic-100` | `#D8E6F6` | Info border, hover on selected |
| `--anodic-200` | `#B3CDEC` | Chart secondary |
| `--anodic-300` | `#7FAADE` | Chart primary light |
| `--anodic-400` | `#4A84CB` | **Focus ring**, occupancy fill |
| `--anodic-500` | `#2A66B3` | Links, destination emphasis |
| `--anodic-600` | `#1E5196` | **Primary action** (button fill, active nav indicator) |
| `--anodic-700` | `#184179` | Primary hover |
| `--anodic-800` | `#143560` | Primary active/pressed |
| `--anodic-900` | `#112B4D` | Logo mark, PDA header |

### 2.3 Signal — semantic feedback

| Token | Fg | Surface | Border | Use |
|---|---|---|---|---|
| `--signal-success` | `#15803D` | `#ECFDF3` | `#ABEFC6` | Committed transaction, dispatched, matched |
| `--signal-warning` | `#B45309` | `#FFFAEB` | `#FEDF89` | Ageing, in movement, variance, needs attention |
| `--signal-danger` | `#B42318` | `#FEF3F2` | `#FECDCA` | Rejected, damaged, exception, destructive |
| `--signal-info` | `#1E5196` | `#EEF4FB` | `#B3CDEC` | Advisory, manual-entry notice |
| `--signal-neutral` | `#536074` | `#F6F8FA` | `#DDE3EA` | Normal, stored, inactive |

### 2.4 Status tokens — the semantic layer

Screens reference **these**, never the palette. Changing what "On Hold" looks like is a
one-line change here.

| Status token | Fg | Surface | Dot | Icon | BRD status |
|---|---|---|---|---|---|
| `status.stored` | graphite-700 | graphite-50 | graphite-500 | `Package` | Stored |
| `status.at-collection` | graphite-600 | graphite-100 | graphite-400 | `Inbox` | At Collection Point |
| `status.in-movement` | signal-warning | warning surface | `#B45309` | `ArrowLeftRight` | In Movement |
| `status.staged` | `#0E7490` | `#ECFEFF` | `#0E7490` | `Truck` | Staged for Dispatch |
| `status.dispatched` | signal-success | success surface | `#15803D` | `CircleCheck` | Dispatched |
| `status.on-hold` | `#C2410C` | `#FFF7ED` | `#C2410C` | `CirclePause` | On Hold |
| `status.damaged` | signal-danger | danger surface | `#B42318` | `TriangleAlert` | Damaged |
| `status.exception` | signal-danger | danger surface | `#B42318` | `OctagonAlert` | Exception |

**Every status badge renders dot + icon + label.** Colour is never the sole carrier (§26 of
the mandate, WCAG 1.4.1).

### 2.5 Location occupancy tokens

Used by the occupancy board, location pickers and the PDA enquiry screen.

| Token | Fill | Border | Pattern | Meaning |
|---|---|---|---|---|
| `location.empty` | graphite-0 | graphite-500 | — | Available for put-away |
| `location.occupied` | anodic-50 | anodic-400 | — | Holds stock; opacity scales with utilisation |
| `location.full` | anodic-100 | anodic-600 | — | At defined capacity |
| `location.blocked` | `#FFF7ED` | `#C2410C` | diagonal hatch | Temporarily blocked |
| `location.inactive` | graphite-100 | graphite-500 | dotted border | Deactivated in master |
| `location.ageing` | — | `#B45309` 2px | — | Overlay ring: holds stock past threshold |

The hatch and dotted patterns exist so the board is readable without colour. Cell borders
sit on the graphite-500 step rather than graphite-300 so they clear 3:1 against the canvas
(WCAG 1.4.11): spotting an empty location is a primary task, so an empty cell has to be
visible as a cell, not inferred from the absence of a fill.

### 2.6 Ageing scale

| Bucket | Token | Colour |
|---|---|---|
| 0–7 days | `ageing.fresh` | graphite-500 |
| 8–15 days | `ageing.normal` | `#0E7490` |
| 16–30 days | `ageing.attention` | `#B45309` |
| > 30 days | `ageing.critical` | `#B42318` |

Bucket boundaries come from `CFG-04`; the *tokens* are fixed so a configuration change never
requires a design change.

---

## 3. Typography

| Role | Family | Rationale |
|---|---|---|
| UI | **Inter** — variable, `cv05`, `ss03`, `tnum` on for numerals | Excellent at small sizes, unambiguous `1`/`l`/`I`, enterprise-neutral |
| Identifiers | **JetBrains Mono** — 400/500/600, `zero` slashed | Disambiguates `0`/`O` and `1`/`l` in codes; aligns columns (UX-01) |

Both self-hosted as committed `woff2` subsets via `next/font/local`, synced from
`@fontsource` by `scripts/sync-fonts.mjs`. No external font request at runtime, and no
network access needed at build time.

### Scale

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | 30 / 38 | 600 | KPI primary numerals |
| `h1` | 24 / 32 | 600 | Page title |
| `h2` | 18 / 26 | 600 | Section, drawer title |
| `h3` | 15 / 22 | 600 | Panel header, card title |
| `body` | 14 / 20 | 400 | Default |
| `body-sm` | 13 / 18 | 400 | **Table cell default** |
| `label` | 13 / 18 | 500 | Form labels |
| `caption` | 12 / 16 | 400 | Helper text, metadata |
| `overline` | 11 / 14 | 600, `.06em`, upper | Column headers, section eyebrows |
| `mono` | 13 / 18 | 500, `-.01em` | **Identifiers** |
| `mono-lg` | 16 / 22 | 600 | Identifier in a drawer header |
| `mono-xl` | 28 / 34 | 600 | PDA location code, scan result |

**Rules:** one family per role, never more than three weights on a screen, tabular figures
on every numeric column, `text-wrap: balance` on headings, sentence case everywhere except
`overline`.

---

## 4. Spacing, grid, radius, elevation

### Spacing — 4 px base
`0 · 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`

| Context | Value |
|---|---|
| Icon ↔ label | 8 |
| Form field stack | 16 |
| Form group separation | 24 |
| Panel padding | 20 |
| Page padding | 24 |
| Section separation | 32 |

### Grid
12-column, 24 px gutter. Shell: sidebar 264 px expanded / 64 px rail. Content max 1560 px,
centred. Drawer 520 px (`lg`) / 560 px (`xl`), full-screen below `md`.

### Radius
`sm 4` (badge, tag, input) · `md 6` (button, select, menu item) · `lg 8` (panel, card,
modal, drawer) · `full` reserved for avatars and count chips only.

### Elevation — three levels, deliberately flat
| Token | Shadow | Use |
|---|---|---|
| `e0` | none, 1px border | Panels, tables, cards — **the default** |
| `e1` | `0 1px 2px rgba(16,24,40,.05)` | Sticky header, raised toolbar |
| `e2` | `0 4px 8px -2px rgba(16,24,40,.08), 0 2px 4px -2px rgba(16,24,40,.04)` | Dropdown, popover, tooltip |
| `e3` | `0 12px 24px -6px rgba(16,24,40,.12)` | Drawer, modal |

Most surfaces sit at `e0`. Shadow indicates layering, never importance.

### Motion
`fast 120ms` (hover, focus) · `base 160ms` (dropdown, toggle, badge change) ·
`slow 220ms` (drawer, modal, sheet). Easing `cubic-bezier(.2,0,0,1)`.
All motion respects `prefers-reduced-motion: reduce`.

---

## 5. Component inventory

Every component below is built once in `web/src/components/ui` and consumed everywhere.
A screen that needs something not on this list extends the system — it does not style
locally.

### 5.1 Primitives

| Component | Key API / variants |
|---|---|
| `Button` | `primary` (anodic-600) · `secondary` (white + border) · `ghost` · `danger` · `link`. Sizes `sm 28` / `md 36` / `lg 44`. Props: `loading`, `leftIcon`, `rightIcon`, `fullWidth`. Loading disables and swaps the icon for a spinner — width never changes. |
| `IconButton` | Same variants. 28/32/36 px square. **Requires `aria-label` and a tooltip.** |
| `Input` | 36 px, graphite-300 border, anodic-400 focus ring (2px, 2px offset). Slots for prefix/suffix. `error` state draws the border danger and renders the message below with an icon. |
| `Select` / `MultiSelect` | Radix Select / custom multi. Multi shows up to 2 chips then `+n more`. Searchable above 8 options. |
| `Combobox` | Async search with debounce, keyboard navigation, empty and loading states. Used for pallet, location, customer, user pickers. |
| `DatePicker` / `DateRangePicker` | Presets — Today · Yesterday · Last 7 · Last 30 · This month · Custom. Shows the resolved range as text. Respects `CFG-13` timezone. |
| `Checkbox` · `Radio` · `Switch` | 16 px control, 44 px hit area. `Switch` only for immediate-effect settings, never inside a form that has a Save button. |
| `Textarea` | Auto-grow to 6 rows, character counter when `maxLength` is set. |
| `NumberInput` | Tabular figures, stepper on hover, no spinner arrows. |

### 5.2 Domain components — the product's signature

| Component | Purpose | Anatomy |
|---|---|---|
| `PalletIdentity` | The canonical way a pallet is named anywhere in ALU TRACK | `mono` pallet number (primary) · job number (caption, graphite-500) · `StatusBadge`. Variants `inline` / `stacked` / `hero`. Clickable → pallet drawer. |
| `LocationRef` | The canonical way a location is named (UX-03) | Occupancy dot · `mono` location code · `Facility › Zone` caption. Variants `inline` / `stacked` / `hero`. Clickable → location drawer. |
| `MovementDirection` | Source → destination (UX-04) | `LocationRef` (graphite) · arrow glyph · `LocationRef` (anodic). Horizontal on web, vertical on PDA. Optional centre slot for the action badge. |
| `StatusBadge` | Pallet status | dot + icon + label, `status.*` tokens. Sizes `sm` (table) / `md` (drawer). |
| `AgeingIndicator` | Days in storage | Numeral + unit + bucket-coloured bar. Tooltip gives the put-away date. |
| `TransactionRef` | Transaction identity | `mono` reference + type icon + copy-to-clipboard on hover. |
| `ScanField` | Barcode entry on web | Auto-focused input with a scan-gun icon, listens for a rapid keystroke burst + Enter, shows resolve state (idle → resolving → resolved / rejected). Manual entry requires a permission and is visually flagged. |
| `TransactionResult` | Outcome of any inventory action | Success: icon + headline + `TransactionRef` + summary + next actions. Failure: renders `ExceptionPanel`. |
| `ExceptionPanel` | Structured error (UX-07) | Headline (*what*) · explanation with the current truth (*why*) · action buttons (*what next*). Consumes the API error envelope directly. |
| `LocationHierarchy` | Site › Facility › Zone › Location | Lazy-loading tree with counts at every node. Used in filters, pickers and the occupancy screen. |
| `OccupancyBoard` | The zone board (§10 of the mandate) | Zones as groups; locations as cells coloured by `location.*` tokens; legend; density control. Virtualised above 500 cells. |
| `Timeline` | Pallet lifecycle (§9 of the mandate) | Vertical rail, one node per transaction: type icon, action, `MovementDirection`, actor, timestamp, reason. Corrections render as an indented branch attached to what they corrected. Current state pinned at the top. |
| `ActivityFeed` | Recent transactions | Compact timeline variant, relative timestamps with absolute on hover. |
| `AuditDiff` | Before/after | Two-column keyed diff; changed values highlighted, unchanged collapsed behind "show unchanged". |
| `PrivilegedAction` | Wrapper for corrections/overrides (UX-08) | Amber-bordered surface, "Administrative action" eyebrow, mandatory reason + justification, two-step confirm with `AuditDiff`. |
| `PermissionGate` | Renders children only if the permission is held | `fallback` prop for the explicit forbidden state. |

### 5.3 Data display

| Component | Notes |
|---|---|
| `DataTable` | Column definitions carry `priority 1–3` (drives responsive hiding), `align`, `width`, `sortable`, `truncate`. Sticky header, row hover, selection, density control (`compact 32` / `default 40` / `comfortable 48`), server-side sort/filter/paginate, column visibility menu, per-row action menu, sticky first and last columns. Truncated cells get a tooltip automatically. |
| `DataTableToolbar` | Search + active filter chips + Clear all + column control + density + Export. Filter chips are removable individually. |
| `FilterBar` | Inline on `lg`+, popover on `md`, sheet on `sm`. **URL-synced.** Shows an active-filter count. |
| `Pagination` | Page size 25/50/100/200, range readout ("51–100 of 3,847"), jump-to-page above 10 pages. |
| `KpiCard` | Label · `display` value · delta vs comparison period · sparkline (optional) · drill-through target. Not a card visually — a bordered panel. |
| `StatPanel` | Grouped read-only key/value pairs for drawer headers. |
| `Chart` | Three permitted types only: horizontal bar (stock by facility / by status), stacked bar (ageing buckets), sparkline. Single-hue by default; categorical colour only where categories are statuses, in which case `status.*` tokens are used. |
| `EmptyState` | `variant`: `no-data` / `no-results` / `location-empty` / `not-started` / `error` / `forbidden`. Icon + headline + one-sentence explanation + primary action. |
| `Skeleton` | Shapes match the final layout exactly — table skeletons have the right column widths and row count. |

### 5.4 Navigation and layout

`AppShell` · `Sidebar` (expand/collapse, persisted; groups; active state as a 2 px anodic-600
left indicator plus anodic-50 fill; tooltips when collapsed) · `TopBar` (logo, site selector,
global search, notifications, profile, role chip) · `PageHeader` (breadcrumb, title, subtitle,
action slot) · `Breadcrumbs` · `Tabs` (underline style) · `SectionHeader`.

### 5.5 Overlays and feedback

`Drawer` (right, 3 sizes, stackable to 2 levels, `Esc` to close, focus trapped) ·
`Modal` (`sm 400` / `md 560` / `lg 720`) · `ConfirmDialog` (names the specific record and the
consequence; destructive variant requires typing the record identifier) ·
`DropdownMenu` · `Tooltip` (400 ms delay, `e2`) · `Popover` ·
`Toast` (top-right, 5 s, background events only — never inventory errors) ·
`Alert` (inline, four signal variants, optional action) ·
`ProgressSteps` (used by put-away, transfer, dispatch and verification flows).

---

## 6. PDA design system

Shares tokens and semantics; nothing else. Full behaviour in
[24-pda-screens.md](24-pda-screens.md).

| Aspect | Value |
|---|---|
| Theme | Dark. Canvas `--graphite-950`, surface `#1B2230`, border `#2A3342` |
| Text | Primary `#F6F8FA`, secondary `#9AA7B8` |
| Contrast | ≥ 7:1 for all text — sunlight legibility |
| Type | Body 16 sp minimum · action tiles 20 sp · scan result `mono-xl` 28 sp · location code 32 sp |
| Touch targets | Minimum 64 dp · primary actions 88 dp · full-width |
| Status colours | Same `status.*` tokens, lightened one step for dark-surface contrast |
| Feedback | Colour + icon + sound + vibration, always all four |
| Motion | 120 ms only. Nothing that delays a scan. |

---

## 7. Accessibility baseline

| Requirement | Standard |
|---|---|
| Text contrast | ≥ 4.5:1 (web), ≥ 7:1 (PDA) |
| UI boundary contrast | ≥ 3:1 |
| Focus indicator | 2 px anodic-400 ring, 2 px offset, visible on every interactive element, never removed |
| Colour independence | Every status carries icon + text (§2.4) |
| Keyboard | Every action reachable; logical tab order; `Esc` closes overlays; arrow keys navigate table rows; skip-to-content link |
| Semantics | Real `<table>`, `<nav>`, `<main>`, `<button>`. Radix primitives supply correct ARIA. |
| Forms | Every input has a `<label>`; errors are `aria-describedby` and announced via a live region |
| Live updates | Polled KPI changes announced politely; they never steal focus |
| Motion | `prefers-reduced-motion` honoured |
| Zoom | Usable at 200% |
| Verification | `axe-core` on every screen in CI; keyboard-only completion of primary journeys in Playwright |
| Contrast verification | `npm run contrast` checks every shipped token pair numerically. axe cannot evaluate contrast in jsdom (no layout, no computed paint), so the ratios are asserted against `tokens.json` instead of being assumed. |

---

## 8. Branding

| Asset | Specification |
|---|---|
| Wordmark | `ALU` in Inter 700, `TRACK` in Inter 400, letter-spaced `.04em`, graphite-900 on light / graphite-0 on dark |
| Mark | Isometric pallet glyph in anodic-700 — a square outline with two horizontal slats, echoing an extruded aluminium channel section. Single colour, works at 16 px. |
| Lock-up | Mark + wordmark horizontal (sidebar, login, PDF header); mark only at ≤ 32 px (collapsed sidebar, favicon, PDA header) |
| Tagline | *Track Every Pallet. Know Every Location.* — login screen and document footers only. Never in the application chrome. |
| Applied to | Login · sidebar · PDA header and splash · report and export headers · PDF exports · location label sheets · browser title and favicon · email templates |
| Document header | Wordmark · report name · generated timestamp with timezone · filters applied · generating user (see `10-report-catalogue.md` §3) |

---

## 9. Token implementation

```
web/src/styles/tokens.css        CSS custom properties — the single source of truth
web/tailwind.config.ts           maps tokens into Tailwind theme (no raw hex)
web/src/lib/status.ts            status → token mapping, shared by badges, charts, boards
pda/.../ui/theme/Tokens.kt       the same values as Compose tokens
docs/21-design-system.md         this document
```

The status map in `status.ts` and `Tokens.kt` is generated from one JSON definition, so web
and PDA cannot drift on what "On Hold" looks like. A CI check fails the build if a component
file contains a hex literal outside `tokens.css`.

# 26 — Frontend Component Architecture

**Covers:** Deliverable 8 (component architecture)
**Applies to:** `web/` (Next.js) and `pda/` (Compose)
**Status:** Implemented in U-0 — this document records what was built

---

## 0. Deviations accepted

D-1 … D-8 were accepted during U-0. D-9 … D-21 were found and corrected during the
full-application build, when every route was exercised against the real backend.

| # | Documented | Built | Why |
|---|---|---|---|
| D-1 | Next.js 14 / React 18 (docs/02 §4.2) | **Next.js 15 / React 19** | The target Node is v24. Next 14 predates it and is two majors behind maintenance; Next 16 is too fresh for a production baseline. |
| D-2 | Tailwind v3 + `tailwind.config.ts` mapping tokens | **Tailwind v4 CSS-first `@theme`** | v4 defines tokens *as* CSS variables, removing the dual source of truth between `tokens.css` and a JS config. It also allows wiping Tailwind's default palette and type scale, so `bg-red-500` and `text-xl` do not resolve at all — the no-off-system-colour rule becomes structural rather than a lint rule. |
| D-3 | `tokens.css` authored by hand as the source of truth | **`design-tokens/tokens.json` generates the CSS** | One JSON generates the web CSS, the web TS status map and the PDA's `Tokens.kt`. Web and PDA cannot drift on what "On Hold" looks like, which is what docs/21 §9 asked for. |
| D-4 | `next/font/google` | **`next/font/local` with committed woff2** | Google Fonts is unreachable from the build environment, and a build-time dependency on an external CDN is wrong for Docker and CI anyway (docs/12 §4). Subsets are synced from `@fontsource` by `scripts/sync-fonts.mjs`; both faces are OFL and the licences ship beside them. |
| D-5 | Shared `TooltipProvider` at app level | **Tooltip self-provides** | A component that throws when rendered without an ancestor provider is a footgun in tests, portals and isolated renders. The cost is losing cross-toolbar delay grouping, which is not worth the fragility. |
| D-7 | Laravel 11 / PHP 8.3 (docs/02 §4.1) | **Laravel 12 / PHP 8.2** | Laravel 11 ships with unpatched high-severity advisories (CRLF injection in the default email rule, signed-URL path confusion); the fixes land only in 12.60+. `composer audit` is clean on 12. PHP 8.2 is what the dev machine has and is what Laravel 12 requires as a minimum; the Docker target stays 8.3. |
| D-8 | MySQL 8.0 for development (docs/12 §2) | **MariaDB 10.4 locally** | Docker's daemon is not running on this machine and MariaDB 10.4 is what is installed. Migrations avoid MySQL-8-only syntax and the collation is env-driven (`DB_COLLATION`), so production still targets `utf8mb4_0900_ai_ci` on MySQL 8. **This divergence is a real risk and is listed in the report.** |
| D-9 | `/occupancy`, `/operations/*`, `/masters/users` in the route map | **`/location-occupancy`, `/transactions/*`, `/users`** | The routes were built under different paths and navigation still pointed at the documented ones, so several sidebar links 404ed. Navigation now matches the filesystem, and `config/routes.test.ts` asserts that every `available: true` item resolves to a real `page.tsx` — the class of bug cannot recur silently. |
| D-10 | Reports gated by `permission:report.view.current_inventory` on the route | **Per-report permission in `ReportController::REPORTS`** | One middleware cannot express thirteen grants. As written, a VIEWER holding only `current_inventory` could read Operator Activity and Pallet Traceability. The map is now slug → permission, and a report the caller may not read answers identically to one that does not exist. |
| D-11 | `LocationResource.state` derived from `is_active` / `is_blocked` only | **Occupancy included** | The comment said occupancy "arrives with the inventory tables in U-4"; it never did, so every occupied location reported `empty` to `LocationRef`. `withCount('locationInventory')` now feeds `empty` / `occupied` / `full`, with inactive and blocked still outranking occupancy. |
| D-12 | `Idempotency-Replayed` consumed by Laravel's tests only | **Forwarded through the BFF to the UI** | The header existed and was tested server-side, but the proxy dropped it, so a retry after a dropped connection rendered as a second successful transaction. `requestDetailed()` surfaces it and both the PDA and web result screens state plainly that the original is being shown. |
| D-13 | `ReasonCodeSeeder` seeding `LOCATION_BLOCK` only | **All seven categories seeded** | `HoldService` and `CorrectionService` both require a reason code, so with only block reasons present, holds and corrections could not be performed at all and the screens correctly showed "no reason codes configured". Generic operational codes for every category are seeded; all remain editable in W-26 and need confirming at UAT. |
| D-14 | Signal colours shared between web and PDA | **A `signal-dark` ramp for the PDA** | The light-surface ramp scores 2.42:1 for danger on the PDA's `graphite-900` chrome. The PDA is the one screen read in direct sunlight. `design-tokens/check-contrast.mjs` now covers the dark pairs too. |
| D-15 | `npm start` running `next start` | **`node .next/standalone/server.js`** | `next start` does not work against `output: 'standalone'` and fails at request time with a React Client Manifest error rather than at build time. `build` now assembles the bundle and `start` runs it, so the wrong command is not reachable. |
| D-16 | The PDA as a native Compose client only (docs/08) | **PDA delivered as a web surface at `/pda`, on the PDA login channel** | The handheld screens are Next.js routes, so they sat behind the web login — and a PDA operator holds `auth.login_pda`, not `auth.login_web`. Operators could not sign in to the only surface they are permitted to use. The login now carries the channel of the destination, so `/pda` opens a PDA session and every scan it records is stamped `channel: PDA` in the ledger and in Operator Activity. A console session is sent to sign in again for `/pda`, and a PDA session is sent back to `/pda` from the console, so the recorded channel is always the surface the work was actually done on. `Tokens.kt` still generates, so the native client remains possible without divergence. |
| D-17 | — | **`.next` output cleaned before each build** | `next build` overwrites its output but never removes what an earlier build left, and the standalone bundle is assembled into that same tree. Stale server chunks then sit beside fresh ones and the server dies per-request with `Cannot find module './NNNN.js'`. `scripts/clean-build-output.mjs` removes `standalone`, `server` and `static` first, keeping `.next/cache` so builds stay incremental. |
| D-18 | `system_settings` referenced by docs/05 §7 but never built | **Table, seeder and S-41 delivered** | The CFG-01 … CFG-21 register existed only as a documentation table, so the values it describes were PHP literals or absent. All 21 rows are now reference data with their own type, allowed values, default and open item, and S-41 renders the register from those rows rather than from a second copy of the catalogue. CFG-01 locks itself once a transaction exists. |
| D-19 | Column named `group` on `system_settings` | **`group_name`** | `GROUP` is reserved in MySQL 8. Laravel quotes identifiers so it would have worked, but any later raw SQL against the table would not — renamed before that could happen rather than after. |
| D-20 | Concurrency proven only at service level | **`RealConcurrencyTest` on real second connections** | The existing suite runs inside one transaction, so the primary key and the row locks were reasoned about rather than exercised. This opens independent PDO sessions and proves the duplicate insert is refused, the pallet lock actually blocks, the loser reads committed truth, references stay unique, foreign keys bite, and datetimes round-trip unshifted. Gated behind `PARALLEL_CONCURRENCY=1`; CI sets it. |
| D-21 | No CI | **`.github/workflows/ci.yml`, MySQL 8.0 and 8.4** | Production is MySQL 8, development is MariaDB 10.4 (D-8), and that gap was carried on trust. CI now asserts the engine is MySQL before running anything, applies the production collation `utf8mb4_0900_ai_ci`, migrates, seeds, proves the migrations reverse, and runs the full suite with the real-connection concurrency tests enabled. |
| D-6 | TanStack Table powering `DataTable` | **Not used in U-0** | Sorting, filtering and pagination are all server-driven, and the table renders a plain semantic `<table>`. TanStack Table earns its place when client-side grouping or virtualisation arrives (occupancy board, U-9); adding it now would be an unused abstraction. The dependency is installed and ready. |

---

## 1. Layering

```
┌─ app/          routes · layouts · server components · BFF route handlers
│                  owns: URL state, data fetching, permission gating
├─ features/     one folder per domain area (inventory, putaway, dispatch, …)
│                  owns: screen composition, feature hooks, domain forms
├─ components/   ui/ (design system)  ·  domain/ (ALU TRACK components)
│                  owns: presentation. No data fetching. No business rules.
└─ lib/          api client · permissions · formatting · status map · schemas
                   owns: shared non-visual logic
```

**Dependency rule, enforced by ESLint `no-restricted-imports`:** `components/ui` imports
nothing from `features` or `app`. `components/domain` may import `components/ui` only. Data
fetching exists only in `app` and `features`. A presentational component that calls an API
is a defect the linter catches, not a review comment.

---

## 2. Directory structure

```
web/src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                    AppShell, session, permission provider
│   │   ├── dashboard/page.tsx
│   │   ├── inventory/page.tsx            W-02  (?pallet= opens the drawer)
│   │   ├── occupancy/page.tsx            W-04
│   │   ├── operations/
│   │   │   ├── putaway/page.tsx          W-12
│   │   │   ├── movement/page.tsx         W-13
│   │   │   ├── dispatch/page.tsx         W-14
│   │   │   ├── verification/…            W-15, W-16
│   │   │   ├── exceptions/page.tsx       W-17
│   │   │   └── corrections/…             W-18, W-19
│   │   ├── transactions/page.tsx         W-07
│   │   ├── reports/[code]/page.tsx       W-09, W-10
│   │   ├── audit/page.tsx                W-11
│   │   ├── config/…                      W-20 … W-30
│   │   └── profile/page.tsx              W-24
│   └── api/                              BFF route handlers — the only place the token is read
│       ├── auth/[...action]/route.ts
│       └── proxy/[...path]/route.ts
│
├── components/
│   ├── ui/            Button Input Select Combobox DatePicker Checkbox Switch
│   │                  DataTable DataTableToolbar FilterBar Pagination
│   │                  Drawer Modal ConfirmDialog DropdownMenu Tooltip Popover
│   │                  Toast Alert Tabs Breadcrumbs ProgressSteps
│   │                  KpiCard StatPanel Chart Skeleton EmptyState Badge
│   └── domain/        PalletIdentity LocationRef MovementDirection StatusBadge
│                      AgeingIndicator TransactionRef ScanField
│                      TransactionResult ExceptionPanel LocationHierarchy
│                      OccupancyBoard Timeline ActivityFeed AuditDiff
│                      PrivilegedAction PermissionGate
│
├── features/
│   ├── inventory/     use-inventory-query.ts  inventory-columns.tsx  pallet-drawer.tsx
│   ├── putaway/       use-putaway-flow.ts     putaway-steps.tsx
│   ├── dispatch/      …
│   ├── occupancy/     use-occupancy.ts        zone-board.tsx
│   ├── corrections/   correction-form.tsx     correction-schema.ts
│   └── …
│
├── lib/
│   ├── api/           client.ts  endpoints.ts  types.ts (generated)  errors.ts
│   ├── permissions/   use-permission.ts  permission-codes.ts (generated)
│   ├── status.ts      status → token map (generated from shared JSON)
│   ├── format.ts      dates in CFG-13 tz, numbers, durations, ageing
│   └── url-state.ts   filter/sort/page ⇄ searchParams
│
└── styles/tokens.css  the single source of colour, type, spacing, elevation
```

---

## 3. State ownership

| State | Owner | Mechanism |
|---|---|---|
| Server data | TanStack Query | Cache keys mirror filter objects; `staleTime` 15 s for lists, 0 for a record being acted on |
| View state (filters, sort, page, open drawer) | **URL** | `useUrlState` ⇄ `searchParams`. Makes every view shareable and back-button correct (N-02). |
| Form state | React Hook Form + Zod | Schemas generated from the API contract, so client and server validation cannot drift |
| Session and permissions | React context, hydrated server-side | From `/auth/me` in the app layout |
| Ephemeral UI | Local `useState` | Hover, focus, transient toggles |
| User preferences | `localStorage` + server profile | Density, page size, sidebar collapsed, landing page |

**No Redux, no Zustand, no Jotai.** The app has no cross-cutting client state that outlives
a route: server state belongs to the query cache, view state belongs to the URL. Adding a
store would create a third source of truth for data that already has two correct homes.

---

## 4. Data flow

```
Browser ──► Next.js route handler (BFF) ──► Laravel /api/v1 ──► MySQL
   ▲            reads httpOnly cookie,
   │            attaches Bearer token          returns { success, data, meta }
   │                                                  or { success:false, error }
   └── TanStack Query cache ◄── typed client ◄────────┘
```

| Concern | Implementation |
|---|---|
| Types | Generated from the OpenAPI spec into `lib/api/types.ts`. **Hand-written response types are banned** — they drift silently. |
| Errors | `client.ts` throws a typed `ApiError` carrying `code`, `message`, `details`, `trace_id`. `ExceptionPanel` consumes it directly, which is why error screens need no per-screen wiring. |
| Idempotency | The mutation hook generates a UUID per user-initiated confirm and reuses it across retries |
| Cancellation | Filter and search requests are aborted on change via `AbortSignal` |
| Auth failure | A `401` from any request clears the session and redirects to login, preserving the target URL |

---

## 5. The DataTable contract

One table component serves every list screen. Screens supply a column definition; they do
not build tables.

```ts
type Column<T> = {
  id: string
  header: string
  accessor: (row: T) => ReactNode
  priority: 1 | 2 | 3        // drives responsive hiding (20 §7)
  align?: 'left' | 'right'
  width?: number | 'auto'
  sortable?: boolean         // only if the API has an index for it
  truncate?: boolean         // auto-tooltips when truncated
  exportValue?: (row: T) => string | number
}
```

| Guarantee | Detail |
|---|---|
| Server-driven | Sorting, filtering and pagination are always server-side |
| Sortable ⇒ indexed | A column may only be `sortable` if `04-data-model.md` §5 lists a covering index. Enforced by a test that cross-references the two. |
| Responsive | Priority ranks produce the `md` and `sm` behaviour with no per-screen code |
| Export | `exportValue` keeps the exported file consistent with what is on screen |
| States | Loading, empty, no-results and error are built in, configured per screen |
| Accessibility | Real `<table>` semantics, `aria-sort`, arrow-key row navigation |

---

## 6. Permission integration

```tsx
const can = usePermission()

{can('transfer.perform') && <Button onClick={transfer}>Transfer</Button>}

<PermissionGate
  permission="correction.perform"
  fallback={<EmptyState variant="forbidden" permission="correction.perform" />}
>
  <CorrectionForm />
</PermissionGate>
```

- `permission-codes.ts` is **generated from the backend `PermissionRegistry`**, so a typo is
  a TypeScript error rather than a silently missing button.
- Nav items are filtered by the same helper that filters actions — one rule, one place.
- The client never decides authorisation. It decides rendering. Every guarded call is
  independently enforced server-side (`07-permission-matrix.md`).

---

## 7. PDA component architecture

```
pda/app/src/main/java/com/redmind/alutrack/
├── ui/
│   ├── theme/           Tokens.kt (generated from the same JSON as web)
│   ├── components/      ActionTile ScanTarget PalletCard LocationCard
│   │                    MovementDirection StatusChip ResultScreen
│   │                    ErrorPanel ProgressSteps ConnectivityChip
│   └── screens/         login/ home/ putaway/ dispatch/ movement/
│                        search/ enquiry/ stockcheck/ hold/ recent/ status/
├── domain/              models · usecases · validation mirroring the server rules
├── data/                api (Retrofit) · repository · session · idempotency
├── scanner/             ScannerProvider · DataWedgeScannerProvider
│                        · CameraXScannerProvider (dev) · FakeScannerProvider (test)
└── di/                  Hilt modules
```

| Pattern | Detail |
|---|---|
| Architecture | MVVM, unidirectional. Each screen has one `UiState` sealed class covering Idle / Input / Validating / Ready / Pending / Committed / Rejected / Unconfirmed — the transaction pattern from `25` §4, expressed as types. |
| Shared screens | D-04, D-05, D-06 and D-08 are one composable each, parameterised by the calling flow. |
| Scanner | Injected through `ScannerProvider`, so swapping the device SDK (`OI-07`) is one binding change and tests use the fake. |
| Tokens | `Tokens.kt` and `status.ts` are generated from one shared JSON definition, so web and PDA cannot disagree about what "On Hold" looks like. |
| Storage | `EncryptedSharedPreferences` for the auth token and UI preferences only. **No inventory data cached, no transaction queue.** |

---

## 8. Conventions

| Item | Rule |
|---|---|
| File names | `kebab-case.tsx`; components `PascalCase`; hooks `use-*.ts` |
| Component size | A file over ~200 lines is split. Screens compose; they do not contain markup trees. |
| Styling | Tailwind utilities from the token theme. `cva` for variants. **No hex literal outside `tokens.css`** — a CI check fails the build. |
| Icons | One set (Lucide), 16 px in tables and 20 px in headers, always with a text label or `aria-label` |
| Dates | Only through `lib/format.ts`, which applies `CFG-13`. Direct `toLocaleString` is lint-banned — it would silently use the browser's timezone and quietly misreport "today". |
| Barrel files | Only `components/ui/index.ts`. Deep barrels wreck tree-shaking. |
| Tests | Component tests for `ui/` and `domain/`; feature tests per screen; Playwright per journey in `25` §2 |

---

## 9. Build-enforced design rules

Design systems decay through exceptions. These checks make the common exceptions fail the
build rather than accumulate.

| Check | Fails when |
|---|---|
| `no-hex-literals` | A colour is written outside `tokens.css` |
| `no-restricted-imports` | `components/ui` imports from `features` or `app` |
| `no-raw-date-format` | `toLocaleString`/`toLocaleDateString` used outside `lib/format.ts` |
| `sortable-requires-index` | A column is `sortable` without a documented covering index |
| `permission-codes-current` | `permission-codes.ts` is out of sync with the backend registry |
| `api-types-current` | Generated types differ from the committed OpenAPI spec |
| `status-tokens-current` | `status.ts` and `Tokens.kt` differ from the shared JSON |
| `axe` | Any screen has an accessibility violation |
| `touch-target-size` | A PDA interactive element is under 64 dp |

# ALU TRACK — Admin Web

Next.js admin application for ALU TRACK.
**Current state: U-0 foundation only.** No application screens are implemented.

See [`../docs/27-ux-implementation-sequence.md`](../docs/27-ux-implementation-sequence.md)
for what lands in each increment.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # then set NEXT_PUBLIC_APP_TIMEZONE (OI-19)
npm run dev
```

Open <http://localhost:3000> — the root redirects to `/foundation`, the design
system gallery.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint, including the build-enforced design rules |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit, component and accessibility tests |
| `npm run tokens` | Regenerate token output from `design-tokens/tokens.json` |
| `npm run fonts` | Re-sync woff2 subsets from `@fontsource` |
| `npm run verify` | tokens → lint → typecheck → test |

## Where things live

```
src/
├── app/            routes, layouts, providers, the /foundation gallery
├── components/
│   ├── ui/         design system primitives — the only styled components
│   ├── domain/     ALU TRACK components (pallet, location, status, movement)
│   └── layout/     shell, sidebar, top bar, page header
├── config/         navigation
├── lib/            formatting, permissions, status, table registry, url state
└── styles/         tokens.generated.css (GENERATED) + base.css
```

## The rules that are enforced by the build

These are not conventions — they fail `npm run lint` or `npm test`:

| Rule | Why |
|---|---|
| No raw hex colours outside the token system | A colour that is not a token is not in the design system |
| No `toLocaleString` outside `lib/format.ts` | The browser timezone is not the yard timezone, and the resulting wrong "today" is invisible in testing |
| `components/` may not import from `features/` or `app/` | Presentation does not own data or screen composition |
| A sortable column must have a covering index | Otherwise a sortable header is a full table scan nobody notices until the yard is full |
| `axe-core` clean | Accessibility is a check, not a review opinion |

Tailwind's default palette and type scale are wiped in `@theme`, so `bg-red-500`
and `text-xl` do not resolve at all.

## Design tokens

`design-tokens/tokens.json` at the repository root is the single source of truth.
`npm run tokens` generates:

- `web/src/styles/tokens.generated.css` — the Tailwind `@theme` block
- `web/src/lib/design-tokens.generated.ts` — status, location and ageing maps
- `design-tokens/generated/Tokens.kt` — the same values for the Compose PDA

Never edit a generated file. Web and PDA cannot disagree about what "On Hold"
looks like because both are generated from the same JSON.

## Reference

- [docs/20 — UI/UX architecture](../docs/20-uiux-architecture.md)
- [docs/21 — Design system](../docs/21-design-system.md)
- [docs/22 — Information architecture](../docs/22-information-architecture.md)
- [docs/23 — Web screens](../docs/23-web-screens.md)
- [docs/26 — Component architecture](../docs/26-component-architecture.md)

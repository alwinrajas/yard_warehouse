'use client'

import { ArrowRight, Download, Package, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { AgeingIndicator } from '@/components/domain/ageing-indicator'
import { ExceptionPanel } from '@/components/domain/exception-panel'
import { LocationRef } from '@/components/domain/location-ref'
import { MovementDirection } from '@/components/domain/movement-direction'
import { PalletIdentity } from '@/components/domain/pallet-identity'
import { PermissionGate } from '@/components/domain/permission-gate'
import { StatusBadge } from '@/components/domain/status-badge'
import { TransactionRef } from '@/components/domain/transaction-ref'
import { TransactionResult } from '@/components/domain/transaction-result'
import { PageHeader } from '@/components/layout/page-header'
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  DataTableToolbar,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  FilterBar,
  IconButton,
  Input,
  KpiCard,
  KpiSkeleton,
  Modal,
  Pagination,
  Panel,
  PanelHeader,
  ProgressSteps,
  RadioGroup,
  Select,
  StatPanel,
  Switch,
  TableSkeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  useToast,
  type DataTableColumn,
  type SortState,
  type TableDensity,
} from '@/components/ui'
import { APP_TIMEZONE, IS_TIMEZONE_UNCONFIRMED } from '@/lib/app-config'
import { formatDateTime, timezoneLabel } from '@/lib/format'
import { AGEING_TOKENS, LOCATION_STATE_TOKENS, STATUS_KEYS } from '@/lib/status'

import { GallerySection, Row, Swatch } from './section'
import { REVIEW_LOCATIONS, REVIEW_ROWS, type ReviewRow } from './review-data'

const GRAPHITE = [0, 25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const ANODIC = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
const SIGNALS = ['success', 'warning', 'danger', 'info', 'neutral'] as const
const TYPE_STEPS = [
  ['display', 'KPI numerals'],
  ['h1', 'Page title'],
  ['h2', 'Section / drawer title'],
  ['h3', 'Panel header'],
  ['body', 'Default'],
  ['body-sm', 'Table cell default'],
  ['label', 'Form labels'],
  ['caption', 'Helper text'],
  ['overline', 'Column headers'],
] as const

export default function FoundationPage() {
  const { toast } = useToast()
  const [density, setDensity] = useState<TableDensity>('default')
  const [sort, setSort] = useState<SortState>({ key: 'ageing_days', direction: 'desc' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typedConfirmOpen, setTypedConfirmOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [switchOn, setSwitchOn] = useState(true)
  const [checked, setChecked] = useState(true)
  const [radio, setRadio] = useState('direct')
  const [selectValue, setSelectValue] = useState<string>()

  const columns: DataTableColumn<ReviewRow>[] = [
    {
      id: 'pallet',
      header: 'Pallet',
      priority: 1,
      sortable: true,
      sortKey: 'pallet_number',
      accessor: (row) => <PalletIdentity pallet={row.pallet} variant="stacked" showStatus={false} />,
    },
    {
      id: 'customer',
      header: 'Customer',
      priority: 2,
      truncate: true,
      accessor: (row) => row.pallet.customerName ?? '—',
    },
    {
      id: 'location',
      header: 'Location',
      priority: 1,
      sortable: true,
      sortKey: 'location_code',
      accessor: (row) => <LocationRef location={row.location} variant="stacked" />,
    },
    {
      id: 'status',
      header: 'Status',
      priority: 1,
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'ageing',
      header: 'Ageing',
      priority: 1,
      align: 'right',
      sortable: true,
      sortKey: 'ageing_days',
      accessor: (row) => (
        <AgeingIndicator days={row.ageingDays} putAwayDate={formatDateTime(row.putAwayAt)} />
      ),
    },
    {
      id: 'user',
      header: 'Last action',
      priority: 3,
      accessor: (row) => <span className="text-graphite-600">{row.lastUser}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-10 pb-16">
      <PageHeader
        title="ALU TRACK Design System"
        context={
          <>
            U-0 foundation · every component below is the one screens will consume · times shown in{' '}
            <span className="font-mono text-mono">{timezoneLabel()}</span>
          </>
        }
        breadcrumbs={[{ label: 'Foundation' }, { label: 'Design System' }]}
        actions={
          <Button variant="secondary" leftIcon={<Download className="size-4" />}>
            Export tokens
          </Button>
        }
      />

      {IS_TIMEZONE_UNCONFIRMED ? (
        <Alert tone="warning" title="Application timezone is not configured">
          <code className="font-mono text-mono">NEXT_PUBLIC_APP_TIMEZONE</code> is unset, so times
          render in <span className="font-mono text-mono">{APP_TIMEZONE}</span>. This is CFG-13 /
          open item OI-19 and must be confirmed before go-live — a wrong timezone silently corrupts
          every &ldquo;today&rdquo; KPI and daily snapshot.
        </Alert>
      ) : null}

      {/* ---------------------------------------------------------------- colour */}
      <GallerySection
        id="colour"
        title="Colour"
        note="Every colour in the product is a token from design-tokens/tokens.json. Tailwind's default palette is wiped, so bg-red-500 does not resolve — an off-system colour is a build error."
      >
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-overline uppercase text-graphite-500">Graphite — cool neutral</p>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-7 lg:grid-cols-13">
              {GRAPHITE.map((step) => (
                <Swatch key={step} name={`graphite-${step}`} varName={`--color-graphite-${step}`} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-overline uppercase text-graphite-500">
              Anodic blue — the only brand colour
            </p>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-10">
              {ANODIC.map((step) => (
                <Swatch key={step} name={`anodic-${step}`} varName={`--color-anodic-${step}`} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-overline uppercase text-graphite-500">Signal — semantic only</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {SIGNALS.map((tone) => (
                <Swatch
                  key={tone}
                  name={tone}
                  varName={`--color-signal-${tone}-fg`}
                  hint={`signal-${tone}`}
                />
              ))}
            </div>
          </div>
        </div>
      </GallerySection>

      {/* ------------------------------------------------------------ typography */}
      <GallerySection
        id="typography"
        title="Typography"
        note="Inter for the interface, JetBrains Mono for every machine-readable identifier. Monospace with tabular, slashed-zero figures is what stops YD-A-03-018 being misread as YD-A-03-Ol8 (UX-01)."
      >
        <Panel className="flex flex-col gap-4">
          {TYPE_STEPS.map(([step, use]) => (
            <div key={step} className="flex flex-wrap items-baseline gap-4">
              <span className="w-24 shrink-0 font-mono text-mono text-graphite-400">{step}</span>
              <span className={`text-${step} ${step === 'overline' ? 'uppercase' : ''} text-graphite-900`}>
                Aluminium channel pallet
              </span>
              <span className="text-caption text-graphite-400">{use}</span>
            </div>
          ))}
          <div className="mt-2 border-t border-graphite-200 pt-4">
            <p className="mb-2 text-overline uppercase text-graphite-500">Identifier treatment</p>
            <div className="flex flex-wrap items-baseline gap-6">
              <span className="font-mono text-mono text-graphite-900">DEMO-PAL-10245</span>
              <span className="font-mono text-mono-lg text-graphite-900">YD-A-03-018</span>
              <span className="font-mono text-mono-xl text-graphite-900">WH-B-02-011</span>
            </div>
            <p className="mt-2 text-caption text-graphite-500">
              Compare <span className="font-mono text-mono">0O 1lI 5S 8B</span> in mono against{' '}
              <span className="text-body-sm">0O 1lI 5S 8B</span> in the interface face.
            </p>
          </div>
        </Panel>
      </GallerySection>

      {/* ---------------------------------------------------------------- status */}
      <GallerySection
        id="status"
        title="Status system"
        note="Dot + icon + label, always. Status is never carried by colour alone. Stored is deliberately neutral graphite — if the state 95% of inventory is in were coloured, colour would stop meaning anything (UX-02)."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Pallet status" />
            <Row>
              {STATUS_KEYS.map((key) => (
                <StatusBadge key={key} status={key} />
              ))}
            </Row>
            <Row className="mt-4">
              {STATUS_KEYS.slice(0, 4).map((key) => (
                <StatusBadge key={key} status={key} size="md" />
              ))}
            </Row>
          </Panel>

          <Panel>
            <PanelHeader title="Location occupancy" description="Pattern differentiates without colour" />
            <div className="flex flex-wrap gap-4">
              {Object.values(LOCATION_STATE_TOKENS).map((token) => (
                <div key={token.key} className="flex items-center gap-2">
                  <span
                    className={`size-5 rounded-sm border ${token.className} ${
                      token.pattern === 'hatch' ? 'pattern-hatch' : ''
                    } ${token.pattern === 'dotted' ? 'pattern-dotted' : ''}`}
                  />
                  <span className="text-body-sm text-graphite-700">{token.label}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Ageing" description="Counted from first entry into inventory, never reset by a transfer" />
            <div className="flex flex-col gap-2">
              {Object.values(AGEING_TOKENS).map((token, index) => (
                <div key={token.key} className="flex items-center gap-4">
                  <span className="w-28 text-body-sm text-graphite-600">{token.label}</span>
                  <AgeingIndicator days={[3, 11, 22, 47][index] ?? 0} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Generic badges" description="For non-status labelling only" />
            <Row>
              <Badge tone="neutral">Neutral</Badge>
              <Badge tone="info">Info</Badge>
              <Badge tone="success">Success</Badge>
              <Badge tone="warning">Warning</Badge>
              <Badge tone="danger">Danger</Badge>
              <Badge tone="outline">Outline</Badge>
            </Row>
          </Panel>
        </div>
      </GallerySection>

      {/* ----------------------------------------------------------- identifiers */}
      <GallerySection
        id="identity"
        title="Domain components"
        note="The product's signature components. Every pallet, location and movement in ALU TRACK renders through exactly these — no screen composes its own."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="PalletIdentity" />
            <div className="flex flex-col gap-4">
              <PalletIdentity pallet={REVIEW_ROWS[0]!.pallet} variant="hero" />
              <div className="border-t border-graphite-200 pt-3">
                <PalletIdentity pallet={REVIEW_ROWS[1]!.pallet} variant="stacked" />
              </div>
              <div className="border-t border-graphite-200 pt-3">
                <PalletIdentity pallet={REVIEW_ROWS[2]!.pallet} />
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="LocationRef" description="A location is an object, not a string (UX-03)" />
            <div className="flex flex-col gap-4">
              <LocationRef location={REVIEW_LOCATIONS[0]!} variant="hero" />
              <div className="flex flex-wrap gap-6 border-t border-graphite-200 pt-3">
                {REVIEW_LOCATIONS.map((location) => (
                  <LocationRef key={location.id} location={location} />
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="lg:col-span-2">
            <PanelHeader
              title="MovementDirection"
              description="Direction is understood pre-attentively; two labelled fields must be read (UX-04)"
            />
            <div className="grid gap-6 md:grid-cols-2">
              <MovementDirection from={REVIEW_LOCATIONS[0]} to={REVIEW_LOCATIONS[1]} />
              <MovementDirection
                from={REVIEW_LOCATIONS[0]}
                to={REVIEW_LOCATIONS[1]}
                orientation="vertical"
                fromLabel="Current location"
                toLabel="Destination"
              />
            </div>
          </Panel>

          <Panel className="lg:col-span-2">
            <PanelHeader title="TransactionRef and StatPanel" />
            <Row className="mb-4">
              <TransactionRef reference="PA-20260916-000148" />
              <TransactionRef reference="TR-20260916-000392" />
              <TransactionRef reference="DP-20260916-000071" />
            </Row>
            <StatPanel
              columns={3}
              stats={[
                { label: 'Pallet', value: 'DEMO-PAL-10245', mono: true },
                { label: 'Job', value: 'DEMO-JOB-8817', mono: true },
                { label: 'Customer', value: 'DEMO Gulf Aluminium' },
                { label: 'Put away', value: formatDateTime('2026-09-12T08:14:00Z') },
                { label: 'Last movement', value: formatDateTime('2026-09-14T09:12:00Z') },
                { label: 'Last action by', value: 'R. Kumar' },
              ]}
            />
          </Panel>
        </div>
      </GallerySection>

      {/* --------------------------------------------------------------- actions */}
      <GallerySection id="actions" title="Actions">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Button variants" />
            <Row>
              <Button variant="primary">Confirm put-away</Button>
              <Button variant="secondary">Cancel</Button>
              <Button variant="ghost">Clear filters</Button>
              <Button variant="danger" leftIcon={<Trash2 className="size-4" />}>
                Delete
              </Button>
              <Button variant="link">View pallet</Button>
            </Row>
            <Row className="mt-4">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </Row>
            <Row className="mt-4">
              <Button variant="primary" loading loadingLabel="Committing transaction…">
                Confirm
              </Button>
              <Button disabled>Disabled</Button>
              <Button leftIcon={<Plus className="size-4" />}>With icon</Button>
              <Button rightIcon={<ArrowRight className="size-4" />}>Continue</Button>
            </Row>
          </Panel>

          <Panel>
            <PanelHeader title="Icon buttons, menus and tooltips" />
            <Row>
              <IconButton label="Add" icon={<Plus className="size-4" />} />
              <IconButton label="Add" variant="primary" icon={<Plus className="size-4" />} />
              <IconButton label="Add" variant="secondary" icon={<Plus className="size-4" />} />
              <IconButton label="Delete" variant="danger" icon={<Trash2 className="size-4" />} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">Row actions</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem icon={<Package className="size-3.5" />}>View pallet</DropdownMenuItem>
                  <DropdownMenuItem>Transfer</DropdownMenuItem>
                  <DropdownMenuItem tone="danger">Place hold</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip content="Tooltips explain a control; they never label one">
                <Button variant="ghost">Hover me</Button>
              </Tooltip>
            </Row>
            <Row className="mt-4">
              <ProgressSteps
                className="w-full"
                current={1}
                steps={[
                  { id: '1', label: 'Location' },
                  { id: '2', label: 'Pallet' },
                  { id: '3', label: 'Confirm' },
                ]}
              />
            </Row>
          </Panel>
        </div>
      </GallerySection>

      {/* ----------------------------------------------------------------- forms */}
      <GallerySection
        id="forms"
        title="Form system"
        note="Field owns label association, description, required marking and error announcement, so no screen has to remember to wire aria-describedby."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="flex flex-col gap-4">
            <Field label="Location code" description="Scan or type the location barcode" required>
              <Input mono placeholder="YD-A-03-018" />
            </Field>
            <Field
              label="Pallet number"
              error="No pallet found with that barcode."
              required
            >
              <Input mono defaultValue="DEMO-PAL-99999" invalid />
            </Field>
            <Field label="Facility">
              <Select
                ariaLabel="Facility"
                value={selectValue}
                onValueChange={setSelectValue}
                placeholder="All facilities"
                options={[
                  { value: 'yd-a', label: 'DEMO Open Yard A', description: 'Open yard' },
                  { value: 'wh-b', label: 'DEMO Warehouse B', description: 'Closed warehouse' },
                ]}
              />
            </Field>
            <Field label="Remarks" hint="Optional">
              <Textarea placeholder="Add context for this transaction…" maxLength={500} showCount />
            </Field>
          </Panel>

          <Panel className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-overline uppercase text-graphite-500">Dispatch mode (CFG-09)</p>
              <RadioGroup
                ariaLabel="Dispatch mode"
                value={radio}
                onValueChange={setRadio}
                options={[
                  { value: 'direct', label: 'Direct', description: 'Dispatch straight from storage' },
                  { value: 'staged', label: 'Staged', description: 'Via a dispatch area' },
                ]}
              />
            </div>
            <Checkbox
              checked={checked}
              onCheckedChange={setChecked}
              label="Require delivery reference"
              description="CFG-16 — makes the field mandatory at dispatch"
            />
            <Checkbox indeterminate label="Partial selection" ariaLabel="Partial selection" />
            <Switch
              checked={switchOn}
              onCheckedChange={setSwitchOn}
              label="Single active PDA session"
              description="CFG-20 — a second login revokes the first"
            />
            <Alert tone="info" title="Deferred to U-2">
              Combobox, MultiSelect, DatePicker and DateRangePicker are specified in docs/21 §5.1
              but are not built here. Each needs a consuming screen to get right, and two add a
              dependency — see the implementation report.
            </Alert>
          </Panel>
        </div>
      </GallerySection>

      {/* ----------------------------------------------------------------- table */}
      <GallerySection
        id="table"
        title="Table system"
        note="One DataTable serves every list screen. Columns carry a priority rank that drives responsive hiding with no per-screen code, and a sortable column without a covering index throws at dev time."
      >
        <Panel padded={false} className="overflow-hidden">
          <div className="flex flex-col gap-3 p-4">
            <DataTableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search pallet, job, customer…"
              density={density}
              onDensityChange={setDensity}
              onExport={() =>
                toast({
                  tone: 'success',
                  title: 'Export queued',
                  description: 'You will get a link when the file is ready.',
                })
              }
            />
            <FilterBar
              activeFilters={[
                { id: 'facility', label: 'Facility', value: 'DEMO Open Yard A' },
                { id: 'status', label: 'Status', value: 'Stored' },
              ]}
              onRemoveFilter={() => undefined}
              onClearAll={() => undefined}
            >
              <Select
                ariaLabel="Facility"
                placeholder="Facility"
                options={[{ value: 'a', label: 'DEMO Open Yard A' }]}
                className="w-44"
              />
              <Select
                ariaLabel="Status"
                placeholder="Status"
                options={[{ value: 'stored', label: 'Stored' }]}
                className="w-36"
              />
            </FilterBar>
          </div>

          <DataTable
            dataset="inventory"
            columns={columns}
            rows={REVIEW_ROWS}
            getRowId={(row) => row.id}
            density={density}
            sort={sort}
            onSortChange={setSort}
            selectedRowId={selectedRow}
            onRowClick={(row) => {
              setSelectedRow(row.id)
              setDrawerOpen(true)
            }}
            caption="Review fixtures demonstrating the ALU TRACK table system"
            rowActions={() => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label="Row actions" size="sm" icon={<Package className="size-4" />} />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>View pallet</DropdownMenuItem>
                  <DropdownMenuItem>Transfer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />

          <Pagination
            page={page}
            pageSize={25}
            total={3847}
            onPageChange={setPage}
            onPageSizeChange={() => undefined}
          />
        </Panel>
      </GallerySection>

      {/* -------------------------------------------------------------- overlays */}
      <GallerySection
        id="overlays"
        title="Overlays"
        note="Detail opens in a drawer over the list so filters, sort and scroll position survive (UX-05). Modals are for confirmation and short forms only."
      >
        <Panel>
          <Row>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Open drawer
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
              Confirm (tier 2)
            </Button>
            <Button variant="secondary" onClick={() => setTypedConfirmOpen(true)}>
              Confirm (tier 3 — typed)
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({ tone: 'info', title: 'Preference saved', description: 'Row density updated.' })
              }
            >
              Toast
            </Button>
          </Row>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline" count={7}>
                Timeline
              </TabsTrigger>
              <TabsTrigger value="holds" count={1}>
                Holds
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <StatPanel
                stats={[
                  { label: 'Status', value: <StatusBadge status="stored" /> },
                  { label: 'Location', value: 'YD-A-03-018', mono: true },
                ]}
              />
            </TabsContent>
            <TabsContent value="timeline">
              <p className="text-body-sm text-graphite-500">
                Timeline lands with the pallet detail drawer in U-4.
              </p>
            </TabsContent>
            <TabsContent value="holds">
              <p className="text-body-sm text-graphite-500">Hold history arrives in U-10.</p>
            </TabsContent>
          </Tabs>
        </Panel>
      </GallerySection>

      {/* ---------------------------------------------------------- feedback */}
      <GallerySection
        id="feedback"
        title="Feedback, states and exceptions"
        note="Every rejected operation answers what happened, why (the current truth from the API envelope), and what the user can do next. An inventory error is never a toast."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <ExceptionPanel
            title="Pallet already stored"
            description="This pallet is currently recorded at another location."
            details={[
              { label: 'Location', value: 'WH-A-03-018', mono: true },
              { label: 'Stored by', value: 'R. Kumar' },
              { label: 'Stored at', value: formatDateTime('2026-09-12T08:14:00Z') },
            ]}
            errorCode="PALLET_ALREADY_STORED"
            traceId="01J8XQ7M2K"
            actions={
              <>
                <Button variant="primary" size="sm">
                  View pallet
                </Button>
                <Button variant="secondary" size="sm">
                  Transfer instead
                </Button>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </>
            }
          />

          <ExceptionPanel
            title="Wrong location"
            description="The scanned location is not where this pallet is recorded."
            comparison={{ expected: 'YD-A-03-018', actual: 'YD-B-02-004' }}
            errorCode="PALLET_NOT_AT_LOCATION"
            actions={
              <>
                <Button variant="primary" size="sm">
                  Go to expected location
                </Button>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </>
            }
          />

          <TransactionResult
            title="Pallet stored"
            reference="PA-20260916-000148"
            details={[
              { label: 'Pallet', value: 'DEMO-PAL-10245', mono: true },
              { label: 'Location', value: 'YD-A-03-018', mono: true },
              { label: 'Time', value: formatDateTime('2026-09-16T10:42:00Z') },
              { label: 'Status', value: <StatusBadge status="stored" /> },
            ]}
            actions={
              <>
                <Button variant="primary" size="sm">
                  Put away another
                </Button>
                <Button variant="secondary" size="sm">
                  View pallet
                </Button>
              </>
            }
          />

          <div className="flex flex-col gap-3">
            <Alert tone="info" title="Manual entry — no scan verification">
              Use the ALU TRACK PDA where possible. This transaction is recorded as web-channel
              without a device reference.
            </Alert>
            <Alert tone="warning" title="2 locations are blocked" action={<Button size="sm" variant="secondary">Review</Button>} />
            <Alert tone="danger" title="Could not reach the server" live>
              Check your connection and retry.
            </Alert>
            <Alert tone="success" title="Opening stock signed off" />
          </div>

          <Panel padded={false}>
            <EmptyState
              variant="no-results"
              title="No pallets match these filters"
              description="Facility: DEMO Open Yard A · Status: Dispatched · Ageing: over 30 days"
              action={<Button variant="primary">Clear all filters</Button>}
            />
          </Panel>

          <Panel padded={false}>
            <EmptyState
              variant="location-empty"
              title="This location is empty"
              description="Nothing is currently recorded at YD-A-05-002."
              action={<Button variant="secondary">Scan another location</Button>}
            />
          </Panel>

          <Panel padded={false}>
            <EmptyState
              variant="forbidden"
              title="You do not have access to corrections"
              description="Corrections are restricted to Yard Admin and Super Admin."
              permission="correction.perform"
              action={<Button variant="secondary">Request access</Button>}
            />
          </Panel>

          <Panel padded={false}>
            <EmptyState
              variant="error"
              title="Could not load inventory"
              description="The server did not respond in time."
              errorCode="UPSTREAM_TIMEOUT"
              traceId="01J8XQ8P4A"
              action={<Button variant="primary">Retry</Button>}
            />
          </Panel>
        </div>
      </GallerySection>

      {/* -------------------------------------------------------------- loading */}
      <GallerySection
        id="loading"
        title="Loading states"
        note="Skeletons match the final geometry exactly — right column widths, right row count — so nothing shifts when data arrives."
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </div>
          <Panel padded={false} className="overflow-hidden">
            <TableSkeleton rows={5} columns={['w-28', 'w-32', 'w-28', 'w-20', 'w-16']} />
          </Panel>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Total active pallets" value={3847} delta={42} deltaLabel="since yesterday" />
            <KpiCard label="Open yard stock" value={2104} onClick={() => undefined} />
            <KpiCard label="Today dispatch" value={94} onClick={() => undefined} />
            <KpiCard label="Ageing over 30 days" value={62} delta={8} tone="attention" onClick={() => undefined} />
          </div>
        </div>
      </GallerySection>

      {/* ---------------------------------------------------------- permissions */}
      <GallerySection
        id="permissions"
        title="Permission-aware UI"
        note="The client decides rendering, never authorisation — every guarded operation is independently enforced server-side. An action the user can never perform is absent; an action blocked by state is disabled with a reason."
      >
        <Panel className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-overline uppercase text-graphite-500">Held permission</p>
            <PermissionGate permission="correction.perform">
              <Button variant="secondary">Create correction</Button>
            </PermissionGate>
          </div>
          <div>
            <p className="mb-2 text-overline uppercase text-graphite-500">
              Missing permission — renders the fallback, not a disabled button
            </p>
            <PermissionGate
              permission={'nonexistent.permission' as never}
              fallback={
                <EmptyState
                  compact
                  variant="forbidden"
                  title="Not permitted"
                  permission="nonexistent.permission"
                />
              }
            >
              <Button variant="secondary">Hidden action</Button>
            </PermissionGate>
          </div>
          <div>
            <p className="mb-2 text-overline uppercase text-graphite-500">
              Permitted but blocked by state — disabled, with the reason
            </p>
            <Tooltip content="Cannot dispatch — pallet is on hold since 14 Sep">
              <span className="inline-block">
                <Button variant="primary" disabled>
                  Dispatch
                </Button>
              </span>
            </Tooltip>
          </div>
        </Panel>
      </GallerySection>

      {/* ------------------------------------------------------------- overlays */}
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Pallet detail"
        header={<PalletIdentity pallet={REVIEW_ROWS[0]!.pallet} variant="hero" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Close
            </Button>
            <Button variant="primary">Transfer</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5 p-5">
          <LocationRef location={REVIEW_LOCATIONS[0]!} variant="hero" />
          <StatPanel
            stats={[
              { label: 'Put away', value: formatDateTime('2026-09-12T08:14:00Z') },
              { label: 'Last movement', value: formatDateTime('2026-09-14T09:12:00Z') },
              { label: 'Last action by', value: 'R. Kumar' },
              { label: 'Ageing', value: <AgeingIndicator days={4} /> },
            ]}
          />
          <p className="text-body-sm text-graphite-500">
            The full pallet detail experience — timeline, holds and transactions — arrives in U-4.
          </p>
        </div>
      </Drawer>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Block location"
        description="New put-away and transfers into this location will be refused."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Block location
            </Button>
          </>
        }
      >
        <Field label="Reason" required>
          <Select
            ariaLabel="Reason"
            placeholder="Select a reason"
            options={[
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'unsafe', label: 'Unsafe access' },
            ]}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Release hold on DEMO-PAL-10102?"
        description="The pallet becomes eligible for dispatch immediately."
        confirmLabel="Release hold"
        onConfirm={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={typedConfirmOpen}
        onOpenChange={setTypedConfirmOpen}
        title="Reverse dispatch for DEMO-PAL-10245?"
        description="This is an administrative correction. The original transaction is preserved and a new correction record is created."
        confirmLabel="Reverse dispatch"
        tone="danger"
        typeToConfirm="DEMO-PAL-10245"
        onConfirm={() => setTypedConfirmOpen(false)}
      />
    </div>
  )
}

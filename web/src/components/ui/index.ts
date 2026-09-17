/**
 * ALU TRACK design system — public surface.
 *
 * The only barrel file in the project (docs/26 §8). Screens import from here;
 * they never reach into individual component files, and they never style locally.
 */
export { Button, buttonVariants, type ButtonProps } from './button'
export { IconButton, type IconButtonProps } from './icon-button'
export { Spinner } from './spinner'
export { Badge, CountBadge, type BadgeProps } from './badge'
export { Panel, PanelHeader, SectionHeader, Separator } from './panel'
export { Tooltip, TooltipProvider } from './tooltip'

export { Field, useField, useFieldControlProps } from './field'
export { Input, type InputProps } from './input'
export { Textarea, type TextareaProps } from './textarea'
export { Select, SelectGroupLabel, type SelectOption } from './select'
export { Combobox, type ComboboxOption } from './combobox'
export { Checkbox } from './checkbox'
export { Switch } from './switch'
export { RadioGroup, type RadioOption } from './radio-group'
export { SearchInput } from './search-input'

export { DataTable } from './data-table'
export {
  DENSITY_HEIGHT,
  type ColumnPriority,
  type DataTableColumn,
  type DataTableProps,
  type SortState,
  type TableDensity,
} from './data-table-types'
export { DataTableToolbar } from './data-table-toolbar'
export { FilterBar, type ActiveFilter } from './filter-bar'
export { Pagination } from './pagination'

export { Modal } from './modal'
export { Drawer } from './drawer'
export { ConfirmDialog } from './confirm-dialog'
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
export { Popover, PopoverContent, PopoverClose, PopoverTrigger } from './popover'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

export { Alert, type AlertProps } from './alert'
export { ToastProvider, useToast, type ToastMessage, type ToastTone } from './toast'
export { Skeleton, TextSkeleton, TableSkeleton, KpiSkeleton } from './skeleton'
export { EmptyState, type EmptyStateVariant } from './empty-state'
export { ProgressSteps, type Step } from './progress-steps'
export { KpiCard, type KpiTone } from './kpi-card'
export { Sparkline } from './sparkline'
export { Donut, DonutLegend, type DonutSlice } from './donut'
export { Meter } from './meter'
export { StatPanel, type Stat } from './stat-panel'

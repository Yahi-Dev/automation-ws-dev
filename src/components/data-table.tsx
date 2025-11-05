"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type FilterFn,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, Plus, Search, Eye, EyeOff, Settings2, Calendar as CalendarIcon, X, Filter } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/src/components/ui/dropdown-menu"
import { Input } from "@/src/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table"
import { Card, CardContent } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Separator } from "@/src/components/ui/separator"
import { Popover, PopoverTrigger, PopoverContent } from "@/src/components/ui/popover"
import { Calendar } from "@/src/components/ui/calendar"
import { Checkbox } from "@/src/components/ui/checkbox"
import { cn } from "@/src/lib/utils"

// Colores de la aplicación
const COLORS = {
  primary: '#4ade80',    // Verde principal
  dark: '#4A4A4A',       // Gris oscuro
  light: '#A39F9E',      // Gris claro
  white: '#FFFFFF',
  black: '#000000'
}

// Tipo para servicios
type ServiceType = 'all' | 'aeronautics' | 'services'

// --------- Filtros ----------
const globalFilterFn: FilterFn<any> = (row, columnId, filterValue: string) => {
  const search = (filterValue ?? "").toLowerCase()
  if (!search) return true
  return Object.values(row.original).some((cellValue) => {
    if (cellValue == null) return false
    return String(cellValue).toLowerCase().includes(search)
  })
}

// Filtro entre fechas para una columna de fecha (acepta Date o ISO/string)
const dateBetween: FilterFn<any> = (row, columnId, value: { from?: Date; to?: Date } | undefined) => {
  if (!value || (!value.from && !value.to)) return true
  const raw = row.getValue(columnId)
  if (!raw) return false

  const d = new Date(raw as string) // soporta Date o string ISO
  if (isNaN(d.getTime())) return false

  const start = value.from ? new Date(value.from) : undefined
  const end = value.to ? new Date(value.to) : undefined

  if (start) {
    start.setHours(0, 0, 0, 0)
    if (d < start) return false
  }
  if (end) {
    end.setHours(23, 59, 59, 999)
    if (d > end) return false
  }
  return true
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  createButtonText?: string
  onCreateClick?: () => void
  showCreateButton?: boolean
  showColumnToggle?: boolean
  showPagination?: boolean
  showFilterService?: boolean
  selectedServices?: ServiceType[]
  setSelectedServices?: React.Dispatch<React.SetStateAction<ServiceType[]>>
  title?: string
  description?: string
  onRowClick?: (row: TData) => void

  /** NUEVO: id o accessorKey de la columna que contiene la fecha (p.ej. "flightDate") */
  dateColumnId?: string
  /** Mostrar/ocultar el filtro de rango de fechas en el toolbar */
  showDateRangeFilter?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search...",
  createButtonText = "Create",
  onCreateClick,
  showCreateButton = true,
  showColumnToggle = true,
  showPagination = true,
  title,
  description,
  showFilterService = false,
  selectedServices = [],
  setSelectedServices,
  onRowClick,
  dateColumnId,
  showDateRangeFilter = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({ 
    from: undefined, 
    to: undefined 
  })

  // Si nos pasan dateColumnId, "inyectamos" el filterFn a esa columna
  const derivedColumns = React.useMemo(() => {
    if (!dateColumnId) return columns
    
    return columns.map((col) => {
      const columnDef = col as ColumnDef<TData, TValue> & { id?: string; accessorKey?: string }
      const id = columnDef.id ?? columnDef.accessorKey
      
      if (id === dateColumnId) {
        return {
          ...col,
          filterFn: dateBetween as any
        }
      }
      return col
    })
  }, [columns, dateColumnId])

  const table = useReactTable({
    data,
    columns: derivedColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: globalFilterFn as FilterFn<TData>,
    filterFns: {
      dateBetween: dateBetween as FilterFn<TData>
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })

  // Sincroniza el valor del filtro de fecha con la columna correspondiente
  React.useEffect(() => {
    if (!dateColumnId) return
    const col = table.getColumn(dateColumnId)
    if (!col) return
    const hasRange = dateRange.from || dateRange.to
    col.setFilterValue(hasRange ? { ...dateRange } : undefined)
  }, [dateRange, dateColumnId, table])

  const totalRows = table.getFilteredRowModel().rows.length
  const selectedRows = table.getFilteredSelectedRowModel().rows.length
  const currentPage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()

  const clearDateRange = () => setDateRange({ from: undefined, to: undefined })

  // Helpers visuales
  const formatBadgeDate = (d?: Date) => {
    if (!d) return ""
    // formato simple (DD/MM/YYYY) sin libs
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  // Handler para cambios en servicios
  const handleServiceChange = (service: ServiceType, checked: boolean) => {
    if (!setSelectedServices) return;
    
    const newServices = checked
      ? [...selectedServices.filter((s: ServiceType) => s !== 'all'), service]
      : selectedServices.filter((s: ServiceType) => s !== service);

    // Si no hay selecciones, remover "all" automáticamente
    if (newServices.length === 0) {
      setSelectedServices([]);
    } else if (newServices.includes('aeronautics') && newServices.includes('services')) {
      // Si ambos están seleccionados, agregar "all"
      setSelectedServices(['all', 'aeronautics', 'services']);
    } else {
      setSelectedServices(newServices);
    }
  }

  return (
    <div className="w-full space-y-6">
      {(title || description) && (
        <div className="space-y-2">
          {title && <h2 className="text-2xl font-bold tracking-tight" style={{ color: COLORS.dark }}>{title}</h2>}
          {description && <p style={{ color: COLORS.light }}>{description}</p>}
        </div>
      )}

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        {/* Left side - Search and filters */}
        <div className="flex flex-1 items-center flex-wrap gap-3">
          {/* Global search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: COLORS.light }} />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-10 bg-white border-gray-300 focus:border-[#FDB913] focus:ring-2 focus:ring-[#FDB913]/20"
              style={{ color: COLORS.dark }}
            />
          </div>

          {/* NEW: Date Range Filter (shadcn) */}
          {showDateRangeFilter && dateColumnId && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal border-gray-300",
                      !dateRange.from && !dateRange.to && "text-muted-foreground"
                    )}
                    style={{ color: COLORS.dark }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from || dateRange.to ? (
                      <span>
                        {dateRange.from ? formatBadgeDate(dateRange.from) : "…"} — {dateRange.to ? formatBadgeDate(dateRange.to) : "…"}
                      </span>
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to
                    }}
                    onSelect={(range: { from?: Date; to?: Date } | undefined) => 
                      setDateRange(range ?? { from: undefined, to: undefined })
                    }
                    numberOfMonths={2}
                    initialFocus
                  />
                  <div className="flex items-center justify-between p-2 border-t border-gray-200">
                    <div className="text-xs" style={{ color: COLORS.light }}>
                      Filter by {dateColumnId}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDateRange}
                      className="hover:bg-gray-100"
                      style={{ color: COLORS.dark }}
                    >
                      <X className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Selected range chips */}
              {(dateRange.from || dateRange.to) && (
                <Badge variant="secondary" className="gap-1" style={{ backgroundColor: COLORS.dark, color: COLORS.white }}>
                  {dateRange.from ? formatBadgeDate(dateRange.from) : "…"} — {dateRange.to ? formatBadgeDate(dateRange.to) : "…"}
                </Badge>
              )}
            </div>
          )}

          {/* Quick statistics */}
          <div className="hidden md:flex items-center space-x-2">
            <Badge variant="secondary" style={{ backgroundColor: COLORS.dark, color: COLORS.white }}>
              {totalRows} records
            </Badge>
            {selectedRows > 0 && (
              <Badge variant="default" style={{ backgroundColor: COLORS.primary, color: COLORS.dark }}>
                {selectedRows} selected
              </Badge>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">

          {/* Services Filter Dropdown */}
          {showFilterService && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-300"
                  style={{ color: COLORS.dark }}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Services
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-gray-200">
                <DropdownMenuLabel style={{ color: COLORS.dark }}>Filter by service</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200" />

                {/* "All" option */}
                <DropdownMenuCheckboxItem
                  className="hover:bg-gray-100"
                  style={{ color: COLORS.dark }}
                  checked={selectedServices.includes('all')}
                  onCheckedChange={(checked) => {
                    if (checked && setSelectedServices) {
                      // Select all
                      setSelectedServices(['all', 'aeronautics', 'services']);
                    } else if (setSelectedServices) {
                      // Deselect all
                      setSelectedServices([]);
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedServices.includes('all')}
                      className="h-4 w-4"
                    />
                    <span>All</span>
                  </div>
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator className="bg-gray-200" />

                {/* Aeronautics option */}
                <DropdownMenuCheckboxItem
                  className="hover:bg-gray-100"
                  style={{ color: COLORS.dark }}
                  checked={selectedServices.includes('aeronautics')}
                  onCheckedChange={(checked) => handleServiceChange('aeronautics', checked)}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedServices.includes('aeronautics')}
                      className="h-4 w-4"
                    />
                    <span>Aeronautics</span>
                  </div>
                </DropdownMenuCheckboxItem>

                {/* Services option */}
                <DropdownMenuCheckboxItem
                  className="hover:bg-gray-100"
                  style={{ color: COLORS.dark }}
                  checked={selectedServices.includes('services')}
                  onCheckedChange={(checked) => handleServiceChange('services', checked)}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedServices.includes('services')}
                      className="h-4 w-4"
                    />
                    <span>Rent Space</span>
                  </div>
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {showColumnToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-300"
                  style={{ color: COLORS.dark }}
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Columns
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-gray-200">
                <DropdownMenuLabel style={{ color: COLORS.dark }}>Show columns</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200" />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    const isVisible = column.getIsVisible()
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize hover:bg-gray-100"
                        style={{ color: COLORS.dark }}
                        checked={isVisible}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        <div className="flex items-center space-x-2">
                          {isVisible ? (
                            <Eye className="h-4 w-4" style={{ color: COLORS.dark }} />
                          ) : (
                            <EyeOff className="h-4 w-4" style={{ color: COLORS.light }} />
                          )}
                          <span>{column.id}</span>
                        </div>
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {showCreateButton && onCreateClick && (
            <Button
              onClick={onCreateClick}
              className="shadow-sm hover:shadow-md transition-shadow"
              style={{ backgroundColor: COLORS.primary, color: COLORS.dark }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {createButtonText}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-gray-200"
                  style={{ backgroundColor: `${COLORS.primary}15` }}
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="font-semibold px-6"
                      style={{ color: COLORS.dark }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`
                      transition-colors border-b border-gray-200
                      ${row.getIsSelected()
                        ? `bg-[#FDB91320] border-[#FDB91340]`
                        : "bg-white hover:bg-gray-50"
                      }
                      ${onRowClick ? "cursor-pointer hover:bg-gray-100" : ""}
                    `}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button, a, [role="button"]')) return
                      onRowClick?.(row.original)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-4 px-6"
                        style={{ color: COLORS.dark }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={derivedColumns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 rounded-full bg-gray-100">
                        <Search className="h-6 w-6" style={{ color: COLORS.dark }} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium" style={{ color: COLORS.dark }}>No results found</p>
                        <p className="text-sm" style={{ color: COLORS.light }}>Try adjusting your search or filters</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {showPagination && (
        <Card className="border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div className="flex items-center space-x-4 text-sm" style={{ color: COLORS.dark }}>
                <div className="flex items-center space-x-2">
                  <span>Showing</span>
                  <Badge variant="outline" className="font-mono border-gray-300" style={{ color: COLORS.dark }}>
                    {table.getRowModel().rows.length}
                  </Badge>
                  <span>of</span>
                  <Badge variant="outline" className="font-mono border-gray-300" style={{ color: COLORS.dark }}>
                    {totalRows}
                  </Badge>
                  <span>records</span>
                </div>

                {selectedRows > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-4 bg-gray-300" />
                    <div className="flex items-center space-x-1">
                      <Badge variant="default" style={{ backgroundColor: COLORS.primary, color: COLORS.dark }}>
                        {selectedRows}
                      </Badge>
                      <span>selected</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-sm" style={{ color: COLORS.dark }}>
                  <span>Page</span>
                  <Badge variant="outline" className="font-mono border-gray-300" style={{ color: COLORS.dark }}>
                    {currentPage}
                  </Badge>
                  <span>of</span>
                  <Badge variant="outline" className="font-mono border-gray-300" style={{ color: COLORS.dark }}>
                    {totalPages}
                  </Badge>
                </div>

                <Separator orientation="vertical" className="h-4 bg-gray-300" />

                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                    className="border-gray-300 hover:bg-gray-100"
                    style={{ color: COLORS.dark }}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="border-gray-300 hover:bg-gray-100"
                    style={{ color: COLORS.dark }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="border-gray-300 hover:bg-gray-100"
                    style={{ color: COLORS.dark }}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                    className="border-gray-300 hover:bg-gray-100"
                    style={{ color: COLORS.dark }}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper para columnas ordenables (sin cambios)
export function createSortableColumn<T>(accessorKey: keyof T, header: string): ColumnDef<T> {
  return {
    accessorKey: accessorKey as string,
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className={`
            h-auto p-2 font-semibold justify-start hover:bg-gray-100
            ${isSorted ? "bg-gray-100" : ""}
          `}
          style={{ color: isSorted ? COLORS.primary : COLORS.dark }}
        >
          {header}
          <ArrowUpDown
            className={`ml-2 h-4 w-4 transition-transform ${isSorted === "asc" ? "rotate-180" : ""}`}
            style={{ color: isSorted ? COLORS.primary : COLORS.dark }}
          />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium ml-5" style={{ color: COLORS.dark }}>
        {row.getValue(accessorKey as string)}
      </div>
    ),
  }
}
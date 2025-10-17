import * as React from "react";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sortKey?: string; // Optional: custom property path for sorting (e.g., "customer.name")
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

export type BulkAction<T> = 
  | {
      type: "button";
      label: string;
      icon?: React.ComponentType<{ className?: string }>;
      action: (selectedItems: T[]) => void;
      variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    }
  | {
      type: "select";
      label: string;
      icon?: React.ComponentType<{ className?: string }>;
      placeholder?: string;
      options: { label: string; value: string }[];
      action: (selectedItems: T[], value: string) => void;
    };

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  bulkActions?: BulkAction<T>[];
  itemsPerPageOptions?: number[];
  defaultItemsPerPage?: number;
  showPagination?: boolean;
  getRowKey: (item: T) => string;
  className?: string;
  expandable?: {
    render: (item: T) => React.ReactNode;
    expandIcon?: React.ReactNode;
    collapseIcon?: React.ReactNode;
  };
  onRowClick?: (item: T) => void;
  defaultExpandAll?: boolean;
  compact?: boolean;
  tableId?: string;
  renderBulkActions?: (params: {
    selectedRows: Set<string>;
    selectedItems: T[];
    bulkActions: BulkAction<T>[];
  }) => React.ReactNode;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T>({
  data,
  columns,
  bulkActions,
  itemsPerPageOptions = [10, 20, 50, 100],
  defaultItemsPerPage = 20,
  showPagination = true,
  getRowKey,
  className,
  expandable,
  onRowClick,
  defaultExpandAll = false,
  compact = false,
  tableId,
  renderBulkActions,
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => {
    // Initialize with all rows expanded if defaultExpandAll is true
    if (defaultExpandAll && expandable) {
      return new Set(data.map(item => getRowKey(item)));
    }
    return new Set();
  });
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    return new Set(columns.map(col => col.key));
  });
  
  // Track previous defaultExpandAll to only update when it changes
  const prevDefaultExpandAll = useRef(defaultExpandAll);
  
  // Effect to handle external expand/collapse all
  useEffect(() => {
    // Only update if defaultExpandAll actually changed
    if (expandable && defaultExpandAll !== prevDefaultExpandAll.current) {
      if (defaultExpandAll) {
        // Expand all rows
        const allKeys = new Set(data.map(item => getRowKey(item)));
        setExpandedRows(allKeys);
      } else {
        // Collapse all rows
        setExpandedRows(new Set());
      }
      prevDefaultExpandAll.current = defaultExpandAll;
    }
  }, [defaultExpandAll, data, expandable, getRowKey]);

  // Load column visibility from localStorage on mount
  useEffect(() => {
    if (tableId) {
      const storageKey = `datatable-columns-${tableId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const columnKeys = JSON.parse(stored) as string[];
          const validKeys = columnKeys.filter(key => 
            columns.some(col => col.key === key)
          );
          if (validKeys.length > 0) {
            setVisibleColumns(new Set(validKeys));
          }
        } catch (e) {
          console.error('Failed to load column visibility settings', e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  // Save column visibility to localStorage when it changes
  useEffect(() => {
    if (tableId) {
      const storageKey = `datatable-columns-${tableId}`;
      const columnKeys = Array.from(visibleColumns);
      localStorage.setItem(storageKey, JSON.stringify(columnKeys));
    }
  }, [visibleColumns, tableId]);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    const column = columns.find(col => col.key === sortColumn);
    const sortKey = column?.sortKey || sortColumn;

    return [...data].sort((a, b) => {
      // Get nested property value using dot notation (e.g., "customer.name")
      const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
      };

      let aValue = getNestedValue(a, sortKey);
      let bValue = getNestedValue(b, sortKey);

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Convert to comparable types
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue === bValue) return 0;
      
      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });
  }, [data, sortColumn, sortDirection, columns]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, itemsPerPage, showPagination]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = new Set(paginatedData.map(item => getRowKey(item)));
      setSelectedRows(allKeys);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    setSelectedRows(newSelected);
  };

  const handleToggleExpand = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const handleToggleColumn = (columnKey: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(columnKey)) {
      newVisible.delete(columnKey);
    } else {
      newVisible.add(columnKey);
    }
    setVisibleColumns(newVisible);
  };

  // Filter columns based on visibility
  const displayColumns = columns.filter(col => visibleColumns.has(col.key));

  const isAllSelected = paginatedData.length > 0 && 
    paginatedData.every(item => selectedRows.has(getRowKey(item)));
  
  const isPartiallySelected = paginatedData.some(item => selectedRows.has(getRowKey(item))) && 
    !isAllSelected;

  // Sort handler
  const handleSort = (columnKey: string) => {
    if (!columns.find(col => col.key === columnKey)?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  // Bulk action handlers
  const handleBulkActionButton = (action: (selectedItems: T[]) => void) => {
    const selectedItems = data.filter(item => selectedRows.has(getRowKey(item)));
    action(selectedItems);
    setSelectedRows(new Set());
  };

  const handleBulkActionSelect = (action: (selectedItems: T[], value: string) => void, value: string) => {
    const selectedItems = data.filter(item => selectedRows.has(getRowKey(item)));
    action(selectedItems, value);
    setSelectedRows(new Set());
  };

  // Reset pagination when items per page changes
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="ml-2 h-4 w-4" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="ml-2 h-4 w-4" />;
    }
    return <ChevronDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className={cn(className)}>
      {/* Bulk Actions - Only render here if not using custom render prop */}
      {bulkActions && !renderBulkActions && (
        <div className={cn(
          "transition-all duration-200",
          selectedRows.size > 0 ? "mb-4" : "mb-0"
        )}>
          {selectedRows.size > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="font-medium">
                  {selectedRows.size} selected
                </Badge>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-2 flex-wrap">
                  {bulkActions.map((action, index) => {
                    if (action.type === "select") {
                      return (
                        <Select
                          key={index}
                          onValueChange={(value) => handleBulkActionSelect(action.action, value)}
                        >
                          <SelectTrigger className="h-7 w-auto min-w-[160px] text-xs justify-start">
                            <SelectValue placeholder={action.placeholder || action.label} />
                          </SelectTrigger>
                          <SelectContent align="start">
                            {action.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    } else {
                      return (
                        <Button
                          key={index}
                          size="sm"
                          variant={action.variant || "ghost"}
                          onClick={() => handleBulkActionButton(action.action)}
                          className="h-7 px-3 text-xs"
                        >
                          {action.label}
                        </Button>
                      );
                    }
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Custom bulk actions rendering */}
      {renderBulkActions && bulkActions && renderBulkActions({
        selectedRows,
        selectedItems: sortedData.filter(item => selectedRows.has(getRowKey(item))),
        bulkActions,
      })}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {bulkActions && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                  />
                </TableHead>
              )}
              {displayColumns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.sortable && "cursor-pointer select-none",
                    compact && "h-8 py-1 px-3",
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={cn(
                    "flex items-center",
                    column.className?.includes("text-right") && "justify-end",
                    column.className?.includes("text-center") && "justify-center"
                  )}>
                    {column.header}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={displayColumns.length + (bulkActions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => {
                const key = getRowKey(item);
                const isSelected = selectedRows.has(key);
                const isExpanded = expandedRows.has(key);
                
                const elements = [
                  <TableRow 
                    key={key}
                    data-state={isSelected && "selected"}
                    className={cn(
                      onRowClick && "cursor-pointer hover:bg-muted/50",
                      isExpanded && "border-b-0"
                    )}
                  >
                    {bulkActions && (
                      <TableCell 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRow(key, !isSelected);
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(key, checked as boolean)}
                          aria-label="Select row"
                          className="translate-y-[2px]"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    {displayColumns.map((column, columnIndex) => {
                      const isLastColumn = columnIndex === displayColumns.length - 1;
                      const cellContent = column.cell ? column.cell(item) : (item as any)[column.key];
                      
                      return (
                        <TableCell 
                          key={column.key} 
                          className={cn(
                            compact && "py-1 px-3",
                            column.className
                          )}
                          onClick={() => onRowClick && onRowClick(item)}
                        >
                          {isLastColumn && expandable ? (
                            <div className={cn(
                              "flex items-center gap-2 w-full",
                              column.className?.includes('text-right') ? 'justify-end' :
                              column.className?.includes('text-center') ? 'justify-center' :
                              'justify-start'
                            )}>
                              {cellContent}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleExpand(key);
                                }}
                                className="h-6 w-6 p-0 flex-shrink-0"
                              >
                                {isExpanded 
                                  ? (expandable.collapseIcon || <ChevronUp className="h-4 w-4" />)
                                  : (expandable.expandIcon || <ChevronDown className="h-4 w-4" />)
                                }
                              </Button>
                            </div>
                          ) : (
                            cellContent
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ];
                
                if (expandable && isExpanded) {
                  elements.push(
                    <TableRow key={`${key}-expanded-1`} className="hover:bg-transparent">
                      <TableCell
                        colSpan={displayColumns.length + (bulkActions ? 1 : 0)}
                        className="bg-white dark:bg-gray-900 p-6 border-l-4 border-l-blue-500"
                      >
                        <div className="relative">
                          {expandable.render(item)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  elements.push(
                    <TableRow key={`${key}-expanded-2`} className="hover:bg-transparent border-b border-gray-200 dark:border-gray-700">
                      <TableCell 
                        colSpan={displayColumns.length + (bulkActions ? 1 : 0)} 
                        className="p-0 h-0"
                      />
                    </TableRow>
                  );
                }
                
                return elements;
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-2">
          {/* Mobile Pagination Info */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              <span className="hidden sm:inline">Showing </span>
              {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, sortedData.length)}
              <span className="hidden sm:inline"> of</span>
              <span className="inline sm:hidden">/</span>
              {" "}{sortedData.length}
            </p>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="h-8 w-[70px] sm:w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}<span className="hidden sm:inline"> / page</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous</span>
            </Button>
            <div className="flex items-center px-2">
              <span className="text-xs sm:text-sm whitespace-nowrap">
                {currentPage}/{totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  data-testid="button-column-visibility"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Column visibility</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={visibleColumns.has(column.key)}
                    onCheckedChange={() => handleToggleColumn(column.key)}
                    data-testid={`checkbox-column-${column.key}`}
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
}
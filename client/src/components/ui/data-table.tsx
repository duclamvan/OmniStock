import * as React from "react";
import { useState, useMemo, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  bulkActions?: {
    label: string;
    action: (selectedItems: T[]) => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  }[];
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
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  
  // Effect to handle external expand/collapse all
  useEffect(() => {
    if (expandable && defaultExpandAll !== undefined) {
      if (defaultExpandAll) {
        // Expand all rows
        const allKeys = new Set(data.map(item => getRowKey(item)));
        setExpandedRows(allKeys);
      } else {
        // Collapse all rows
        setExpandedRows(new Set());
      }
    }
  }, [defaultExpandAll, data, expandable, getRowKey]);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortColumn];
      const bValue = (b as any)[sortColumn];

      if (aValue === bValue) return 0;
      
      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });
  }, [data, sortColumn, sortDirection]);

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

  // Bulk action handler
  const handleBulkAction = (action: (selectedItems: T[]) => void) => {
    const selectedItems = data.filter(item => selectedRows.has(getRowKey(item)));
    action(selectedItems);
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
    <div className={cn("space-y-4", className)}>
      {/* Bulk Actions */}
      {bulkActions && selectedRows.size > 0 && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">
            {selectedRows.size} item{selectedRows.size !== 1 ? 's' : ''} selected
          </span>
          {bulkActions.map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant={action.variant || "outline"}
              onClick={() => handleBulkAction(action.action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {expandable && (
                <TableHead className="w-12">
                  {/* Empty header for expand column */}
                </TableHead>
              )}
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
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.sortable && "cursor-pointer select-none",
                    compact && "h-8 py-1 px-3",
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
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
                  colSpan={columns.length + (bulkActions ? 1 : 0) + (expandable ? 1 : 0)}
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
                    {expandable && (
                      <TableCell className="w-12">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleExpand(key);
                          }}
                        >
                          {isExpanded ? (
                            expandable.collapseIcon || <ChevronUp className="h-4 w-4" />
                          ) : (
                            expandable.expandIcon || <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
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
                    {columns.map((column) => (
                      <TableCell 
                        key={column.key} 
                        className={cn(
                          compact && "py-1 px-3",
                          column.className
                        )}
                        onClick={() => onRowClick && onRowClick(item)}
                      >
                        {column.cell ? column.cell(item) : (item as any)[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ];
                
                if (expandable && isExpanded) {
                  elements.push(
                    <TableRow key={`${key}-expanded-1`} className="hover:bg-transparent">
                      <TableCell
                        colSpan={columns.length + (bulkActions ? 1 : 0) + 1}
                        className="bg-slate-50 dark:bg-slate-900/30 p-6 border-l-4 border-l-blue-500 shadow-inner"
                      >
                        <div className="relative">
                          {expandable.render(item)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  elements.push(
                    <TableRow key={`${key}-expanded-2`} className="hover:bg-transparent border-b-2 border-slate-200 dark:border-slate-700">
                      <TableCell 
                        colSpan={columns.length + (bulkActions ? 1 : 0) + 1} 
                        className="p-0 h-2 bg-gradient-to-b from-slate-50 dark:from-slate-900/30 to-transparent"
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
          </div>
        </div>
      )}
    </div>
  );
}
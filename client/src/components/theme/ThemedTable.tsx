import * as React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { themeClasses } from "@/lib/theme-utils";

const ThemedTable = Table;
ThemedTable.displayName = "ThemedTable";

const ThemedTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <TableHeader
    ref={ref}
    className={cn(themeClasses.table.header, className)}
    {...props}
  />
));
ThemedTableHeader.displayName = "ThemedTableHeader";

const ThemedTableBody = TableBody;
ThemedTableBody.displayName = "ThemedTableBody";

const ThemedTableFooter = TableFooter;
ThemedTableFooter.displayName = "ThemedTableFooter";

const ThemedTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <TableRow
    ref={ref}
    className={cn(themeClasses.table.row, className)}
    {...props}
  />
));
ThemedTableRow.displayName = "ThemedTableRow";

const ThemedTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <TableHead
    ref={ref}
    className={cn(themeClasses.text.secondary, "font-semibold", className)}
    {...props}
  />
));
ThemedTableHead.displayName = "ThemedTableHead";

const ThemedTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <TableCell
    ref={ref}
    className={cn(themeClasses.table.cell, className)}
    {...props}
  />
));
ThemedTableCell.displayName = "ThemedTableCell";

const ThemedTableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <TableCaption
    ref={ref}
    className={cn(themeClasses.text.muted, className)}
    {...props}
  />
));
ThemedTableCaption.displayName = "ThemedTableCaption";

export {
  ThemedTable,
  ThemedTableHeader,
  ThemedTableBody,
  ThemedTableFooter,
  ThemedTableHead,
  ThemedTableRow,
  ThemedTableCell,
  ThemedTableCaption,
};

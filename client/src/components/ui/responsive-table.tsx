import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export function ResponsiveTable({ children, className, ...props }: ResponsiveTableProps) {
  return (
    <div className="mobile-scroll-container">
      <table className={cn("w-full min-w-full", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

interface ResponsiveTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function ResponsiveTableHeader({ children, className, ...props }: ResponsiveTableHeaderProps) {
  return (
    <thead className={cn("bg-gray-50 hidden sm:table-header-group", className)} {...props}>
      {children}
    </thead>
  );
}

interface ResponsiveTableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function ResponsiveTableBody({ children, className, ...props }: ResponsiveTableBodyProps) {
  return (
    <tbody className={cn("block sm:table-row-group", className)} {...props}>
      {children}
    </tbody>
  );
}

interface ResponsiveTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export function ResponsiveTableRow({ children, className, ...props }: ResponsiveTableRowProps) {
  return (
    <tr className={cn("block sm:table-row border-b sm:border-b last:border-b-0 mb-4 sm:mb-0 rounded-lg sm:rounded-none shadow sm:shadow-none bg-white sm:bg-transparent p-4 sm:p-0", className)} {...props}>
      {children}
    </tr>
  );
}

interface ResponsiveTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  mobileLabel?: string;
  priority?: 'primary' | 'secondary' | 'tertiary';
  hideOnMobile?: boolean;
}

export function ResponsiveTableCell({ 
  children, 
  className, 
  mobileLabel,
  priority = 'secondary',
  hideOnMobile = false,
  ...props 
}: ResponsiveTableCellProps) {
  const priorityClasses = {
    primary: 'text-mobile-base font-medium sm:font-normal',
    secondary: 'text-mobile-sm',
    tertiary: 'text-mobile-sm text-gray-500'
  };

  return (
    <td 
      className={cn(
        "block sm:table-cell px-0 sm:px-6 py-2 sm:py-4",
        hideOnMobile && "hidden sm:table-cell",
        priorityClasses[priority],
        className
      )} 
      {...props}
    >
      {mobileLabel && (
        <span className="inline-block sm:hidden font-medium text-gray-700 min-w-[120px] mr-2">
          {mobileLabel}:
        </span>
      )}
      <span className={cn(
        priority === 'primary' && "text-base font-semibold sm:text-sm sm:font-normal"
      )}>
        {children}
      </span>
    </td>
  );
}

interface ResponsiveTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  sortable?: boolean;
}

export function ResponsiveTableHead({ 
  children, 
  className, 
  sortable = false,
  ...props 
}: ResponsiveTableHeadProps) {
  return (
    <th 
      className={cn(
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
        sortable && "cursor-pointer hover:bg-gray-100",
        className
      )} 
      {...props}
    >
      {children}
    </th>
  );
}

// Mobile Card View Component for complex tables
interface MobileCardViewProps {
  items: any[];
  renderCard: (item: any, index: number) => React.ReactNode;
  className?: string;
}

export function MobileCardView({ items, renderCard, className }: MobileCardViewProps) {
  return (
    <div className={cn("sm:hidden space-y-4", className)}>
      {items.map((item, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-4 space-y-2">
          {renderCard(item, index)}
        </div>
      ))}
    </div>
  );
}

// Helper component for mobile-friendly action buttons
interface MobileActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileActions({ children, className }: MobileActionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2 mt-3 sm:mt-0 sm:justify-end", className)}>
      {children}
    </div>
  );
}
# Dark Mode Implementation Guide

## Overview

This guide provides comprehensive instructions for implementing dark mode throughout the Davie Supply WMS application. We've created reusable theme-aware components and utilities to ensure consistency, reduce code duplication, and future-proof our dark mode implementation.

**Current Progress**: 41 of 95+ pages have dark mode implemented (~43%)

---

## Table of Contents

1. [Theme System Architecture](#theme-system-architecture)
2. [Using Themed Components](#using-themed-components)
3. [Theme Utilities Reference](#theme-utilities-reference)
4. [Before/After Examples](#beforeafter-examples)
5. [Guidelines for New Components](#guidelines-for-new-components)
6. [Future-Proofing Checklist](#future-proofing-checklist)
7. [Migration Strategy](#migration-strategy)

---

## Theme System Architecture

### How Dark Mode Works

Our dark mode implementation uses:

1. **Tailwind CSS Dark Mode**: Configured with `darkMode: ["class"]` in `tailwind.config.ts`
2. **CSS Variables**: Defined in `client/src/index.css` with `:root` and `.dark` selectors
3. **Explicit Class Variants**: Every visual property uses both light and dark variants

### Theme Provider

The theme is managed by a ThemeProvider that:
- Toggles the `dark` class on `document.documentElement`
- Syncs theme preference to localStorage
- Provides theme context throughout the app

---

## Using Themed Components

### Import Pattern

```typescript
import { ThemedCard, ThemedBadge, ThemedTable } from '@/components/theme';
```

### ThemedCard

**Purpose**: Wrapper for Card component with automatic theme-aware styling.

**Variants**:
- `default`: White background with standard borders
- `secondary`: Gray background for secondary content
- `elevated`: Enhanced shadow for depth

**Usage**:

```tsx
import { ThemedCard, ThemedCardHeader, ThemedCardTitle, ThemedCardContent } from '@/components/theme';

<ThemedCard variant="default">
  <ThemedCardHeader>
    <ThemedCardTitle>Dashboard Overview</ThemedCardTitle>
  </ThemedCardHeader>
  <ThemedCardContent>
    Your content here
  </ThemedCardContent>
</ThemedCard>
```

### ThemedTable

**Purpose**: Table component with theme-aware headers, rows, and cells.

**Usage**:

```tsx
import {
  ThemedTable,
  ThemedTableHeader,
  ThemedTableBody,
  ThemedTableHead,
  ThemedTableRow,
  ThemedTableCell,
} from '@/components/theme';

<ThemedTable>
  <ThemedTableHeader>
    <ThemedTableRow>
      <ThemedTableHead>Name</ThemedTableHead>
      <ThemedTableHead>Status</ThemedTableHead>
    </ThemedTableRow>
  </ThemedTableHeader>
  <ThemedTableBody>
    <ThemedTableRow>
      <ThemedTableCell>John Doe</ThemedTableCell>
      <ThemedTableCell>Active</ThemedTableCell>
    </ThemedTableRow>
  </ThemedTableBody>
</ThemedTable>
```

### ThemedBadge

**Purpose**: Badge component with theme-aware status colors.

**Variants**: `success`, `error`, `warning`, `info`, `default`

**Usage**:

```tsx
import { ThemedBadge } from '@/components/theme';

<ThemedBadge variant="success">Completed</ThemedBadge>
<ThemedBadge variant="error">Failed</ThemedBadge>
<ThemedBadge variant="warning">Pending</ThemedBadge>
<ThemedBadge variant="info">Processing</ThemedBadge>
<ThemedBadge variant="default">Draft</ThemedBadge>
```

### ThemedEmptyState

**Purpose**: Reusable empty state component with icon, message, and optional action.

**Usage**:

```tsx
import { ThemedEmptyState } from '@/components/theme';
import { PackageX } from 'lucide-react';

<ThemedEmptyState
  icon={PackageX}
  title="No products found"
  description="Get started by adding your first product to the inventory."
  action={{
    label: "Add Product",
    onClick: () => navigate('/inventory/add')
  }}
/>
```

### ThemedStatCard

**Purpose**: Statistics card for dashboard metrics with icon and optional trend indicator.

**Usage**:

```tsx
import { ThemedStatCard } from '@/components/theme';
import { Package } from 'lucide-react';

<ThemedStatCard
  icon={Package}
  label="Total Orders"
  value="1,234"
  change={{
    value: "+12%",
    trend: "up"
  }}
  variant="default"
/>
```

---

## Theme Utilities Reference

### Import

```typescript
import { themeClasses } from '@/lib/theme-utils';
```

### Available Utilities

#### Surface Colors

```typescript
themeClasses.surface.primary    // 'bg-white dark:bg-slate-900'
themeClasses.surface.secondary  // 'bg-gray-50 dark:bg-slate-800'
themeClasses.surface.elevated   // 'bg-white dark:bg-slate-900 shadow-sm dark:shadow-gray-900/50'
themeClasses.surface.card       // 'bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700'
```

#### Text Hierarchy

```typescript
themeClasses.text.primary    // 'text-gray-900 dark:text-gray-100'
themeClasses.text.secondary  // 'text-gray-700 dark:text-gray-300'
themeClasses.text.muted      // 'text-gray-500 dark:text-gray-400'
themeClasses.text.subtle     // 'text-gray-400 dark:text-gray-500'
```

#### Borders

```typescript
themeClasses.border.default   // 'border-gray-200 dark:border-gray-700'
themeClasses.border.subtle    // 'border-gray-100 dark:border-gray-800'
themeClasses.border.emphasis  // 'border-gray-300 dark:border-gray-600'
```

#### Interactive States

```typescript
themeClasses.interactive.hover      // 'hover:bg-gray-100 dark:hover:bg-gray-800'
themeClasses.interactive.hoverCard  // 'hover:bg-gray-50 dark:hover:bg-slate-800'
themeClasses.interactive.active     // 'active:bg-gray-200 dark:active:bg-gray-700'
```

#### Table Styles

```typescript
themeClasses.table.header  // 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
themeClasses.table.row     // 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800'
themeClasses.table.cell    // 'text-gray-900 dark:text-gray-100'
```

#### Badge Variants

```typescript
themeClasses.badge.success  // Green with dark mode variant
themeClasses.badge.error    // Red with dark mode variant
themeClasses.badge.warning  // Yellow with dark mode variant
themeClasses.badge.info     // Blue with dark mode variant
themeClasses.badge.default  // Gray with dark mode variant
```

#### Stat Card Styles

```typescript
themeClasses.stat.icon                 // 'bg-primary/10 dark:bg-primary/20'
themeClasses.stat.change.positive      // 'text-green-600 dark:text-green-400'
themeClasses.stat.change.negative      // 'text-red-600 dark:text-red-400'
themeClasses.stat.change.neutral       // 'text-gray-600 dark:text-gray-400'
```

---

## Before/After Examples

### Example 1: Basic Card

**❌ Before (Manual Dark Mode)**:

```tsx
<Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700">
  <CardHeader>
    <CardTitle className="text-gray-900 dark:text-gray-100">Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-gray-700 dark:text-gray-300">Description text</p>
  </CardContent>
</Card>
```

**✅ After (Themed Component)**:

```tsx
<ThemedCard>
  <ThemedCardHeader>
    <ThemedCardTitle>Title</ThemedCardTitle>
  </ThemedCardHeader>
  <ThemedCardContent>
    <p className={themeClasses.text.secondary}>Description text</p>
  </ThemedCardContent>
</ThemedCard>
```

### Example 2: Status Badges

**❌ Before**:

```tsx
<Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
  Active
</Badge>
```

**✅ After**:

```tsx
<ThemedBadge variant="success">Active</ThemedBadge>
```

### Example 3: Data Table

**❌ Before**:

```tsx
<Table>
  <TableHeader className="bg-gray-50 dark:bg-slate-800">
    <TableRow className="border-gray-200 dark:border-gray-700">
      <TableHead className="text-gray-700 dark:text-gray-300">Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800">
      <TableCell className="text-gray-900 dark:text-gray-100">John</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**✅ After**:

```tsx
<ThemedTable>
  <ThemedTableHeader>
    <ThemedTableRow>
      <ThemedTableHead>Name</ThemedTableHead>
    </ThemedTableRow>
  </ThemedTableHeader>
  <ThemedTableBody>
    <ThemedTableRow>
      <ThemedTableCell>John</ThemedTableCell>
    </ThemedTableRow>
  </ThemedTableBody>
</ThemedTable>
```

### Example 4: Empty State

**❌ Before**:

```tsx
<div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
  <PackageX className="h-8 w-8 text-gray-500 dark:text-gray-400 mb-4" />
  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No items</h3>
  <p className="text-sm text-gray-500 dark:text-gray-400">Add your first item</p>
  <Button onClick={handleAdd}>Add Item</Button>
</div>
```

**✅ After**:

```tsx
<ThemedEmptyState
  icon={PackageX}
  title="No items"
  description="Add your first item"
  action={{ label: "Add Item", onClick: handleAdd }}
/>
```

---

## Guidelines for New Components

### 1. Always Use Themed Components First

Before creating custom styled components, check if a themed component exists:

```tsx
// ✅ Good
import { ThemedCard } from '@/components/theme';

// ❌ Avoid (unless necessary)
import { Card } from '@/components/ui/card';
```

### 2. Use Theme Utilities for Custom Styling

When you need custom styling, use theme utilities:

```tsx
import { themeClasses } from '@/lib/theme-utils';

<div className={cn(
  themeClasses.surface.secondary,
  themeClasses.border.default,
  "rounded-lg p-4"
)}>
  <h3 className={themeClasses.text.primary}>Heading</h3>
  <p className={themeClasses.text.muted}>Description</p>
</div>
```

### 3. Never Use Single-Mode Colors

```tsx
// ❌ Bad - Only works in light mode
<div className="bg-white text-gray-900">

// ✅ Good - Works in both modes
<div className={themeClasses.surface.primary}>
<div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
```

### 4. Test in Both Modes

Always test your components in both light and dark mode:

```tsx
// Toggle dark mode in your browser console:
document.documentElement.classList.toggle('dark');
```

### 5. Maintain Contrast Ratios

Ensure text remains readable in both modes:
- Light mode: Dark text on light backgrounds
- Dark mode: Light text on dark backgrounds
- Minimum contrast ratio: 4.5:1 for normal text (WCAG AA)

---

## Future-Proofing Checklist

Use this checklist when creating or reviewing components:

### Component Creation

- [ ] Used themed components where available
- [ ] Used theme utilities for custom styling
- [ ] All backgrounds have dark mode variants
- [ ] All text colors have dark mode variants
- [ ] All borders have dark mode variants
- [ ] Interactive states (hover, active) work in both modes
- [ ] Icons and images are visible in both modes

### Code Review

- [ ] No hard-coded single-mode colors (e.g., `bg-white` without `dark:` variant)
- [ ] No inline styles that don't respect theme
- [ ] Components use semantic theme utilities
- [ ] Proper TypeScript types for variant props
- [ ] Components are exported from theme index if reusable

### Testing

- [ ] Tested in light mode
- [ ] Tested in dark mode
- [ ] Verified contrast ratios
- [ ] Checked hover/active states
- [ ] Verified on mobile viewport

---

## Migration Strategy

### For Migrating Existing Pages

1. **Identify repetitive patterns**: Look for Cards, Tables, Badges used multiple times
2. **Replace with themed components**: Swap standard components with themed versions
3. **Apply theme utilities**: Use `themeClasses` for remaining custom styles
4. **Test thoroughly**: Verify both light and dark modes work correctly

### Priority Order

Migrate pages in this order:
1. **High-traffic pages**: Dashboard, Orders, Inventory
2. **User-facing pages**: Customer views, Reports
3. **Admin pages**: Settings, System pages
4. **Utilities**: Minor pages and utilities

### Example Migration

```tsx
// Step 1: Replace Card with ThemedCard
- <Card className="bg-white dark:bg-slate-900">
+ <ThemedCard>

// Step 2: Replace Badge with ThemedBadge
- <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
+ <ThemedBadge variant="success">

// Step 3: Apply theme utilities to remaining elements
- <h2 className="text-gray-900 dark:text-gray-100">
+ <h2 className={themeClasses.text.primary}>
```

---

## Best Practices Summary

1. **Consistency**: Always use themed components for consistency
2. **Efficiency**: Theme utilities reduce code duplication
3. **Maintainability**: Centralized theme management
4. **Accessibility**: Proper contrast in both modes
5. **Future-proof**: Easy to update all components from one place

---

## Need Help?

- **Components not working?** Check that you're importing from `@/components/theme`
- **Custom styling needed?** Use `themeClasses` utilities
- **New reusable pattern?** Consider creating a new themed component
- **Questions?** Review this guide or check existing themed component implementations

---

## Resources

- **Theme Utilities**: `client/src/lib/theme-utils.ts`
- **Themed Components**: `client/src/components/theme/`
- **CSS Variables**: `client/src/index.css`
- **Tailwind Config**: `tailwind.config.ts`

---

**Last Updated**: November 14, 2025
**Version**: 1.0.0

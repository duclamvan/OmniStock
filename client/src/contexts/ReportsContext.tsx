import { createContext, useContext, useState, ReactNode } from 'react';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

export type DateRangeType = 'today' | 'week' | 'month' | 'thisMonth' | 'year' | 'lastYear' | 'all' | 'custom';
export type CurrencyFilter = 'all' | 'CZK' | 'EUR' | 'USD';
export type ComparisonPeriod = 'previous' | 'lastYear' | 'none';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportsContextType {
  dateRange: DateRangeType;
  setDateRange: (range: DateRangeType) => void;
  customDateRange: DateRange | null;
  setCustomDateRange: (range: DateRange | null) => void;
  currencyFilter: CurrencyFilter;
  setCurrencyFilter: (currency: CurrencyFilter) => void;
  comparisonPeriod: ComparisonPeriod;
  setComparisonPeriod: (period: ComparisonPeriod) => void;
  getDateRangeValues: () => DateRange;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRangeType>('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('all');
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('previous');

  const getDateRangeValues = (): DateRange => {
    if (dateRange === 'custom' && customDateRange) {
      return customDateRange;
    }

    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: subMonths(now, 1), end: new Date() };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'lastYear':
        const lastYearDate = subYears(now, 1);
        return { start: startOfYear(lastYearDate), end: endOfYear(lastYearDate) };
      default:
        return { start: new Date(0), end: new Date() };
    }
  };

  return (
    <ReportsContext.Provider
      value={{
        dateRange,
        setDateRange,
        customDateRange,
        setCustomDateRange,
        currencyFilter,
        setCurrencyFilter,
        comparisonPeriod,
        setComparisonPeriod,
        getDateRangeValues,
      }}
    >
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
}

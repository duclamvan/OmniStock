import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileText, Calendar } from "lucide-react";
import { useReports, DateRangeType, CurrencyFilter } from "@/contexts/ReportsContext";

interface ReportHeaderProps {
  title: string;
  description?: string;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  showCurrencyFilter?: boolean;
}

export function ReportHeader({
  title,
  description,
  onExportExcel,
  onExportPDF,
  showCurrencyFilter = false,
}: ReportHeaderProps) {
  const { dateRange, setDateRange, currencyFilter, setCurrencyFilter } = useReports();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && (
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeType)}>
          <SelectTrigger className="w-[150px]" data-testid="select-date-range">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        {showCurrencyFilter && (
          <Select value={currencyFilter} onValueChange={(value) => setCurrencyFilter(value as CurrencyFilter)}>
            <SelectTrigger className="w-[120px]" data-testid="select-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Currencies</SelectItem>
              <SelectItem value="CZK">CZK</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        )}

        {onExportExcel && (
          <Button
            onClick={onExportExcel}
            variant="outline"
            size="sm"
            data-testid="button-export-excel"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export XLSX
          </Button>
        )}

        {onExportPDF && (
          <Button
            onClick={onExportPDF}
            variant="outline"
            size="sm"
            data-testid="button-export-pdf"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        )}
      </div>
    </div>
  );
}

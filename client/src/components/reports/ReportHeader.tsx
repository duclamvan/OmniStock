import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { FileDown, FileText, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { useReports, CurrencyFilter, DateRangeType } from "@/contexts/ReportsContext";
import { useTranslation } from 'react-i18next';
import { format } from "date-fns";

interface ReportHeaderProps {
  title: string;
  description?: string;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  showCurrencyFilter?: boolean;
  showDateFilter?: boolean;
}

export function ReportHeader({
  title,
  description,
  onExportExcel,
  onExportPDF,
  showCurrencyFilter = false,
  showDateFilter = false,
}: ReportHeaderProps) {
  const { t } = useTranslation();
  const { t: tReports } = useTranslation('reports');
  const { currencyFilter, setCurrencyFilter, dateRange, setDateRange, customDateRange, setCustomDateRange } = useReports();
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(customDateRange?.start);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(customDateRange?.end);

  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomPickerOpen(true);
    } else {
      setDateRange(value as DateRangeType);
    }
  };

  const applyCustomDateRange = () => {
    if (tempStartDate && tempEndDate) {
      setCustomDateRange({ start: tempStartDate, end: tempEndDate });
      setDateRange('custom');
      setIsCustomPickerOpen(false);
    }
  };

  const getDateRangeLabel = () => {
    if (dateRange === 'custom' && customDateRange) {
      return `${format(customDateRange.start, 'MMM dd')} - ${format(customDateRange.end, 'MMM dd, yyyy')}`;
    }
    switch (dateRange) {
      case 'today': return tReports('today');
      case 'week': return tReports('thisWeek');
      case 'thisMonth': return tReports('thisMonth');
      case 'month': return tReports('lastMonth');
      case 'year': return tReports('thisYear');
      case 'lastYear': return tReports('lastYear');
      case 'all': return tReports('allTime');
      default: return tReports('selectPeriod');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showDateFilter && (
          <Popover open={isCustomPickerOpen} onOpenChange={setIsCustomPickerOpen}>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-[160px]" data-testid="select-date-range">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue>{getDateRangeLabel()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {tReports('today')}
                    </div>
                  </SelectItem>
                  <SelectItem value="week">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {tReports('thisWeek')}
                    </div>
                  </SelectItem>
                  <SelectItem value="thisMonth">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {tReports('thisMonth')}
                    </div>
                  </SelectItem>
                  <SelectItem value="year">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {tReports('thisYear')}
                    </div>
                  </SelectItem>
                  <SelectItem value="lastYear">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {tReports('lastYear')}
                    </div>
                  </SelectItem>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="h-4 w-4" />
                      {tReports('allTime')}
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="h-4 w-4" />
                      {tReports('custom')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PopoverTrigger asChild>
              <span />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">{tReports('startDate')}</Label>
                    <CalendarPicker
                      mode="single"
                      selected={tempStartDate}
                      onSelect={setTempStartDate}
                      className="rounded-md border mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{tReports('endDate')}</Label>
                    <CalendarPicker
                      mode="single"
                      selected={tempEndDate}
                      onSelect={setTempEndDate}
                      className="rounded-md border mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsCustomPickerOpen(false)}>
                    {t('common:cancel')}
                  </Button>
                  <Button size="sm" onClick={applyCustomDateRange} disabled={!tempStartDate || !tempEndDate}>
                    {tReports('selectDates')}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {showCurrencyFilter && (
          <Select value={currencyFilter} onValueChange={(value) => setCurrencyFilter(value as CurrencyFilter)}>
            <SelectTrigger className="w-[120px]" data-testid="select-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common:allCurrencies')}</SelectItem>
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
            {t('common:exportAsXLSX')}
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
            {t('common:exportAsPDF')}
          </Button>
        )}
      </div>
    </div>
  );
}

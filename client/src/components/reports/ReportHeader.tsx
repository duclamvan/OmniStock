import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileText } from "lucide-react";
import { useReports, CurrencyFilter } from "@/contexts/ReportsContext";
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { currencyFilter, setCurrencyFilter } = useReports();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

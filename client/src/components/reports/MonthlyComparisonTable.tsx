import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthlyData } from "@/lib/reportUtils";
import { useTranslation } from 'react-i18next';

interface MonthlyComparisonTableProps {
  title: string;
  data: MonthlyData[];
  formatCurrency?: (value: number, currency?: string) => string;
  testId?: string;
}

export function MonthlyComparisonTable({
  title,
  data,
  formatCurrency = (value) => `${value.toLocaleString()} Kč`,
  testId,
}: MonthlyComparisonTableProps) {
  const { t } = useTranslation();
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const renderChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common:month')}</TableHead>
                <TableHead className="text-right">{t('reports:revenueCZK')}</TableHead>
                <TableHead className="text-right">{t('reports:revenueEUR')}</TableHead>
                <TableHead className="text-right">{t('reports:revenueUSD')}</TableHead>
                <TableHead className="text-right">{t('reports:totalCost')}</TableHead>
                <TableHead className="text-right">{t('reports:profit')}</TableHead>
                <TableHead className="text-right">{t('reports:marginPercent')}</TableHead>
                <TableHead className="text-right">{t('reports:vsPrevious')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((month, index) => {
                const previousMonth = index > 0 ? data[index - 1] : null;
                const profitChange = previousMonth 
                  ? calculateChange(month.profit, previousMonth.profit)
                  : 0;

                const totalCost = month.costCZK + (month.costEUR * 25) + (month.costUSD * 23);

                return (
                  <TableRow key={month.month} data-testid={`${testId}-row-${month.month}`}>
                    <TableCell className="font-medium">{month.monthName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(month.revenueCZK, 'CZK')}</TableCell>
                    <TableCell className="text-right">{month.revenueEUR.toFixed(2)} €</TableCell>
                    <TableCell className="text-right">{month.revenueUSD.toFixed(2)} $</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalCost, 'CZK')}</TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      month.profit >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(month.profit, 'CZK')}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      month.profitMargin >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {month.profitMargin.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {index > 0 && renderChangeIcon(profitChange)}
                        <span className={cn(
                          "text-sm",
                          profitChange > 0 ? "text-green-600" : profitChange < 0 ? "text-red-600" : "text-slate-400"
                        )}>
                          {index > 0 ? `${profitChange >= 0 ? '+' : ''}${profitChange.toFixed(1)}%` : '-'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { LabelContent, type LabelProduct } from "@/components/warehouse/WarehouseLabelPreview";
import {
  ArrowLeft,
  Printer,
  Trash2,
  CheckSquare,
  Square,
  Search,
  Tag,
  Clock,
  Hash,
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WarehouseLabel {
  id: string;
  productId: string;
  productName: string;
  vietnameseName: string | null;
  sku: string | null;
  priceEur: string | null;
  priceCzk: string | null;
  quantity: number;
  lastUsedAt: string;
  printCount: number;
  createdAt: string;
}

export default function WarehouseLabels() {
  const { t } = useTranslation(["inventory", "common"]);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: labels = [], isLoading } = useQuery<WarehouseLabel[]>({
    queryKey: ["/api/warehouse-labels"],
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await apiRequest("POST", "/api/warehouse-labels/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-labels"] });
      setSelectedIds(new Set());
      toast({
        title: t("common:success"),
        description: t("inventory:labelsDeleted"),
      });
    },
    onError: () => {
      toast({
        title: t("common:error"),
        description: t("inventory:labelsDeleteError"),
        variant: "destructive",
      });
    },
  });

  const bulkPrintMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await apiRequest("POST", "/api/warehouse-labels/bulk-print", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-labels"] });
    },
  });

  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) return labels;
    const query = searchQuery.toLowerCase();
    return labels.filter(
      (label) =>
        label.productName.toLowerCase().includes(query) ||
        (label.vietnameseName?.toLowerCase().includes(query)) ||
        (label.sku?.toLowerCase().includes(query))
    );
  }, [labels, searchQuery]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredLabels.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLabels.map((l) => l.id)));
    }
  };

  const handleBulkPrint = async () => {
    if (selectedIds.size === 0) return;

    const selectedLabels = labels.filter((l) => selectedIds.has(l.id));
    
    await bulkPrintMutation.mutateAsync(Array.from(selectedIds));

    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) {
      toast({
        title: t("common:error"),
        description: t("inventory:popupBlocked"),
        variant: "destructive",
      });
      return;
    }

    const labelsHtml = selectedLabels
      .map((label) => {
        const stockUrl = `${window.location.origin}/stock?q=${encodeURIComponent(label.sku || label.productName)}`;
        const vietnameseName = label.vietnameseName || label.productName;
        const priceEur = label.priceEur ? Number(label.priceEur) : null;
        const priceCzk = label.priceCzk ? Number(label.priceCzk) : null;

        return `
          <div class="label-container">
            <div class="qr-section">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="90" height="90">
                <rect width="45" height="45" fill="white"/>
                <text x="22.5" y="22.5" text-anchor="middle" dominant-baseline="middle" font-size="6">QR</text>
                <text x="22.5" y="30" text-anchor="middle" font-size="4">${label.sku || ""}</text>
              </svg>
            </div>
            <div class="name-section">
              <span class="vn-name">${vietnameseName}</span>
              <span class="en-name">${label.productName}</span>
              ${label.sku ? `<span class="sku">${label.sku}</span>` : ""}
            </div>
            <div class="price-section">
              ${priceEur !== null ? `<span class="price-eur">€${priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>` : ""}
              ${priceCzk !== null ? `<span class="price-czk">${priceCzk.toLocaleString("cs-CZ")} Kč</span>` : ""}
              ${priceEur === null && priceCzk === null ? `<span class="price-na">N/A</span>` : ""}
            </div>
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Warehouse Labels - Bulk Print</title>
        <style>
          @page {
            size: 100mm 30mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
          }
          .label-container {
            width: 100mm;
            height: 30mm;
            display: flex;
            flex-direction: row;
            align-items: stretch;
            background: white;
            color: black;
            overflow: hidden;
            page-break-after: always;
          }
          .label-container:last-child {
            page-break-after: auto;
          }
          .qr-section {
            flex-shrink: 0;
            width: 26mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1mm;
          }
          .qr-section svg {
            width: 24mm;
            height: 24mm;
          }
          .name-section {
            flex: 1;
            padding: 1mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            min-width: 0;
            border-left: 0.5pt solid #e5e7eb;
          }
          .vn-name {
            font-weight: bold;
            font-size: 11pt;
            line-height: 1.2;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .en-name {
            font-size: 9pt;
            line-height: 1.2;
            color: #374151;
            margin-top: 0.5mm;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .sku {
            font-size: 7pt;
            color: #6b7280;
            margin-top: 1mm;
            font-family: monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .price-section {
            flex-shrink: 0;
            width: 22mm;
            padding: 1mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: flex-end;
            text-align: right;
            border-left: 0.5pt solid #e5e7eb;
          }
          .price-eur {
            font-weight: bold;
            font-size: 13pt;
            line-height: 1.2;
            color: #15803d;
          }
          .price-czk {
            font-size: 10pt;
            line-height: 1.2;
            color: #1d4ed8;
            margin-top: 0.5mm;
          }
          .price-na {
            font-size: 9pt;
            color: #9ca3af;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 100);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
    setShowDeleteConfirm(false);
  };

  const labelToProduct = (label: WarehouseLabel): LabelProduct => ({
    id: label.productId,
    name: label.productName,
    vietnameseName: label.vietnameseName,
    sku: label.sku,
    priceEur: label.priceEur,
    priceCzk: label.priceCzk,
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link href="/stock">
              <Button variant="ghost" size="icon" data-testid="btn-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              <Tag className="inline h-5 w-5 mr-2" />
              {t("inventory:warehouseLabels")}
            </h1>
            <Badge variant="secondary" className="ml-2">
              {labels.length} {t("inventory:labels")}
            </Badge>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t("inventory:searchLabels")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-labels"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            className="gap-2"
            data-testid="btn-select-all"
          >
            {selectedIds.size === filteredLabels.length && filteredLabels.length > 0 ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedIds.size === filteredLabels.length && filteredLabels.length > 0
              ? t("common:deselectAll")
              : t("common:selectAll")}
          </Button>

          {selectedIds.size > 0 && (
            <>
              <Badge variant="default" className="px-3 py-1">
                {selectedIds.size} {t("common:selected")}
              </Badge>
              <Button
                size="sm"
                onClick={handleBulkPrint}
                disabled={bulkPrintMutation.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700"
                data-testid="btn-bulk-print"
              >
                <Printer className="h-4 w-4" />
                {t("inventory:printSelected")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={bulkDeleteMutation.isPending}
                className="gap-2"
                data-testid="btn-bulk-delete"
              >
                <Trash2 className="h-4 w-4" />
                {t("common:delete")}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredLabels.length === 0 ? (
          <Card className="p-8 text-center">
            <Tag className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? t("inventory:noLabelsFound") : t("inventory:noLabelsYet")}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {t("inventory:generateLabelsHint")}
            </p>
          </Card>
        ) : (
          filteredLabels.map((label) => (
            <Card
              key={label.id}
              className={`transition-all ${
                selectedIds.has(label.id)
                  ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : ""
              }`}
              data-testid={`card-label-${label.id}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(label.id)}
                    onCheckedChange={() => toggleSelect(label.id)}
                    className="mt-1"
                    data-testid={`checkbox-label-${label.id}`}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {label.vietnameseName || label.productName}
                      </span>
                      {label.vietnameseName && label.vietnameseName !== label.productName && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          ({label.productName})
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      {label.sku && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {label.sku}
                        </Badge>
                      )}
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {t("inventory:printedTimes", { count: label.printCount })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(label.lastUsedAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-sm">
                      {label.priceEur && (
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          €{Number(label.priceEur).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {label.priceCzk && (
                        <span className="font-medium text-blue-700 dark:text-blue-400">
                          {Number(label.priceCzk).toLocaleString("cs-CZ")} Kč
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inventory:deleteLabelsTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("inventory:deleteLabelsConfirm", { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

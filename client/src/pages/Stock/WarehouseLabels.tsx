import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LabelContent, type LabelProduct } from "@/components/warehouse/WarehouseLabelPreview";
import { generateProductQRUrl } from "@shared/qrUtils";
import QRCode from "qrcode";
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
  FileText,
  Loader2,
  Layers,
  ArrowUpDown,
  SortAsc,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  barcode: string | null;
  quantity: number;
  locationCode: string | null;
}

export default function WarehouseLabels() {
  const { t } = useTranslation(["inventory", "common"]);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<"saved" | "all">("all");
  const [includeVariantsFor, setIncludeVariantsFor] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "abc" | "variants">("newest");

  const { data: labels = [], isLoading } = useQuery<WarehouseLabel[]>({
    queryKey: ["/api/warehouse-labels"],
  });

  const { data: allProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  // Fetch variants for all products to determine which have variants
  const variantQueries = useQueries({
    queries: allProducts.map((product: any) => ({
      queryKey: ["/api/products", product.id, "variants"],
      queryFn: async () => {
        const response = await fetch(`/api/products/${product.id}/variants`, {
          credentials: "include",
        });
        if (!response.ok) return [];
        return response.json();
      },
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      enabled: !!product.id,
    })),
  });

  // Build a map of productId -> variants
  const variantsMap = useMemo(() => {
    const map = new Map<string, ProductVariant[]>();
    allProducts.forEach((product: any, index: number) => {
      const query = variantQueries[index];
      if (query?.data && Array.isArray(query.data) && query.data.length > 0) {
        map.set(product.id, query.data);
      }
    });
    return map;
  }, [allProducts, variantQueries]);

  const [generatingAll, setGeneratingAll] = useState(false);
  const [printingSelected, setPrintingSelected] = useState(false);

  const toggleIncludeVariants = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(includeVariantsFor);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setIncludeVariantsFor(newSet);
  };

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

  const filteredProducts = useMemo(() => {
    let products = allProducts;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        (product: any) =>
          product.name?.toLowerCase().includes(query) ||
          (product.vietnameseName?.toLowerCase().includes(query)) ||
          (product.sku?.toLowerCase().includes(query))
      );
    }
    
    // Sort products
    return [...products].sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest":
          // Sort by ID descending (higher ID = newer)
          return Number(b.id) - Number(a.id);
        case "oldest":
          // Sort by ID ascending (lower ID = older)
          return Number(a.id) - Number(b.id);
        case "abc":
          // Sort alphabetically by Vietnamese name or name
          const nameA = (a.vietnameseName || a.name || "").toLowerCase();
          const nameB = (b.vietnameseName || b.name || "").toLowerCase();
          return nameA.localeCompare(nameB, "vi");
        case "variants":
          // Products with variants first
          const hasVariantsA = variantsMap.has(a.id) ? 1 : 0;
          const hasVariantsB = variantsMap.has(b.id) ? 1 : 0;
          if (hasVariantsB !== hasVariantsA) return hasVariantsB - hasVariantsA;
          // Secondary sort by ID descending (newest)
          return Number(b.id) - Number(a.id);
        default:
          return 0;
      }
    });
  }, [allProducts, searchQuery, sortBy, variantsMap]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleProductSelect = (id: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProductIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredLabels.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLabels.map((l) => l.id)));
    }
  };

  const selectAllProducts = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map((p: any) => p.id)));
    }
  };

  const printProductLabels = async (products: any[], title: string) => {
    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) {
      toast({
        title: t("common:error"),
        description: t("inventory:popupBlocked"),
        variant: "destructive",
      });
      return;
    }

    // Generate QR codes for all products in parallel
    const labelsWithQR = await Promise.all(
      products.map(async (product: any) => {
        const productCode = product.sku || product.barcode || product.id;
        const qrUrl = generateProductQRUrl("https://wms.davie.shop", productCode);
        const vietnameseName = product.vietnameseName || product.name;
        const priceEur = product.priceEur ? Number(product.priceEur) : null;
        const priceCzk = product.priceCzk ? Number(product.priceCzk) : null;

        // Generate actual QR code SVG
        let qrSvg = "";
        try {
          qrSvg = await QRCode.toString(qrUrl, { 
            type: "svg",
            margin: 0,
            width: 72,
            errorCorrectionLevel: "M"
          });
        } catch (err) {
          console.error("Failed to generate QR code for", productCode, err);
          // Fallback to placeholder if QR generation fails
          qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="72" height="72">
            <rect width="45" height="45" fill="white"/>
            <text x="22.5" y="22.5" text-anchor="middle" dominant-baseline="middle" font-size="6">QR</text>
          </svg>`;
        }

        return `
          <div class="label-container">
            <div class="qr-section">
              ${qrSvg}
            </div>
            <div class="name-section">
              <div class="vn-name">${vietnameseName}</div>
              <div class="en-name">${product.name}</div>
              ${product.sku ? `<div class="sku">${product.sku}</div>` : ""}
            </div>
            <div class="price-section">
              ${priceEur !== null ? `<div class="price-eur-row"><span class="price-eur">€${priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ""}
              ${priceCzk !== null ? `<div class="price-czk-row"><span class="price-czk">${priceCzk.toLocaleString("cs-CZ")} Kč</span></div>` : ""}
              ${priceEur === null && priceCzk === null ? `<div class="price-czk-row"><span class="price-na">N/A</span></div>` : ""}
            </div>
          </div>
        `;
      })
    );

    const labelsHtml = labelsWithQR.join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @page {
            size: 100mm 30mm;
            margin: 0;
          }
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
          }
          .label-container {
            width: 100mm;
            height: 30mm;
            display: flex;
            flex-direction: row;
            align-items: stretch;
            background: white !important;
            color: black;
            overflow: hidden;
            border: 2pt solid black;
            page-break-after: always;
          }
          .label-container:last-child {
            page-break-after: auto;
          }
          .qr-section {
            flex-shrink: 0;
            width: 22mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5mm;
            background: white;
            border-right: 2pt solid black;
          }
          .qr-section svg {
            width: 19mm;
            height: 19mm;
          }
          .name-section {
            flex: 1;
            padding: 1.5mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            min-width: 0;
            background: white;
          }
          .vn-name {
            font-weight: 900;
            font-size: 10pt;
            line-height: 1.2;
            text-transform: uppercase;
            word-break: break-word;
            letter-spacing: -0.3pt;
          }
          .en-name {
            font-size: 9pt;
            font-weight: 500;
            line-height: 1.2;
            color: #1f2937;
            margin-top: 1mm;
            word-break: break-word;
          }
          .sku {
            font-size: 8pt;
            line-height: 1.1;
            color: black;
            margin-top: 1mm;
            font-family: monospace;
            font-weight: bold;
            background: #f3f4f6;
            padding: 0.5mm 1mm;
            display: inline-block;
          }
          .price-section {
            flex-shrink: 0;
            width: 26mm;
            display: flex;
            flex-direction: column;
            border-left: 2pt solid black;
          }
          .price-eur-row {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: black !important;
          }
          .price-czk-row {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white !important;
            border-top: 1pt solid black;
          }
          .price-eur {
            font-weight: 900;
            font-size: 14pt;
            line-height: 1;
            color: white;
            letter-spacing: -0.3pt;
          }
          .price-czk {
            font-weight: bold;
            font-size: 12pt;
            line-height: 1;
            color: black;
            letter-spacing: -0.3pt;
          }
          .price-na {
            font-size: 10pt;
            color: #6b7280;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handlePrintSelectedProducts = async () => {
    if (selectedProductIds.size === 0) return;

    setPrintingSelected(true);
    let savedCount = 0;
    const failedProducts: string[] = [];
    
    try {
      const selectedProducts = allProducts.filter((p: any) => selectedProductIds.has(p.id));
      
      // Build list of items to print (products or their variants if enabled)
      const itemsToPrint: any[] = [];
      
      for (const product of selectedProducts) {
        // Check if variants are enabled for this product
        if (includeVariantsFor.has(product.id)) {
          // Only print variants, skip parent product
          const variants = variantsMap.get(product.id) || [];
          for (const variant of variants) {
            itemsToPrint.push({
              ...product,
              id: variant.id,
              name: `${product.name} - ${variant.name}`,
              vietnameseName: product.vietnameseName ? `${product.vietnameseName} - ${variant.name}` : `${product.name} - ${variant.name}`,
              sku: variant.barcode || product.sku,
              isVariant: true,
              variantName: variant.name,
            });
          }
        } else {
          // Add the parent product only
          itemsToPrint.push(product);
        }
        
        try {
          await apiRequest("POST", "/api/warehouse-labels", {
            productId: product.id,
            productName: product.name,
            vietnameseName: product.vietnameseName || product.name,
            sku: product.sku || null,
            priceEur: product.priceEur ? String(product.priceEur) : null,
            priceCzk: product.priceCzk ? String(product.priceCzk) : null,
          });
          savedCount++;
        } catch (err) {
          console.error(`Failed to save label for ${product.name}:`, err);
          failedProducts.push(product.name || product.sku || product.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-labels"] });
      
      // Still print labels even if some failed to save
      await printProductLabels(itemsToPrint, `Labels - ${itemsToPrint.length} Items`);
      
      if (failedProducts.length > 0) {
        toast({
          title: t("inventory:labelsPrintedWithErrors"),
          description: t("inventory:labelsSaveFailedSome", { 
            saved: savedCount, 
            failed: failedProducts.length,
            products: failedProducts.slice(0, 3).join(", ") + (failedProducts.length > 3 ? "..." : "")
          }),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("common:success"),
          description: t("inventory:labelsPrinted", { count: selectedProducts.length }),
        });
      }
    } catch (error: any) {
      console.error("Failed to print labels:", error);
      const errorMessage = error?.message || error?.fullResponse?.message || t("inventory:generateLabelsError");
      toast({
        title: t("common:error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPrintingSelected(false);
    }
  };

  const handlePrintAllProducts = async () => {
    if (allProducts.length === 0) {
      toast({
        title: t("common:error"),
        description: t("inventory:noProductsInStock"),
        variant: "destructive",
      });
      return;
    }

    setGeneratingAll(true);
    let savedCount = 0;
    const failedProducts: string[] = [];

    try {
      // Build list of items to print (products or their variants if enabled)
      const itemsToPrint: any[] = [];
      
      for (const product of allProducts) {
        // Check if variants are enabled for this product
        if (includeVariantsFor.has(product.id)) {
          // Only print variants, skip parent product
          const variants = variantsMap.get(product.id) || [];
          for (const variant of variants) {
            itemsToPrint.push({
              ...product,
              id: variant.id,
              name: `${product.name} - ${variant.name}`,
              vietnameseName: product.vietnameseName ? `${product.vietnameseName} - ${variant.name}` : `${product.name} - ${variant.name}`,
              sku: variant.barcode || product.sku,
              isVariant: true,
              variantName: variant.name,
            });
          }
        } else {
          // Add the parent product only
          itemsToPrint.push(product);
        }
        
        try {
          await apiRequest("POST", "/api/warehouse-labels", {
            productId: product.id,
            productName: product.name,
            vietnameseName: product.vietnameseName || product.name,
            sku: product.sku || null,
            priceEur: product.priceEur ? String(product.priceEur) : null,
            priceCzk: product.priceCzk ? String(product.priceCzk) : null,
          });
          savedCount++;
        } catch (err) {
          console.error(`Failed to save label for ${product.name}:`, err);
          failedProducts.push(product.name || product.sku || product.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-labels"] });
      
      // Still print labels even if some failed to save
      await printProductLabels(itemsToPrint, "All Product Labels");

      if (failedProducts.length > 0) {
        toast({
          title: t("inventory:labelsPrintedWithErrors"),
          description: t("inventory:labelsSaveFailedSome", { 
            saved: savedCount, 
            failed: failedProducts.length,
            products: failedProducts.slice(0, 3).join(", ") + (failedProducts.length > 3 ? "..." : "")
          }),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("common:success"),
          description: t("inventory:allLabelsGenerated", { count: itemsToPrint.length }),
        });
      }
    } catch (error: any) {
      console.error("Failed to generate all labels:", error);
      const errorMessage = error?.message || error?.fullResponse?.message || t("inventory:generateLabelsError");
      toast({
        title: t("common:error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGeneratingAll(false);
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

    // Generate QR codes for all labels in parallel
    const labelsWithQR = await Promise.all(
      selectedLabels.map(async (label) => {
        const productCode = label.sku || label.productId;
        const qrUrl = generateProductQRUrl("https://wms.davie.shop", productCode);
        const vietnameseName = label.vietnameseName || label.productName;
        const priceEur = label.priceEur ? Number(label.priceEur) : null;
        const priceCzk = label.priceCzk ? Number(label.priceCzk) : null;

        // Generate actual QR code SVG
        let qrSvg = "";
        try {
          qrSvg = await QRCode.toString(qrUrl, { 
            type: "svg",
            margin: 0,
            width: 72,
            errorCorrectionLevel: "M"
          });
        } catch (err) {
          console.error("Failed to generate QR code for", productCode, err);
          qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="72" height="72">
            <rect width="45" height="45" fill="white"/>
            <text x="22.5" y="22.5" text-anchor="middle" dominant-baseline="middle" font-size="6">QR</text>
          </svg>`;
        }

        return `
          <div class="label-container">
            <div class="qr-section">
              ${qrSvg}
            </div>
            <div class="name-section">
              <div class="vn-name">${vietnameseName}</div>
              <div class="en-name">${label.productName}</div>
              ${label.sku ? `<div class="sku">${label.sku}</div>` : ""}
            </div>
            <div class="price-section">
              ${priceEur !== null ? `<div class="price-eur-row"><span class="price-eur">€${priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ""}
              ${priceCzk !== null ? `<div class="price-czk-row"><span class="price-czk">${priceCzk.toLocaleString("cs-CZ")} Kč</span></div>` : ""}
              ${priceEur === null && priceCzk === null ? `<div class="price-czk-row"><span class="price-na">N/A</span></div>` : ""}
            </div>
          </div>
        `;
      })
    );

    const labelsHtml = labelsWithQR.join("");

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
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
          }
          .label-container {
            width: 100mm;
            height: 30mm;
            display: flex;
            flex-direction: row;
            align-items: stretch;
            background: white !important;
            color: black;
            overflow: hidden;
            border: 2pt solid black;
            page-break-after: always;
          }
          .label-container:last-child {
            page-break-after: auto;
          }
          .qr-section {
            flex-shrink: 0;
            width: 22mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5mm;
            background: white;
            border-right: 2pt solid black;
          }
          .qr-section svg {
            width: 19mm;
            height: 19mm;
          }
          .name-section {
            flex: 1;
            padding: 1.5mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            min-width: 0;
            background: white;
          }
          .vn-name {
            font-weight: 900;
            font-size: 10pt;
            line-height: 1.2;
            text-transform: uppercase;
            word-break: break-word;
            letter-spacing: -0.3pt;
          }
          .en-name {
            font-size: 9pt;
            font-weight: 500;
            line-height: 1.2;
            color: #1f2937;
            margin-top: 1mm;
            word-break: break-word;
          }
          .sku {
            font-size: 8pt;
            line-height: 1.1;
            color: black;
            margin-top: 1mm;
            font-family: monospace;
            font-weight: bold;
            background: #f3f4f6;
            padding: 0.5mm 1mm;
            display: inline-block;
          }
          .price-section {
            flex-shrink: 0;
            width: 26mm;
            display: flex;
            flex-direction: column;
            border-left: 2pt solid black;
          }
          .price-eur-row {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: black !important;
          }
          .price-czk-row {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white !important;
            border-top: 1pt solid black;
          }
          .price-eur {
            font-weight: 900;
            font-size: 14pt;
            line-height: 1;
            color: white;
            letter-spacing: -0.3pt;
          }
          .price-czk {
            font-weight: bold;
            font-size: 12pt;
            line-height: 1;
            color: black;
            letter-spacing: -0.3pt;
          }
          .price-na {
            font-size: 10pt;
            color: #6b7280;
            font-weight: 500;
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

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t("inventory:searchLabels")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-labels"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[140px]" data-testid="select-sort">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("inventory:sortNewest")}</SelectItem>
              <SelectItem value="oldest">{t("inventory:sortOldest")}</SelectItem>
              <SelectItem value="abc">{t("inventory:sortAbc")}</SelectItem>
              <SelectItem value="variants">{t("inventory:sortVariants")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintAllProducts}
            disabled={generatingAll || productsLoading}
            className="gap-2"
            data-testid="btn-print-all-labels"
          >
            {generatingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {generatingAll 
              ? t("inventory:generatingLabels")
              : t("inventory:printAllLabels")}
            {!generatingAll && allProducts.length > 0 && (
              <Badge variant="secondary" className="ml-1">{allProducts.length}</Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={selectAllProducts}
            className="gap-2"
            data-testid="btn-select-all-products"
          >
            {selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0 ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0
              ? t("common:deselectAll")
              : t("common:selectAll")}
          </Button>

          {selectedProductIds.size > 0 && (
            <>
              <Badge variant="default" className="px-3 py-1">
                {selectedProductIds.size} {t("common:selected")}
              </Badge>
              <Button
                size="sm"
                onClick={handlePrintSelectedProducts}
                disabled={printingSelected}
                className="gap-2 bg-green-600 hover:bg-green-700"
                data-testid="btn-print-selected-products"
              >
                {printingSelected ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {t("inventory:printSelected")}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredProducts.length === 0 ? (
          <Card className="p-8 text-center">
            <Tag className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? t("inventory:noProductsFound") : t("inventory:noProductsInStock")}
            </p>
          </Card>
        ) : (
          filteredProducts.map((product: any) => (
            <Card
              key={product.id}
              className={`transition-all cursor-pointer ${
                selectedProductIds.has(product.id)
                  ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : ""
              }`}
              onClick={() => toggleProductSelect(product.id)}
              data-testid={`card-product-${product.id}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedProductIds.has(product.id)}
                    onCheckedChange={() => toggleProductSelect(product.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                    data-testid={`checkbox-product-${product.id}`}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {product.vietnameseName || product.name}
                      </span>
                      {product.vietnameseName && product.vietnameseName !== product.name && (
                        <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400 truncate">
                          ({product.name})
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      {product.sku && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {product.sku}
                        </Badge>
                      )}
                      {product.quantity !== undefined && (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {product.quantity} {t("common:inStock")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-sm">
                      {product.priceEur && (
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          €{Number(product.priceEur).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {product.priceCzk && (
                        <span className="font-medium text-blue-700 dark:text-blue-400">
                          {Number(product.priceCzk).toLocaleString("cs-CZ")} Kč
                        </span>
                      )}
                    </div>

                    {/* Variants toggle - only show for products with variants */}
                    {variantsMap.has(product.id) && (
                      <div 
                        className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Switch
                          id={`include-variants-${product.id}`}
                          checked={includeVariantsFor.has(product.id)}
                          onCheckedChange={() => {
                            const newSet = new Set(includeVariantsFor);
                            if (newSet.has(product.id)) {
                              newSet.delete(product.id);
                            } else {
                              newSet.add(product.id);
                            }
                            setIncludeVariantsFor(newSet);
                          }}
                          data-testid={`switch-include-variants-${product.id}`}
                        />
                        <Label 
                          htmlFor={`include-variants-${product.id}`}
                          className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer flex items-center gap-1"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          {t("inventory:includeVariants")}
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {variantsMap.get(product.id)?.length || 0}
                          </Badge>
                        </Label>
                      </div>
                    )}
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

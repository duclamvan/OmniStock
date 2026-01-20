import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, X, Loader2, Package, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrinter } from "@/hooks/usePrinter";
import { useToast } from "@/hooks/use-toast";
import { generateProductQRUrl } from "@shared/qrUtils";
import QRCode from "qrcode";

export interface VariantLabelItem {
  id: string;
  name: string;
  vietnameseName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  priceEur?: number | string | null;
  priceCzk?: number | string | null;
  imageUrl?: string | null;
}

interface BatchVariantLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variants: VariantLabelItem[];
  productName: string;
  productVietnameseName?: string | null;
}

export default function BatchVariantLabelDialog({
  open,
  onOpenChange,
  variants,
  productName,
  productVietnameseName,
}: BatchVariantLabelDialogProps) {
  const { t } = useTranslation(["inventory", "common"]);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [labelSize, setLabelSize] = useState<"small" | "large">("small");
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set(variants.map(v => v.id)));
  const [isPrinting, setIsPrinting] = useState(false);
  const { printLabelHTML, canDirectPrint } = usePrinter({ context: 'warehouse_label_printer' });

  useEffect(() => {
    if (open) {
      setSelectedVariants(new Set(variants.map(v => v.id)));
    }
  }, [open, variants]);

  const toggleVariant = (variantId: string) => {
    setSelectedVariants(prev => {
      const next = new Set(prev);
      if (next.has(variantId)) {
        next.delete(variantId);
      } else {
        next.add(variantId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedVariants(new Set(variants.map(v => v.id)));
  };

  const deselectAll = () => {
    setSelectedVariants(new Set());
  };

  const generateLabelHtml = async (variant: VariantLabelItem, size: "small" | "large") => {
    const productCode = variant.sku || variant.barcode || variant.id;
    const qrUrl = generateProductQRUrl("https://wms.davie.shop", productCode);
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: size === "large" ? 140 : 90, margin: 0 });
    
    const vietnameseName = variant.vietnameseName || variant.name;
    const englishName = variant.name;
    const priceEur = variant.priceEur ? Number(variant.priceEur) : null;
    const priceCzk = variant.priceCzk ? Number(variant.priceCzk) : null;

    if (size === "large") {
      return `
        <div style="width:148mm;height:105mm;border:3pt solid black;display:grid;grid-template-columns:30mm 1fr;grid-template-rows:1fr 24mm;background:white;color:black;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;page-break-after:always;">
          <div style="grid-row:1/3;border-right:2pt solid black;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3mm;gap:2mm;">
            <img src="${qrDataUrl}" width="70" height="70" />
            <div style="font-size:9pt;font-weight:900;font-family:monospace;text-align:center;word-break:break-all;padding:1.5mm 2mm;background:black;color:white;width:100%;">${variant.sku || productCode}</div>
          </div>
          <div style="padding:4mm 5mm 3mm 5mm;display:flex;flex-direction:column;justify-content:center;gap:2mm;overflow:hidden;">
            <div style="font-weight:900;font-size:28pt;line-height:1.0;text-transform:uppercase;letter-spacing:-1pt;word-break:break-word;">${vietnameseName}</div>
            ${vietnameseName !== englishName ? `<div style="font-size:16pt;font-weight:600;line-height:1.1;letter-spacing:0.5pt;text-transform:uppercase;opacity:0.7;word-break:break-word;border-top:1pt solid black;padding-top:2mm;margin-top:1mm;">${englishName}</div>` : ''}
          </div>
          <div style="border-top:3pt solid black;display:flex;align-items:center;justify-content:flex-end;padding:0 5mm;gap:6mm;background:white;">
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0;">
              ${priceEur !== null ? `<div style="font-weight:900;font-size:28pt;line-height:1;color:black;">€${priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
              ${priceCzk !== null ? `<div style="font-weight:700;font-size:18pt;line-height:1.1;color:black;opacity:0.7;">${priceCzk.toLocaleString("cs-CZ")} Kč</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div style="width:100mm;height:30mm;display:flex;flex-direction:row;align-items:stretch;background:white;color:black;overflow:hidden;border:2pt solid black;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;page-break-after:always;">
        <div style="flex-shrink:0;width:22mm;display:flex;align-items:center;justify-content:center;padding:1.5mm;background:white;border-right:2pt solid black;">
          <img src="${qrDataUrl}" width="72" height="72" style="width:19mm;height:19mm;" />
        </div>
        <div style="flex:1;padding:1.5mm 2mm;display:flex;flex-direction:column;justify-content:center;overflow:hidden;min-width:0;background:white;">
          <div style="font-weight:900;font-size:10pt;line-height:1.2;text-transform:uppercase;word-break:break-word;letter-spacing:-0.3pt;">${vietnameseName}</div>
          <div style="font-size:9pt;font-weight:500;line-height:1.2;color:#1f2937;margin-top:1mm;word-break:break-word;">${englishName}</div>
          ${variant.sku ? `<div style="font-size:8pt;line-height:1.1;color:black;margin-top:1mm;font-family:monospace;font-weight:bold;background:#f3f4f6;padding:0.5mm 1mm;display:inline-block;">${variant.sku}</div>` : ''}
        </div>
        <div style="flex-shrink:0;width:26mm;display:flex;flex-direction:column;border-left:2pt solid black;">
          ${priceEur !== null ? `<div style="flex:1;display:flex;align-items:center;justify-content:center;background:black;"><span style="font-weight:900;font-size:14pt;line-height:1;color:white;">€${priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
          ${priceCzk !== null ? `<div style="flex:1;display:flex;align-items:center;justify-content:center;background:white;${priceEur !== null ? 'border-top:1pt solid black;' : ''}"><span style="font-weight:bold;font-size:12pt;line-height:1;color:black;">${priceCzk.toLocaleString("cs-CZ")} Kč</span></div>` : ''}
          ${priceEur === null && priceCzk === null ? `<div style="flex:1;display:flex;align-items:center;justify-content:center;"><span style="font-size:10pt;color:#6b7280;font-weight:500;">N/A</span></div>` : ''}
        </div>
      </div>
    `;
  };

  const handlePrint = async () => {
    const selectedList = variants.filter(v => selectedVariants.has(v.id));
    if (selectedList.length === 0) {
      toast({
        title: t("common:error"),
        description: t("noVariantsSelected"),
        variant: "destructive",
      });
      return;
    }

    setIsPrinting(true);

    try {
      const labelHtmls = await Promise.all(selectedList.map(v => generateLabelHtml(v, labelSize)));
      const allLabelsHtml = labelHtmls.join('\n');

      const pageSize = labelSize === "large" ? { width: 148, height: 105 } : { width: 100, height: 30 };

      const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Variant Labels - ${productName}</title>
<style>
@page { size: ${pageSize.width}mm ${pageSize.height}mm; margin: 0 !important; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; }
</style>
</head>
<body>${allLabelsHtml}</body>
</html>`;

      if (canDirectPrint) {
        try {
          const result = await printLabelHTML(fullHtml, true, pageSize);
          if (result.success && result.usedQZ) {
            toast({
              title: t("labelsPrinted"),
              description: t("printedVariantLabels", { count: selectedList.length }),
            });
            onOpenChange(false);
            return;
          }
        } catch (error) {
          console.error('QZ print failed, falling back to browser print:', error);
        }
      }

      const printWindow = window.open("", "_blank", "width=600,height=800");
      if (!printWindow) {
        toast({
          title: t("common:error"),
          description: t("popupBlocked"),
          variant: "destructive",
        });
        return;
      }

      printWindow.document.write(fullHtml);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.print();
      };

      toast({
        title: t("labelsSentToPrinter"),
        description: t("printingVariantLabels", { count: selectedList.length }),
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: t("common:error"),
        description: t("printFailed"),
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const content = (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectedVariants.size === variants.length ? deselectAll : selectAll}
              className="h-9 text-sm"
            >
              {selectedVariants.size === variants.length ? (
                <><X className="h-4 w-4 mr-1" /> {t("common:deselectAll")}</>
              ) : (
                <><Check className="h-4 w-4 mr-1" /> {t("common:selectAll")}</>
              )}
            </Button>
            <Badge variant="secondary" className="px-3 py-1">
              {selectedVariants.size} / {variants.length}
            </Badge>
          </div>
          <Select value={labelSize} onValueChange={(v) => setLabelSize(v as "small" | "large")}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">{t("smallLabel")} (100×30mm)</SelectItem>
              <SelectItem value="large">{t("largeLabel")} (148×105mm)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[300px] border rounded-lg p-3">
          <div className="space-y-2">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedVariants.has(variant.id)
                    ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                    : "bg-gray-50 dark:bg-gray-800 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                onClick={() => toggleVariant(variant.id)}
              >
                <Checkbox
                  checked={selectedVariants.has(variant.id)}
                  onCheckedChange={() => toggleVariant(variant.id)}
                  className="h-6 w-6"
                />
                {variant.imageUrl ? (
                  <img
                    src={variant.imageUrl}
                    alt={variant.name}
                    className="h-10 w-10 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{variant.name}</p>
                  {variant.sku && (
                    <p className="text-xs text-gray-500 font-mono">{variant.sku}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {variant.priceEur && (
                    <span className="text-xs font-bold">€{Number(variant.priceEur).toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                  )}
                  {variant.priceCzk && (
                    <span className="text-xs text-gray-500">{Number(variant.priceCzk).toLocaleString("cs-CZ")} Kč</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t("common:cancel")}
        </Button>
        <Button
          onClick={handlePrint}
          disabled={selectedVariants.size === 0 || isPrinting}
          className="min-w-[140px]"
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Printer className="h-4 w-4 mr-2" />
          )}
          {t("printLabels")} ({selectedVariants.size})
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="text-left">{t("batchPrintVariantLabels")}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("batchPrintVariantLabels")}</DialogTitle>
          <DialogDescription>
            {productName}
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

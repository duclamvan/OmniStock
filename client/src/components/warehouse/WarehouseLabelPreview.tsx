import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Printer, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";

interface WarehouseLabelPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    vietnameseName?: string | null;
    sku?: string | null;
    priceEur?: number | string | null;
    priceCzk?: number | string | null;
  } | null;
}

export interface LabelProduct {
  id: string;
  name: string;
  vietnameseName?: string | null;
  sku?: string | null;
  priceEur?: number | string | null;
  priceCzk?: number | string | null;
}

export function LabelContent({ product }: { product: LabelProduct | null }) {
  if (!product) return null;

  const stockUrl = `${window.location.origin}/stock?q=${encodeURIComponent(product.sku || product.name)}`;
  const vietnameseName = product.vietnameseName || product.name;
  const englishName = product.name;
  const priceEur = product.priceEur ? Number(product.priceEur) : null;
  const priceCzk = product.priceCzk ? Number(product.priceCzk) : null;

  return (
    <div
      id="warehouse-label-print"
      className="w-[100mm] h-[30mm] flex flex-row items-stretch bg-white text-black overflow-hidden border border-gray-300 print:border-0 box-border"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      <div className="flex-shrink-0 w-[20mm] h-[28mm] flex items-center justify-center p-[1mm] self-center">
        <QRCodeSVG
          value={stockUrl}
          size={68}
          level="M"
          includeMargin={false}
          className="w-full h-full"
        />
      </div>

      <div className="flex-1 px-[2mm] py-[1mm] flex flex-col justify-center overflow-hidden min-w-0 border-l border-gray-200">
        <span
          className="font-bold text-[10pt] leading-tight block uppercase"
          style={{ lineHeight: 1.15, wordBreak: 'break-word' }}
        >
          {vietnameseName}
        </span>
        <span
          className="text-[9pt] leading-tight block text-gray-700 mt-[0.5mm]"
          style={{ lineHeight: 1.15, wordBreak: 'break-word' }}
        >
          {englishName}
        </span>
        {product.sku && (
          <span
            className="text-[7pt] text-gray-500 mt-[0.5mm] font-mono block"
            style={{ lineHeight: 1.1 }}
          >
            {product.sku}
          </span>
        )}
      </div>

      <div className="flex-shrink-0 w-[24mm] flex flex-col justify-center border-l border-gray-200">
        {priceEur !== null && (
          <div className="flex items-center justify-end pr-[2mm] py-[1mm]">
            <span className="font-bold text-[13pt] text-black" style={{ lineHeight: 1.1 }}>
              €{priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {priceEur !== null && priceCzk !== null && (
          <div className="border-t border-gray-300 mx-[1mm]"></div>
        )}
        {priceCzk !== null && (
          <div className="flex items-center justify-end pr-[2mm] py-[1mm]">
            <span className="font-bold text-[12pt] text-black" style={{ lineHeight: 1.1 }}>
              {priceCzk.toLocaleString("cs-CZ")} Kč
            </span>
          </div>
        )}
        {priceEur === null && priceCzk === null && (
          <div className="flex items-center justify-end pr-[2mm] py-[1mm]">
            <span className="text-[9pt] text-gray-400">N/A</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WarehouseLabelPreview({
  open,
  onOpenChange,
  product,
}: WarehouseLabelPreviewProps) {
  const { t } = useTranslation(["inventory", "common"]);
  const isMobile = useIsMobile();

  const handlePrint = async () => {
    const printContent = document.getElementById("warehouse-label-print");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=500,height=200");
    if (!printWindow) return;
    
    // Save label to history (upsert - creates new or increments print count)
    if (product) {
      try {
        await apiRequest("POST", "/api/warehouse-labels", {
          productId: product.id,
          englishName: product.name,
          vietnameseName: product.vietnameseName || product.name,
          sku: product.sku || null,
          priceEur: product.priceEur ? String(product.priceEur) : null,
          priceCzk: product.priceCzk ? String(product.priceCzk) : null,
        });
      } catch (error) {
        console.error("Failed to save label to history:", error);
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Warehouse Label - ${product?.sku || product?.name || "Label"}</title>
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
            width: 100mm;
            height: 30mm;
            overflow: hidden;
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
          }
          .qr-section {
            flex-shrink: 0;
            width: 20mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1mm;
          }
          .qr-section svg {
            width: 18mm;
            height: 18mm;
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
            font-size: 10pt;
            line-height: 1.15;
            text-transform: uppercase;
            word-break: break-word;
          }
          .en-name {
            font-size: 9pt;
            line-height: 1.15;
            color: #374151;
            margin-top: 0.5mm;
            word-break: break-word;
          }
          .sku {
            font-size: 7pt;
            line-height: 1.1;
            color: #6b7280;
            margin-top: 0.5mm;
            font-family: monospace;
          }
          .price-section {
            flex-shrink: 0;
            width: 24mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            border-left: 0.5pt solid #e5e7eb;
          }
          .price-row {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 1mm 2mm;
          }
          .price-divider {
            border-top: 0.5pt solid #d1d5db;
            margin: 0 1mm;
          }
          .price-eur {
            font-weight: bold;
            font-size: 13pt;
            line-height: 1.1;
            color: black;
          }
          .price-czk {
            font-weight: bold;
            font-size: 12pt;
            line-height: 1.1;
            color: black;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="qr-section">
            ${printContent.querySelector("svg")?.outerHTML || ""}
          </div>
          <div class="name-section">
            <div class="vn-name">${product?.vietnameseName || product?.name || ""}</div>
            <div class="en-name">${product?.name || ""}</div>
            ${product?.sku ? `<div class="sku">${product.sku}</div>` : ""}
          </div>
          <div class="price-section">
            ${product?.priceEur ? `<div class="price-row"><span class="price-eur">€${Number(product.priceEur).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ""}
            ${product?.priceEur && product?.priceCzk ? `<div class="price-divider"></div>` : ""}
            ${product?.priceCzk ? `<div class="price-row"><span class="price-czk">${Number(product.priceCzk).toLocaleString("cs-CZ")} Kč</span></div>` : ""}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const DialogWrapper = isMobile ? Drawer : Dialog;
  const ContentWrapper = isMobile ? DrawerContent : DialogContent;
  const HeaderWrapper = isMobile ? DrawerHeader : DialogHeader;
  const TitleWrapper = isMobile ? DrawerTitle : DialogTitle;
  const FooterWrapper = isMobile ? DrawerFooter : DialogFooter;

  if (!product) return null;

  return (
    <DialogWrapper open={open} onOpenChange={onOpenChange}>
      <ContentWrapper className={isMobile ? "max-h-[85vh]" : "max-w-[450px]"}>
        <HeaderWrapper>
          <TitleWrapper className="text-left flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {t("inventory:warehouseLabel")}
          </TitleWrapper>
        </HeaderWrapper>

        <div className={`${isMobile ? "px-4 pb-4" : "py-4"} space-y-4`}>
          <p className="text-sm text-muted-foreground">
            {t("inventory:warehouseLabelDesc")}
          </p>

          <div className="flex justify-center py-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto">
            <div className="transform scale-90 origin-center">
              <LabelContent product={product} />
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            {t("inventory:labelDimensions")}: 100mm × 30mm
          </div>
        </div>

        <FooterWrapper className={isMobile ? "px-4 pb-6" : "gap-2"}>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-label">
            <X className="h-4 w-4 mr-2" />
            {t("common:close")}
          </Button>
          <Button onClick={handlePrint} data-testid="button-print-label" className="bg-green-600 hover:bg-green-700">
            <Printer className="h-4 w-4 mr-2" />
            {t("inventory:printLabel")}
          </Button>
        </FooterWrapper>
      </ContentWrapper>
    </DialogWrapper>
  );
}

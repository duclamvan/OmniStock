import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { generateProductQRUrl } from "@shared/qrUtils";
import QRCode from "qrcode";

export interface LabelPrintItem {
  id?: string;
  name: string;
  vietnameseName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  priceEur?: number | string | null;
  priceCzk?: number | string | null;
  quantity?: number;
  locationCode?: string;
}

type LabelSize = "small" | "large";

interface LabelPrintContextValue {
  openLabelPrint: (items: LabelPrintItem[]) => void;
}

const LabelPrintContext = createContext<LabelPrintContextValue | null>(null);

export function useLabelPrint() {
  const context = useContext(LabelPrintContext);
  if (!context) {
    throw new Error("useLabelPrint must be used within LabelPrintProvider");
  }
  return context;
}

interface LabelPrintProviderProps {
  children: ReactNode;
}

export function LabelPrintProvider({ children }: LabelPrintProviderProps) {
  const { t } = useTranslation(["inventory", "common"]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<LabelPrintItem[]>([]);
  const [labelSize, setLabelSize] = useState<LabelSize>("small");

  const openLabelPrint = useCallback((labelItems: LabelPrintItem[]) => {
    setItems(labelItems);
    setIsOpen(true);
  }, []);

  const handlePrint = async () => {
    if (items.length === 0) return;
    
    if (labelSize === "large") {
      await printLargeLabels();
    } else {
      await printSmallLabels();
    }
    setIsOpen(false);
  };

  const printSmallLabels = async () => {
    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) {
      toast({
        title: t("common:error"),
        description: t("popupBlocked"),
        variant: "destructive",
      });
      return;
    }

    const labelsHtml = await Promise.all(items.map(async (item) => {
      const productCode = item.sku || item.barcode || item.id || "-";
      const qrUrl = generateProductQRUrl("https://wms.davie.shop", productCode);
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 90, margin: 0 });
      const vietnameseName = item.vietnameseName || item.name;
      const englishName = item.name;
      const priceEur = item.priceEur ? Number(item.priceEur) : null;
      const priceCzk = item.priceCzk ? Number(item.priceCzk) : null;

      return `
        <div class="label-container">
          <div class="qr-section">
            <img src="${qrDataUrl}" alt="QR" width="72" height="72" />
          </div>
          <div class="name-section">
            <div class="vn-name">${vietnameseName}</div>
            <div class="en-name">${englishName}</div>
            ${item.sku ? `<div class="sku">${item.sku}</div>` : ""}
          </div>
          <div class="price-section">
            ${priceEur !== null ? `<div class="price-eur-row"><span class="price-eur">€${priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ""}
            ${priceCzk !== null ? `<div class="price-czk-row"><span class="price-czk">${priceCzk.toLocaleString("cs-CZ")} Kč</span></div>` : ""}
            ${priceEur === null && priceCzk === null ? `<div class="price-czk-row"><span class="price-na">N/A</span></div>` : ""}
          </div>
        </div>
      `;
    }));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Warehouse Labels</title>
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
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
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
            border: 2pt solid black;
            page-break-after: always;
            break-after: page;
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
          .qr-section img {
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
            background: black;
          }
          .price-czk-row {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
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
        ${labelsHtml.join("")}
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const printLargeLabels = async () => {
    const printWindow = window.open("", "_blank", "width=700,height=600");
    if (!printWindow) {
      toast({
        title: t("common:error"),
        description: t("popupBlocked"),
        variant: "destructive",
      });
      return;
    }

    const labelsHtml = await Promise.all(items.map(async (item) => {
      const productCode = item.sku || item.barcode || item.id || "-";
      const qrUrl = generateProductQRUrl("https://wms.davie.shop", productCode);
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 0 });
      const vietnameseName = item.vietnameseName || item.name;
      const englishName = item.name;
      const priceEur = item.priceEur ? Number(item.priceEur) : null;
      const priceCzk = item.priceCzk ? Number(item.priceCzk) : null;

      return `
        <div class="label-container">
          <div class="qr-spine">
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="sku-plate">${item.sku || productCode}</div>
          </div>
          <div class="content-area">
            <div class="vn-name">${vietnameseName}</div>
            ${vietnameseName !== englishName ? `<div class="en-name">${englishName}</div>` : ""}
          </div>
          <div class="price-strap">
            <div class="price-stack">
              ${priceEur !== null ? `<div class="price-eur">€${priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ""}
              ${priceCzk !== null ? `<div class="price-czk">${priceCzk.toLocaleString("cs-CZ")} Kč</div>` : ""}
            </div>
          </div>
        </div>
      `;
    }));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Large Warehouse Labels</title>
        <style>
          @page {
            size: 148mm 105mm landscape;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
          }
          .label-container {
            width: 148mm;
            height: 105mm;
            display: grid;
            grid-template-columns: 30mm 1fr;
            grid-template-rows: 1fr 24mm;
            background: white;
            color: black;
            overflow: hidden;
            border: 3pt solid black;
            page-break-after: always;
            break-after: page;
          }
          .qr-spine {
            grid-row: 1 / 3;
            border-right: 2pt solid black;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3mm;
            gap: 2mm;
          }
          .qr-spine img {
            width: 20mm;
            height: 20mm;
          }
          .sku-plate {
            font-size: 9pt;
            font-weight: 900;
            font-family: 'Courier New', monospace;
            text-align: center;
            word-break: break-all;
            padding: 1.5mm 2mm;
            background: black;
            color: white;
            width: 100%;
            letter-spacing: -0.3pt;
          }
          .content-area {
            padding: 4mm 5mm 3mm 5mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 2mm;
            overflow: hidden;
          }
          .vn-name {
            font-weight: 900;
            font-size: 38pt;
            line-height: 1.0;
            text-transform: uppercase;
            word-break: break-word;
            letter-spacing: -1pt;
            color: black;
          }
          .en-name {
            font-size: 20pt;
            font-weight: 600;
            line-height: 1.1;
            letter-spacing: 0.5pt;
            text-transform: uppercase;
            color: #444;
            word-break: break-word;
            border-top: 1pt solid black;
            padding-top: 2mm;
            margin-top: 1mm;
          }
          .price-strap {
            border-top: 3pt solid black;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 0 5mm;
            gap: 6mm;
            background: white;
          }
          .price-stack {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0;
          }
          .price-eur {
            font-weight: 900;
            font-size: 32pt;
            line-height: 1;
            color: black;
            letter-spacing: -0.5pt;
          }
          .price-czk {
            font-weight: 700;
            font-size: 22pt;
            line-height: 1.1;
            color: black;
            opacity: 0.7;
            letter-spacing: -0.3pt;
          }
        </style>
      </head>
      <body>
        ${labelsHtml.join("")}
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

  const previewItem = items[0] || null;

  return (
    <LabelPrintContext.Provider value={{ openLabelPrint }}>
      {children}
      
      <DialogWrapper open={isOpen} onOpenChange={setIsOpen}>
        <ContentWrapper className={isMobile ? "max-h-[85vh]" : "max-w-[420px]"}>
          <HeaderWrapper>
            <TitleWrapper className="text-left flex items-center gap-2">
              <Printer className="h-5 w-5" />
              {t("inventory:warehouseLabel")}
              {items.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({items.length} {t("common:items")})
                </span>
              )}
            </TitleWrapper>
          </HeaderWrapper>

          <div className={`${isMobile ? "px-3 pb-3" : "py-2 px-1"} space-y-3`}>
            {/* Label Size Selector */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">{t("inventory:labelSize")}:</span>
              <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                <SelectTrigger className="w-[180px] h-8 text-sm" data-testid="select-label-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small" data-testid="option-label-small">
                    {t("inventory:labelSizeSmall")} (100×30mm)
                  </SelectItem>
                  <SelectItem value="large" data-testid="option-label-large">
                    {t("inventory:labelSizeLarge")} (148×105mm)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {previewItem && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">{t("common:preview")}:</p>
                {labelSize === "small" ? (
                  <div className="flex bg-white border-2 border-black rounded overflow-hidden" style={{ height: "60px" }}>
                    <div className="w-14 flex items-center justify-center border-r-2 border-black bg-gray-50">
                      <div className="w-10 h-10 bg-gray-200 flex items-center justify-center text-[8px] text-gray-500">QR</div>
                    </div>
                    <div className="flex-1 p-1.5 flex flex-col justify-center overflow-hidden">
                      <div className="text-[10px] font-black uppercase line-clamp-1">{previewItem.vietnameseName || previewItem.name}</div>
                      <div className="text-[9px] text-gray-600 line-clamp-1">{previewItem.name}</div>
                      {previewItem.sku && <div className="text-[8px] font-mono bg-gray-100 px-1 mt-0.5 inline-block w-fit">{previewItem.sku}</div>}
                    </div>
                    <div className="w-16 flex flex-col border-l-2 border-black">
                      {previewItem.priceEur && (
                        <div className="flex-1 bg-black flex items-center justify-center">
                          <span className="text-white font-bold text-xs">€{Number(previewItem.priceEur).toFixed(2)}</span>
                        </div>
                      )}
                      {previewItem.priceCzk && (
                        <div className="flex-1 flex items-center justify-center border-t border-black">
                          <span className="font-bold text-[10px]">{Number(previewItem.priceCzk).toLocaleString()} Kč</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border-2 border-black rounded p-3">
                    <div className="flex gap-2">
                      <div className="w-12 h-12 bg-gray-200 flex items-center justify-center text-xs text-gray-500">QR</div>
                      <div className="flex-1">
                        <div className="text-sm font-black uppercase">{previewItem.vietnameseName || previewItem.name}</div>
                        <div className="text-xs text-gray-600">{previewItem.name}</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-end gap-2">
                      {previewItem.priceEur && <span className="font-black">€{Number(previewItem.priceEur).toFixed(2)}</span>}
                      {previewItem.priceCzk && <span className="font-bold text-gray-600">{Number(previewItem.priceCzk).toLocaleString()} Kč</span>}
                    </div>
                  </div>
                )}
                {items.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    + {items.length - 1} {t("common:more")}
                  </p>
                )}
              </div>
            )}
          </div>

          <FooterWrapper className={isMobile ? "px-3 pb-3" : ""}>
            <div className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
              <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                {t("common:cancel")}
              </Button>
              <Button onClick={handlePrint} className="flex-1" data-testid="button-print-labels">
                <Printer className="h-4 w-4 mr-2" />
                {t("inventory:printLabel")} {items.length > 1 && `(${items.length})`}
              </Button>
            </div>
          </FooterWrapper>
        </ContentWrapper>
      </DialogWrapper>
    </LabelPrintContext.Provider>
  );
}

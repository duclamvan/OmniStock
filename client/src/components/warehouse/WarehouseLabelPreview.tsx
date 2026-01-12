import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, X, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrinter } from "@/hooks/usePrinter";
import { apiRequest } from "@/lib/queryClient";
import { generateProductQRUrl } from "@shared/qrUtils";
import QRCode from "qrcode";

interface WarehouseLabelPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    vietnameseName?: string | null;
    sku?: string | null;
    barcode?: string | null;
    priceEur?: number | string | null;
    priceCzk?: number | string | null;
  } | null;
}

export interface LabelProduct {
  id: string;
  name: string;
  vietnameseName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  priceEur?: number | string | null;
  priceCzk?: number | string | null;
}

export function LabelContent({ product }: { product: LabelProduct | null }) {
  if (!product) return null;

  const productCode = product.sku || product.barcode || product.id;
  const qrUrl = generateProductQRUrl("https://wms.davie.shop", productCode);
  const vietnameseName = product.vietnameseName || product.name;
  const englishName = product.name;
  const priceEur = product.priceEur ? Number(product.priceEur) : null;
  const priceCzk = product.priceCzk ? Number(product.priceCzk) : null;

  return (
    <div
      id="warehouse-label-print"
      className="w-[100mm] h-[30mm] flex flex-row items-stretch bg-white text-black overflow-hidden border-2 border-black print:border-2 box-border"
      style={{ fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif" }}
    >
      <div className="flex-shrink-0 w-[22mm] flex items-center justify-center p-[1.5mm] bg-white border-r-2 border-black">
        <QRCodeSVG
          value={qrUrl}
          size={72}
          level="M"
          includeMargin={false}
          className="w-full h-full"
        />
      </div>

      <div className="flex-1 px-[2mm] py-[1.5mm] flex flex-col justify-center overflow-hidden min-w-0 bg-white">
        <span
          className="font-black text-[10pt] leading-tight block uppercase tracking-tight"
          style={{ lineHeight: 1.2, wordBreak: 'break-word' }}
        >
          {vietnameseName}
        </span>
        <span
          className="text-[9pt] leading-tight block text-gray-800 mt-[1mm] font-medium"
          style={{ lineHeight: 1.2, wordBreak: 'break-word' }}
        >
          {englishName}
        </span>
        {product.sku && (
          <span
            className="text-[8pt] text-black mt-[1mm] font-mono font-bold block bg-gray-100 px-[1mm] py-[0.5mm] inline-block w-fit"
            style={{ lineHeight: 1.1 }}
          >
            {product.sku}
          </span>
        )}
      </div>

      <div className="flex-shrink-0 w-[26mm] flex flex-col border-l-2 border-black">
        {priceEur !== null && (
          <div className="flex-1 flex items-center justify-center bg-black">
            <span className="font-black text-[14pt] text-white tracking-tight" style={{ lineHeight: 1 }}>
              €{priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {priceCzk !== null && (
          <div className="flex-1 flex items-center justify-center border-t border-black">
            <span className="font-bold text-[12pt] text-black tracking-tight" style={{ lineHeight: 1 }}>
              {priceCzk.toLocaleString("cs-CZ")} Kč
            </span>
          </div>
        )}
        {priceEur === null && priceCzk === null && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10pt] text-gray-500 font-medium">N/A</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function LargeLabelContentRaw({ product }: { product: LabelProduct | null }) {
  if (!product) return null;

  const productCode = product.sku || product.barcode || product.id;
  const qrUrl = generateProductQRUrl("https://wms.davie.shop", productCode);
  const vietnameseName = product.vietnameseName || product.name;
  const englishName = product.name;
  const priceEur = product.priceEur ? Number(product.priceEur) : null;
  const priceCzk = product.priceCzk ? Number(product.priceCzk) : null;

  return (
    <div
      id="warehouse-label-large-print"
      className="bg-white text-black overflow-hidden"
      style={{ 
        fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif", 
        width: "148mm",
        height: "105mm",
        border: "3pt solid black",
        display: "grid",
        gridTemplateColumns: "30mm 1fr",
        gridTemplateRows: "1fr 24mm"
      }}
    >
      {/* Left Spine - QR + SKU */}
      <div style={{
        gridRow: "1 / 3",
        borderRight: "2pt solid black",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3mm",
        gap: "2mm",
        background: "repeating-linear-gradient(45deg, transparent, transparent 2mm, rgba(0,0,0,0.03) 2mm, rgba(0,0,0,0.03) 4mm)"
      }}>
        <QRCodeSVG
          value={qrUrl}
          size={70}
          level="M"
          includeMargin={false}
        />
        <div style={{
          fontSize: "9pt",
          fontWeight: 900,
          fontFamily: "monospace",
          textAlign: "center",
          wordBreak: "break-all",
          padding: "1.5mm 2mm",
          background: "black",
          color: "white",
          width: "100%",
          letterSpacing: "-0.3pt"
        }}>
          {product.sku || productCode}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        padding: "4mm 5mm 3mm 5mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "2mm",
        overflow: "hidden"
      }}>
        {/* Vietnamese Name - Primary */}
        <div style={{
          fontWeight: 900,
          fontSize: "38pt",
          lineHeight: 1.0,
          textTransform: "uppercase",
          letterSpacing: "-1pt",
          wordBreak: "break-word"
        }}>
          {vietnameseName}
        </div>
        
        {/* English Name - Secondary */}
        {vietnameseName !== englishName && (
          <div style={{
            fontSize: "20pt",
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: "0.5pt",
            textTransform: "uppercase",
            opacity: 0.7,
            wordBreak: "break-word",
            borderTop: "1pt solid black",
            paddingTop: "2mm",
            marginTop: "1mm"
          }}>
            {englishName}
          </div>
        )}
      </div>

      {/* Bottom Strap - Price Zone */}
      <div style={{
        borderTop: "3pt solid black",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 5mm",
        gap: "6mm",
        background: "white"
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "0"
        }}>
          {priceEur !== null && (
            <div style={{
              fontWeight: 900,
              fontSize: "32pt",
              lineHeight: 1,
              color: "black",
              letterSpacing: "-0.5pt"
            }}>
              €{priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
          {priceCzk !== null && (
            <div style={{
              fontWeight: 700,
              fontSize: "22pt",
              lineHeight: 1.1,
              color: "black",
              opacity: 0.7,
              letterSpacing: "-0.3pt"
            }}>
              {priceCzk.toLocaleString("cs-CZ")} Kč
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Alias for backwards compatibility
export const LargeLabelContent = LargeLabelContentRaw;

export default function WarehouseLabelPreview({
  open,
  onOpenChange,
  product,
}: WarehouseLabelPreviewProps) {
  const { t } = useTranslation(["inventory", "common"]);
  const isMobile = useIsMobile();
  const [labelSize, setLabelSize] = useState<"small" | "large">("small");
  const { printLabelHTML, isPrinting: isPrintingQZ, canDirectPrint } = usePrinter({ context: 'warehouse_label_printer' });

  const printHtmlViaQZ = async (htmlContent: string, width: number, height: number): Promise<boolean> => {
    try {
      const orientation = width > height ? 'landscape' : 'portrait';
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
<style>
@page { size: ${width}mm ${height}mm; margin: 0; }
body { margin: 0; padding: 0; width: ${width}mm; height: ${height}mm; }
</style>
</head>
<body>${htmlContent}</body>
</html>`;
      
      const result = await printLabelHTML(fullHtml, { orientation, width, height });
      return result.success && result.usedQZ;
    } catch (error) {
      console.error('QZ print failed:', error);
      return false;
    }
  };

  const handlePrint = async () => {
    if (labelSize === "large") {
      await handlePrintLarge();
      return;
    }
    
    const printContent = document.getElementById("warehouse-label-print");
    if (!printContent) return;
    
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
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
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
            border: 2pt solid black;
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
            ${product?.priceEur ? `<div class="price-eur-row"><span class="price-eur">€${Number(product.priceEur).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ""}
            ${product?.priceCzk ? `<div class="price-czk-row"><span class="price-czk">${Number(product.priceCzk).toLocaleString("cs-CZ")} Kč</span></div>` : ""}
            ${!product?.priceEur && !product?.priceCzk ? `<div class="price-czk-row"><span class="price-na">N/A</span></div>` : ""}
          </div>
        </div>
      </body>
      </html>
    `;

    const labelHtmlForQZ = `
      <div class="label-container" style="width:378px;height:113px;display:flex;flex-direction:row;align-items:stretch;background:white;color:black;overflow:hidden;border:2px solid black;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
        <div class="qr-section" style="flex-shrink:0;width:83px;display:flex;align-items:center;justify-content:center;padding:5px;background:white;border-right:2px solid black;">
          ${printContent.querySelector("svg")?.outerHTML || ""}
        </div>
        <div class="name-section" style="flex:1;padding:5px 8px;display:flex;flex-direction:column;justify-content:center;overflow:hidden;min-width:0;background:white;">
          <div class="vn-name" style="font-weight:900;font-size:13px;line-height:1.2;text-transform:uppercase;word-break:break-word;">${product?.vietnameseName || product?.name || ""}</div>
          <div class="en-name" style="font-size:12px;font-weight:500;line-height:1.2;color:#1f2937;margin-top:3px;word-break:break-word;">${product?.name || ""}</div>
          ${product?.sku ? `<div class="sku" style="font-size:11px;line-height:1.1;color:black;margin-top:3px;font-family:monospace;font-weight:bold;background:#f3f4f6;padding:2px 4px;display:inline-block;">${product.sku}</div>` : ""}
        </div>
        <div class="price-section" style="flex-shrink:0;width:98px;display:flex;flex-direction:column;border-left:2px solid black;">
          ${product?.priceEur ? `<div class="price-eur-row" style="flex:1;display:flex;align-items:center;justify-content:center;background:black;"><span class="price-eur" style="font-weight:900;font-size:18px;line-height:1;color:white;">€${Number(product.priceEur).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ""}
          ${product?.priceCzk ? `<div class="price-czk-row" style="flex:1;display:flex;align-items:center;justify-content:center;background:white;border-top:1px solid black;"><span class="price-czk" style="font-weight:bold;font-size:16px;line-height:1;color:black;">${Number(product.priceCzk).toLocaleString("cs-CZ")} Kč</span></div>` : ""}
          ${!product?.priceEur && !product?.priceCzk ? `<div class="price-czk-row" style="flex:1;display:flex;align-items:center;justify-content:center;"><span class="price-na" style="font-size:13px;color:#6b7280;font-weight:500;">N/A</span></div>` : ""}
        </div>
      </div>
    `;

    const qzSuccess = await printHtmlViaQZ(labelHtmlForQZ, 378, 113);
    if (qzSuccess) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=500,height=200");
    if (!printWindow) return;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handlePrintLarge = async () => {
    if (!product) return;
    
    const productCode = product.sku || product.barcode || product.id;
    const qrUrl = generateProductQRUrl("https://wms.davie.shop", productCode);
    const vietnameseName = product.vietnameseName || product.name;
    const englishName = product.name;
    const priceEur = product.priceEur ? Number(product.priceEur) : null;
    const priceCzk = product.priceCzk ? Number(product.priceCzk) : null;

    // Save label to history
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

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 0 });

    const largeLabelHtmlForQZ = `
      <div style="width:560px;height:397px;display:grid;grid-template-columns:113px 1fr;grid-template-rows:1fr 91px;background:white;color:black;overflow:hidden;border:3px solid black;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
        <div style="grid-row:1/3;border-right:2px solid black;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:11px;gap:8px;">
          <img src="${qrDataUrl}" style="width:76px;height:76px;" alt="QR" />
          <div style="font-size:12px;font-weight:900;font-family:'Courier New',monospace;text-align:center;word-break:break-all;padding:6px 8px;background:black;color:white;width:100%;">${product.sku || productCode}</div>
        </div>
        <div style="padding:15px 19px 11px 19px;display:flex;flex-direction:column;justify-content:center;gap:8px;overflow:hidden;">
          <div style="font-weight:900;font-size:50px;line-height:1.0;text-transform:uppercase;word-break:break-word;letter-spacing:-1px;color:black;">${vietnameseName}</div>
          ${vietnameseName !== englishName ? `<div style="font-size:27px;font-weight:600;line-height:1.1;letter-spacing:0.5px;text-transform:uppercase;color:#444;word-break:break-word;border-top:1px solid black;padding-top:8px;margin-top:4px;">${englishName}</div>` : ''}
        </div>
        <div style="border-top:3px solid black;display:flex;align-items:center;justify-content:flex-end;padding:0 19px;gap:23px;background:white;">
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0;">
            ${priceEur !== null ? `<div style="font-weight:900;font-size:43px;line-height:1;color:black;letter-spacing:-0.5px;">€${priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
            ${priceCzk !== null ? `<div style="font-weight:700;font-size:29px;line-height:1.1;color:black;opacity:0.7;letter-spacing:-0.3px;">${priceCzk.toLocaleString("cs-CZ")} Kč</div>` : ''}
          </div>
        </div>
      </div>
    `;

    const qzSuccess = await printHtmlViaQZ(largeLabelHtmlForQZ, 560, 397);
    if (qzSuccess) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=600,height=450");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Large Label - ${product?.sku || product?.name || "Label"}</title>
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
            width: 148mm;
            height: 105mm;
            overflow: hidden;
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
        <div class="label-container">
          <div class="qr-spine">
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="sku-plate">${product.sku || productCode}</div>
          </div>
          <div class="content-area">
            <div class="vn-name">${vietnameseName}</div>
            ${vietnameseName !== englishName ? `<div class="en-name">${englishName}</div>` : ''}
          </div>
          <div class="price-strap">
            <div class="price-stack">
              ${priceEur !== null ? `<div class="price-eur">€${priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
              ${priceCzk !== null ? `<div class="price-czk">${priceCzk.toLocaleString("cs-CZ")} Kč</div>` : ''}
            </div>
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
      <ContentWrapper className={isMobile ? "max-h-[85vh]" : labelSize === "large" ? "max-w-[420px]" : "max-w-[420px]"}>
        <HeaderWrapper>
          <TitleWrapper className="text-left flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {t("inventory:warehouseLabel")}
          </TitleWrapper>
        </HeaderWrapper>

        <div className={`${isMobile ? "px-3 pb-3" : "py-2 px-1"} space-y-2`}>
          <div className="flex items-center justify-end gap-2">
            <Select value={labelSize} onValueChange={(v) => setLabelSize(v as "small" | "large")}>
              <SelectTrigger className="w-[180px] h-8 text-sm" data-testid="select-label-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small" data-testid="option-label-small">
                  {t("inventory:labelSizeSmall")}
                </SelectItem>
                <SelectItem value="large" data-testid="option-label-large">
                  {t("inventory:labelSizeLarge")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={`flex justify-center bg-gray-50 dark:bg-gray-900 rounded ${labelSize === "large" ? "p-2" : "py-3"}`}>
            {labelSize === "small" ? (
              <div className="transform scale-90 origin-center">
                <LabelContent product={product} />
              </div>
            ) : (
              <div className="flex justify-center items-center overflow-visible mx-auto" style={{ height: "270px", maxWidth: "280px" }}>
                <div style={{ transform: "scale(0.65)", transformOrigin: "center center" }}>
                  <LargeLabelContent product={product} />
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            {labelSize === "small" ? "100mm × 30mm" : "148mm × 105mm"}
          </div>
        </div>

        <FooterWrapper className={isMobile ? "px-4 pb-6" : "gap-2"}>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-label">
            <X className="h-4 w-4 mr-2" />
            {t("common:close")}
          </Button>
          <Button onClick={handlePrint} disabled={isPrintingQZ} data-testid="button-print-label" className="bg-green-600 hover:bg-green-700">
            {isPrintingQZ ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {isPrintingQZ ? t("common:printing") : t("inventory:printLabel")}
          </Button>
        </FooterWrapper>
      </ContentWrapper>
    </DialogWrapper>
  );
}

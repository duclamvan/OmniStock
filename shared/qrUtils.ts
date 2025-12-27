export const QR_PRODUCT_PATH = '/p';
export const QR_WAREHOUSE_LOCATION_PREFIX = 'WLOC|';

export function generateProductQRUrl(baseUrl: string, identifier: string): string {
  return `${baseUrl}${QR_PRODUCT_PATH}/${encodeURIComponent(identifier)}`;
}

export function generateWarehouseLocationQR(warehouseId: string, locationCode: string): string {
  return `${QR_WAREHOUSE_LOCATION_PREFIX}${warehouseId}|${locationCode}`;
}

export function parseWarehouseLocationQR(value: string): { warehouseId: string; locationCode: string } | null {
  if (!value.startsWith(QR_WAREHOUSE_LOCATION_PREFIX)) {
    return null;
  }
  const parts = value.substring(QR_WAREHOUSE_LOCATION_PREFIX.length).split('|');
  if (parts.length >= 2) {
    return {
      warehouseId: parts[0],
      locationCode: parts[1]
    };
  }
  return null;
}

export function isWarehouseLocationQR(value: string): boolean {
  return value.startsWith(QR_WAREHOUSE_LOCATION_PREFIX);
}

export function isEAN13Barcode(value: string): boolean {
  return /^\d{13}$/.test(value);
}

export function isProductBarcode(value: string): boolean {
  return /^\d{8,14}$/.test(value) || /^[A-Za-z0-9-]+$/.test(value);
}

export function parseProductQRUrl(url: string): { code: string } | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/^\/p\/(.+)$/);
    if (pathMatch) {
      return { code: decodeURIComponent(pathMatch[1]) };
    }
    return null;
  } catch {
    return null;
  }
}

export function isProductQRUrl(value: string): boolean {
  try {
    const urlObj = new URL(value);
    return urlObj.pathname.startsWith(`${QR_PRODUCT_PATH}/`);
  } catch {
    return false;
  }
}

export function extractCodeFromQRValue(value: string): string {
  const parsed = parseProductQRUrl(value);
  return parsed?.code || value;
}

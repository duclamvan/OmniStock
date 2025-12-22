export const QR_PRODUCT_PATH = '/p';

export function generateProductQRUrl(baseUrl: string, identifier: string): string {
  return `${baseUrl}${QR_PRODUCT_PATH}/${encodeURIComponent(identifier)}`;
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

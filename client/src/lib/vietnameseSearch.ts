const vietnameseMap: Record<string, string> = {
  'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'Á': 'A', 'À': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
  'Ă': 'A', 'Ắ': 'A', 'Ằ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
  'Â': 'A', 'Ấ': 'A', 'Ầ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
  'đ': 'd', 'Đ': 'D',
  'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'É': 'E', 'È': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
  'Ê': 'E', 'Ế': 'E', 'Ề': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
  'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'Í': 'I', 'Ì': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
  'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'Ó': 'O', 'Ò': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
  'Ô': 'O', 'Ố': 'O', 'Ồ': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
  'Ơ': 'O', 'Ớ': 'O', 'Ờ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
  'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'Ú': 'U', 'Ù': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
  'Ư': 'U', 'Ứ': 'U', 'Ừ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
  'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'Ý': 'Y', 'Ỳ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y'
};

export function removeDiacritics(str: string): string {
  return str.split('').map(function(char) {
    return vietnameseMap[char] || vietnameseMap[char.toLowerCase()] || char;
  }).join('');
}

export function normalizeForSKU(text: string): string {
  return removeDiacritics(text)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function generateProductSku(productName: string): string {
  if (!productName || !productName.trim()) return '';
  
  const normalized = normalizeForSKU(productName);
  if (!normalized) return '';
  
  const words = productName.trim().split(/[\s\-–—]+/).filter(w => w.length > 0);
  
  let prefix = '';
  for (const word of words) {
    const normalizedWord = normalizeForSKU(word);
    if (normalizedWord.length >= 2 && /^[A-Z]/.test(normalizedWord)) {
      prefix = normalizedWord.slice(0, 3).toUpperCase();
      break;
    }
  }
  
  if (!prefix) {
    prefix = normalized.slice(0, 3);
  }
  
  return `${prefix}-${normalized}`;
}

export function generateVariantSku(parentSku: string, variantName: string): string {
  if (!parentSku) return '';
  if (!variantName) return parentSku;
  
  const sanitizedVariant = removeDiacritics(variantName.trim())
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
  
  if (!sanitizedVariant) return parentSku;
  
  return `${parentSku}-${sanitizedVariant}`;
}

export function createVietnameseSearchMatcher(searchTerm: string) {
  const normalizedSearch = removeDiacritics(searchTerm.toLowerCase()).trim();
  
  return (text: string): boolean => {
    if (!normalizedSearch) return true;
    
    const normalizedText = removeDiacritics(text.toLowerCase());
    const searchWords = normalizedSearch.split(/\s+/);
    
    // Check if all search words match word boundaries in the text
    return searchWords.every(searchWord => {
      // Create a regex pattern that matches the search word at word boundaries
      // This ensures "bo" won't match "bao" (from "bào")
      const pattern = new RegExp(`\\b${searchWord}`, 'i');
      return pattern.test(normalizedText);
    });
  };
}

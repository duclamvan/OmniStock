/**
 * Name Normalizer Utility
 * Handles Vietnamese and Czech name normalization:
 * - Removes diacritics (Vietnamese: Nguyễn → Nguyen, Czech: Potůčky → Potucky)
 * - Converts to Title Case (initial capital letter)
 * - Properly formats names (trims, collapses spaces)
 */

const vietnameseDiacriticMap: { [key: string]: string } = {
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'đ': 'd',
  'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
  'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
  'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
  'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
  'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
  'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
  'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
  'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
  'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
  'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
  'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
  'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
  'Đ': 'D',
};

const czechDiacriticMap: { [key: string]: string } = {
  'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i',
  'ň': 'n', 'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u',
  'ů': 'u', 'ý': 'y', 'ž': 'z',
  'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I',
  'Ň': 'N', 'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U',
  'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z',
};

const germanDiacriticMap: { [key: string]: string } = {
  'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 'ss',
  'Ä': 'A', 'Ö': 'O', 'Ü': 'U',
};

const allDiacriticsMap = {
  ...vietnameseDiacriticMap,
  ...czechDiacriticMap,
  ...germanDiacriticMap,
};

export function removeDiacritics(text: string): string {
  if (!text) return '';
  
  let result = '';
  for (const char of text) {
    result += allDiacriticsMap[char] || char;
  }
  
  return result
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function toTitleCase(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizePersonName(name: string): string {
  if (!name) return '';
  
  const withoutDiacritics = removeDiacritics(name);
  
  return toTitleCase(withoutDiacritics.trim().replace(/\s+/g, ' '));
}

export function normalizeFirstName(firstName: string): string {
  return normalizePersonName(firstName);
}

export function normalizeLastName(lastName: string): string {
  return normalizePersonName(lastName);
}

export function normalizeFullName(fullName: string): string {
  return normalizePersonName(fullName);
}

export function normalizeStreetName(street: string): string {
  if (!street) return '';
  
  const withoutDiacritics = removeDiacritics(street);
  
  return toTitleCase(withoutDiacritics.trim().replace(/\s+/g, ' '));
}

export function normalizeCityName(city: string): string {
  if (!city) return '';
  
  // Keep diacritics for proper city names (e.g., "Česká Lípa", "Praha")
  // Only apply Title Case formatting
  return toTitleCase(city.trim().replace(/\s+/g, ' '));
}

export function normalizeAddress(address: {
  street?: string;
  streetNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}): typeof address {
  return {
    street: address.street ? normalizeStreetName(address.street) : address.street,
    streetNumber: address.streetNumber?.toUpperCase().trim(),
    city: address.city ? normalizeCityName(address.city) : address.city,
    state: address.state ? toTitleCase(removeDiacritics(address.state).trim()) : address.state,
    zipCode: address.zipCode?.replace(/\s+/g, ' ').trim(),
    country: address.country ? toTitleCase(removeDiacritics(address.country).trim()) : address.country,
  };
}

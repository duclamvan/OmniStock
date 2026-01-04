// Enhanced Global Search Utilities with Token-Based Fuzzy Matching
// Provides robust search functionality with Vietnamese diacritics support

// Vietnamese diacritics normalization map
const VIETNAMESE_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'đ': 'd',
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
  'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
  'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
  'Đ': 'D',
  'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
  'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
  'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
  'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
  'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
  'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
  'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
  'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
  'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y'
};

export function normalizeVietnamese(str: string): string {
  return str.replace(
    /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬĐÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]/g,
    (char) => VIETNAMESE_MAP[char] || char
  );
}

function tokenize(text: string): string[] {
  return text.split(/[\s\-_.,;:!?/\\|()[\]{}'"]+/).filter(t => t.length > 0);
}

function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[len2][len1];
}

function tokenMatch(searchToken: string, textToken: string): number {
  if (textToken === searchToken) return 1;
  if (textToken.startsWith(searchToken)) return 0.9;
  if (textToken.includes(searchToken)) return 0.7;
  
  const maxLen = Math.max(searchToken.length, textToken.length);
  if (maxLen === 0) return 0;
  const distance = levenshteinDistance(searchToken, textToken);
  const similarity = 1 - distance / maxLen;
  
  return similarity >= 0.6 ? similarity * 0.6 : 0;
}

export function vietnameseMatch(text: string, searchTerm: string): boolean {
  if (!searchTerm.trim()) return true;
  
  const normalizedText = normalizeVietnamese(text.toLowerCase());
  const normalizedSearch = normalizeVietnamese(searchTerm.toLowerCase()).trim();
  
  if (normalizedText.includes(normalizedSearch)) return true;
  
  const textTokens = tokenize(normalizedText);
  const searchTokens = tokenize(normalizedSearch);
  
  if (searchTokens.length === 0) return true;
  
  let matchedTokens = 0;
  for (const searchToken of searchTokens) {
    for (const textToken of textTokens) {
      if (tokenMatch(searchToken, textToken) > 0) {
        matchedTokens++;
        break;
      }
    }
  }
  
  return matchedTokens === searchTokens.length;
}

export function calculateSearchScore(text: string, searchTerm: string): number {
  if (!searchTerm.trim() || !text) return 0;
  
  const normalizedText = normalizeVietnamese(text.toLowerCase());
  const normalizedSearch = normalizeVietnamese(searchTerm.toLowerCase()).trim();
  
  let score = 0;
  
  if (normalizedText === normalizedSearch) return 100;
  
  if (normalizedText.startsWith(normalizedSearch)) score += 70;
  
  if (normalizedText.includes(normalizedSearch)) score += 40;
  
  const textTokens = tokenize(normalizedText);
  const searchTokens = tokenize(normalizedSearch);
  
  if (searchTokens.length > 0 && textTokens.length > 0) {
    let matchedTokens = 0;
    let totalTokenScore = 0;
    
    for (const searchToken of searchTokens) {
      let bestMatch = 0;
      for (const textToken of textTokens) {
        const matchScore = tokenMatch(searchToken, textToken);
        if (matchScore > bestMatch) {
          bestMatch = matchScore;
        }
      }
      if (bestMatch > 0) {
        matchedTokens++;
        totalTokenScore += bestMatch;
      }
    }
    
    if (matchedTokens === searchTokens.length) {
      const avgMatchQuality = totalTokenScore / searchTokens.length;
      score += Math.floor(60 * avgMatchQuality);
    } else if (matchedTokens > 0) {
      const matchRatio = matchedTokens / searchTokens.length;
      const avgMatchQuality = totalTokenScore / matchedTokens;
      score += Math.floor(30 * matchRatio * avgMatchQuality);
    }
  }
  
  if (searchTokens.length === 1 && textTokens.some(token => token.startsWith(searchTokens[0]))) {
    score += 25;
  }
  
  if (textTokens.length > 0) {
    const acronym = textTokens.map(token => token[0] || '').join('');
    if (acronym.startsWith(normalizedSearch)) {
      score += 15;
    }
  }
  
  return Math.min(score, 100);
}

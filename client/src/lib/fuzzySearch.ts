/**
 * Comprehensive Fuzzy Search Utility with Vietnamese Diacritics Support
 * Provides robust search functionality with scoring and ranking
 */

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

/**
 * Normalize Vietnamese diacritics in a string
 */
export function normalizeVietnamese(str: string): string {
  return str.replace(
    /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬĐÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]/g,
    (char) => VIETNAMESE_MAP[char] || char
  );
}

/**
 * Tokenize text by splitting on non-alphanumeric characters
 * Returns array of non-empty tokens
 */
function tokenize(text: string): string[] {
  return text.split(/[\s\-_.,;:!?/\\|()[\]{}'"]+/).filter(t => t.length > 0);
}

/**
 * Check if searchToken matches textToken with fuzzy tolerance
 * Returns match score 0-1 (1 = perfect match)
 */
function tokenMatch(searchToken: string, textToken: string): number {
  if (textToken === searchToken) return 1;
  if (textToken.startsWith(searchToken)) return 0.9;
  if (textToken.includes(searchToken)) return 0.7;
  
  // Fuzzy match for short edit distance
  const maxLen = Math.max(searchToken.length, textToken.length);
  if (maxLen === 0) return 0;
  const distance = levenshteinDistance(searchToken, textToken);
  const similarity = 1 - distance / maxLen;
  
  // Only accept fuzzy matches with high similarity
  return similarity >= 0.6 ? similarity * 0.6 : 0;
}

/**
 * Calculate Levenshtein distance between two strings (for fuzzy matching)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * Calculate fuzzy similarity score (0-1, higher is better)
 */
function fuzzyScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

export interface SearchOptions {
  /** Minimum score threshold (0-1). Default: 0.3 */
  threshold?: number;
  /** Fields to search in (if searching objects) */
  fields?: string[];
  /** Enable fuzzy matching. Default: true */
  fuzzy?: boolean;
  /** Case sensitive search. Default: false */
  caseSensitive?: boolean;
  /** Normalize Vietnamese diacritics. Default: true */
  vietnameseNormalization?: boolean;
}

export interface SearchResult<T> {
  item: T;
  score: number;
  matchedFields?: string[];
}

/**
 * Calculate comprehensive search score for a text against a search term
 * Returns a score from 0-100 (higher is better)
 * 
 * Enhanced token-based matching: "1kg top coat" matches "1KG - Top coat tim dac"
 */
export function calculateSearchScore(
  text: string,
  searchTerm: string,
  options: SearchOptions = {}
): number {
  const {
    fuzzy = true,
    caseSensitive = false,
    vietnameseNormalization = true,
  } = options;

  if (!searchTerm.trim() || !text) return 0;

  // Normalize
  let normalizedText = vietnameseNormalization ? normalizeVietnamese(text) : text;
  let normalizedSearch = vietnameseNormalization ? normalizeVietnamese(searchTerm) : searchTerm;

  if (!caseSensitive) {
    normalizedText = normalizedText.toLowerCase();
    normalizedSearch = normalizedSearch.toLowerCase();
  }

  normalizedSearch = normalizedSearch.trim();
  
  let score = 0;

  // 1. Exact match (100 points)
  if (normalizedText === normalizedSearch) {
    return 100;
  }

  // 2. Starts with (70 points)
  if (normalizedText.startsWith(normalizedSearch)) {
    score += 70;
  }

  // 3. Contains exact phrase (40 points)
  if (normalizedText.includes(normalizedSearch)) {
    score += 40;
  }

  // 4. TOKEN-BASED MATCHING (most important for multi-word searches)
  // Tokenize both text and search terms
  const textTokens = tokenize(normalizedText);
  const searchTokens = tokenize(normalizedSearch);
  
  if (searchTokens.length > 0 && textTokens.length > 0) {
    // Check if each search token matches any text token
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
    
    // All search tokens found in text tokens = high score (60 points)
    if (matchedTokens === searchTokens.length) {
      const avgMatchQuality = totalTokenScore / searchTokens.length;
      score += Math.floor(60 * avgMatchQuality);
    } else if (matchedTokens > 0) {
      // Partial match: proportional score (up to 30 points)
      const matchRatio = matchedTokens / searchTokens.length;
      const avgMatchQuality = totalTokenScore / matchedTokens;
      score += Math.floor(30 * matchRatio * avgMatchQuality);
    }
  }

  // 5. Any token starts with search (25 points) - for single-word search
  if (searchTokens.length === 1 && textTokens.some(token => token.startsWith(searchTokens[0]))) {
    score += 25;
  }

  // 6. Fuzzy matching for entire strings (up to 15 points)
  if (fuzzy) {
    const similarity = fuzzyScore(normalizedText, normalizedSearch);
    score += Math.floor(similarity * 15);
  }

  // 7. Acronym match (15 points) - e.g., "vdl" matches "Van Duy Lam"
  if (textTokens.length > 0) {
    const acronym = textTokens.map(token => token[0] || '').join('');
    if (acronym.startsWith(normalizedSearch)) {
      score += 15;
    }
  }

  return Math.min(score, 100);
}

/**
 * Get value from an object using dot notation path (e.g., "supplier.name")
 * Supports arrays - returns all values joined with space
 */
function getNestedValue(obj: any, path: string): string {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) return '';
    
    // Handle arrays - collect values from all array items with remaining path
    if (Array.isArray(current)) {
      const remainingPath = parts.slice(i).join('.');
      const values = current
        .map(item => getNestedValue(item, remainingPath))
        .filter(v => v)
        .join(' ');
      return values;
    }
    
    current = current[parts[i]];
  }
  
  if (current === null || current === undefined) return '';
  if (typeof current === 'string') return current;
  if (typeof current === 'number') return String(current);
  if (Array.isArray(current)) {
    return current.filter(v => typeof v === 'string' || typeof v === 'number').join(' ');
  }
  return '';
}

/**
 * Search through an array of items with fuzzy matching and scoring
 * Supports nested field paths like "supplier.name" or "products.name"
 */
export function fuzzySearch<T>(
  items: T[],
  searchTerm: string,
  options: SearchOptions = {}
): SearchResult<T>[] {
  const {
    threshold = 0.3,
    fields = [],
  } = options;

  if (!searchTerm.trim()) {
    return items.map(item => ({ item, score: 0 }));
  }

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    let maxScore = 0;
    const matchedFields: string[] = [];

    // If item is a string
    if (typeof item === 'string') {
      maxScore = calculateSearchScore(item, searchTerm, options);
      if (maxScore >= threshold * 100) {
        results.push({ item, score: maxScore });
      }
      continue;
    }

    // If item is an object
    if (typeof item === 'object' && item !== null) {
      // Search in specified fields, or all string fields if none specified
      const fieldsToSearch = fields.length > 0
        ? fields
        : Object.keys(item).filter(key => typeof (item as any)[key] === 'string');

      for (const field of fieldsToSearch) {
        // Use getNestedValue to support dot notation paths
        const value = field.includes('.') 
          ? getNestedValue(item, field)
          : (item as any)[field];
          
        if (typeof value === 'string' && value) {
          const score = calculateSearchScore(value, searchTerm, options);
          if (score > maxScore) {
            maxScore = score;
            matchedFields.length = 0;
            matchedFields.push(field);
          } else if (score === maxScore && score > 0) {
            matchedFields.push(field);
          }
        }
      }
    }

    // Add to results if above threshold
    if (maxScore >= threshold * 100) {
      results.push({
        item,
        score: maxScore,
        matchedFields: matchedFields.length > 0 ? matchedFields : undefined,
      });
    }
  }

  // Sort by score (descending)
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Simple filter helper - returns items that match the search term
 */
export function fuzzyFilter<T>(
  items: T[],
  searchTerm: string,
  options: SearchOptions = {}
): T[] {
  return fuzzySearch(items, searchTerm, options).map(result => result.item);
}

/**
 * Check if text matches search term (simple boolean check)
 */
export function fuzzyMatches(
  text: string,
  searchTerm: string,
  options: SearchOptions = {}
): boolean {
  const { threshold = 0.3 } = options;
  const score = calculateSearchScore(text, searchTerm, options);
  return score >= threshold * 100;
}

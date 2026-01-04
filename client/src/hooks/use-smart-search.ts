import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { fuzzySearch, calculateSearchScore, normalizeVietnamese, SearchResult } from "@/lib/fuzzySearch";

interface SmartSearchOptions<T> {
  items: T[];
  fields: (keyof T)[];
  threshold?: number;
  debounceMs?: number;
}

interface SmartSearchReturn<T> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredItems: T[];
  isSearching: boolean;
  clearSearch: () => void;
  resultCount: number;
}

export function useSmartSearch<T extends Record<string, any>>({
  items,
  fields,
  threshold = 0.25,
  debounceMs = 150,
}: SmartSearchOptions<T>): SmartSearchReturn<T> {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (searchQuery !== debouncedQuery) {
      setIsSearching(true);
      timeoutRef.current = setTimeout(() => {
        setDebouncedQuery(searchQuery);
        setIsSearching(false);
      }, debounceMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery, debouncedQuery, debounceMs]);

  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }

    const fieldStrings = fields.map(f => String(f));
    const results = fuzzySearch(items, debouncedQuery, {
      fields: fieldStrings,
      threshold,
    });

    return results.sort((a, b) => b.score - a.score).map((r) => r.item);
  }, [items, debouncedQuery, fields, threshold]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
    isSearching,
    clearSearch,
    resultCount: filteredItems.length,
  };
}

export function smartFilter<T extends Record<string, any>>(
  items: T[],
  searchQuery: string,
  fields: (keyof T)[],
  threshold: number = 0.25
): T[] {
  if (!searchQuery.trim()) {
    return items;
  }

  const fieldStrings = fields.map(f => String(f));
  const results = fuzzySearch(items, searchQuery, {
    fields: fieldStrings,
    threshold,
  });

  return results.sort((a, b) => b.score - a.score).map((r) => r.item);
}

export function quickMatch(text: string, searchTerm: string): boolean {
  if (!searchTerm.trim()) return true;
  if (!text) return false;
  
  const normalizedText = normalizeVietnamese(text.toLowerCase());
  const normalizedSearch = normalizeVietnamese(searchTerm.toLowerCase()).trim();
  
  if (normalizedText.includes(normalizedSearch)) return true;
  
  const score = calculateSearchScore(text, searchTerm);
  return score >= 25;
}

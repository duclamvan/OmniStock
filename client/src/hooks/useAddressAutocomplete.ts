import { useState, useRef, useEffect } from "react";
import { UseFormSetValue } from "react-hook-form";

export interface AddressSuggestion {
  formatted: string;
  street?: string;
  houseNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface UseAddressAutocompleteOptions {
  onError?: (error: Error) => void;
  debounceMs?: number;
  minQueryLength?: number;
}

export function useAddressAutocomplete(options: UseAddressAutocompleteOptions = {}) {
  const {
    onError,
    debounceMs = 500,
    minQueryLength = 3,
  } = options;

  const [addressSearch, setAddressSearch] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isLoadingAddressSearch, setIsLoadingAddressSearch] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const searchAddresses = (query: string) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (query.length < minQueryLength) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      setIsLoadingAddressSearch(false);
      return;
    }

    setIsLoadingAddressSearch(true);
    setShowAddressDropdown(true);

    // Debounce
    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
          signal: abortControllerRef.current.signal
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch addresses');
        }
        const data = await response.json();

        const suggestions: AddressSuggestion[] = data.map((item: any) => ({
          formatted: item.formatted,
          street: item.street,
          houseNumber: item.houseNumber,
          city: item.city,
          state: item.state,
          zipCode: item.zipCode,
          country: item.country,
        }));

        setAddressSuggestions(suggestions);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error searching addresses:', error);
          setAddressSuggestions([]);
          if (onError) {
            onError(error);
          }
        }
      } finally {
        setIsLoadingAddressSearch(false);
      }
    }, debounceMs);
  };

  const selectAddress = <T extends Record<string, any>>(
    suggestion: AddressSuggestion,
    setValue: UseFormSetValue<T>
  ) => {
    // Build full address string, avoiding duplicate house numbers
    // Check if street already contains the house number to prevent duplication
    let fullAddress = suggestion.street || '';
    if (suggestion.houseNumber && !fullAddress.includes(suggestion.houseNumber)) {
      fullAddress = [fullAddress, suggestion.houseNumber].filter(Boolean).join(' ');
    }
    
    // Update form fields - cast to any to avoid type issues
    setValue('address' as any, fullAddress);
    setValue('city' as any, suggestion.city || '');
    setValue('zipCode' as any, suggestion.zipCode || '');
    setValue('country' as any, suggestion.country || '');

    setAddressSearch(suggestion.formatted);
    setShowAddressDropdown(false);
    setAddressSuggestions([]);
  };

  const clearSearch = () => {
    setAddressSearch("");
    setAddressSuggestions([]);
    setShowAddressDropdown(false);
    setIsLoadingAddressSearch(false);
  };

  return {
    addressSearch,
    setAddressSearch,
    addressSuggestions,
    showAddressDropdown,
    setShowAddressDropdown,
    isLoadingAddressSearch,
    searchAddresses,
    selectAddress,
    clearSearch,
  };
}

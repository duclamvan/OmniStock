import { useState, useEffect, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

interface UseDefaultWarehouseSelectionOptions {
  initialValue?: string;
  onChange?: (warehouse: string) => void;
  locationType?: 'pallet' | 'office' | 'shelves';
}

export function useDefaultWarehouseSelection(options: UseDefaultWarehouseSelectionOptions = {}) {
  const { inventorySettings } = useSettings();
  const { initialValue, onChange, locationType = 'shelves' } = options;
  
  const [value, setValue] = useState(initialValue || '');
  const [hasManualOverride, setHasManualOverride] = useState(!!initialValue);
  const defaultAppliedRef = useRef(false);
  
  // Apply default warehouse when settings hydrate (only once)
  useEffect(() => {
    // Skip if:
    // 1. Default already applied
    // 2. User has made manual selection
    // 3. No default warehouse configured
    // 4. Initial value was provided (edit mode)
    if (
      defaultAppliedRef.current ||
      hasManualOverride ||
      !inventorySettings.defaultWarehouse ||
      initialValue
    ) {
      return;
    }
    
    const defaultWarehouse = inventorySettings.defaultWarehouse;
    setValue(defaultWarehouse);
    onChange?.(defaultWarehouse);
    defaultAppliedRef.current = true;
  }, [inventorySettings.defaultWarehouse, hasManualOverride, initialValue, onChange]);
  
  // Sync with external value changes
  useEffect(() => {
    if (initialValue !== undefined && initialValue !== value) {
      setValue(initialValue);
      setHasManualOverride(true);
    }
  }, [initialValue, value]);
  
  const handleChange = (newValue: string, isManual = true) => {
    setValue(newValue);
    setHasManualOverride(isManual);
    onChange?.(newValue);
  };
  
  return {
    value,
    setValue: handleChange,
    hasManualOverride,
    applyDefaultOnce: () => {
      if (inventorySettings.defaultWarehouse && !hasManualOverride) {
        setValue(inventorySettings.defaultWarehouse);
        onChange?.(inventorySettings.defaultWarehouse);
        defaultAppliedRef.current = true;
      }
    },
  };
}

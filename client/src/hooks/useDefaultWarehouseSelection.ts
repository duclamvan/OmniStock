import { useState, useEffect, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

interface UseDefaultWarehouseSelectionOptions {
  initialValue?: string;
  onChange?: (warehouse: string) => void;
  locationType?: 'pallet' | 'office' | 'shelves';
  manualEntry?: boolean;
}

interface LocationDefaults {
  aisle: string;
  rack: string;
  level: string;
  bin: string;
}

function getLocationDefaultsByType(type: 'pallet' | 'office' | 'shelves'): LocationDefaults {
  switch (type) {
    case 'pallet':
      return { aisle: 'P01', rack: '', level: '', bin: '' };
    case 'office':
      return { aisle: 'OFF', rack: '', level: '', bin: '' };
    case 'shelves':
    default:
      return { aisle: 'A01', rack: 'R01', level: 'L01', bin: 'B1' };
  }
}

export function useDefaultWarehouseSelection(options: UseDefaultWarehouseSelectionOptions = {}) {
  const { inventorySettings } = useSettings();
  const { initialValue, onChange } = options;
  
  // FIX 3: Manage locationType state (previously areaType in component)
  const [locationType, setLocationType] = useState<'pallet' | 'office' | 'shelves'>(
    options.locationType || 
    (localStorage.getItem('warehouse-location-storage-type') as 'pallet' | 'office' | 'shelves') || 
    'shelves'
  );
  
  // FIX 3: Manage manualEntry state (previously in component)
  const [manualEntry, setManualEntry] = useState(
    options.manualEntry ?? 
    (localStorage.getItem('warehouse-location-manual-entry') === 'true')
  );
  
  const [value, setValue] = useState(initialValue || '');
  const [hasManualOverride, setHasManualOverride] = useState(!!initialValue);
  
  // FIX 1: Track previous default value instead of boolean flag
  const prevDefaultRef = useRef<string>();
  
  // FIX 3: Sync locationType to localStorage
  useEffect(() => {
    localStorage.setItem('warehouse-location-storage-type', locationType);
  }, [locationType]);
  
  // FIX 3: Sync manualEntry to localStorage
  useEffect(() => {
    localStorage.setItem('warehouse-location-manual-entry', String(manualEntry));
  }, [manualEntry]);
  
  // FIX 1: Apply default warehouse when settings hydrate or change
  useEffect(() => {
    const currentDefault = inventorySettings.defaultWarehouse;
    
    // Skip if no default configured
    if (!currentDefault) return;
    
    // Skip if initial value was provided (edit mode)
    if (initialValue) {
      // Track the current default even in edit mode
      prevDefaultRef.current = currentDefault;
      return;
    }
    
    // Check if default has CHANGED since last application
    const defaultChanged = prevDefaultRef.current !== currentDefault;
    
    // Apply default if:
    // 1. Settings just arrived (prevDefault was undefined)
    // 2. OR default changed and user hasn't manually overridden
    if ((prevDefaultRef.current === undefined || defaultChanged) && !hasManualOverride) {
      setValue(currentDefault);
      onChange?.(currentDefault);
      prevDefaultRef.current = currentDefault;
    }
    
    // Track the last seen default (even if not applied due to manual override)
    if (defaultChanged) {
      prevDefaultRef.current = currentDefault;
    }
  }, [inventorySettings.defaultWarehouse, hasManualOverride, initialValue, onChange]);
  
  // Sync with external value changes (only when initialValue changes, not on internal value changes)
  const prevInitialValueRef = useRef<string | undefined>(initialValue);
  useEffect(() => {
    // Only update if initialValue actually changed from external source
    if (initialValue !== undefined && initialValue !== prevInitialValueRef.current) {
      prevInitialValueRef.current = initialValue;
      if (initialValue !== value) {
        setValue(initialValue);
        setHasManualOverride(true);
      }
    }
  }, [initialValue]); // Remove 'value' from deps to prevent loop
  
  const handleChange = (newValue: string, isManual = true) => {
    setValue(newValue);
    setHasManualOverride(isManual);
    onChange?.(newValue);
  };
  
  const handleLocationTypeChange = (newType: 'pallet' | 'office' | 'shelves') => {
    setLocationType(newType);
  };
  
  const handleManualEntryChange = (newManualEntry: boolean) => {
    setManualEntry(newManualEntry);
  };
  
  // FIX 2: Return locationType and locationDefaults
  return {
    value,
    setValue: handleChange,
    hasManualOverride,
    locationType,
    setLocationType: handleLocationTypeChange,
    manualEntry,
    setManualEntry: handleManualEntryChange,
    locationDefaults: getLocationDefaultsByType(locationType),
  };
}

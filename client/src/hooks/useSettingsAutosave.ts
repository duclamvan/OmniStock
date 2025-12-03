import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { camelToSnake, deepCamelToSnake } from '@/utils/caseConverters';
import { useToast } from '@/hooks/use-toast';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const valuesAreEqual = (a: any, b: any): boolean => {
  const isUnsetA = a === null || a === undefined || a === '';
  const isUnsetB = b === null || b === undefined || b === '';
  
  if (isUnsetA && isUnsetB) return true;
  if (isUnsetA || isUnsetB) return false;
  
  return a === b;
};

interface UseSettingsAutosaveOptions<T extends Record<string, any>> {
  category: string;
  originalValues: T;
  getCurrentValue: (fieldName: keyof T) => any;
  onSaveSuccess?: (fieldName: keyof T, value: any) => void;
  onSaveError?: (fieldName: keyof T, error: any) => void;
}

interface UseSettingsAutosaveReturn<T extends Record<string, any>> {
  saveField: (fieldName: keyof T, value: any) => Promise<void>;
  handleSelectChange: (fieldName: keyof T) => (value: string) => void;
  handleCheckboxChange: (fieldName: keyof T) => (checked: boolean) => void;
  handleTextBlur: (fieldName: keyof T) => () => void;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  pendingChanges: Set<keyof T>;
  markPendingChange: (fieldName: keyof T) => void;
  clearPendingChange: (fieldName: keyof T) => void;
  hasPendingChanges: boolean;
  saveAllPending: () => Promise<void>;
}

export function useSettingsAutosave<T extends Record<string, any>>({
  category,
  originalValues,
  getCurrentValue,
  onSaveSuccess,
  onSaveError,
}: UseSettingsAutosaveOptions<T>): UseSettingsAutosaveReturn<T> {
  const { toast } = useToast();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Set<keyof T>>(new Set());
  
  const originalValuesRef = useRef<T>(originalValues);
  
  useEffect(() => {
    originalValuesRef.current = originalValues;
  }, [originalValues]);

  const saveMutation = useMutation({
    mutationFn: async ({ fieldName, value }: { fieldName: keyof T; value: any }) => {
      const cleanValue = (value === '' || value === undefined) ? null : value;
      
      await apiRequest('POST', '/api/settings', {
        key: camelToSnake(String(fieldName)),
        value: deepCamelToSnake(cleanValue),
        category,
      });
      
      return { fieldName, value };
    },
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: async ({ fieldName, value }) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      
      setPendingChanges((prev) => {
        const next = new Set(prev);
        next.delete(fieldName);
        return next;
      });
      
      originalValuesRef.current = {
        ...originalValuesRef.current,
        [fieldName]: value,
      };
      
      onSaveSuccess?.(fieldName, value);
      
      setTimeout(() => {
        setSaveStatus((current) => (current === 'saved' ? 'idle' : current));
      }, 2000);
    },
    onError: (error: any, { fieldName }) => {
      setSaveStatus('error');
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save setting',
      });
      
      onSaveError?.(fieldName, error);
      
      setTimeout(() => {
        setSaveStatus((current) => (current === 'error' ? 'idle' : current));
      }, 3000);
    },
  });

  const saveField = useCallback(
    async (fieldName: keyof T, value: any): Promise<void> => {
      const originalValue = originalValuesRef.current[fieldName];
      
      if (valuesAreEqual(value, originalValue)) {
        setPendingChanges((prev) => {
          const next = new Set(prev);
          next.delete(fieldName);
          return next;
        });
        return;
      }
      
      await saveMutation.mutateAsync({ fieldName, value });
    },
    [saveMutation]
  );

  const handleSelectChange = useCallback(
    (fieldName: keyof T) => (value: string) => {
      saveField(fieldName, value);
    },
    [saveField]
  );

  const handleCheckboxChange = useCallback(
    (fieldName: keyof T) => (checked: boolean) => {
      saveField(fieldName, checked);
    },
    [saveField]
  );

  const handleTextBlur = useCallback(
    (fieldName: keyof T) => () => {
      const currentValue = getCurrentValue(fieldName);
      const originalValue = originalValuesRef.current[fieldName];
      
      if (!valuesAreEqual(currentValue, originalValue)) {
        saveField(fieldName, currentValue);
      } else {
        setPendingChanges((prev) => {
          const next = new Set(prev);
          next.delete(fieldName);
          return next;
        });
      }
    },
    [getCurrentValue, saveField]
  );

  const markPendingChange = useCallback((fieldName: keyof T) => {
    setPendingChanges((prev) => new Set(prev).add(fieldName));
  }, []);

  const clearPendingChange = useCallback((fieldName: keyof T) => {
    setPendingChanges((prev) => {
      const next = new Set(prev);
      next.delete(fieldName);
      return next;
    });
  }, []);

  const saveAllPending = useCallback(async (): Promise<void> => {
    const pendingFieldNames = Array.from(pendingChanges);
    
    const savePromises = pendingFieldNames.map((fieldName) => {
      const currentValue = getCurrentValue(fieldName);
      return saveField(fieldName, currentValue);
    });
    
    await Promise.all(savePromises);
  }, [pendingChanges, getCurrentValue, saveField]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChanges.size > 0) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pendingChanges]);

  return {
    saveField,
    handleSelectChange,
    handleCheckboxChange,
    handleTextBlur,
    saveStatus,
    lastSavedAt,
    pendingChanges,
    markPendingChange,
    clearPendingChange,
    hasPendingChanges: pendingChanges.size > 0,
    saveAllPending,
  };
}

export { valuesAreEqual };

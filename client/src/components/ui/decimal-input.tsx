import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { parseDecimal } from "@/lib/utils";

export interface DecimalInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> {
  value: number | string;
  onChange: (value: number) => void;
  step?: string;
  min?: string | number;
  max?: string | number;
}

const DecimalInput = forwardRef<HTMLInputElement, DecimalInputProps>(
  ({ value, onChange, step = "0.01", min, max, onKeyDown, onFocus, onBlur, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState<string>(() => 
      value === 0 || value === '' ? '' : String(value)
    );
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) {
        setInternalValue(value === 0 || value === '' ? '' : String(value));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let rawValue = e.target.value;
      // Replace comma with dot for decimal separator
      rawValue = rawValue.replace(',', '.');
      
      // Allow empty, negative sign, or valid decimal pattern
      if (rawValue === '' || rawValue === '-' || rawValue === '.' || /^-?[0-9]*\.?[0-9]*$/.test(rawValue)) {
        setInternalValue(rawValue);
        
        // Don't update parent if incomplete
        if (rawValue === '' || rawValue === '-' || rawValue === '.' || rawValue.endsWith('.')) {
          return;
        }
        
        const parsed = parseDecimal(rawValue);
        onChange(parsed);
      }
    };

    const handleBlurWrapper = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const parsed = parseDecimal(internalValue);
      onChange(parsed);
      setInternalValue(parsed === 0 ? '' : String(parsed));
      onBlur?.(e);
    };

    const handleFocusWrapper = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      e.target.select();
      onFocus?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={internalValue}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onFocus={handleFocusWrapper}
        onBlur={handleBlurWrapper}
        {...props}
      />
    );
  }
);

DecimalInput.displayName = "DecimalInput";

export { DecimalInput };

import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { parseDecimal, handleDecimalKeyDown } from "@/lib/utils";

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
      const rawValue = e.target.value;
      setInternalValue(rawValue);
      
      if (rawValue === '' || rawValue === '-') {
        return;
      }
      
      if (rawValue.endsWith('.') || rawValue.endsWith(',')) {
        return;
      }
      
      const parsed = parseDecimal(rawValue);
      onChange(parsed);
    };

    const handleBlurWrapper = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const parsed = parseDecimal(internalValue);
      onChange(parsed);
      setInternalValue(parsed === 0 ? '' : String(parsed));
      onBlur?.(e);
    };

    const handleKeyDownWrapper = (e: React.KeyboardEvent<HTMLInputElement>) => {
      handleDecimalKeyDown(e);
      onKeyDown?.(e);
    };

    const handleFocusWrapper = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      e.target.select();
      onFocus?.(e);
    };

    return (
      <Input
        ref={ref}
        type="number"
        step={step}
        min={min}
        max={max}
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDownWrapper}
        onFocus={handleFocusWrapper}
        onBlur={handleBlurWrapper}
        {...props}
      />
    );
  }
);

DecimalInput.displayName = "DecimalInput";

export { DecimalInput };

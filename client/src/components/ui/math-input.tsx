import { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function evaluateMathExpression(expression: string): number | null {
  if (!expression || expression.trim() === "") return null;
  
  const cleaned = expression.replace(/\s/g, "");
  
  if (/^-?\d+\.?\d*$/.test(cleaned)) {
    return parseFloat(cleaned);
  }
  
  if (!/^[\d+\-*/().]+$/.test(cleaned)) {
    return null;
  }
  
  try {
    const tokens = cleaned.match(/(\d+\.?\d*|[+\-*/()])/g);
    if (!tokens) return null;
    
    let result = 0;
    let currentNumber = 0;
    let pendingOperator = "+";
    let i = 0;
    
    const values: number[] = [];
    const operators: string[] = [];
    
    while (i < tokens.length) {
      const token = tokens[i];
      
      if (/^\d+\.?\d*$/.test(token)) {
        let num = parseFloat(token);
        
        while (i + 2 < tokens.length && (tokens[i + 1] === "*" || tokens[i + 1] === "/")) {
          const op = tokens[i + 1];
          const nextNum = parseFloat(tokens[i + 2]);
          if (op === "*") {
            num *= nextNum;
          } else {
            num /= nextNum;
          }
          i += 2;
        }
        
        values.push(num);
      } else if (token === "+" || token === "-") {
        operators.push(token);
      }
      
      i++;
    }
    
    if (values.length === 0) return null;
    
    result = values[0];
    for (let j = 0; j < operators.length && j + 1 < values.length; j++) {
      if (operators[j] === "+") {
        result += values[j + 1];
      } else {
        result -= values[j + 1];
      }
    }
    
    return isNaN(result) || !isFinite(result) ? null : result;
  } catch {
    return null;
  }
}

interface MathInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  isInteger?: boolean;
  allowNegative?: boolean;
}

const MathInput = forwardRef<HTMLInputElement, MathInputProps>(
  ({ value, onChange, min, max, step = 1, isInteger = false, allowNegative = false, className, onBlur, onFocus, onKeyDown, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>(String(value));
    const [isFocused, setIsFocused] = useState(false);
    const [hasExpression, setHasExpression] = useState(false);

    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(String(value));
        setHasExpression(false);
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setDisplayValue(inputValue);
      
      const hasMathOperators = /[+\-*/]/.test(inputValue.replace(/^-/, ""));
      setHasExpression(hasMathOperators);
      
      if (!hasMathOperators) {
        const numValue = parseFloat(inputValue);
        if (!isNaN(numValue)) {
          let finalValue = isInteger ? Math.floor(numValue) : numValue;
          if (min !== undefined) finalValue = Math.max(min, finalValue);
          if (max !== undefined) finalValue = Math.min(max, finalValue);
          if (!allowNegative && finalValue < 0) finalValue = 0;
          onChange(finalValue);
        }
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      const result = evaluateMathExpression(displayValue);
      if (result !== null) {
        let finalValue = isInteger ? Math.round(result) : result;
        if (min !== undefined) finalValue = Math.max(min, finalValue);
        if (max !== undefined) finalValue = Math.min(max, finalValue);
        if (!allowNegative && finalValue < 0) finalValue = 0;
        
        if (isInteger) {
          finalValue = Math.round(finalValue);
        } else {
          finalValue = Math.round(finalValue * 100) / 100;
        }
        
        onChange(finalValue);
        setDisplayValue(String(finalValue));
      } else {
        setDisplayValue(String(value));
      }
      
      setHasExpression(false);
      onBlur?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      e.target.select();
      onFocus?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        
        const result = evaluateMathExpression(displayValue);
        if (result !== null) {
          let finalValue = isInteger ? Math.round(result) : result;
          if (min !== undefined) finalValue = Math.max(min, finalValue);
          if (max !== undefined) finalValue = Math.min(max, finalValue);
          if (!allowNegative && finalValue < 0) finalValue = 0;
          
          if (isInteger) {
            finalValue = Math.round(finalValue);
          } else {
            finalValue = Math.round(finalValue * 100) / 100;
          }
          
          onChange(finalValue);
          setDisplayValue(String(finalValue));
          setHasExpression(false);
        }
        return;
      }
      onKeyDown?.(e);
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={cn(
            hasExpression && "ring-2 ring-blue-400 ring-offset-1",
            className
          )}
          {...props}
        />
        {hasExpression && (
          <div className="absolute -top-6 left-0 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
            = {evaluateMathExpression(displayValue)?.toFixed(isInteger ? 0 : 2) ?? "?"}
          </div>
        )}
      </div>
    );
  }
);

MathInput.displayName = "MathInput";

export { MathInput, evaluateMathExpression };

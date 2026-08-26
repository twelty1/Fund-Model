import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  isHighlighted?: boolean;
  tooltip?: string;
  disabled?: boolean;
}

export type { InputFieldProps };

const formatWithCommas = (num: number): string => {
  return num.toLocaleString('en-US');
};

const parseFromCommas = (str: string): number => {
  const cleaned = str.replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

export function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min,
  max,
  isHighlighted = true,
  disabled = false,
}: InputFieldProps) {
  const [displayValue, setDisplayValue] = useState(formatWithCommas(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatWithCommas(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^[\d,.-]*$/.test(raw)) {
      setDisplayValue(raw);
      const parsed = parseFromCommas(raw);
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    let parsed = parseFromCommas(displayValue);
    if (min !== undefined && parsed < min) parsed = min;
    if (max !== undefined && parsed > max) parsed = max;
    onChange(parsed);
    setDisplayValue(formatWithCommas(parsed));
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[11px] text-muted-foreground shrink-0">
        {label}
      </Label>
      <div className="relative w-28">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">
            {prefix}
          </span>
        )}
        <Input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            "font-mono text-xs h-7 transition-all",
            prefix && "pl-5",
            suffix && "pr-6",
            isHighlighted && "input-highlight",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

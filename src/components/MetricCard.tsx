import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Info } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  formula?: string;
  formulaDescription?: string;
}

export function MetricCard({ 
  label, 
  value, 
  variant = 'default',
  size = 'md',
  formula,
  formulaDescription,
}: MetricCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  };

  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const hasFormula = formula || formulaDescription;

  const content = (
    <div className={cn("metric-card", hasFormula && "cursor-pointer hover:bg-muted/50 transition-colors")}>
      <div className="flex items-center gap-1">
        <p className="stat-label mb-0.5">{label}</p>
        {hasFormula && <Info className="w-3 h-3 text-muted-foreground" />}
      </div>
      <p className={cn("font-mono font-semibold tracking-tight", sizeStyles[size], variantStyles[variant])}>
        {value}
      </p>
    </div>
  );

  if (!hasFormula) {
    return content;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {content}
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label} Formula</p>
          {formula && (
            <code className="block text-sm font-mono bg-muted/50 p-2 rounded border border-border whitespace-pre-wrap">
              {formula}
            </code>
          )}
          {formulaDescription && (
            <p className="text-xs text-muted-foreground">{formulaDescription}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

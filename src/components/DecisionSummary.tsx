import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DecisionSummaryProps {
  decision: 'INVEST' | 'SKIP';
  confidence: number;
  moic: number;
  irr: number;
  onClick?: () => void;
}

export function DecisionSummary({ decision, confidence, moic, irr, onClick }: DecisionSummaryProps) {
  const isInvest = decision === 'INVEST';

  return (
    <div 
      onClick={onClick}
      className={cn(
        "border-t bg-card px-4 py-2 flex items-center justify-between cursor-pointer transition-colors",
        isInvest 
          ? "border-success/30 hover:bg-success/5" 
          : "border-destructive/30 hover:bg-destructive/5"
      )}
    >
      <div className="flex items-center gap-2">
        {isInvest ? (
          <CheckCircle2 className="w-4 h-4 text-success" />
        ) : (
          <XCircle className="w-4 h-4 text-destructive" />
        )}
        <span className={cn(
          "text-sm font-semibold",
          isInvest ? "text-success" : "text-destructive"
        )}>
          {decision}
        </span>
      </div>
      
      <div className="flex items-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Conf:</span>
          <span className={cn(
            "font-mono font-medium",
            confidence >= 70 ? "text-success" : confidence >= 40 ? "text-warning" : "text-destructive"
          )}>
            {confidence}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">MOIC:</span>
          <span className="font-mono font-medium">{moic.toFixed(2)}x</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">IRR:</span>
          <span className="font-mono font-medium">{irr.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

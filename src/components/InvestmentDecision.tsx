import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvestmentDecisionProps {
  decision: 'INVEST' | 'SKIP';
  confidence: number;
  moic: number;
  irr: number;
}

export function InvestmentDecision({ decision, confidence, moic, irr }: InvestmentDecisionProps) {
  const isInvest = decision === 'INVEST';

  return (
    <div className={cn(
      "rounded-md p-3 border transition-all",
      isInvest 
        ? "border-success/50 bg-success/5" 
        : "border-destructive/50 bg-destructive/5"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isInvest ? (
            <CheckCircle2 className="w-6 h-6 text-success" />
          ) : (
            <XCircle className="w-6 h-6 text-destructive" />
          )}
          <div>
            <h2 className={cn(
              "text-xl font-bold tracking-tight",
              isInvest ? "text-success" : "text-destructive"
            )}>
              {decision}
            </h2>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Confidence</p>
            <p className={cn(
              "font-mono font-semibold",
              confidence >= 70 ? "text-success" : confidence >= 40 ? "text-warning" : "text-destructive"
            )}>
              {confidence}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">MOIC</p>
            <p className="font-mono font-semibold">{moic.toFixed(2)}x</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Net IRR</p>
            <p className="font-mono font-semibold">{irr.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

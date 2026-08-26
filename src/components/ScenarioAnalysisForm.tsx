import { ScenarioAnalysis } from '@/types/fundModel';
import { InputField } from './InputField';
import { SectionCard } from './SectionCard';
import { formatCurrency } from '@/utils/calculations';

interface Props {
  data: ScenarioAnalysis;
  onChange: (data: ScenarioAnalysis) => void;
}

export function ScenarioAnalysisForm({ data, onChange }: Props) {
  const update = (field: keyof ScenarioAnalysis, value: number) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <SectionCard title="Scenario Analysis">
      <div className="space-y-2">
        <InputField
          label="Exit Revenue"
          value={data.exitRevenue / 1000000}
          onChange={(v) => update('exitRevenue', v * 1000000)}
          prefix="$"
          suffix="M"
          step={1}
        />
        <InputField
          label="Market Discount"
          value={data.marketDiscount}
          onChange={(v) => update('marketDiscount', v)}
          suffix="%"
          step={1}
          min={0}
          max={50}
        />
        
        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] uppercase tracking-wide text-destructive/80 mb-2">Worst Case</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">EV/Rev Multiple</span>
              <span className="text-sm font-mono text-foreground">{data.worstCaseMultiple.toFixed(2)}x</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Value</span>
              <span className="text-sm font-mono text-foreground">{formatCurrency(data.exitRevenue * data.worstCaseMultiple)}</span>
            </div>
            <InputField
              label="Probability"
              value={data.worstCaseProbability}
              onChange={(v) => update('worstCaseProbability', v)}
              suffix="%"
              step={5}
              min={0}
              max={100}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Base Case</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">EV/Rev Multiple</span>
              <span className="text-sm font-mono text-foreground">{data.baseCaseMultiple.toFixed(2)}x</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Value</span>
              <span className="text-sm font-mono text-foreground">{formatCurrency(data.exitRevenue * data.baseCaseMultiple)}</span>
            </div>
            <InputField
              label="Probability"
              value={data.baseCaseProbability}
              onChange={(v) => update('baseCaseProbability', v)}
              suffix="%"
              step={5}
              min={0}
              max={100}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] uppercase tracking-wide text-success/80 mb-2">Best Case</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">EV/Rev Multiple</span>
              <span className="text-sm font-mono text-foreground">{data.bestCaseMultiple.toFixed(2)}x</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Value</span>
              <span className="text-sm font-mono text-foreground">{formatCurrency(data.exitRevenue * data.bestCaseMultiple)}</span>
            </div>
            <InputField
              label="Probability"
              value={data.bestCaseProbability}
              onChange={(v) => update('bestCaseProbability', v)}
              suffix="%"
              step={5}
              min={0}
              max={100}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

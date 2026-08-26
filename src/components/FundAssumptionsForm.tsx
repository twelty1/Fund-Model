import { FundAssumptions, ManagementFeePeriod } from '@/types/fundModel';
import { InputField } from './InputField';
import { SectionCard } from './SectionCard';
import { Button } from './ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  data: FundAssumptions;
  onChange: (data: FundAssumptions) => void;
}

export function FundAssumptionsForm({ data, onChange }: Props) {
  const update = (field: keyof FundAssumptions, value: number) => {
    onChange({ ...data, [field]: value });
  };

  const periods = data.managementFeePeriods ?? [];

  const updatePeriod = (index: number, field: keyof ManagementFeePeriod, value: number) => {
    const updated = periods.map((p, i) => i === index ? { ...p, [field]: value } : p);
    onChange({ ...data, managementFeePeriods: updated });
  };

  const addPeriod = () => {
    const lastEnd = periods.length > 0 ? periods[periods.length - 1].endYear : 0;
    const newPeriod: ManagementFeePeriod = {
      startYear: lastEnd + 1,
      endYear: Math.min(lastEnd + 5, data.fundOperationYears),
      feePercent: 2.0,
    };
    onChange({ ...data, managementFeePeriods: [...periods, newPeriod] });
  };

  const removePeriod = (index: number) => {
    onChange({ ...data, managementFeePeriods: periods.filter((_, i) => i !== index) });
  };

  return (
    <SectionCard title="Fund Assumptions">
      <div className="space-y-2">
        <InputField
          label="Fund Size"
          value={data.fundSize / 1000000}
          onChange={(v) => update('fundSize', v * 1000000)}
          prefix="$"
          suffix="M"
          step={1}
        />

        {/* Management Fee Periods */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Management Fees by Period</label>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={addPeriod}>
              <Plus className="w-3 h-3" /> Add Period
            </Button>
          </div>
          {periods.length === 0 && (
            <InputField
              label="Management Fee (flat)"
              value={data.managementFeePercent}
              onChange={(v) => update('managementFeePercent', v)}
              suffix="%"
              step={0.1}
              min={0}
              max={5}
            />
          )}
          {periods.map((period, index) => (
            <div key={index} className="flex items-end gap-2 bg-muted/30 border border-border/50 rounded-md p-2">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <InputField
                  label={index === 0 ? "Start Yr" : ""}
                  value={period.startYear}
                  onChange={(v) => updatePeriod(index, 'startYear', v)}
                  step={1}
                  min={1}
                  max={data.fundOperationYears}
                />
                <InputField
                  label={index === 0 ? "End Yr" : ""}
                  value={period.endYear}
                  onChange={(v) => updatePeriod(index, 'endYear', v)}
                  step={1}
                  min={period.startYear}
                  max={data.fundOperationYears}
                />
                <InputField
                  label={index === 0 ? "Fee %" : ""}
                  value={period.feePercent}
                  onChange={(v) => updatePeriod(index, 'feePercent', v)}
                  suffix="%"
                  step={0.1}
                  min={0}
                  max={5}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removePeriod(index)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <InputField
          label="Carried Interest"
          value={data.carriedInterestPercent}
          onChange={(v) => update('carriedInterestPercent', v)}
          suffix="%"
          step={1}
          min={0}
          max={30}
        />
        <InputField
          label="GP Committed"
          value={data.gpCommittedCapitalPercent}
          onChange={(v) => update('gpCommittedCapitalPercent', v)}
          suffix="%"
          step={0.5}
          min={0}
          max={10}
        />
        <InputField
          label="Investment Period"
          value={data.investmentPeriodYears}
          onChange={(v) => update('investmentPeriodYears', v)}
          suffix="yrs"
          step={1}
          min={1}
          max={10}
        />
        <InputField
          label="Fund Life"
          value={data.fundOperationYears}
          onChange={(v) => update('fundOperationYears', v)}
          suffix="yrs"
          step={1}
          min={5}
          max={15}
        />
        <InputField
          label="Fees Recycled"
          value={data.managementFeesRecycledPercent}
          onChange={(v) => update('managementFeesRecycledPercent', v)}
          suffix="%"
          step={5}
          min={0}
          max={100}
        />
        <InputField
          label="Fund Already Committed"
          value={data.fundAlreadyCommittedPercent}
          onChange={(v) => update('fundAlreadyCommittedPercent', v)}
          suffix="%"
          step={1}
          min={0}
          max={100}
        />
      </div>
    </SectionCard>
  );
}

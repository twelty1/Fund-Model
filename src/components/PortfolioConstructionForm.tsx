import { PortfolioConstruction, FollowOnRound } from '@/types/fundModel';
import { InputField } from './InputField';
import { SectionCard } from './SectionCard';
import { Button } from './ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  data: PortfolioConstruction;
  onChange: (data: PortfolioConstruction) => void;
}

export function PortfolioConstructionForm({ data, onChange }: Props) {
  const update = (field: keyof Omit<PortfolioConstruction, 'followOnRounds'>, value: number) => {
    onChange({ ...data, [field]: value });
  };

  const updateRound = (index: number, field: keyof FollowOnRound, value: number) => {
    const newRounds = [...data.followOnRounds];
    newRounds[index] = { ...newRounds[index], [field]: value };
    onChange({ ...data, followOnRounds: newRounds });
  };

  const addRound = () => {
    const newRound: FollowOnRound = { fundPercent: 50, followOnRate: 50 };
    onChange({ ...data, followOnRounds: [...data.followOnRounds, newRound] });
  };

  const removeRound = (index: number) => {
    const newRounds = data.followOnRounds.filter((_, i) => i !== index);
    onChange({ ...data, followOnRounds: newRounds });
  };

  return (
    <SectionCard title="Portfolio Construction">
      <div className="space-y-4">
        <div className="space-y-2">
          <InputField
            label="Reserve Capital"
            value={data.reserveCapitalPercent}
            onChange={(v) => update('reserveCapitalPercent', v)}
            suffix="%"
            step={5}
            min={0}
            max={80}
          />
          <InputField
            label="Portfolio Companies"
            value={data.portfolioCompaniesCount}
            onChange={(v) => update('portfolioCompaniesCount', v)}
            step={1}
            min={1}
            max={100}
          />
        </div>

        {/* Follow-on Rounds */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Follow-on Rounds ({data.followOnRounds.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={addRound}
              className="h-7 text-xs gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Round
            </Button>
          </div>

          {data.followOnRounds.map((round, index) => (
            <div 
              key={index} 
              className="p-3 bg-muted/30 border border-border rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">
                  Reserve {index + 1}
                </span>
                {data.followOnRounds.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRound(index)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <InputField
                label="Total % of Reserve Fund"
                value={round.fundPercent}
                onChange={(v) => updateRound(index, 'fundPercent', v)}
                suffix="%"
                step={5}
                min={0}
                max={100}
              />
              <InputField
                label={index === 0 ? "Portfolio Co %" : `% of R${index} Cos`}
                value={round.followOnRate}
                onChange={(v) => updateRound(index, 'followOnRate', v)}
                suffix="%"
                step={5}
                min={0}
                max={100}
              />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

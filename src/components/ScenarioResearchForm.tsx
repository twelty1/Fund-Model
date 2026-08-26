import { useEffect } from 'react';
import { ComparableCompany } from '@/types/fundModel';
import { SectionCard } from './SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export interface EvRevStats {
  max: number | null;
  median: number | null;
  min: number | null;
  avg: number | null;
}

interface Props {
  comparables: ComparableCompany[];
  onChange: (comparables: ComparableCompany[]) => void;
  onStatsChange?: (stats: EvRevStats) => void;
}

const createEmptyCompany = (): ComparableCompany => ({
  id: crypto.randomUUID(),
  name: '',
  ev: null,
  revenue: null,
  ipoExitValuation: null,
  ipoTimeYears: null,
  expectedIpoTimeYears: null,
});


const formatNumber = (value: number | null): string => {
  if (value === null || value === 0) return '';
  return value.toLocaleString();
};

const parseNumber = (value: string): number | null => {
  const cleaned = value.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

export function ScenarioResearchForm({ comparables, onChange, onStatsChange }: Props) {
  const updateCompany = (id: string, field: keyof ComparableCompany, value: string | number | null) => {
    onChange(
      comparables.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    );
  };

  const addCompany = () => {
    onChange([...comparables, createEmptyCompany()]);
  };

  const removeCompany = (id: string) => {
    if (comparables.length > 1) {
      onChange(comparables.filter((c) => c.id !== id));
    }
  };

  // Calculate EV/Rev multiple
  const getEvRevMultiple = (company: ComparableCompany): string => {
    if (!company.ev || !company.revenue || company.revenue === 0) return '—';
    return (company.ev / company.revenue).toFixed(2) + 'x';
  };

  // Calculate summary statistics
  const validComps = comparables.filter((c) => c.ev && c.revenue && c.revenue > 0);
  const evRevMultiples = validComps.map((c) => c.ev! / c.revenue!);
  const ipoExitVals = comparables.filter((c) => c.ipoExitValuation).map((c) => c.ipoExitValuation!);
  const _ipoTimes = comparables.filter((c) => c.ipoTimeYears).map((c) => c.ipoTimeYears!);
  const _expectedIpoTimes = comparables.filter((c) => c.expectedIpoTimeYears).map((c) => c.expectedIpoTimeYears!);

  const calcStats = (arr: number[]) => {
    if (arr.length === 0) return { max: null, median: null, min: null, avg: null };
    const sorted = [...arr].sort((a, b) => a - b);
    const max = Math.max(...arr);
    const min = Math.min(...arr);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return { max, median, min, avg };
  };

  const evRevStats = calcStats(evRevMultiples);
  const ipoExitStats = calcStats(ipoExitVals);
  const _ipoTimeStats = calcStats(_ipoTimes);
  const _expectedIpoStats = calcStats(_expectedIpoTimes);

  // Emit stats when they change
  useEffect(() => {
    if (onStatsChange) {
      onStatsChange(evRevStats);
    }
  }, [evRevStats.max, evRevStats.median, evRevStats.min, evRevStats.avg, onStatsChange]);

  const formatStat = (val: number | null, suffix = ''): string => {
    if (val === null) return '—';
    return val.toFixed(2) + suffix;
  };

  return (
    <SectionCard title="Asset Financials">
      <div className="overflow-x-auto -mx-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium text-muted-foreground w-8">#</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground min-w-[140px]">Company</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground min-w-[90px]">EV ($M)</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground min-w-[90px]">Rev ($M)</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground min-w-[80px]">EV/Rev</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground min-w-[100px]">IPO Exit Val</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {comparables.map((company, index) => (
              <tr key={company.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-1 px-2 text-muted-foreground">{index + 1}</td>
                <td className="py-1 px-2">
                  <Input
                    value={company.name}
                    onChange={(e) => updateCompany(company.id, 'name', e.target.value)}
                    placeholder="Company name"
                    className="h-7 text-xs"
                  />
                </td>
                <td className="py-1 px-2">
                  <Input
                    value={formatNumber(company.ev)}
                    onChange={(e) => updateCompany(company.id, 'ev', parseNumber(e.target.value))}
                    placeholder="0"
                    className="h-7 text-xs text-right"
                  />
                </td>
                <td className="py-1 px-2">
                  <Input
                    value={formatNumber(company.revenue)}
                    onChange={(e) => updateCompany(company.id, 'revenue', parseNumber(e.target.value))}
                    placeholder="0"
                    className="h-7 text-xs text-right"
                  />
                </td>
                <td className="py-1 px-2 text-right font-mono text-muted-foreground">
                  {getEvRevMultiple(company)}
                </td>
                <td className="py-1 px-2">
                  <Input
                    value={formatNumber(company.ipoExitValuation)}
                    onChange={(e) => updateCompany(company.id, 'ipoExitValuation', parseNumber(e.target.value))}
                    placeholder="0"
                    className="h-7 text-xs text-right"
                  />
                </td>
                <td className="py-1 px-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCompany(company.id)}
                    disabled={comparables.length <= 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30">
            <tr className="border-b border-border/50">
              <td colSpan={4} className="py-1.5 px-2 text-right font-medium text-muted-foreground">Max</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatStat(evRevStats.max, 'x')}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatStat(ipoExitStats.max)}</td>
              <td></td>
            </tr>
            <tr className="border-b border-border/50">
              <td colSpan={4} className="py-1.5 px-2 text-right font-medium text-muted-foreground">Median</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatStat(evRevStats.median, 'x')}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatStat(ipoExitStats.median)}</td>
              <td></td>
            </tr>
            <tr className="border-b border-border/50">
              <td colSpan={4} className="py-1.5 px-2 text-right font-medium text-muted-foreground">Min</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatStat(evRevStats.min, 'x')}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatStat(ipoExitStats.min)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={4} className="py-1.5 px-2 text-right font-medium text-muted-foreground">Average</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatStat(evRevStats.avg, 'x')}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatStat(ipoExitStats.avg)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={addCompany}
        className="mt-3 gap-1.5"
      >
        <Plus className="h-3 w-3" />
        Add Company
      </Button>
    </SectionCard>
  );
}

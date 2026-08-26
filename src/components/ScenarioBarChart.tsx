import { ScenarioAnalysis } from '@/types/fundModel';
import { SectionCard } from './SectionCard';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts';

interface Props {
  data: ScenarioAnalysis;
}

export function ScenarioBarChart({ data }: Props) {
  const chartData = [
    {
      name: 'Worst',
      multiple: data.worstCaseMultiple,
      probability: data.worstCaseProbability,
      fill: 'hsl(var(--destructive))',
    },
    {
      name: 'Base',
      multiple: data.baseCaseMultiple,
      probability: data.baseCaseProbability,
      fill: 'hsl(var(--muted-foreground))',
    },
    {
      name: 'Best',
      multiple: data.bestCaseMultiple,
      probability: data.bestCaseProbability,
      fill: 'hsl(var(--success))',
    },
  ];

  const chartConfig = {
    multiple: { label: 'EV/Rev Multiple' },
    probability: { label: 'Probability' },
  };

  // Calculate weighted average terminal value
  const weightedAvgMultiple = 
    (data.worstCaseMultiple * data.worstCaseProbability +
     data.baseCaseMultiple * data.baseCaseProbability +
     data.bestCaseMultiple * data.bestCaseProbability) / 100;
  
  const weightedAvgTerminalValue = weightedAvgMultiple * data.exitRevenue * (1 - data.marketDiscount / 100);

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <SectionCard title="Scenario Comparison">
      <div className="h-48">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
            <XAxis type="number" tickFormatter={(v) => `${v}x`} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={50}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{item.payload.name} Case</span>
                      <span>Multiple: {item.payload.multiple}x</span>
                      <span>Probability: {item.payload.probability}%</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="multiple" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <div className="flex flex-col items-center gap-1 mt-2">
        <span className="text-[9px] text-muted-foreground/70">Probability</span>
        <div className="flex justify-center gap-4 text-[10px]">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-sm" 
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-muted-foreground">
                {item.name}: {item.probability}%
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Weighted Average Terminal Value */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Weighted Average Estimated Terminal Value</span>
          <span className="text-sm font-mono font-semibold text-foreground">
            {formatCurrency(weightedAvgTerminalValue)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground/70">Weighted Avg Multiple</span>
          <span className="text-xs font-mono text-muted-foreground">
            {weightedAvgMultiple.toFixed(2)}x
          </span>
        </div>
      </div>
    </SectionCard>
  );
}

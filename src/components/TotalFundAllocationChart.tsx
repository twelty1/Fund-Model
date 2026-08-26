import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FundAssumptions } from '@/types/fundModel';

interface Props {
  data: FundAssumptions;
}

export function TotalFundAllocationChart({ data }: Props) {
  const gpCommitted = data.fundSize * (data.gpCommittedCapitalPercent / 100);
  const lpCommitted = data.fundSize - gpCommitted;
  
  const chartData = [
    { 
      name: 'LP Committed Capital', 
      value: lpCommitted, 
      color: 'hsl(220, 70%, 50%)' // primary color
    },
    { 
      name: 'GP Committed Capital', 
      value: gpCommitted, 
      color: 'hsl(280, 60%, 50%)' // purple
    },
  ];

  const formatValue = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  const formatPercent = (value: number) => {
    return `${((value / data.fundSize) * 100).toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{item.name}</p>
          <p className="text-sm font-mono text-muted-foreground">
            {formatValue(item.value)} ({formatPercent(item.value)})
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = () => (
    <div className="flex flex-wrap justify-center gap-3 mt-2">
      {chartData.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div 
            className="w-2.5 h-2.5 rounded-sm" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.name}</span>
          <span className="text-xs font-mono text-foreground">{formatValue(entry.value)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="card-terminal rounded-md overflow-hidden h-full">
      <div className="section-header shrink-0">
        <span className="text-xs font-medium">Total Fund Allocation</span>
      </div>
      <div className="p-3">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center -mt-2 mb-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Committed</p>
          <p className="text-lg font-mono font-semibold text-foreground">
            ${(data.fundSize / 1000000).toFixed(0)}M
          </p>
        </div>
        {renderLegend()}
      </div>
    </div>
  );
}

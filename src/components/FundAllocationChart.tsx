import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { FundAssumptions } from '@/types/fundModel';
import { calculateTotalFeesFromPeriods, getFirstYearFee } from '@/utils/calculations';

interface Props {
  data: FundAssumptions;
  investableCapital: number;
}

export function FundAllocationChart({ data, investableCapital }: Props) {
  const totalManagementFees = calculateTotalFeesFromPeriods(data.fundSize, data.managementFeePeriods, data.managementFeePercent, data.fundOperationYears);
  const firstYearFee = getFirstYearFee(data.fundSize, data.managementFeePeriods, data.managementFeePercent);
  const recycledFees = firstYearFee * (data.managementFeesRecycledPercent / 100);
  
  // Net fees after recycling
  const netManagementFees = totalManagementFees - recycledFees;
  
  const baseInvestable = data.fundSize - totalManagementFees;

  // Already committed comes from investable capital (base + recycled)
  const totalInvestable = baseInvestable + recycledFees;
  const alreadyCommitted = totalInvestable * (data.fundAlreadyCommittedPercent / 100);
  const remainingInvestable = baseInvestable - alreadyCommitted;

  const chartData = [
    { 
      name: 'Remaining Investable', 
      value: remainingInvestable, 
      color: 'hsl(145, 60%, 42%)'
    },
    { 
      name: 'Already Committed', 
      value: alreadyCommitted, 
      color: 'hsl(35, 80%, 50%)'
    },
    { 
      name: '*Management Fees Recycled', 
      value: recycledFees, 
      color: 'hsl(220, 55%, 35%)'
    },
    { 
      name: 'Net Management Fees', 
      value: netManagementFees, 
      color: 'hsl(220, 70%, 50%)'
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

  const totalManagementFeesGross = netManagementFees + recycledFees;

  const renderLegend = () => (
    <div className="flex flex-col gap-2 mt-2">
      {/* Investable Capital Group */}
      <div className="border border-border/50 rounded-md px-2 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Investable Capital</span>
          <span className="text-[10px] font-mono text-muted-foreground">{formatValue(chartData[0].value + chartData[1].value)} ({formatPercent(chartData[0].value + chartData[1].value)})</span>
        </div>
        <div className="flex flex-col gap-1 pl-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: chartData[0].color }} />
              <span className="text-[11px] text-muted-foreground">{chartData[0].name}</span>
            </div>
            <span className="text-[11px] font-mono text-foreground">{formatValue(chartData[0].value)}</span>
          </div>
          {alreadyCommitted > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: chartData[1].color }} />
                <span className="text-[11px] text-muted-foreground">{chartData[1].name}</span>
              </div>
              <span className="text-[11px] font-mono text-foreground">{formatValue(chartData[1].value)}</span>
            </div>
          )}
        </div>
      </div>
      {/* Management Fees Group */}
      <div className="border border-border/50 rounded-md px-2 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Total Management Fees</span>
          <span className="text-[10px] font-mono text-muted-foreground">{formatValue(totalManagementFeesGross)} ({formatPercent(totalManagementFeesGross)})</span>
        </div>
        <div className="flex flex-col gap-1 pl-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: chartData[2].color }} />
              <span className="text-[11px] text-muted-foreground">Net Fees (Paid Out)</span>
            </div>
            <span className="text-[11px] font-mono text-foreground">{formatValue(chartData[2].value)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: chartData[3].color }} />
              <span className="text-[11px] text-muted-foreground">{chartData[3].name}</span>
            </div>
            <span className="text-[11px] font-mono text-foreground">{formatValue(chartData[3].value)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="card-terminal rounded-md overflow-hidden">
      <div className="section-header shrink-0">
        <span className="text-xs font-medium">Fund Allocation</span>
      </div>
      <div className="p-3">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.filter(d => d.value > 0)}
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
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Fund Size</p>
          <p className="text-lg font-mono font-semibold text-foreground">
            ${(data.fundSize / 1000000).toFixed(0)}M
          </p>
        </div>
        {renderLegend()}
      </div>
    </div>
  );
}

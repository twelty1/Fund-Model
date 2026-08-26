import { CalculatedMetrics, PortfolioConstruction, FundAssumptions, ScenarioAnalysis } from '@/types/fundModel';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  metrics: CalculatedMetrics;
  portfolioConstruction: PortfolioConstruction;
  fundAssumptions: FundAssumptions;
  scenarioAnalysis: ScenarioAnalysis;
  ownershipAtExitFromDilution: number;
}

export function ExitOwnershipChart({ metrics, portfolioConstruction, fundAssumptions, scenarioAnalysis, ownershipAtExitFromDilution }: Props) {
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const { followOnRounds } = portfolioConstruction;
  const reserveCapital = metrics.investableCapital * (portfolioConstruction.reserveCapitalPercent / 100);
  let companiesRemaining = portfolioConstruction.portfolioCompaniesCount;
  const followOnAmounts = followOnRounds.map((round) => {
    const roundCapital = reserveCapital * (round.fundPercent / 100);
    const companiesGettingRound = companiesRemaining * (round.followOnRate / 100);
    const avgFollowOn = companiesGettingRound > 0 ? roundCapital / companiesGettingRound : 0;
    companiesRemaining = companiesGettingRound;
    return avgFollowOn;
  });

  const avgFollowOn1 = followOnAmounts[0] || 0;
  const avgFollowOn2 = followOnAmounts[1] || 0;
  const originalCapitalInvested = metrics.averageInitialInvestment;
  const totalFollowOn = avgFollowOn1 + avgFollowOn2;
  const totalCapitalDeployed = originalCapitalInvested + totalFollowOn;
  const exitOwnershipPercent = ownershipAtExitFromDilution;

  const weightedAvgMultiple =
    (scenarioAnalysis.worstCaseMultiple * scenarioAnalysis.worstCaseProbability +
     scenarioAnalysis.baseCaseMultiple * scenarioAnalysis.baseCaseProbability +
     scenarioAnalysis.bestCaseMultiple * scenarioAnalysis.bestCaseProbability) / 100;
  const potentialExit = weightedAvgMultiple * scenarioAnalysis.exitRevenue * (1 - scenarioAnalysis.marketDiscount / 100);
  const exitOwnershipValue = potentialExit * (exitOwnershipPercent / 100);

  const exitPieData = [
    { name: 'Original Capital', value: originalCapitalInvested, color: 'hsl(142, 76%, 45%)' },
    { name: 'Follow-on Capital', value: totalFollowOn, color: 'hsl(220, 70%, 50%)' },
    { name: 'Remaining Exit Value', value: Math.max(0, exitOwnershipValue - totalCapitalDeployed), color: 'hsl(var(--foreground) / 0.15)' },
  ].filter(d => d.value > 0);

  const exitTableRows = [
    { label: 'Exit Value (Weighted Avg)', value: formatCurrency(potentialExit) },
    { label: 'Total Capital Deployed', value: formatCurrency(totalCapitalDeployed), subs: [
      { label: 'Initial Investment', value: formatCurrency(originalCapitalInvested), color: 'text-green-600' },
      { label: 'Follow-on Investment', value: formatCurrency(totalFollowOn), color: 'text-blue-600' },
    ]},
    { label: 'Exit Ownership Value', value: formatCurrency(exitOwnershipValue), subs: [
      { label: 'Ownership at Exit', value: formatPercent(exitOwnershipPercent) },
    ]},
  ];

  return (
    <div className="p-3 bg-muted/20 border border-border rounded-lg">
      <h4 className="text-xs font-medium text-muted-foreground mb-2">Exit Ownership Breakdown</h4>
      <div className="flex items-start gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <Pie data={exitPieData} cx="50%" cy="50%" innerRadius={20} outerRadius={45} paddingAngle={2} dataKey="value">
                {exitPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '11px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1">
          {exitTableRows.map((row, i) => (
            <div key={i}>
              <div className={`flex items-center justify-between py-1 px-2 rounded ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                <span className="text-[10px] text-muted-foreground">{row.label}</span>
                <span className="text-[10px] font-mono font-medium text-foreground">{row.value}</span>
              </div>
              {row.subs?.map((sub, j) => (
                <div key={j} className="flex items-center justify-between py-0.5 px-2 pl-5">
                  <span className={`text-[9px] ${sub.color || 'text-muted-foreground/70'}`}>↳ {sub.label}</span>
                  <span className={`text-[9px] font-mono ${sub.color || 'text-muted-foreground'}`}>{sub.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Fund Returns Summary */}
      <div className="pt-2 mt-2 border-t border-border grid grid-cols-8 gap-1">
        {[
          { label: 'Total Proceeds', value: formatCurrency(metrics.totalProceeds), bg: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
          { label: 'Total Expenses', value: formatCurrency(metrics.totalProceeds - metrics.netProceeds), bg: 'bg-red-500/15 text-red-700 border-red-500/30' },
          { label: 'Net Proceeds', value: formatCurrency(metrics.netProceeds), bg: 'bg-green-500/15 text-green-700 border-green-500/30' },
          { label: 'Gross IRR', value: formatPercent(metrics.grossIrr), bg: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
          { label: 'Net IRR', value: formatPercent(metrics.netIrr), bg: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30' },
          { label: 'Gross Multiple', value: `${metrics.grossMultiple.toFixed(2)}x`, bg: 'bg-purple-500/15 text-purple-700 border-purple-500/30' },
          { label: 'Net Multiple', value: `${metrics.netMultiple.toFixed(2)}x`, bg: 'bg-violet-500/15 text-violet-700 border-violet-500/30' },
          { label: 'MOIC', value: `${metrics.moic.toFixed(2)}x`, bg: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
        ].map((row, i) => (
          <div key={i} className={`rounded-md border px-1 py-1.5 text-center ${row.bg}`}>
            <p className="text-[7px] uppercase tracking-wide opacity-70">{row.label}</p>
            <p className="text-[10px] font-mono font-semibold">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

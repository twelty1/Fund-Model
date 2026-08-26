import { CalculatedMetrics, PortfolioConstruction, FundAssumptions, ScenarioAnalysis } from '@/types/fundModel';
import { SectionCard } from './SectionCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
interface Props {
  metrics: CalculatedMetrics;
  portfolioConstruction: PortfolioConstruction;
  fundAssumptions: FundAssumptions;
  scenarioAnalysis: ScenarioAnalysis;
  ownershipAtExitFromDilution: number;
}

export function ExitScenarioForm({ metrics, portfolioConstruction, fundAssumptions, scenarioAnalysis, ownershipAtExitFromDilution }: Props) {
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  // Early Investment = Fund Size
  const earlyInvestment = fundAssumptions.fundSize;

  // Weighted Average Terminal Value
  const weightedAvgMultiple = 
    (scenarioAnalysis.worstCaseMultiple * scenarioAnalysis.worstCaseProbability +
     scenarioAnalysis.baseCaseMultiple * scenarioAnalysis.baseCaseProbability +
     scenarioAnalysis.bestCaseMultiple * scenarioAnalysis.bestCaseProbability) / 100;
  const potentialExit = weightedAvgMultiple * scenarioAnalysis.exitRevenue * (1 - scenarioAnalysis.marketDiscount / 100);

  // Ownership at exit needed to cover entire fund value
  const ownershipAtExit = (earlyInvestment / potentialExit) * 100;

  // Calculate follow-on investments
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
  const avgTotalInvestment = metrics.averageInitialInvestment + avgFollowOn1 + avgFollowOn2;

  // Predicted dilution until exit - calculated from the ownership change
  const predictedDilution = metrics.initialOwnershipTaken > 0 
    ? ((metrics.initialOwnershipTaken - ownershipAtExitFromDilution) / metrics.initialOwnershipTaken) * 100
    : 0;

  // Initial ownership needed (to achieve fund return at exit)
  const initialOwnershipNeeded = ownershipAtExit / (1 - predictedDilution / 100);

  const dealPoints = [
    { label: 'Early Investment', value: formatCurrency(earlyInvestment) },
    { label: 'Potential Exit (Ev/Rev)', value: formatCurrency(potentialExit) },
    { label: 'Ownership needed at exit (%)', value: formatPercent(ownershipAtExit) },
    { label: 'Ownership at Exit (%)', value: formatPercent(ownershipAtExitFromDilution) },
    { label: 'Predicted Dilution until exit (%)', value: formatPercent(predictedDilution) },
    { label: 'Initial Ownership Needed', value: formatPercent(initialOwnershipNeeded) },
    { label: 'Initial Ownership Taken', value: formatPercent(metrics.initialOwnershipTaken) },
    { label: 'Average Initial Investment', value: formatCurrency(metrics.averageInitialInvestment) },
    { label: 'Average Follow On 1', value: formatCurrency(avgFollowOn1) },
    { label: 'Average Follow On 2', value: formatCurrency(avgFollowOn2) },
    { label: 'Average Total Investment', value: formatCurrency(avgTotalInvestment) },
  ];

  const isDoDeal = metrics.initialOwnershipTaken > initialOwnershipNeeded;

  // Exit value breakdown for pie chart
  const originalCapitalInvested = metrics.averageInitialInvestment;
  const totalFollowOn = avgFollowOn1 + avgFollowOn2;
  const totalCapitalDeployed = originalCapitalInvested + totalFollowOn;
  const exitOwnershipPercent = ownershipAtExitFromDilution;
  const exitOwnershipValue = potentialExit * (exitOwnershipPercent / 100);
  const roi = totalCapitalDeployed > 0 ? ((exitOwnershipValue - totalCapitalDeployed) / totalCapitalDeployed) * 100 : 0;
  const netMultiple = totalCapitalDeployed > 0 ? exitOwnershipValue / totalCapitalDeployed : 0;
  const grossMultiple = totalCapitalDeployed > 0 ? (exitOwnershipValue * 1.25) / totalCapitalDeployed : 0; // simplified gross (before fees/carry)

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
    <SectionCard title="Economic Deal Points">
      <div className="space-y-4">
        {/* Exit Visual */}
        <div className="p-3 bg-muted/20 border border-border rounded-lg">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Exit Ownership Breakdown</h4>
          <div className="flex items-start gap-4">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <Pie
                    data={exitPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {exitPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
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
          {/* Fund Returns Summary - full width */}
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

        {/* Returns Flow Chart */}
        <div className="p-3 bg-muted/20 border border-border rounded-lg">
          <h4 className="text-xs font-medium text-muted-foreground mb-3">Returns Flow</h4>
          <div className="flex flex-col items-center gap-0">
            {[
              { label: 'Investable Capital', value: formatCurrency(metrics.investableCapital) },
              { label: 'Initial Investments → Initial Ownership', value: `${formatCurrency(metrics.averageInitialInvestment)} → ${formatPercent(metrics.initialOwnershipTaken)}` },
              { label: 'Dilution → Ownership at Exit', value: `${formatPercent(predictedDilution)} → ${formatPercent(ownershipAtExitFromDilution)}` },
              { label: 'Terminal Value × Ownership at Exit', value: `${formatCurrency(potentialExit)} × ${formatPercent(ownershipAtExitFromDilution)}` },
              { label: 'Exit Value (Your Share)', value: formatCurrency(exitOwnershipValue) },
              { label: 'Total Proceeds', value: formatCurrency(metrics.totalProceeds) },
              { label: 'Net Proceeds', value: formatCurrency(metrics.netProceeds) },
              { label: 'Gross / Net IRR + Multiples', value: `${formatPercent(metrics.grossIrr)} / ${formatPercent(metrics.netIrr)} · ${metrics.grossMultiple.toFixed(2)}x / ${metrics.netMultiple.toFixed(2)}x` },
            ].map((step, i, arr) => (
              <div key={i} className="flex flex-col items-center w-full">
                <div className="w-full max-w-xs bg-card border border-border rounded-md px-3 py-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{step.label}</p>
                  <p className="text-xs font-mono font-semibold text-foreground mt-0.5">{step.value}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="h-4 w-px bg-border relative">
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-muted-foreground text-[10px]">↓</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total Investment Section */}
        <div className="p-3 bg-muted/20 border border-border rounded-lg">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Total Investment</h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-1 px-2 rounded bg-muted/30">
              <span className="text-[10px] text-muted-foreground">Initial Investment (Avg)</span>
              <span className="text-[10px] font-mono font-medium text-foreground">{formatCurrency(originalCapitalInvested)}</span>
            </div>
            {followOnAmounts.map((amt, i) => (
              <div key={i} className={`flex items-center justify-between py-1 px-2 rounded ${i % 2 === 1 ? 'bg-muted/30' : ''}`}>
                <span className="text-[10px] text-muted-foreground">Follow-on {i + 1} (Avg)</span>
                <span className="text-[10px] font-mono font-medium text-foreground">{formatCurrency(amt)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-1.5 px-2 rounded border-t border-border mt-1 pt-1.5">
              <span className="text-[10px] font-medium text-foreground">Total Capital Deployed</span>
              <span className="text-[10px] font-mono font-semibold text-foreground">{formatCurrency(totalCapitalDeployed)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          {dealPoints.map((point, index) => (
            <div 
              key={point.label} 
              className={`flex items-center justify-between py-1.5 px-2 rounded ${
                index % 2 === 0 ? 'bg-muted/30' : ''
              }`}
            >
              <span className="text-xs text-muted-foreground">{point.label}</span>
              <span className="text-xs font-mono font-medium text-foreground">
                {point.value}
              </span>
            </div>
          ))}
        </div>

        {/* Deal Decision Box */}
        <div 
          className={`p-6 rounded-lg text-center ${
            isDoDeal 
              ? 'bg-success text-success-foreground' 
              : 'bg-destructive text-destructive-foreground'
          }`}
        >
          <p className="text-2xl font-bold tracking-wide">
            {isDoDeal ? 'DO DEAL' : 'NO DEAL'}
          </p>
          <p className="text-xs mt-2 opacity-90">
            {isDoDeal 
              ? 'Initial Ownership Taken > Initial Ownership Needed'
              : 'Initial Ownership Taken < Initial Ownership Needed'
            }
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

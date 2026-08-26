import { PortfolioConstruction } from '@/types/fundModel';
import { ArrowDown } from 'lucide-react';

interface Props {
  data: PortfolioConstruction;
  investableCapital: number;
  fundSize: number;
  capitalInvested: number;
  managementFees: number;
  recycledFees: number;
}

export function PortfolioFlowChart({ data, investableCapital, fundSize, capitalInvested, managementFees, recycledFees }: Props) {
  // Calculate values
  const initialInvestmentPercent = 100 - data.reserveCapitalPercent;
  const initialInvestmentCapital = investableCapital * (initialInvestmentPercent / 100);
  const reserveCapital = investableCapital * (data.reserveCapitalPercent / 100);
  
  const avgInitialCheck = initialInvestmentCapital / data.portfolioCompaniesCount;

  // Calculate reserve allocations and company counts for each round
  const roundCalculations = data.followOnRounds.map((round, index) => {
    const capital = reserveCapital * (round.fundPercent / 100);
    
    let companiesExact: number;
    if (index === 0) {
      // First round: percentage of total portfolio companies
      companiesExact = data.portfolioCompaniesCount * (round.followOnRate / 100);
    } else {
      // Subsequent rounds: percentage of previous round's companies
      const prevCompanies = Math.round(
        index === 1 
          ? data.portfolioCompaniesCount * (data.followOnRounds[0].followOnRate / 100)
          : calculateCompaniesForRound(index - 1)
      );
      companiesExact = prevCompanies * (round.followOnRate / 100);
    }
    
    const companies = Math.round(companiesExact);
    const avgInvestment = companies > 0 ? capital / companies : 0;
    
    return {
      capital,
      companiesExact,
      companies,
      avgInvestment,
      fundPercent: round.fundPercent,
      followOnRate: round.followOnRate,
    };
  });

  // Helper to calculate companies for a given round index recursively
  function calculateCompaniesForRound(roundIndex: number): number {
    if (roundIndex === 0) {
      return Math.round(data.portfolioCompaniesCount * (data.followOnRounds[0].followOnRate / 100));
    }
    const prevCompanies = calculateCompaniesForRound(roundIndex - 1);
    return Math.round(prevCompanies * (data.followOnRounds[roundIndex].followOnRate / 100));
  }

  const formatValue = (value: number) => `$${(value / 1000000).toFixed(1)}M`;
  const formatValueK = (value: number) => value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : `$${(value / 1000).toFixed(0)}K`;

  const totalFollowOnCompanies = roundCalculations.reduce((sum, r) => sum + r.companies, 0);

  return (
    <div className="card-terminal rounded-md overflow-hidden max-w-xl mx-auto">
      <div className="section-header shrink-0">
        <span className="text-xs font-medium">Capital Flow & Reserves</span>
      </div>
      <div className="p-3">
        {/* Level 1: Total Investable Capital */}
        <div className="flex justify-center mb-2">
          <div className="bg-primary/10 border border-primary/30 rounded-md px-4 py-1.5 text-center animate-fade-in">
            <p className="text-[9px] uppercase tracking-wide text-primary">Total Investable Capital</p>
            <p className="text-sm font-mono font-semibold text-primary">{formatValue(investableCapital)}</p>
          </div>
        </div>
        <p className="text-[8px] text-center text-muted-foreground mb-2">
          Mgmt Fees: {formatValue(managementFees)} deducted from total fund · Fees Recycled: {formatValue(recycledFees)}
        </p>

        <div className="flex justify-center mb-2">
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Level 2: Initial Investment & Reserve Funds */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="bg-success/10 border border-success/30 rounded-md p-2 text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <p className="text-[9px] uppercase tracking-wide text-success">Initial Investment</p>
            <p className="text-sm font-mono font-semibold text-success">{formatValue(initialInvestmentCapital)}</p>
            <p className="text-[9px] text-muted-foreground">{initialInvestmentPercent}% of capital</p>
          </div>
          <div className="bg-warning/10 border border-warning/30 rounded-md p-2 text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <p className="text-[9px] uppercase tracking-wide text-warning">Reserve Funds</p>
            <p className="text-sm font-mono font-semibold text-warning">{formatValue(reserveCapital)}</p>
            <p className="text-[9px] text-muted-foreground">{data.reserveCapitalPercent}% of capital</p>
          </div>
        </div>

        {/* Arrows down */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="flex justify-center"><ArrowDown className="w-3 h-3 text-muted-foreground" /></div>
          <div className="flex justify-center"><ArrowDown className="w-3 h-3 text-muted-foreground" /></div>
        </div>

        {/* Level 3: Portfolio Companies & Follow-on Details */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="bg-success/5 border border-success/20 rounded-md p-2 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <p className="text-[9px] uppercase tracking-wide text-success">Portfolio Companies</p>
            <p className="text-base font-mono font-semibold text-foreground">{data.portfolioCompaniesCount}</p>
            <p className="text-[8px] italic text-muted-foreground">(6 initial investments made)</p>
            <p className="text-[9px] text-muted-foreground">Avg check: {formatValueK(avgInitialCheck)}</p>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(data.followOnRounds.length, 4)}, 1fr)` }}>
            {roundCalculations.map((round, index) => (
              <div key={index} className="bg-primary/5 border border-primary/20 rounded-md p-1.5 text-center animate-fade-in" style={{ animationDelay: `${0.3 + index * 0.05}s` }}>
                <p className="text-[9px] uppercase tracking-wide text-primary">R{index + 1} Cos</p>
                <p className="text-sm font-mono font-semibold text-foreground">{round.companies}</p>
                <p className="text-[9px] font-mono text-primary">
                  {formatValueK(round.avgInvestment)}/co
                </p>
              </div>
            ))}
          </div>
        </div>


        {/* Summary Footer */}
        <div className="mt-2 pt-2 border-t border-border">
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Reserves:</span>
              <span className="font-mono font-medium text-foreground">{formatValue(reserveCapital)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Follow-on Cos:</span>
              <span className="font-mono font-medium text-foreground">{totalFollowOnCompanies}</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <p className="mt-2 text-[8px] italic text-muted-foreground">
          * Deployed capital assumes 6 initial investments averaging $3M each = {formatValue(capitalInvested)} or {((capitalInvested / fundSize) * 100).toFixed(0)}% of {formatValue(fundSize)} fund
        </p>
      </div>
    </div>
  );
}

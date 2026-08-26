import { 
  FundAssumptions, 
  ManagementFeePeriod,
  PortfolioConstruction, 
  ScenarioAnalysis, 
  DealDynamics,
  ExitScenario,
  CalculatedMetrics 
} from '@/types/fundModel';

// Calculate total management fees from periods (or fallback to flat rate)
export function calculateTotalFeesFromPeriods(
  fundSize: number,
  periods: ManagementFeePeriod[] | undefined,
  fallbackPercent: number,
  fundLifeYears: number
): number {
  if (!periods || periods.length === 0) {
    return fundSize * (fallbackPercent / 100) * fundLifeYears;
  }
  return periods.reduce((total, period) => {
    const years = Math.max(0, period.endYear - period.startYear + 1);
    return total + fundSize * (period.feePercent / 100) * years;
  }, 0);
}

// Get the fee percent for a specific year from periods
export function getFeePercentForYear(
  periods: ManagementFeePeriod[] | undefined,
  year: number,
  fallbackPercent: number
): number {
  if (!periods || periods.length === 0) return fallbackPercent;
  const period = periods.find(p => year >= p.startYear && year <= p.endYear);
  return period ? period.feePercent : 0;
}

// Calculate first-year fee for recycling purposes
export function getFirstYearFee(
  fundSize: number,
  periods: ManagementFeePeriod[] | undefined,
  fallbackPercent: number
): number {
  if (!periods || periods.length === 0) {
    return fundSize * (fallbackPercent / 100);
  }
  return fundSize * (getFeePercentForYear(periods, 1, fallbackPercent) / 100);
}

export function calculateInvestableCapital(
  fundSize: number, 
  managementFeePercent: number, 
  fundLifeYears: number,
  feesRecycledPercent: number
): number {
  const totalManagementFees = fundSize * (managementFeePercent / 100) * fundLifeYears;
  const oneYearFees = fundSize * (managementFeePercent / 100);
  const recycledFees = oneYearFees * (feesRecycledPercent / 100);
  return fundSize - totalManagementFees + recycledFees;
}

export function calculateAlreadyCommittedCapital(
  fundSize: number,
  fundAlreadyCommittedPercent: number
): number {
  return fundSize * (fundAlreadyCommittedPercent / 100);
}

export function calculateTerminalValue(scenarioAnalysis: ScenarioAnalysis): number {
  const worstCase = scenarioAnalysis.exitRevenue * scenarioAnalysis.worstCaseMultiple * (scenarioAnalysis.worstCaseProbability / 100);
  const baseCase = scenarioAnalysis.exitRevenue * scenarioAnalysis.baseCaseMultiple * (scenarioAnalysis.baseCaseProbability / 100);
  const bestCase = scenarioAnalysis.exitRevenue * scenarioAnalysis.bestCaseMultiple * (scenarioAnalysis.bestCaseProbability / 100);
  
  const rawTerminalValue = worstCase + baseCase + bestCase;
  return rawTerminalValue * (1 - scenarioAnalysis.marketDiscount / 100);
}

export function calculateOwnership(
  investment: number,
  preMoney: number,
  syndicateInvestment: number,
  convertibleValue: number
): number {
  const postMoney = preMoney + investment + syndicateInvestment + convertibleValue;
  return (investment / postMoney) * 100;
}

export function calculateDilutedOwnership(initialOwnership: number, dilutionPercent: number): number {
  return initialOwnership * (1 - dilutionPercent / 100);
}

export function calculateExitValue(terminalValue: number, ownershipPercent: number): number {
  return terminalValue * (ownershipPercent / 100);
}

export function calculateMOIC(exitValue: number, totalInvestment: number): number {
  if (totalInvestment === 0) return 0;
  return exitValue / totalInvestment;
}

export function calculateIRR(cashFlows: number[], periods: number): number {
  // Newton-Raphson method for IRR calculation
  let rate = 0.1;
  const maxIterations = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivativeNpv = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      npv += cashFlows[j] / Math.pow(1 + rate, j);
      derivativeNpv -= j * cashFlows[j] / Math.pow(1 + rate, j + 1);
    }

    if (Math.abs(npv) < tolerance) break;
    if (derivativeNpv === 0) break;

    rate = rate - npv / derivativeNpv;
  }

  return rate * 100;
}

export function calculateGrossMultiple(totalProceeds: number, investedCapital: number): number {
  if (investedCapital === 0) return 0;
  return totalProceeds / investedCapital;
}

export function calculateAllMetrics(
  fundAssumptions: FundAssumptions,
  portfolioConstruction: PortfolioConstruction,
  scenarioAnalysis: ScenarioAnalysis,
  dealDynamics: DealDynamics,
  exitScenarios: ExitScenario[]
): CalculatedMetrics {
  // Fund-level calculations
  const totalManagementFees = calculateTotalFeesFromPeriods(fundAssumptions.fundSize, fundAssumptions.managementFeePeriods, fundAssumptions.managementFeePercent, fundAssumptions.fundOperationYears);
  const firstYearFees = getFirstYearFee(fundAssumptions.fundSize, fundAssumptions.managementFeePeriods, fundAssumptions.managementFeePercent);
  const recycledFees = firstYearFees * (fundAssumptions.managementFeesRecycledPercent / 100);
  
  // Investable capital = Fund Size - Management Fees + Recycled Fees (before committed deduction)
  const investableCapital = fundAssumptions.fundSize - totalManagementFees + recycledFees;
  const remainingInvestableCapital = investableCapital;

  const reserveCapital = remainingInvestableCapital * (portfolioConstruction.reserveCapitalPercent / 100);
  const initialInvestmentCapital = remainingInvestableCapital - reserveCapital;
  const averageInitialInvestment = initialInvestmentCapital / portfolioConstruction.portfolioCompaniesCount;

  // Calculate reserve capitals for each follow-on round
  const reserveCapitals = portfolioConstruction.followOnRounds.map(
    round => reserveCapital * (round.fundPercent / 100)
  );
  const reserve1Capital = reserveCapitals[0] || 0;
  const reserve2Capital = reserveCapitals[1] || 0;

  // Scenario analysis calculations
  const terminalValue = calculateTerminalValue(scenarioAnalysis);
  const potentialExit = terminalValue;

  // Deal-level calculations
  const totalInvestment = dealDynamics.vcFundInvestment + dealDynamics.syndicateInvestment;
  const totalConvertible = dealDynamics.convertibleDebt.reduce((sum, item) => sum + item.value, 0);
  const postMoney = dealDynamics.preMoney + totalInvestment + totalConvertible;

  const initialOwnershipTaken = (dealDynamics.vcFundInvestment / postMoney) * 100;
  // Calculate dilution based on option pool percentage
  const predictedDilution = dealDynamics.esopPercent;
  const actualOwnershipAtExit = calculateDilutedOwnership(initialOwnershipTaken, predictedDilution);
  const ownershipNeededAtExit = (averageInitialInvestment / terminalValue) * 100 * 10; // Target 10x return

  const exitValue = calculateExitValue(terminalValue, actualOwnershipAtExit);
  const moic = calculateMOIC(exitValue, dealDynamics.vcFundInvestment);

  // Cash flow calculations for IRR
  const investmentPerYear = investableCapital / fundAssumptions.investmentPeriodYears;
  
  // Build cash flows
  const grossCashFlows: number[] = [];
  const netCashFlows: number[] = [];

  for (let year = 0; year <= fundAssumptions.fundOperationYears; year++) {
    if (year < fundAssumptions.investmentPeriodYears) {
      grossCashFlows.push(-investmentPerYear);
      const yearFee = fundAssumptions.fundSize * (getFeePercentForYear(fundAssumptions.managementFeePeriods, year + 1, fundAssumptions.managementFeePercent) / 100);
      netCashFlows.push(-investmentPerYear - yearFee);
    } else {
      // Exit period - distribute proceeds evenly
      const exitYears = fundAssumptions.fundOperationYears - fundAssumptions.investmentPeriodYears + 1;
      
      // Calculate total proceeds from exit scenarios
      const totalProceeds = exitScenarios.reduce((sum, scenario) => {
        const companies = portfolioConstruction.portfolioCompaniesCount * (scenario.probability / 100);
        return sum + (averageInitialInvestment * scenario.multiple * companies);
      }, 0);

      const proceedsPerYear = totalProceeds / exitYears;
      const carriedInterest = proceedsPerYear * (fundAssumptions.carriedInterestPercent / 100);

      grossCashFlows.push(proceedsPerYear);
      netCashFlows.push(proceedsPerYear - carriedInterest);
    }
  }

  const grossIrr = calculateIRR(grossCashFlows, fundAssumptions.fundOperationYears);
  const netIrr = calculateIRR(netCashFlows, fundAssumptions.fundOperationYears);

  // Total proceeds calculation
  const totalProceeds = exitScenarios.reduce((sum, scenario) => {
    const companies = portfolioConstruction.portfolioCompaniesCount * (scenario.probability / 100);
    return sum + (averageInitialInvestment * scenario.multiple * companies);
  }, 0);

  const carriedInterestAmount = totalProceeds * (fundAssumptions.carriedInterestPercent / 100);
  const netProceeds = totalProceeds - carriedInterestAmount;
  const grossMultiple = calculateGrossMultiple(totalProceeds, investableCapital);
  const netMultiple = netProceeds / (fundAssumptions.fundSize);

  // Investment decision logic
  const investDecision = moic >= 3 && actualOwnershipAtExit >= 5 && netIrr >= 15 ? 'INVEST' : 'SKIP';
  
  // Confidence score (0-100)
  let confidence = 0;
  if (moic >= 10) confidence += 35;
  else if (moic >= 5) confidence += 25;
  else if (moic >= 3) confidence += 15;
  
  if (netIrr >= 25) confidence += 35;
  else if (netIrr >= 20) confidence += 25;
  else if (netIrr >= 15) confidence += 15;
  
  if (actualOwnershipAtExit >= 15) confidence += 30;
  else if (actualOwnershipAtExit >= 10) confidence += 20;
  else if (actualOwnershipAtExit >= 5) confidence += 10;

  return {
    investableCapital,
    initialInvestmentCapital,
    averageInitialInvestment,
    reserve1Capital,
    reserve2Capital,
    terminalValue,
    potentialExit,
    ownershipNeededAtExit,
    actualOwnershipAtExit,
    initialOwnershipTaken,
    exitValue,
    moic,
    grossIrr,
    netIrr,
    totalProceeds,
    netProceeds,
    grossMultiple,
    netMultiple,
    investDecision,
    investConfidence: Math.min(100, confidence),
  };
}

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1e3) {
    return `$${(value / 1e3).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatMultiple(value: number): string {
  return `${value.toFixed(2)}x`;
}

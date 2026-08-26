export interface ManagementFeePeriod {
  startYear: number;
  endYear: number;
  feePercent: number;
}

export interface FundAssumptions {
  fundSize: number;
  managementFeePercent: number; // legacy fallback
  managementFeePeriods: ManagementFeePeriod[];
  carriedInterestPercent: number;
  investmentPeriodYears: number;
  fundOperationYears: number;
  gpCommittedCapitalPercent: number;
  managementFeesRecycledPercent: number;
  fundAlreadyCommittedPercent: number;
}

export interface FollowOnRound {
  fundPercent: number;      // % of reserve capital allocated to this round
  followOnRate: number;     // % of companies from previous stage that get this round
}

export interface PortfolioConstruction {
  reserveCapitalPercent: number;
  portfolioCompaniesCount: number;
  followOnRounds: FollowOnRound[];
}

export interface ExitScenario {
  name: string;
  multiple: number;
  probability: number;
}

export interface ScenarioAnalysis {
  exitRevenue: number;
  marketDiscount: number;
  worstCaseMultiple: number;
  worstCaseProbability: number;
  baseCaseMultiple: number;
  baseCaseProbability: number;
  bestCaseMultiple: number;
  bestCaseProbability: number;
}

export interface ConvertibleInstrument {
  id: string;
  type: 'note' | 'safe';
  name: string;
  value: number;
  discountRate: number;
  cap: number;
}

export type InvestmentRound = 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C';

export interface DealDynamics {
  currentRound: InvestmentRound;
  preMoneyMode: 'carta' | 'custom';
  preMoney: number;
  vcFundInvestment: number;
  syndicateInvestment: number;
  originalSharesOutstanding: number;
  esopPercent: number;
  isPreMoneyOptionPool: boolean;
  convertibleDebt: ConvertibleInstrument[];
}

export interface CalculatedMetrics {
  investableCapital: number;
  initialInvestmentCapital: number;
  averageInitialInvestment: number;
  reserve1Capital: number;
  reserve2Capital: number;
  terminalValue: number;
  potentialExit: number;
  ownershipNeededAtExit: number;
  actualOwnershipAtExit: number;
  initialOwnershipTaken: number;
  exitValue: number;
  moic: number;
  grossIrr: number;
  netIrr: number;
  totalProceeds: number;
  netProceeds: number;
  grossMultiple: number;
  netMultiple: number;
  investDecision: 'INVEST' | 'SKIP';
  investConfidence: number;
}

export interface FundModelState {
  fundAssumptions: FundAssumptions;
  portfolioConstruction: PortfolioConstruction;
  exitScenarios: ExitScenario[];
  scenarioAnalysis: ScenarioAnalysis;
  dealDynamics: DealDynamics;
}

export interface ComparableCompany {
  id: string;
  name: string;
  ev: number | null;
  revenue: number | null;
  ipoExitValuation: number | null;
  ipoTimeYears: number | null;
  expectedIpoTimeYears: number | null;
}

export interface ScenarioResearch {
  comparables: ComparableCompany[];
}

import { useState, useMemo, useCallback, useEffect } from 'react';
import { FundAssumptions, PortfolioConstruction, ScenarioAnalysis, DealDynamics, ExitScenario, ComparableCompany } from '@/types/fundModel';
import { calculateAllMetrics, calculateTotalFeesFromPeriods, getFirstYearFee } from '@/utils/calculations';
import { FundAssumptionsForm } from '@/components/FundAssumptionsForm';
import { PortfolioConstructionForm } from '@/components/PortfolioConstructionForm';
import { ScenarioAnalysisForm } from '@/components/ScenarioAnalysisForm';
import { ScenarioBarChart } from '@/components/ScenarioBarChart';
import { DealDynamicsForm } from '@/components/DealDynamicsForm';
import { ScenarioResearchForm, EvRevStats } from '@/components/ScenarioResearchForm';
import { ExitScenarioForm } from '@/components/ExitScenarioForm';
import { OutputMetrics } from '@/components/OutputMetrics';
import { ExitOwnershipChart } from '@/components/ExitOwnershipChart';
import { DecisionSummary } from '@/components/DecisionSummary';
import { FundAllocationChart } from '@/components/FundAllocationChart';
import { TotalFundAllocationChart } from '@/components/TotalFundAllocationChart';
import { PortfolioFlowChart } from '@/components/PortfolioFlowChart';
import { EstimatedDilutionForm, EstimatedDilutionData } from '@/components/EstimatedDilutionForm';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CapTableDeliverables } from '@/components/CapTableDeliverables';
import { ProblemSolutionSet } from '@/components/ProblemSolutionSet';
import { BusinessModel } from '@/components/BusinessModel';
const defaultFundAssumptions: FundAssumptions = {
  fundSize: 100000000,
  managementFeePercent: 2.0,
  managementFeePeriods: [
    { startYear: 1, endYear: 5, feePercent: 2.0 },
    { startYear: 6, endYear: 10, feePercent: 1.5 },
  ],
  carriedInterestPercent: 20.0,
  investmentPeriodYears: 4,
  fundOperationYears: 10,
  gpCommittedCapitalPercent: 2.0,
  managementFeesRecycledPercent: 50.0,
  fundAlreadyCommittedPercent: 0,
};

const defaultPortfolioConstruction: PortfolioConstruction = {
  reserveCapitalPercent: 40,
  portfolioCompaniesCount: 15,
  followOnRounds: [
    { fundPercent: 50, followOnRate: 40 },
    { fundPercent: 50, followOnRate: 60 },
  ],
};

const defaultScenarioAnalysis: ScenarioAnalysis = {
  exitRevenue: 100000000,
  marketDiscount: 10,
  worstCaseMultiple: 0.2,
  worstCaseProbability: 20,
  baseCaseMultiple: 4.23,
  baseCaseProbability: 60,
  bestCaseMultiple: 31.67,
  bestCaseProbability: 20,
};

const defaultDealDynamics: DealDynamics = {
  currentRound: 'Seed',
  preMoneyMode: 'carta',
  preMoney: 16000000,
  vcFundInvestment: 4000000,
  syndicateInvestment: 0,
  originalSharesOutstanding: 2000000,
  esopPercent: 10,
  isPreMoneyOptionPool: true,
  convertibleDebt: [],
};

const defaultExitScenarios: ExitScenario[] = [
  { name: 'Write-down', multiple: 0, probability: 45 },
  { name: 'Small', multiple: 2, probability: 30 },
  { name: 'Medium', multiple: 10, probability: 20 },
  { name: 'Large', multiple: 15, probability: 5 },
];

const defaultComparables: ComparableCompany[] = [
  { id: '1', name: 'UiPath', ev: 10000, revenue: 600, ipoExitValuation: 2900, ipoTimeYears: 6, expectedIpoTimeYears: null },
  { id: '2', name: 'Databricks', ev: 4300, revenue: 1000, ipoExitValuation: 4300, ipoTimeYears: 14, expectedIpoTimeYears: 1.5 },
  { id: '3', name: 'Stripe', ev: 5000, revenue: 1200, ipoExitValuation: 5000, ipoTimeYears: 20, expectedIpoTimeYears: null },
  { id: '4', name: 'Notion', ev: 1000, revenue: 5000, ipoExitValuation: 1000, ipoTimeYears: 16, expectedIpoTimeYears: 4 },
  { id: '5', name: 'ServiceTitan', ev: 9500, revenue: 300, ipoExitValuation: 9500, ipoTimeYears: 14, expectedIpoTimeYears: 1.5 },
  { id: '6', name: 'Monday.com', ev: 830, revenue: 400, ipoExitValuation: 680, ipoTimeYears: 9, expectedIpoTimeYears: null },
];

const defaultEstimatedDilution: EstimatedDilutionData = {
  rounds: [
    { mode: 'carta', newMoneyDilution: 19, optionPoolRefreshed: 10, optionPoolPreMoney: true, proRataRights: true, proRataPercentTaken: 0, isInterim: false },
    { mode: 'carta', newMoneyDilution: 13, optionPoolRefreshed: 10, optionPoolPreMoney: true, proRataRights: true, proRataPercentTaken: 0, isInterim: false },
  ],
};

function loadState<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {}
  return fallback;
}

function saveState(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const STORAGE_KEYS = {
  fund: 'fm_fundAssumptions',
  portfolio: 'fm_portfolioConstruction',
  scenario: 'fm_scenarioAnalysis',
  deal: 'fm_dealDynamics',
  comparables: 'fm_comparables',
  dilution: 'fm_estimatedDilution',
  tab: 'fm_activeTab',
};

const Index = () => {
  const [fundAssumptions, setFundAssumptions] = useState<FundAssumptions>(() => loadState(STORAGE_KEYS.fund, defaultFundAssumptions));
  const [portfolioConstruction, setPortfolioConstruction] = useState<PortfolioConstruction>(() => loadState(STORAGE_KEYS.portfolio, defaultPortfolioConstruction));
  const [scenarioAnalysis, setScenarioAnalysis] = useState<ScenarioAnalysis>(() => loadState(STORAGE_KEYS.scenario, defaultScenarioAnalysis));
  const [dealDynamics, setDealDynamics] = useState<DealDynamics>(() => loadState(STORAGE_KEYS.deal, defaultDealDynamics));
  const [comparables, setComparables] = useState<ComparableCompany[]>(() => loadState(STORAGE_KEYS.comparables, defaultComparables));
  const [estimatedDilution, setEstimatedDilution] = useState<EstimatedDilutionData>(() => loadState(STORAGE_KEYS.dilution, defaultEstimatedDilution));
  const [activeTab, setActiveTab] = useState(() => loadState(STORAGE_KEYS.tab, 'fund'));

  // Persist all state to localStorage
  useEffect(() => { saveState(STORAGE_KEYS.fund, fundAssumptions); }, [fundAssumptions]);
  useEffect(() => { saveState(STORAGE_KEYS.portfolio, portfolioConstruction); }, [portfolioConstruction]);
  useEffect(() => { saveState(STORAGE_KEYS.scenario, scenarioAnalysis); }, [scenarioAnalysis]);
  useEffect(() => { saveState(STORAGE_KEYS.deal, dealDynamics); }, [dealDynamics]);
  useEffect(() => { saveState(STORAGE_KEYS.comparables, comparables); }, [comparables]);
  useEffect(() => { saveState(STORAGE_KEYS.dilution, estimatedDilution); }, [estimatedDilution]);
  useEffect(() => { saveState(STORAGE_KEYS.tab, activeTab); }, [activeTab]);

  // Sync ESOP % from deal dynamics to estimated dilution option pool refreshed
  useEffect(() => {
    setEstimatedDilution(prev => ({
      ...prev,
      rounds: prev.rounds.map(round => ({
        ...round,
        optionPoolRefreshed: dealDynamics.esopPercent,
      })),
    }));
  }, [dealDynamics.esopPercent]);

  // Sync research stats to scenario analysis multiples
  const handleResearchStatsChange = useCallback((stats: EvRevStats) => {
    setScenarioAnalysis(prev => ({
      ...prev,
      worstCaseMultiple: stats.min ?? prev.worstCaseMultiple,
      baseCaseMultiple: stats.median ?? prev.baseCaseMultiple,
      bestCaseMultiple: stats.max ?? prev.bestCaseMultiple,
    }));
  }, []);

  const metrics = useMemo(() => {
    return calculateAllMetrics(
      fundAssumptions,
      portfolioConstruction,
      scenarioAnalysis,
      dealDynamics,
      defaultExitScenarios
    );
  }, [fundAssumptions, portfolioConstruction, scenarioAnalysis, dealDynamics]);

  // Calculate portfolio follow-on reserve averages per round
  const followOnAverages = useMemo(() => {
    const reserveCapital = metrics.investableCapital * (portfolioConstruction.reserveCapitalPercent / 100);
    let companiesRemaining = portfolioConstruction.portfolioCompaniesCount;
    return portfolioConstruction.followOnRounds.map((round) => {
      const roundCapital = reserveCapital * (round.fundPercent / 100);
      const companiesGettingRound = companiesRemaining * (round.followOnRate / 100);
      const avg = companiesGettingRound > 0 ? roundCapital / companiesGettingRound : 0;
      companiesRemaining = companiesGettingRound;
      return avg;
    });
  }, [metrics.investableCapital, portfolioConstruction]);

  // Calculate post money shares and cap table for EstimatedDilutionForm
  const { totalPostMoneyShares, currentCapTable, postMoneyValuation, currentPPS } = useMemo(() => {
    const founderShares = dealDynamics.originalSharesOutstanding;
    const esopPercent = dealDynamics.esopPercent / 100;
    const totalConvertible = dealDynamics.convertibleDebt.reduce((sum, item) => sum + item.value, 0);
    const postMoney = dealDynamics.preMoney + dealDynamics.vcFundInvestment + dealDynamics.syndicateInvestment + totalConvertible;
    const totalInvestment = dealDynamics.vcFundInvestment + dealDynamics.syndicateInvestment;
    const investorOwnership = totalInvestment / postMoney;
    
    let optionPoolShares: number;
    let preMoneyShares: number;
    let investmentShares: number;
    let postMoneySharesPreConvertible: number;
    
    if (dealDynamics.isPreMoneyOptionPool) {
      optionPoolShares = (founderShares / (1 - esopPercent)) - founderShares;
      preMoneyShares = founderShares + optionPoolShares;
      postMoneySharesPreConvertible = preMoneyShares / (1 - investorOwnership);
      investmentShares = postMoneySharesPreConvertible - preMoneyShares;
    } else {
      const postMoneySharesBeforePool = founderShares / (1 - investorOwnership);
      investmentShares = postMoneySharesBeforePool - founderShares;
      postMoneySharesPreConvertible = postMoneySharesBeforePool / (1 - esopPercent);
      optionPoolShares = postMoneySharesPreConvertible - postMoneySharesBeforePool;
      preMoneyShares = founderShares + optionPoolShares;
    }
    
    // Calculate convertible debt shares
    const ppsPreConvertible = postMoney / postMoneySharesPreConvertible;
    let convertibleDebtShares = 0;
    dealDynamics.convertibleDebt.forEach(instrument => {
      if (instrument.value > 0) {
        const discountedPrice = ppsPreConvertible * (1 - instrument.discountRate / 100);
        const capPrice = instrument.cap > 0 ? instrument.cap / postMoneySharesPreConvertible : Infinity;
        const effectivePrice = Math.min(discountedPrice, capPrice);
        convertibleDebtShares += instrument.value / effectivePrice;
      }
    });
    
    const totalShares = postMoneySharesPreConvertible + convertibleDebtShares;
    
    // Build cap table matching DealDynamicsForm
    const capTable = [
      { name: 'Founders', shares: founderShares, percent: (founderShares / totalShares) * 100 },
      { name: 'Option Pool', shares: optionPoolShares, percent: (optionPoolShares / totalShares) * 100 },
    ];
    
    if (dealDynamics.syndicateInvestment > 0) {
      const vcFundShareRatio = totalInvestment > 0 ? dealDynamics.vcFundInvestment / totalInvestment : 1;
      const syndicateShareRatio = totalInvestment > 0 ? dealDynamics.syndicateInvestment / totalInvestment : 0;
      capTable.push({ name: 'VC Fund Investment', shares: investmentShares * vcFundShareRatio, percent: (investmentShares * vcFundShareRatio / totalShares) * 100 });
      capTable.push({ name: 'Syndicate Investor', shares: investmentShares * syndicateShareRatio, percent: (investmentShares * syndicateShareRatio / totalShares) * 100 });
    } else {
      capTable.push({ name: 'Investors', shares: investmentShares, percent: (investmentShares / totalShares) * 100 });
    }
    
    if (convertibleDebtShares > 0) {
      capTable.push({ name: 'Convertible Debt', shares: convertibleDebtShares, percent: (convertibleDebtShares / totalShares) * 100 });
    }
    
    const computedPPS = totalShares > 0 ? postMoney / totalShares : 0;
    return { totalPostMoneyShares: totalShares, currentCapTable: capTable, postMoneyValuation: postMoney, currentPPS: computedPPS };
  }, [dealDynamics]);

  // Carta Q3 2025 median dilution by round name
  const CARTA_DILUTION: Record<string, number> = {
    'Seed': 19, 'Series A': 19, 'Series B': 13, 'Series C': 12, 'Series D': 13,
  };
  const ROUND_ORDER = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series F'];

  // Calculate ownership at exit based on estimated dilution rounds
  const ownershipAtExitFromDilution = useMemo(() => {
    let finalOwnership = metrics.initialOwnershipTaken;
    const currentIdx = ROUND_ORDER.indexOf(dealDynamics.currentRound || 'Seed');
    
    estimatedDilution.rounds.forEach((round, index) => {
      let dilution = round.newMoneyDilution;
      if (round.mode === 'carta') {
        let namedCount = 0;
        for (let i = 0; i < index; i++) {
          if (!estimatedDilution.rounds[i].isInterim) namedCount++;
        }
        const targetIdx = currentIdx + namedCount + 1;
        const roundName = targetIdx < ROUND_ORDER.length ? ROUND_ORDER[targetIdx] : '';
        dilution = CARTA_DILUTION[roundName] ?? 15;
      }
      const dilutionFactor = (100 - dilution) / 100;
      if (round.proRataRights && round.proRataPercentTaken > 0) {
        finalOwnership = finalOwnership * dilutionFactor + (round.proRataPercentTaken / 100) * dilution;
      } else {
        finalOwnership = finalOwnership * dilutionFactor;
      }
    });
    return finalOwnership;
  }, [metrics.initialOwnershipTaken, estimatedDilution.rounds, dealDynamics.currentRound]);

  const resetAll = () => {
    setFundAssumptions(defaultFundAssumptions);
    setPortfolioConstruction(defaultPortfolioConstruction);
    setScenarioAnalysis(defaultScenarioAnalysis);
    setDealDynamics(defaultDealDynamics);
    setComparables(defaultComparables);
    setEstimatedDilution(defaultEstimatedDilution);
    // Clear localStorage too
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  };

  const handleDecisionClick = () => {
    setActiveTab('decision');
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-2 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Fund Model Analyzer</h1>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={resetAll}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Reset
        </Button>
      </header>

      <main className="flex-1 overflow-hidden p-4 pb-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 shrink-0">
            <TabsTrigger value="fund">Fund</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="deal">Valuation/Shares</TabsTrigger>
            <TabsTrigger value="scenario">Scenario</TabsTrigger>
            <TabsTrigger value="deliverables">Comp. Deliverables</TabsTrigger>
          </TabsList>

          <TabsContent value="fund" className="flex-1 overflow-auto mt-4 pb-4">
            <div className="max-w-4xl mx-auto space-y-4">
              <FundAssumptionsForm 
                data={fundAssumptions} 
                onChange={setFundAssumptions} 
              />
              <div className="p-4 bg-card border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-3">Outputs</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Investable Capital</p>
                    <p className="text-sm font-mono font-semibold text-foreground">
                      ${(metrics.investableCapital / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Initial Investment Capital</p>
                    <p className="text-sm font-mono font-semibold text-foreground">
                      ${(metrics.initialInvestmentCapital / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Reserve Capital</p>
                    <p className="text-sm font-mono font-semibold text-foreground">
                      ${((metrics.reserve1Capital + metrics.reserve2Capital) / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Avg. Initial Investment</p>
                    <p className="text-sm font-mono font-semibold text-foreground">
                      ${(metrics.averageInitialInvestment / 1000000).toFixed(2)}M
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TotalFundAllocationChart data={fundAssumptions} />
                <FundAllocationChart 
                  data={fundAssumptions} 
                  investableCapital={metrics.investableCapital} 
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="flex-1 overflow-auto mt-4 pb-4">
            <div className="max-w-3xl mx-auto space-y-4">
              <PortfolioConstructionForm 
                data={portfolioConstruction} 
                onChange={setPortfolioConstruction} 
              />
              <PortfolioFlowChart 
                data={portfolioConstruction} 
                investableCapital={metrics.investableCapital}
                fundSize={fundAssumptions.fundSize}
                capitalInvested={fundAssumptions.fundSize * (fundAssumptions.fundAlreadyCommittedPercent / 100)}
                managementFees={calculateTotalFeesFromPeriods(fundAssumptions.fundSize, fundAssumptions.managementFeePeriods, fundAssumptions.managementFeePercent, fundAssumptions.fundOperationYears)}
                recycledFees={getFirstYearFee(fundAssumptions.fundSize, fundAssumptions.managementFeePeriods, fundAssumptions.managementFeePercent) * (fundAssumptions.managementFeesRecycledPercent / 100)}
              />
            </div>
          </TabsContent>

          <TabsContent value="scenario" className="flex-1 overflow-auto mt-4 pb-4">
            <div className="max-w-2xl mx-auto">
              <Tabs defaultValue="research" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="research">Scenario Research</TabsTrigger>
                  <TabsTrigger value="analysis">Scenario Analysis</TabsTrigger>
                  <TabsTrigger value="exit">Exit Evaluation</TabsTrigger>
                </TabsList>
                
                <TabsContent value="research" className="mt-0">
                  <ScenarioResearchForm 
                    comparables={comparables}
                    onChange={setComparables}
                    onStatsChange={handleResearchStatsChange}
                  />
                </TabsContent>
                
                <TabsContent value="analysis" className="space-y-4 mt-0">
                  <ScenarioAnalysisForm 
                    data={scenarioAnalysis} 
                    onChange={setScenarioAnalysis} 
                  />
                  <ScenarioBarChart data={scenarioAnalysis} />
                </TabsContent>
                
                <TabsContent value="exit" className="mt-0">
                  <ExitScenarioForm 
                    metrics={metrics} 
                    portfolioConstruction={portfolioConstruction}
                    fundAssumptions={fundAssumptions}
                    scenarioAnalysis={scenarioAnalysis}
                    ownershipAtExitFromDilution={ownershipAtExitFromDilution}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="deal" className="flex-1 overflow-auto mt-4 pb-4">
            <div className="max-w-2xl mx-auto">
              <Tabs defaultValue="dynamics" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="dynamics">Current Investment Shares</TabsTrigger>
                  <TabsTrigger value="dilution">Estimated Dilution</TabsTrigger>
                </TabsList>
                
                <TabsContent value="dynamics" className="mt-0">
                  <DealDynamicsForm 
                    data={dealDynamics} 
                    onChange={setDealDynamics}
                    averageInitialInvestment={metrics.averageInitialInvestment}
                  />
                </TabsContent>

                <TabsContent value="dilution" className="mt-0">
                  <EstimatedDilutionForm 
                    data={estimatedDilution} 
                    onChange={setEstimatedDilution}
                    initialOwnershipPercent={metrics.initialOwnershipTaken}
                    totalPostMoneyShares={totalPostMoneyShares}
                    currentCapTable={currentCapTable}
                    currentRound={dealDynamics.currentRound}
                    hasSyndicate={dealDynamics.syndicateInvestment > 0}
                    followOnAverages={followOnAverages}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="deliverables" className="flex-1 overflow-auto mt-4 pb-4">
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="p-4 bg-card border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-3">Fund/Portfolio Deliverables</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 deliverables-compact">
                  <div className="md:col-span-2">
                    <PortfolioFlowChart 
                      data={portfolioConstruction} 
                      investableCapital={metrics.investableCapital}
                      fundSize={fundAssumptions.fundSize}
                      capitalInvested={fundAssumptions.fundSize * (fundAssumptions.fundAlreadyCommittedPercent / 100)}
                      managementFees={calculateTotalFeesFromPeriods(fundAssumptions.fundSize, fundAssumptions.managementFeePeriods, fundAssumptions.managementFeePercent, fundAssumptions.fundOperationYears)}
                      recycledFees={getFirstYearFee(fundAssumptions.fundSize, fundAssumptions.managementFeePeriods, fundAssumptions.managementFeePercent) * (fundAssumptions.managementFeesRecycledPercent / 100)}
                    />
                  </div>
                  <div>
                    <FundAllocationChart 
                      data={fundAssumptions} 
                      investableCapital={metrics.investableCapital} 
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-3">Cap Table/Dilution Deliverables</h3>
                <CapTableDeliverables
                  currentCapTable={currentCapTable}
                  currentRound={dealDynamics.currentRound}
                  hasSyndicate={dealDynamics.syndicateInvestment > 0}
                  postMoneyValuation={postMoneyValuation}
                  totalPostMoneyShares={totalPostMoneyShares}
                  pps={currentPPS}
                  estimatedDilution={estimatedDilution}
                  initialOwnershipPercent={metrics.initialOwnershipTaken}
                />
              </div>
              <div className="p-4 bg-card border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-3">Exit Deliverables</h3>
                <ExitOwnershipChart 
                  metrics={metrics} 
                  portfolioConstruction={portfolioConstruction}
                  fundAssumptions={fundAssumptions}
                  scenarioAnalysis={scenarioAnalysis}
                  ownershipAtExitFromDilution={ownershipAtExitFromDilution}
                />
              </div>
              <div className="p-4 bg-card border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-3">Problem Solution Set</h3>
                <ProblemSolutionSet />
              </div>
              <div className="p-4 bg-card border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-3">Business Model</h3>
                <BusinessModel />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Sticky Decision Footer */}
      <DecisionSummary
        decision={metrics.investDecision}
        confidence={metrics.investConfidence}
        moic={metrics.moic}
        irr={metrics.netIrr}
        onClick={handleDecisionClick}
      />
    </div>
  );
};

export default Index;

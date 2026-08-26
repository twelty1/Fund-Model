import { CalculatedMetrics, FundAssumptions, ScenarioAnalysis } from '@/types/fundModel';
import { MetricCard } from './MetricCard';
import { formatCurrency, formatPercent, formatMultiple } from '@/utils/calculations';
import { SectionCard } from './SectionCard';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  metrics: CalculatedMetrics;
  fundAssumptions: FundAssumptions;
  scenarioAnalysis: ScenarioAnalysis;
  ownershipAtExitFromDilution: number;
}

const formulas = {
  investableCapital: {
    formula: "Fund Size - Total Mgmt Fees + Recycled Fees",
    description: "Where Total Mgmt Fees = Fund Size × Mgmt Fee % × Fund Life, and Recycled Fees = (Fund Size × Mgmt Fee %) × Fees Recycled %"
  },
  averageInitialInvestment: {
    formula: "(Investable Capital × (1 - Reserve %)) ÷ # of Companies",
    description: "Initial investment capital divided evenly across portfolio companies"
  },
  terminalValue: {
    formula: "(Worst×P₁ + Base×P₂ + Best×P₃) × (1 - Discount)",
    description: "Probability-weighted exit revenue multiples, adjusted for market discount. Each case = Exit Revenue × Multiple × Probability"
  },
  exitValue: {
    formula: "Terminal Value × Ownership at Exit %",
    description: "Your share of the company's terminal value based on diluted ownership"
  },
  initialOwnership: {
    formula: "(VC Investment ÷ Post-Money) × 100",
    description: "Post-Money = Pre-Money + VC Investment + Syndicate + Convertibles"
  },
  ownershipAtExit: {
    formula: "Initial Ownership × (1 - Predicted Dilution %)",
    description: "Ownership after accounting for future dilution from subsequent funding rounds"
  },
  grossIrr: {
    formula: "IRR of cash flows (investments → proceeds)",
    description: "Newton-Raphson method: Investment outflows during investment period, exit proceeds distributed over remaining fund life"
  },
  netIrr: {
    formula: "IRR of net cash flows (after fees & carry)",
    description: "Similar to Gross IRR but includes management fees and carried interest deductions"
  },
  moic: {
    formula: "Exit Value ÷ VC Investment",
    description: "Multiple on Invested Capital - how many times you get your money back"
  },
  grossMultiple: {
    formula: "Total Proceeds ÷ Investable Capital",
    description: "Fund-level return multiple before carried interest"
  },
  totalProceeds: {
    formula: "Σ (Avg Investment × Multiple × Companies per Scenario)",
    description: "Sum of proceeds across all exit scenarios weighted by probability"
  },
  netProceeds: {
    formula: "Total Proceeds - Carried Interest",
    description: "Proceeds after GP's carried interest (typically 20%)"
  }
};

export function OutputMetrics({ metrics, fundAssumptions, scenarioAnalysis, ownershipAtExitFromDilution }: Props) {
  // Calculate DO DEAL / NO DEAL logic (same as ExitScenarioForm)
  const earlyInvestment = fundAssumptions.fundSize;
  const weightedAvgMultiple = 
    (scenarioAnalysis.worstCaseMultiple * scenarioAnalysis.worstCaseProbability +
     scenarioAnalysis.baseCaseMultiple * scenarioAnalysis.baseCaseProbability +
     scenarioAnalysis.bestCaseMultiple * scenarioAnalysis.bestCaseProbability) / 100;
  const potentialExit = weightedAvgMultiple * scenarioAnalysis.exitRevenue;
  const ownershipNeededAtExit = (earlyInvestment / potentialExit) * 100;
  const predictedDilution = metrics.initialOwnershipTaken > 0 
    ? ((metrics.initialOwnershipTaken - ownershipAtExitFromDilution) / metrics.initialOwnershipTaken) * 100
    : 0;
  const initialOwnershipNeeded = ownershipNeededAtExit / (1 - predictedDilution / 100);
  const isDoDeal = metrics.initialOwnershipTaken > initialOwnershipNeeded;

  return (
    <div className="space-y-4">
      {/* DO DEAL / NO DEAL Banner */}
      <div 
        className={cn(
          "p-6 rounded-lg text-center",
          isDoDeal 
            ? "bg-success text-success-foreground" 
            : "bg-destructive text-destructive-foreground"
        )}
      >
        <div className="flex items-center justify-center gap-3">
          {isDoDeal ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            <XCircle className="w-8 h-8" />
          )}
          <p className="text-3xl font-bold tracking-wide">
            {isDoDeal ? 'DO DEAL' : 'NO DEAL'}
          </p>
        </div>
        <p className="text-xs mt-2 opacity-90">
          {isDoDeal 
            ? 'Initial Ownership Taken > Initial Ownership Needed'
            : 'Initial Ownership Taken < Initial Ownership Needed'
          }
        </p>
      </div>

      <SectionCard title="Calculated Outputs">
        <p className="text-xs text-muted-foreground mb-3">Click any metric to see its formula</p>
        <div className="grid grid-cols-3 gap-2">
          <MetricCard
          label="Investable Capital"
          value={formatCurrency(metrics.investableCapital)}
          formula={formulas.investableCapital.formula}
          formulaDescription={formulas.investableCapital.description}
        />
        <MetricCard
          label="Avg. Initial Invest"
          value={formatCurrency(metrics.averageInitialInvestment)}
          formula={formulas.averageInitialInvestment.formula}
          formulaDescription={formulas.averageInitialInvestment.description}
        />
        <MetricCard
          label="Terminal Value"
          value={formatCurrency(metrics.terminalValue)}
          variant={metrics.terminalValue > 0 ? 'success' : 'danger'}
          formula={formulas.terminalValue.formula}
          formulaDescription={formulas.terminalValue.description}
        />
        <MetricCard
          label="Exit Value (Your Share)"
          value={formatCurrency(metrics.exitValue)}
          variant={metrics.exitValue > metrics.investableCapital ? 'success' : 'warning'}
          formula={formulas.exitValue.formula}
          formulaDescription={formulas.exitValue.description}
        />
        <MetricCard
          label="Initial Ownership"
          value={formatPercent(metrics.initialOwnershipTaken)}
          formula={formulas.initialOwnership.formula}
          formulaDescription={formulas.initialOwnership.description}
        />
        <MetricCard
          label="Ownership at Exit"
          value={formatPercent(metrics.actualOwnershipAtExit)}
          variant={metrics.actualOwnershipAtExit >= 10 ? 'success' : 'warning'}
          formula={formulas.ownershipAtExit.formula}
          formulaDescription={formulas.ownershipAtExit.description}
        />
        <MetricCard
          label="Gross IRR"
          value={formatPercent(metrics.grossIrr)}
          variant={metrics.grossIrr >= 25 ? 'success' : metrics.grossIrr >= 15 ? 'warning' : 'danger'}
          formula={formulas.grossIrr.formula}
          formulaDescription={formulas.grossIrr.description}
        />
        <MetricCard
          label="Net IRR"
          value={formatPercent(metrics.netIrr)}
          variant={metrics.netIrr >= 20 ? 'success' : metrics.netIrr >= 15 ? 'warning' : 'danger'}
          formula={formulas.netIrr.formula}
          formulaDescription={formulas.netIrr.description}
        />
        <MetricCard
          label="MOIC"
          value={formatMultiple(metrics.moic)}
          variant={metrics.moic >= 5 ? 'success' : metrics.moic >= 3 ? 'warning' : 'danger'}
          size="lg"
          formula={formulas.moic.formula}
          formulaDescription={formulas.moic.description}
        />
        <MetricCard
          label="Gross Multiple"
          value={formatMultiple(metrics.grossMultiple)}
          formula={formulas.grossMultiple.formula}
          formulaDescription={formulas.grossMultiple.description}
        />
        <MetricCard
          label="Total Proceeds"
          value={formatCurrency(metrics.totalProceeds)}
          formula={formulas.totalProceeds.formula}
          formulaDescription={formulas.totalProceeds.description}
        />
        <MetricCard
          label="Net Proceeds"
          value={formatCurrency(metrics.netProceeds)}
          variant="success"
          formula={formulas.netProceeds.formula}
          formulaDescription={formulas.netProceeds.description}
          />
        </div>
      </SectionCard>
    </div>
  );
}

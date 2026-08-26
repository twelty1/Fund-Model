import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CurrentCapTableItem } from './EstimatedDilutionForm';
import { EstimatedDilutionData, FollowOnRoundDilution } from './EstimatedDilutionForm';

const BLACK_COLOR = 'hsl(var(--foreground) / 0.7)';
const INVESTMENT_COLOR = 'hsl(142, 76%, 45%)';

interface CapEntry {
  name: string;
  percent: number;
  shares: number;
  value: number;
  color: string;
  isInvestment?: boolean;
}

interface Props {
  currentCapTable: CurrentCapTableItem[];
  currentRound?: string;
  hasSyndicate: boolean;
  postMoneyValuation: number;
  totalPostMoneyShares: number;
  pps: number;
  estimatedDilution: EstimatedDilutionData;
  initialOwnershipPercent: number;
}

const ROUND_ORDER = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series F'];
const CARTA_DILUTION: Record<string, number> = {
  'Seed': 19, 'Series A': 19, 'Series B': 13, 'Series C': 12, 'Series D': 13,
};

function buildFullyDilutedCapTable(
  initialOwnership: number,
  rounds: FollowOnRoundDilution[],
  totalShares: number,
  hasSyndicate: boolean,
  vcFundOwnershipRatio: number,
  currentRound?: string,
): CapEntry[] {
  const newInvestorsByRound: number[] = [];
  let investorOwnership = initialOwnership;
  let optionPool = 10;
  let founderOwnership = 100 - initialOwnership - optionPool;

  const currentIdx = ROUND_ORDER.indexOf(currentRound || 'Seed');

  const getCartaDilution = (index: number): number => {
    let namedCount = 0;
    for (let i = 0; i < index; i++) {
      if (!rounds[i].isInterim) namedCount++;
    }
    const targetIdx = currentIdx + namedCount + 1;
    const name = targetIdx < ROUND_ORDER.length ? ROUND_ORDER[targetIdx] : '';
    return CARTA_DILUTION[name] ?? 15;
  };

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const dilution = round.mode === 'carta' ? getCartaDilution(i) : round.newMoneyDilution;
    const dilutionFactor = (100 - dilution) / 100;

    if (round.proRataRights && round.proRataPercentTaken > 0) {
      investorOwnership = investorOwnership * dilutionFactor + (round.proRataPercentTaken / 100) * dilution;
    } else {
      investorOwnership *= dilutionFactor;
    }
    founderOwnership *= dilutionFactor;
    optionPool *= dilutionFactor;
    for (let j = 0; j < newInvestorsByRound.length; j++) {
      newInvestorsByRound[j] *= dilutionFactor;
    }

    const proRataShare = (round.proRataRights && round.proRataPercentTaken > 0)
      ? (round.proRataPercentTaken / 100) * dilution : 0;
    newInvestorsByRound.push(dilution - proRataShare);

    const optionPoolIncrease = round.optionPoolRefreshed - optionPool;
    if (optionPoolIncrease > 0) {
      if (round.optionPoolPreMoney) {
        founderOwnership -= optionPoolIncrease;
      } else {
        const total = founderOwnership + investorOwnership + newInvestorsByRound.reduce((s, v) => s + v, 0);
        if (total > 0) {
          const ratio = (total - optionPoolIncrease) / total;
          founderOwnership *= ratio;
          investorOwnership *= ratio;
          for (let j = 0; j < newInvestorsByRound.length; j++) newInvestorsByRound[j] *= ratio;
        }
      }
      optionPool = round.optionPoolRefreshed;
    }
  }

  const estimatedTotalShares = totalShares * Math.pow(1.25, rounds.length);
  const estimatedPPS = estimatedTotalShares > 0 ? 1 : 0; // We'll compute value from ownership

  const result: CapEntry[] = [
    { name: 'Founders', percent: Math.max(0, founderOwnership), shares: estimatedTotalShares * (founderOwnership / 100), value: 0, color: BLACK_COLOR },
    { name: 'Option Pool', percent: optionPool, shares: estimatedTotalShares * (optionPool / 100), value: 0, color: BLACK_COLOR },
  ];

  if (hasSyndicate) {
    const vc = Math.max(0, investorOwnership * vcFundOwnershipRatio);
    const syn = Math.max(0, investorOwnership * (1 - vcFundOwnershipRatio));
    result.push({ name: 'VC Fund Investment', percent: vc, shares: estimatedTotalShares * (vc / 100), value: 0, color: INVESTMENT_COLOR, isInvestment: true });
    result.push({ name: `Syndicate Investor`, percent: syn, shares: estimatedTotalShares * (syn / 100), value: 0, color: BLACK_COLOR });
  } else {
    result.push({ name: 'VC Firm Investor', percent: Math.max(0, investorOwnership), shares: estimatedTotalShares * (investorOwnership / 100), value: 0, color: INVESTMENT_COLOR, isInvestment: true });
  }

  let namedCount = 0;
  newInvestorsByRound.forEach((val, i) => {
    if (val > 0) {
      const round = rounds[i];
      let label: string;
      if (round?.isInterim) {
        const lastIdx = currentIdx + namedCount;
        label = `${lastIdx < ROUND_ORDER.length ? ROUND_ORDER[lastIdx] : `Round ${lastIdx + 1}`} Bridge`;
      } else {
        namedCount++;
        const idx = currentIdx + namedCount;
        label = idx < ROUND_ORDER.length ? ROUND_ORDER[idx] : `Round ${idx + 1}`;
      }
      result.push({ name: `${label} Investors`, percent: Math.max(0, val), shares: estimatedTotalShares * (val / 100), value: 0, color: BLACK_COLOR });
    } else {
      if (!rounds[i]?.isInterim) namedCount++;
    }
  });

  return result.filter(r => r.percent > 0);
}

function formatShares(shares: number) {
  if (shares >= 1000000) return `${(shares / 1000000).toFixed(2)}M`;
  if (shares >= 1000) return `${(shares / 1000).toFixed(1)}K`;
  return shares.toFixed(0);
}

function formatValue(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function CapTableChart({ title, entries, pps, footnotes }: { title: string; entries: CapEntry[]; pps: number; footnotes?: string[] }) {
  const chartData = entries.map(e => ({ ...e, chartValue: e.percent }));

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      <div className="flex items-start gap-3">
        <div className="h-28 w-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={20}
                outerRadius={45}
                paddingAngle={2}
                dataKey="chartValue"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke={entry.isInvestment ? 'hsl(142, 76%, 35%)' : undefined} strokeWidth={entry.isInvestment ? 2 : 0} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
          {footnotes && footnotes.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {footnotes.map((note, i) => (
                <p key={i} className="text-[8px] text-muted-foreground leading-tight">*{note}</p>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_55px_55px_55px] gap-1 pb-1 border-b border-border/50 mb-1">
            <span className="text-[9px] text-muted-foreground">Entity</span>
            <span className="text-[9px] text-muted-foreground text-right">Own%</span>
            <span className="text-[9px] text-muted-foreground text-right">Shares</span>
            <span className="text-[9px] text-muted-foreground text-right">Value</span>
          </div>
          {entries.map((item, i) => {
            const dollarValue = item.shares * pps;
            return (
              <div
                key={i}
                className={`grid grid-cols-[1fr_55px_55px_55px] gap-1 py-0.5 items-center ${
                  item.isInvestment ? 'bg-green-500/10 rounded px-1 -mx-1' : ''
                }`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                  <span className={`text-[10px] truncate ${item.isInvestment ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {item.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-foreground text-right">{item.percent.toFixed(1)}%</span>
                <span className="text-[10px] font-mono text-muted-foreground text-right">{formatShares(item.shares)}</span>
                <span className="text-[10px] font-mono text-muted-foreground text-right">{formatValue(dollarValue)}</span>
              </div>
            );
          })}
          {(() => {
            const totalPercent = entries.reduce((s, e) => s + e.percent, 0);
            const totalShares = entries.reduce((s, e) => s + e.shares, 0);
            const totalValue = entries.reduce((s, e) => s + e.shares * pps, 0);
            return (
              <div className="grid grid-cols-[1fr_55px_55px_55px] gap-1 pt-1 mt-1 border-t border-border font-semibold">
                <span className="text-[10px] text-foreground">Total</span>
                <span className="text-[10px] font-mono text-foreground text-right">{totalPercent.toFixed(1)}%</span>
                <span className="text-[10px] font-mono text-foreground text-right">{formatShares(totalShares)}</span>
                <span className="text-[10px] font-mono text-foreground text-right">{formatValue(totalValue)}</span>
              </div>
            );
          })()}
          <div className="pt-1 mt-1 border-t border-border/50">
            <div className="flex justify-between text-[9px]">
              <span className="text-muted-foreground">PPS</span>
              <span className="font-mono text-foreground">${pps.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CapTableDeliverables({
  currentCapTable,
  currentRound,
  hasSyndicate,
  postMoneyValuation,
  totalPostMoneyShares,
  pps,
  estimatedDilution,
  initialOwnershipPercent,
}: Props) {
  // Build current cap table entries
  const currentEntries: CapEntry[] = currentCapTable.map((item) => {
    const isVcFund = item.name === 'VC Fund Investment' || item.name === 'Investors';
    return {
      name: isVcFund ? (hasSyndicate ? 'VC Fund Investment' : 'VC Firm Investor') : item.name === 'Syndicate Investor' ? `Syndicate Investor` : item.name,
      percent: item.percent,
      shares: item.shares,
      value: item.shares * pps,
      color: isVcFund ? INVESTMENT_COLOR : BLACK_COLOR,
      isInvestment: isVcFund,
    };
  }).filter(e => e.percent > 0);

  // Compute VC fund ownership ratio for fully diluted
  const vcItem = currentCapTable.find(c => c.name === 'VC Fund Investment' || c.name === 'Investors');
  const synItem = currentCapTable.find(c => c.name === 'Syndicate Investor');
  const vcFundRatio = hasSyndicate && vcItem && synItem
    ? vcItem.percent / (vcItem.percent + synItem.percent)
    : 1;

  // Build fully diluted cap table
  const fullyDilutedEntries = buildFullyDilutedCapTable(
    initialOwnershipPercent,
    estimatedDilution.rounds,
    totalPostMoneyShares,
    hasSyndicate,
    vcFundRatio,
    currentRound,
  );

  // Estimate future PPS (simplified - use current PPS as base, grows ~25% per round)
  const estimatedFuturePPS = pps * Math.pow(1.25, estimatedDilution.rounds.length);

  // Build footnotes from dilution rounds
  const currentIdx = ROUND_ORDER.indexOf(currentRound || 'Seed');
  const optionPoolRounds: string[] = [];
  const proRataRounds: string[] = [];
  let namedCount = 0;
  estimatedDilution.rounds.forEach((round, i) => {
    let roundLabel: string;
    if (round.isInterim) {
      const lastIdx = currentIdx + namedCount;
      roundLabel = `${lastIdx < ROUND_ORDER.length ? ROUND_ORDER[lastIdx] : `R${lastIdx + 1}`} Bridge`;
    } else {
      namedCount++;
      const idx = currentIdx + namedCount;
      roundLabel = idx < ROUND_ORDER.length ? ROUND_ORDER[idx] : `Round ${idx + 1}`;
    }
    if (round.optionPoolRefreshed > 0) {
      optionPoolRounds.push(`${round.optionPoolRefreshed}% ${roundLabel}`);
    }
    if (round.proRataRights && round.proRataPercentTaken > 0) {
      proRataRounds.push(roundLabel);
    }
  });

  const dilutionFootnotes: string[] = [];
  if (optionPoolRounds.length > 0) {
    dilutionFootnotes.push(`Option pool refreshed to ${optionPoolRounds.join(', ')}`);
  }
  if (proRataRounds.length > 0) {
    dilutionFootnotes.push(`Pro rata rights taken/follow-on capital invested: ${proRataRounds.join(', ')}`);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CapTableChart title={`Current Cap Table — ${currentRound || 'Seed'}`} entries={currentEntries} pps={pps} />
      <CapTableChart title="Fully Diluted Cap Table (Est.)" entries={fullyDilutedEntries} pps={estimatedFuturePPS} footnotes={dilutionFootnotes} />
    </div>
  );
}

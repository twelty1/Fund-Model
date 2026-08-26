import { InputField } from './InputField';
import { SectionCard } from './SectionCard';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useMemo, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

export type DilutionMode = 'carta' | 'custom';

export interface FollowOnRoundDilution {
  mode: DilutionMode;
  newMoneyDilution: number;
  optionPoolRefreshed: number;
  optionPoolPreMoney: boolean;
  proRataRights: boolean;
  proRataPercentTaken: number;
  isInterim: boolean;
  useCustomValuation?: boolean;
  customPreMoney?: number;
  useCustomInvestment?: boolean;
  customInvestment?: number;
}

export interface EstimatedDilutionData {
  rounds: FollowOnRoundDilution[];
}

export interface CurrentCapTableItem {
  name: string;
  shares: number;
  percent: number;
}

interface Props {
  data: EstimatedDilutionData;
  onChange: (data: EstimatedDilutionData) => void;
  initialOwnershipPercent: number;
  totalPostMoneyShares: number;
  currentCapTable: CurrentCapTableItem[];
  currentRound?: string;
  hasSyndicate?: boolean;
  followOnAverages?: number[];
}

const defaultRound: FollowOnRoundDilution = {
  mode: 'carta',
  newMoneyDilution: 20,
  optionPoolRefreshed: 10,
  optionPoolPreMoney: true,
  proRataRights: false,
  proRataPercentTaken: 0,
  isInterim: false,
};

const BLACK_COLOR = 'hsl(var(--foreground) / 0.7)';
const INVESTMENT_COLOR = 'hsl(142, 76%, 45%)'; // Vibrant green for Initial Investment - stands out

interface CapTableData {
  name: string;
  value: number;
  shares: number;
  color: string;
  isInvestment?: boolean;
}

function calculateCapTableAfterRound(
  initialOwnership: number,
  rounds: FollowOnRoundDilution[],
  upToRoundIndex: number,
  totalShares: number,
  hasSyndicate: boolean,
  vcFundOwnershipRatio: number,
  currentRound?: string,
): CapTableData[] {
  // Track each round's new investors separately
  const newInvestorsByRound: number[] = [];
  
  let investorOwnership = initialOwnership;
  let optionPool = 10; // Assume initial 10% option pool
  let founderOwnership = 100 - initialOwnership - optionPool; // Track founders explicitly
  
  // Apply dilution for each round up to and including the target round
  for (let i = 0; i <= upToRoundIndex; i++) {
    const round = rounds[i];
    const dilutionFactor = (100 - round.newMoneyDilution) / 100;
    
    // Step 1: Apply new money dilution to all existing parties
    // Dilute initial investor (with pro rata consideration)
    if (round.proRataRights && round.proRataPercentTaken > 0) {
      // Pro rata % is the percentage of the new round's capital the VC takes
      investorOwnership = investorOwnership * dilutionFactor + (round.proRataPercentTaken / 100) * round.newMoneyDilution;
    } else {
      investorOwnership = investorOwnership * dilutionFactor;
    }
    
    // Dilute founders
    founderOwnership = founderOwnership * dilutionFactor;
    
    // Dilute option pool (before refresh)
    optionPool = optionPool * dilutionFactor;
    
    // Dilute previous new investors
    for (let j = 0; j < newInvestorsByRound.length; j++) {
      newInvestorsByRound[j] = newInvestorsByRound[j] * dilutionFactor;
    }
    
    // This round's new investors get dilution minus what the pro rata investor took
    const proRataShare = (round.proRataRights && round.proRataPercentTaken > 0) 
      ? (round.proRataPercentTaken / 100) * round.newMoneyDilution 
      : 0;
    newInvestorsByRound.push(round.newMoneyDilution - proRataShare);
    
    // Step 2: Handle option pool refresh
    const optionPoolIncrease = round.optionPoolRefreshed - optionPool;
    
    if (optionPoolIncrease > 0) {
      if (round.optionPoolPreMoney) {
        // Pre-money: Only founders bear the option pool dilution
        founderOwnership = founderOwnership - optionPoolIncrease;
      } else {
        // Post-money: Everyone (founders, initial investor, new investors) diluted proportionally
        const totalNonOptionPool = founderOwnership + investorOwnership + newInvestorsByRound.reduce((sum, v) => sum + v, 0);
        if (totalNonOptionPool > 0) {
          const dilutionRatio = (totalNonOptionPool - optionPoolIncrease) / totalNonOptionPool;
          founderOwnership = founderOwnership * dilutionRatio;
          investorOwnership = investorOwnership * dilutionRatio;
          for (let j = 0; j < newInvestorsByRound.length; j++) {
            newInvestorsByRound[j] = newInvestorsByRound[j] * dilutionRatio;
          }
        }
      }
      optionPool = round.optionPoolRefreshed;
    }
  }
  
  const totalNewInvestors = newInvestorsByRound.reduce((sum, v) => sum + v, 0);
  
  // Estimate shares grow with each round (simplified model: 20% more shares per round)
  const estimatedTotalShares = totalShares * Math.pow(1.25, upToRoundIndex + 1);
  
  const result: CapTableData[] = [
    { name: 'Founders', value: Math.max(0, founderOwnership), shares: estimatedTotalShares * (founderOwnership / 100), color: BLACK_COLOR },
    { name: 'Option Pool', value: optionPool, shares: estimatedTotalShares * (optionPool / 100), color: BLACK_COLOR },
  ];
  
  if (hasSyndicate) {
    const vcOwnership = Math.max(0, investorOwnership * vcFundOwnershipRatio);
    const syndicateOwnership = Math.max(0, investorOwnership * (1 - vcFundOwnershipRatio));
    result.push({ name: 'VC Fund Investment', value: vcOwnership, shares: estimatedTotalShares * (vcOwnership / 100), color: INVESTMENT_COLOR, isInvestment: true });
    result.push({ name: `Syndicate Investor — ${currentRound || 'Seed'}`, value: syndicateOwnership, shares: estimatedTotalShares * (syndicateOwnership / 100), color: BLACK_COLOR, isInvestment: false });
  } else {
    result.push({ name: 'VC Firm Investor', value: Math.max(0, investorOwnership), shares: estimatedTotalShares * (investorOwnership / 100), color: INVESTMENT_COLOR, isInvestment: true });
  }
  
  // Add each round's new investors separately, named by series
  const ROUND_NAMES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series F'];
  const currentIdx = ROUND_NAMES.indexOf(currentRound || 'Seed');
  let namedCount = 0;
  newInvestorsByRound.forEach((value, i) => {
    if (value > 0) {
      // Determine the round name for this new investor group
      const round = rounds[i];
      let roundLabel: string;
      if (round?.isInterim) {
        const lastNamedIdx = currentIdx + namedCount;
        const lastRoundName = lastNamedIdx < ROUND_NAMES.length ? ROUND_NAMES[lastNamedIdx] : `Round ${lastNamedIdx + 1}`;
        roundLabel = `${lastRoundName} Bridge`;
      } else {
        namedCount++;
        const targetIdx = currentIdx + namedCount;
        roundLabel = targetIdx < ROUND_NAMES.length ? ROUND_NAMES[targetIdx] : `Round ${targetIdx + 1}`;
      }
      result.push({
        name: `${roundLabel} Investors`,
        value: Math.max(0, value),
        shares: estimatedTotalShares * (value / 100),
        color: BLACK_COLOR,
      });
    } else {
      if (!rounds[i]?.isInterim) namedCount++;
    }
  });
  
  return result.filter(item => item.value > 0);
}

export function EstimatedDilutionForm({ data, onChange, initialOwnershipPercent, totalPostMoneyShares, currentCapTable, currentRound, hasSyndicate, followOnAverages }: Props) {
  const ROUND_ORDER: string[] = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series F'];

  // Carta Q3 2025 median pre-money valuations
  const CARTA_PRE_MONEY: Record<string, number> = {
    'Pre-Seed': 10000000,
    'Seed': 16000000,
    'Series A': 49300000,
    'Series B': 118900000,
    'Series C': 199700000,
    'Series D': 412100000,
  };

  // Carta Q3 2025 median dilution by round name
  const CARTA_DILUTION: Record<string, number> = {
    'Seed': 19,
    'Series A': 19,
    'Series B': 13,
    'Series C': 12,
    'Series D': 13,
  };

  const getCartaDilutionForRoundIndex = (index: number): number => {
    const currentIdx = ROUND_ORDER.indexOf(currentRound || 'Seed');
    let namedRoundCount = 0;
    for (let i = 0; i < index; i++) {
      if (!data.rounds[i].isInterim) namedRoundCount++;
    }
    const targetIdx = currentIdx + namedRoundCount + 1;
    const roundName = targetIdx < ROUND_ORDER.length ? ROUND_ORDER[targetIdx] : '';
    return CARTA_DILUTION[roundName] ?? 15;
  };

  // When a round is in carta mode, sync its dilution to the Carta value
  useEffect(() => {
    let changed = false;
    const newRounds = data.rounds.map((round, index) => {
      if (round.mode === 'carta') {
        const cartaDilution = getCartaDilutionForRoundIndex(index);
        if (round.newMoneyDilution !== cartaDilution) {
          changed = true;
          return { ...round, newMoneyDilution: cartaDilution };
        }
      }
      return round;
    });
    if (changed) onChange({ ...data, rounds: newRounds });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRound]);

  const getFollowOnRoundName = (index: number): string => {
    const currentIdx = ROUND_ORDER.indexOf(currentRound || 'Seed');
    let namedRoundCount = 0;
    for (let i = 0; i < index; i++) {
      if (!data.rounds[i].isInterim) namedRoundCount++;
    }
    if (data.rounds[index].isInterim) {
      const lastNamedIdx = currentIdx + namedRoundCount;
      const lastRoundName = lastNamedIdx < ROUND_ORDER.length ? ROUND_ORDER[lastNamedIdx] : `Round ${lastNamedIdx + 1}`;
      return `${lastRoundName} Bridge`;
    }
    const targetIdx = currentIdx + namedRoundCount + 1;
    return targetIdx < ROUND_ORDER.length ? ROUND_ORDER[targetIdx] : `Round ${targetIdx + 1}`;
  };

  // Auto-set proRataPercentTaken when it's 0 and pro rata is on
  useEffect(() => {
    let changed = false;
    const newRounds = data.rounds.map((round, index) => {
      if (round.proRataRights && round.proRataPercentTaken === 0) {
        const roundName = getFollowOnRoundName(index);
        const cartaPreMoney = CARTA_PRE_MONEY[roundName];
        const useCustom = round.useCustomValuation ?? false;
        const effectivePreMoney = useCustom && round.customPreMoney != null ? round.customPreMoney : cartaPreMoney;
        const dilution = round.newMoneyDilution / 100;
        const seriesInvestment = effectivePreMoney !== undefined ? effectivePreMoney * dilution / (1 - dilution) : 0;
        const effectiveInvestment = (round.useCustomInvestment && round.customInvestment != null) ? round.customInvestment : seriesInvestment;
        
        if (effectiveInvestment > 0) {
          const proRataDollars = (initialOwnershipPercent / 100) * effectiveInvestment;
          const reserveAvg = followOnAverages?.[index] ?? 0;
          const targetDollars = Math.min(proRataDollars, reserveAvg > 0 ? reserveAvg : proRataDollars);
          const newPercent = (targetDollars / effectiveInvestment) * 100;
          changed = true;
          return { ...round, proRataPercentTaken: newPercent };
        }
      }
      return round;
    });
    if (changed) onChange({ ...data, rounds: newRounds });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOwnershipPercent, followOnAverages, data.rounds.length]);

  const updateRound = (index: number, field: keyof FollowOnRoundDilution, value: number | boolean) => {
    const newRounds = [...data.rounds];
    newRounds[index] = { ...newRounds[index], [field]: value };
    onChange({ ...data, rounds: newRounds });
  };

  const addRound = () => {
    const newIndex = data.rounds.length;
    const cartaDilution = getCartaDilutionForRoundIndex(newIndex);
    onChange({ ...data, rounds: [...data.rounds, { ...defaultRound, newMoneyDilution: cartaDilution }] });
  };

  const removeRound = (index: number) => {
    const newRounds = data.rounds.filter((_, i) => i !== index);
    onChange({ ...data, rounds: newRounds });
  };

  const formatShares = (shares: number) => {
    if (shares >= 1000000) {
      return `${(shares / 1000000).toFixed(2)}M`;
    } else if (shares >= 1000) {
      return `${(shares / 1000).toFixed(1)}K`;
    }
    return shares.toFixed(0);
  };

  // Build current deal cap table from the passed data (matching Current Investment Shares tab)
  // All sections are black except Initial Investment (Investors) which is green
  const currentDealCapTable: CapTableData[] = currentCapTable.map((item) => {
    const isVcFund = item.name === 'VC Fund Investment' || item.name === 'Investors';
    const isSyndicate = item.name === 'Syndicate Investor';
    return {
      name: item.name === 'VC Fund Investment' ? 'VC Fund Investment' : isSyndicate ? `Syndicate Investor — ${currentRound || 'Seed'}` : item.name === 'Investors' ? 'VC Firm Investor' : item.name,
      value: item.percent,
      shares: item.shares,
      color: isVcFund ? INVESTMENT_COLOR : BLACK_COLOR,
      isInvestment: isVcFund,
    };
  }).filter(item => item.value > 0);

  // Helper: resolve effective rounds with Carta dilution values applied
  const getEffectiveRounds = (): FollowOnRoundDilution[] => {
    return data.rounds.map((r, i) => {
      if (r.mode === 'carta') {
        return { ...r, newMoneyDilution: getCartaDilutionForRoundIndex(i) };
      }
      return r;
    });
  };

  return (
    <SectionCard title="Estimated Dilution">
      <div className="space-y-4">
        {/* Current Deal Cap Table */}
        <div className="pb-3 border-b border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Current Deal Cap Table{currentRound ? ` — ${currentRound}` : ''}
          </h4>
          <div className="flex items-center gap-4">
            <div className="h-32 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentDealCapTable}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {currentDealCapTable.map((entry, i) => (
                      <Cell 
                        key={`cell-${i}`} 
                        fill={entry.color}
                        stroke={entry.isInvestment ? 'hsl(142, 76%, 35%)' : undefined}
                        strokeWidth={entry.isInvestment ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {currentDealCapTable.map((item, i) => (
                <div 
                  key={i} 
                  className={`flex items-center justify-between text-xs py-1 px-2 rounded ${
                    item.isInvestment ? 'bg-green-500/10 border border-green-500/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div 
                      className={`w-2 h-2 rounded-sm ${item.isInvestment ? 'ring-2 ring-green-500/50' : ''}`} 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={`${item.isInvestment ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono text-muted-foreground text-[10px]">{formatShares(item.shares)}</span>
                    <span className="font-mono font-medium text-foreground w-12 text-right">
                      {item.value.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dilution View Toggle */}
        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-7">
            <TabsTrigger value="individual" className="text-[10px] h-5">Custom Individual Rounds</TabsTrigger>
            <TabsTrigger value="estimated" className="text-[10px] h-5">Est. Total Dilution (Carta Q3 2025)</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="mt-4 space-y-4">
            {/* Follow-on rounds */}
            {data.rounds.map((round, index) => {
              const vcFundRatio = hasSyndicate ? (currentCapTable.find(c => c.name === 'VC Fund Investment')?.percent ?? 50) / (currentCapTable.filter(c => c.name === 'VC Fund Investment' || c.name === 'Syndicate Investor').reduce((s, c) => s + c.percent, 0) || 1) : 1;
              const capTableData = calculateCapTableAfterRound(
                initialOwnershipPercent,
                getEffectiveRounds(),
                index,
                totalPostMoneyShares,
                hasSyndicate ?? false,
                vcFundRatio,
                currentRound,
              );
              
              return (
                <div key={index}>
                  {/* Add Interim Round button between rounds */}
                  {index > 0 && (
                    <div className="flex justify-center -mt-2 mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newRounds = [...data.rounds];
                          newRounds.splice(index, 0, { ...defaultRound, isInterim: true });
                          onChange({ ...data, rounds: newRounds });
                        }}
                        className="h-6 px-3 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Interim Round
                      </Button>
                    </div>
                  )}
                  <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {getFollowOnRoundName(index)}
                        </span>
                        {round.isInterim && (
                          <span className="text-[9px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Bridge</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {data.rounds.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRound(index)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>


              {/* Carta Q3 2025 round details */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-1.5 px-1">
                    <span className="text-xs text-muted-foreground">Dilution <span className="text-[10px] italic text-muted-foreground/70">*Carta Q3 2025 dilution %</span></span>
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {round.newMoneyDilution}%
                    </span>
                  </div>
                  {(() => {
                    const roundName = getFollowOnRoundName(index);
                    const cartaPreMoney = CARTA_PRE_MONEY[roundName];
                    const cartaDilution = round.newMoneyDilution;
                    const cartaDilutionDecimal = cartaDilution / 100;
                    const useCustom = round.useCustomValuation ?? false;
                    const effectivePreMoney = useCustom && round.customPreMoney != null ? round.customPreMoney : cartaPreMoney;
                    const seriesInvestment = effectivePreMoney !== undefined ? effectivePreMoney * cartaDilutionDecimal / (1 - cartaDilutionDecimal) : null;
                    
                    return (
                      <div className="space-y-1.5 pt-1 border-t border-border/50">
                        {(cartaPreMoney !== undefined || useCustom) && (
                          <>
                            <div className="flex items-center justify-between py-1 px-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Pre-Money</span>
                                <Tabs
                                  value={useCustom ? 'custom' : 'carta'}
                                  onValueChange={(v) => {
                                    const newRounds = [...data.rounds];
                                    const isCustom = v === 'custom';
                                    newRounds[index] = {
                                      ...newRounds[index],
                                      useCustomValuation: isCustom,
                                      customPreMoney: isCustom && newRounds[index].customPreMoney == null ? (cartaPreMoney ?? 0) : newRounds[index].customPreMoney,
                                    };
                                    onChange({ ...data, rounds: newRounds });
                                  }}
                                >
                                  <TabsList className="h-5 p-0.5">
                                    <TabsTrigger value="carta" className="text-[9px] h-4 px-1.5">Carta</TabsTrigger>
                                    <TabsTrigger value="custom" className="text-[9px] h-4 px-1.5">Custom</TabsTrigger>
                                  </TabsList>
                                </Tabs>
                              </div>
                              {useCustom ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">$</span>
                                  <input
                                    type="text"
                                    value={round.customPreMoney != null ? (round.customPreMoney / 1000000).toFixed(1) : ''}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      const newRounds = [...data.rounds];
                                      newRounds[index] = { ...newRounds[index], customPreMoney: isNaN(val) ? 0 : val * 1000000 };
                                      onChange({ ...data, rounds: newRounds });
                                    }}
                                    className="w-16 text-right text-xs font-mono font-semibold bg-background border border-border rounded px-1 py-0.5"
                                  />
                                  <span className="text-xs text-muted-foreground">M</span>
                                </div>
                              ) : (
                                <span className="text-xs font-mono font-semibold text-foreground">
                                  ${cartaPreMoney !== undefined ? (cartaPreMoney / 1000000).toFixed(1) : '—'}M
                                </span>
                              )}
                            </div>
                            {(seriesInvestment !== null || round.useCustomInvestment) && (
                              <div className="flex items-center justify-between py-1 px-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{roundName} Investment</span>
                                  <Tabs
                                    value={round.useCustomInvestment ? 'custom' : 'carta'}
                                    onValueChange={(v) => {
                                      const newRounds = [...data.rounds];
                                      const isCustom = v === 'custom';
                                      newRounds[index] = {
                                        ...newRounds[index],
                                        useCustomInvestment: isCustom,
                                        customInvestment: isCustom && newRounds[index].customInvestment == null ? (seriesInvestment ?? 0) : newRounds[index].customInvestment,
                                      };
                                      onChange({ ...data, rounds: newRounds });
                                    }}
                                  >
                                    <TabsList className="h-5 p-0.5">
                                      <TabsTrigger value="carta" className="text-[9px] h-4 px-1.5">Carta</TabsTrigger>
                                      <TabsTrigger value="custom" className="text-[9px] h-4 px-1.5">Custom</TabsTrigger>
                                    </TabsList>
                                  </Tabs>
                                </div>
                                {round.useCustomInvestment ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">$</span>
                                    <input
                                      type="text"
                                      value={round.customInvestment != null ? (round.customInvestment / 1000000).toFixed(1) : ''}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        const newRounds = [...data.rounds];
                                        newRounds[index] = { ...newRounds[index], customInvestment: isNaN(val) ? 0 : val * 1000000 };
                                        onChange({ ...data, rounds: newRounds });
                                      }}
                                      className="w-16 text-right text-xs font-mono font-semibold bg-background border border-border rounded px-1 py-0.5"
                                    />
                                    <span className="text-xs text-muted-foreground">M</span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-mono font-semibold text-foreground">
                                    ${seriesInvestment !== null ? (seriesInvestment / 1000000).toFixed(1) : '—'}M
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex items-center justify-between py-1 px-1">
                          <span className="text-xs text-muted-foreground">Aggregate Investment %</span>
                          <span className="text-xs font-mono font-semibold text-foreground">
                            {cartaDilution.toFixed(1)}%
                          </span>
                        </div>

                        {/* Pro Rata Rights Toggle */}
                        <div className="flex items-center justify-between py-2 px-1">
                          <Label htmlFor={`carta-pro-rata-${index}`} className="text-xs text-muted-foreground">
                            Pro Rata Rights
                          </Label>
                          <Switch
                            id={`carta-pro-rata-${index}`}
                            checked={round.proRataRights}
                            onCheckedChange={(checked) => {
                              updateRound(index, 'proRataRights', checked);
                              if (checked && round.proRataPercentTaken === 0) {
                                updateRound(index, 'proRataPercentTaken', initialOwnershipPercent);
                              }
                            }}
                          />
                        </div>

                        {round.proRataRights && (() => {
                          const effectiveInvestment = (round.useCustomInvestment && round.customInvestment != null) ? round.customInvestment : (seriesInvestment ?? 0);
                          const proRataInvestmentDollars = (initialOwnershipPercent / 100) * effectiveInvestment;
                          const dollarsInvested = (round.proRataPercentTaken / 100) * effectiveInvestment;

                          return (
                            <div className="space-y-2 p-2 bg-muted/50 rounded border border-border">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Max % of New Round Capital</span>
                                <span className="text-sm font-mono font-medium text-foreground">
                                  {initialOwnershipPercent.toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Pro Rata Investment Rights ($)</span>
                                <span className="text-sm font-mono font-medium text-foreground">
                                  ${(proRataInvestmentDollars / 1000000).toFixed(2)}M
                                </span>
                              </div>
                              <div className={`rounded ${dollarsInvested > proRataInvestmentDollars && proRataInvestmentDollars > 0 ? 'ring-2 ring-destructive' : ''}`}>
                                <InputField
                                  label="$ Invested in New Round"
                                  value={dollarsInvested / 1000000}
                                  onChange={(v) => {
                                    const newDollars = v * 1000000;
                                    const newPercent = effectiveInvestment > 0 ? (newDollars / effectiveInvestment) * 100 : 0;
                                    updateRound(index, 'proRataPercentTaken', newPercent);
                                  }}
                                  prefix="$"
                                  suffix="M"
                                  step={0.01}
                                  min={0}
                                />
                              </div>
                              {dollarsInvested > proRataInvestmentDollars && proRataInvestmentDollars > 0 && (
                                <p className="text-[10px] text-destructive">Exceeds pro rata investment rights</p>
                              )}
                              {followOnAverages && followOnAverages[index] !== undefined && followOnAverages[index] > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  Portfolio Avg Reserve {index + 1}: ${(followOnAverages[index] / 1000000).toFixed(2)}M
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Option Pool Refresh Toggle */}
                        <div className="flex items-center justify-between py-2 px-1">
                          <Label htmlFor={`carta-esop-refresh-${index}`} className="text-xs text-muted-foreground">
                            Option Pool Refreshed
                          </Label>
                          <Switch
                            id={`carta-esop-refresh-${index}`}
                            checked={round.optionPoolRefreshed > 0}
                            onCheckedChange={(checked) => updateRound(index, 'optionPoolRefreshed', checked ? 10 : 0)}
                          />
                        </div>
                        {round.optionPoolRefreshed > 0 && (
                          <div className="space-y-2 p-2 bg-muted/50 rounded border border-border">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`carta-esop-premoney-${index}`} className="text-xs text-muted-foreground">
                                Pre-Money Option Pool
                              </Label>
                              <Switch
                                id={`carta-esop-premoney-${index}`}
                                checked={round.optionPoolPreMoney}
                                onCheckedChange={(checked) => updateRound(index, 'optionPoolPreMoney', checked)}
                              />
                            </div>
                            <InputField
                              label="Refreshed To"
                              value={round.optionPoolRefreshed}
                              onChange={(v) => updateRound(index, 'optionPoolRefreshed', v)}
                              suffix="%"
                              step={1}
                              min={1}
                              max={100}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

              {/* Cap Table Pie Chart */}
              <div className="mt-4 pt-3 border-t border-border">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Cap Table After {getFollowOnRoundName(index)}
                </h4>
                <div className="flex items-center gap-4">
                  <div className="h-32 w-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={capTableData}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {capTableData.map((entry, i) => (
                            <Cell 
                              key={`cell-${i}`} 
                              fill={entry.color}
                              stroke={entry.isInvestment ? 'hsl(142, 76%, 35%)' : undefined}
                              strokeWidth={entry.isInvestment ? 2 : 0}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => `${value.toFixed(1)}%`}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1">
                    {capTableData.map((item, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center justify-between text-xs py-1 px-2 rounded ${
                          item.isInvestment ? 'bg-green-500/10 border border-green-500/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div 
                            className={`w-2 h-2 rounded-sm ${item.isInvestment ? 'ring-2 ring-green-500/50' : ''}`} 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className={`${item.isInvestment ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {item.name}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="font-mono text-muted-foreground text-[10px]">{formatShares(item.shares)}</span>
                          <span className="font-mono font-medium text-foreground w-12 text-right">
                            {item.value.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* VC Fund dilution summary for this round */}
                {(() => {
                  const vcEntry = capTableData.find(item => item.isInvestment);
                  const vcOwnershipAfter = vcEntry?.value ?? 0;
                  // For first round, compare against initial ownership; for subsequent rounds, compare against previous round's VC ownership
                  let vcOwnershipBefore = initialOwnershipPercent;
                  if (index > 0) {
                    const prevCapTable = calculateCapTableAfterRound(
                      initialOwnershipPercent,
                      getEffectiveRounds(),
                      index - 1,
                      totalPostMoneyShares,
                      hasSyndicate ?? false,
                      vcFundRatio,
                      currentRound,
                    );
                    const prevVcEntry = prevCapTable.find(item => item.isInvestment);
                    vcOwnershipBefore = prevVcEntry?.value ?? initialOwnershipPercent;
                  }
                  const dilutionFromPrev = vcOwnershipBefore - vcOwnershipAfter;
                  const dilutionPercentFromPrev = vcOwnershipBefore > 0 ? (dilutionFromPrev / vcOwnershipBefore) * 100 : 0;
                  const roundName = getFollowOnRoundName(index);
                  return (
                    <div className="flex items-center justify-between py-2 px-2 mt-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <span className="text-xs text-destructive">Total VC Fund {roundName} Dilution</span>
                      <span className="text-xs font-mono font-semibold text-destructive">
                        -{dilutionPercentFromPrev.toFixed(1)}% ({dilutionFromPrev.toFixed(2)} pts) → {vcOwnershipAfter.toFixed(2)}%
                      </span>
                    </div>
                  );
                })()}
              </div>
                  </div>
                </div>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={addRound}
              className="w-full gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Follow On Round
            </Button>

            {/* Total Dilution Summary */}
            {data.rounds.length > 0 && (() => {
              const effectiveRounds = getEffectiveRounds();
              const totalDilution = effectiveRounds.reduce((sum, r) => sum + r.newMoneyDilution, 0);
              return (
                <div className="flex items-center justify-between py-2 px-3 bg-destructive/10 border border-destructive/20 rounded-lg mt-2">
                  <span className="text-xs font-medium text-destructive">Total Dilution</span>
                  <span className="text-sm font-mono font-semibold text-destructive">
                    -{totalDilution.toFixed(0)}%
                  </span>
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="estimated" className="mt-4">
            {(() => {
              const ROUND_NAMES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D'];
              const DILUTION_MAP: Record<string, number> = {
                'Seed': 19, 'Series A': 19, 'Series B': 13, 'Series C': 12, 'Series D': 13,
              };
              const currentIdx = ROUND_NAMES.indexOf(currentRound || 'Seed');
              // Build rows: current round ownership, then each subsequent round
              const futureRounds = ROUND_NAMES.slice(currentIdx + 1);
              let ownership = initialOwnershipPercent;
              const rows: { label: string; dilution: number | null; ownership: number }[] = [
                { label: `${currentRound || 'Seed'} (Current)`, dilution: null, ownership },
              ];
              futureRounds.forEach(name => {
                const dil = DILUTION_MAP[name] ?? 15;
                ownership = ownership * (100 - dil) / 100;
                rows.push({ label: name, dilution: dil, ownership });
              });

              return (
                <div className="space-y-1">
                  {rows.map((row, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs ${
                        i === 0 ? 'bg-muted/50' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{row.label}</span>
                        {row.dilution !== null && (
                          <span className="text-destructive font-mono">-{row.dilution}%</span>
                        )}
                      </div>
                      <span
                        className="font-mono font-semibold"
                        style={{ color: i === 0 ? undefined : INVESTMENT_COLOR }}
                      >
                        {row.ownership.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 px-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs mt-2">
                    <span className="text-destructive">Total Dilution</span>
                    <span className="font-mono font-semibold text-destructive">
                      -{((initialOwnershipPercent - ownership) / initialOwnershipPercent * 100).toFixed(1)}% ({(initialOwnershipPercent - ownership).toFixed(2)} pts)
                    </span>
                  </div>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>

      </div>
    </SectionCard>
  );
}

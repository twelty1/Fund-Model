import { DealDynamics, ConvertibleInstrument, InvestmentRound } from '@/types/fundModel';
import { InputField } from './InputField';
import { SectionCard } from './SectionCard';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { useMemo, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const CARTA_PRE_MONEY: Record<string, number> = {
  'Pre-Seed': 10000000,
  'Seed': 16000000,
  'Series A': 49300000,
  'Series B': 118900000,
  'Series C': 199700000,
  'Series D': 412100000,
};

interface Props {
  data: DealDynamics;
  onChange: (data: DealDynamics) => void;
  averageInitialInvestment?: number;
}

export function DealDynamicsForm({ data, onChange, averageInitialInvestment }: Props) {
  const update = (field: keyof DealDynamics, value: number | boolean) => {
    onChange({ ...data, [field]: value });
  };

  // Sync pre-money valuation when in carta mode and round changes
  useEffect(() => {
    if (data.preMoneyMode === 'carta') {
      const cartaValue = CARTA_PRE_MONEY[data.currentRound] ?? 16000000;
      if (data.preMoney !== cartaValue) {
        onChange({ ...data, preMoney: cartaValue });
      }
    }
  }, [data.currentRound, data.preMoneyMode]);

  const totalConvertible = data.convertibleDebt.reduce((sum, item) => sum + item.value, 0);
  const postMoney = data.preMoney + data.vcFundInvestment + data.syndicateInvestment + totalConvertible;
  const totalInvestment = data.vcFundInvestment + data.syndicateInvestment;

  const addConvertibleInstrument = () => {
    const newInstrument: ConvertibleInstrument = {
      id: crypto.randomUUID(),
      type: 'note',
      name: `Note ${data.convertibleDebt.length + 1}`,
      value: 0,
      discountRate: 20,
      cap: 0,
    };
    onChange({ ...data, convertibleDebt: [...data.convertibleDebt, newInstrument] });
  };

  const removeConvertibleInstrument = (id: string) => {
    onChange({ ...data, convertibleDebt: data.convertibleDebt.filter(item => item.id !== id) });
  };

  const updateConvertibleInstrument = (id: string, field: keyof ConvertibleInstrument, value: string | number) => {
    onChange({
      ...data,
      convertibleDebt: data.convertibleDebt.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  // Calculate share counts using the formula:
  // 1. Founder shares = Original shares
  // 2. Option pool shares = (Founder shares / (1 - option pool %)) - Founder shares
  // 3. Pre-money shares = Founder shares + Option pool shares
  // 4. Investor ownership % = Investment / Post-money valuation
  // 5. Investment shares = (Founder shares + Option pool shares) / (1 - investor ownership %) - (Founder shares + Option pool shares)
  // 6. Post-money shares = Pre-money shares + Investment shares
  // 7. PPS = Post-money valuation / Post-money shares
  const shareCalculations = useMemo(() => {
    const founderShares = data.originalSharesOutstanding;
    const esopPercent = data.esopPercent / 100;
    const investorOwnership = totalInvestment / postMoney;
    
    if (data.isPreMoneyOptionPool) {
      // Pre-money option pool: option pool is calculated before investment
      // Option pool shares = (Founder shares / (1 - option pool %)) - Founder shares
      const optionPoolSharesPreDilution = (founderShares / (1 - esopPercent)) - founderShares;
      const preMoneyShares = founderShares + optionPoolSharesPreDilution;
      
      // Investment shares = (Founder + Option Pool) / (1 - investor ownership %) - (Founder + Option Pool)
      const postMoneySharesPreConvertible = preMoneyShares / (1 - investorOwnership);
      const investmentShares = postMoneySharesPreConvertible - preMoneyShares;
      
      // Calculate PPS before convertible debt
      const ppsPreConvertible = postMoney / postMoneySharesPreConvertible;
      
      // Calculate convertible debt shares
      let convertibleDebtShares = 0;
      data.convertibleDebt.forEach(instrument => {
        if (instrument.value > 0) {
          const discountedPrice = ppsPreConvertible * (1 - instrument.discountRate / 100);
          const capPrice = instrument.cap > 0 ? instrument.cap / postMoneySharesPreConvertible : Infinity;
          const effectivePrice = Math.min(discountedPrice, capPrice);
          convertibleDebtShares += instrument.value / effectivePrice;
        }
      });
      
      // Convertible debt dilutes founders and option pool proportionally, NOT investors
      const totalPostMoney = postMoneySharesPreConvertible + convertibleDebtShares;
      const dilutionFromConvertible = convertibleDebtShares > 0 
        ? convertibleDebtShares / (preMoneyShares + convertibleDebtShares)
        : 0;
      const founderSharesDiluted = founderShares * (1 - dilutionFromConvertible);
      const optionPoolSharesDiluted = optionPoolSharesPreDilution * (1 - dilutionFromConvertible);
      
      // Split investment shares between VC Fund and Syndicate
      const vcFundShareRatio = totalInvestment > 0 ? data.vcFundInvestment / totalInvestment : 1;
      const syndicateShareRatio = totalInvestment > 0 ? data.syndicateInvestment / totalInvestment : 0;
      
      return {
        founderShares: founderSharesDiluted,
        founderSharesPreDilution: founderShares,
        optionPoolShares: optionPoolSharesDiluted,
        optionPoolSharesPreDilution: optionPoolSharesPreDilution,
        preMoneyShares,
        investmentShares,
        vcFundShares: investmentShares * vcFundShareRatio,
        syndicateShares: investmentShares * syndicateShareRatio,
        convertibleDebtShares,
        postMoneyShares: totalPostMoney,
      };
    } else {
      // Post-money option pool: option pool comes from post-money cap table
      // First calculate without option pool
      const postMoneySharesBeforePool = founderShares / (1 - investorOwnership);
      const investmentShares = postMoneySharesBeforePool - founderShares;
      
      // Then add option pool from post-money
      const postMoneySharesPreConvertible = postMoneySharesBeforePool / (1 - esopPercent);
      const optionPoolSharesPreDilution = postMoneySharesPreConvertible - postMoneySharesBeforePool;
      const preMoneyShares = founderShares + optionPoolSharesPreDilution;
      
      // Calculate PPS before convertible debt
      const ppsPreConvertible = postMoney / postMoneySharesPreConvertible;
      
      // Calculate convertible debt shares
      let convertibleDebtShares = 0;
      data.convertibleDebt.forEach(instrument => {
        if (instrument.value > 0) {
          const discountedPrice = ppsPreConvertible * (1 - instrument.discountRate / 100);
          const capPrice = instrument.cap > 0 ? instrument.cap / postMoneySharesPreConvertible : Infinity;
          const effectivePrice = Math.min(discountedPrice, capPrice);
          convertibleDebtShares += instrument.value / effectivePrice;
        }
      });
      
      // Convertible debt dilutes founders and option pool proportionally, NOT investors
      const totalPostMoney = postMoneySharesPreConvertible + convertibleDebtShares;
      const dilutionFromConvertible = convertibleDebtShares > 0 
        ? convertibleDebtShares / (preMoneyShares + convertibleDebtShares)
        : 0;
      const founderSharesDiluted = founderShares * (1 - dilutionFromConvertible);
      const optionPoolSharesDiluted = optionPoolSharesPreDilution * (1 - dilutionFromConvertible);
      
      // Split investment shares between VC Fund and Syndicate
      const vcFundShareRatio = totalInvestment > 0 ? data.vcFundInvestment / totalInvestment : 1;
      const syndicateShareRatio = totalInvestment > 0 ? data.syndicateInvestment / totalInvestment : 0;
      
      return {
        founderShares: founderSharesDiluted,
        founderSharesPreDilution: founderShares,
        optionPoolShares: optionPoolSharesDiluted,
        optionPoolSharesPreDilution: optionPoolSharesPreDilution,
        preMoneyShares,
        investmentShares,
        vcFundShares: investmentShares * vcFundShareRatio,
        syndicateShares: investmentShares * syndicateShareRatio,
        convertibleDebtShares,
        postMoneyShares: totalPostMoney,
      };
    }
  }, [data.originalSharesOutstanding, data.esopPercent, data.isPreMoneyOptionPool, data.convertibleDebt, totalInvestment, postMoney]);

  const pps = shareCalculations.postMoneyShares > 0 ? postMoney / shareCalculations.postMoneyShares : 0;

  const capTableData = useMemo(() => {
    const colors = [
      'hsl(var(--chart-1))', 
      'hsl(var(--chart-2))', 
      'hsl(142, 76%, 45%)', // Vibrant green for VC Fund - stands out
      'hsl(160, 60%, 40%)', // Teal for Syndicate
      'hsl(var(--chart-4))'
    ];
    const items: { name: string; shares: number; color: string; isInvestor: boolean }[] = [
      { name: 'Founders', shares: shareCalculations.founderShares, color: colors[0], isInvestor: false },
      { name: 'Option Pool', shares: shareCalculations.optionPoolShares, color: colors[1], isInvestor: false },
    ];
    
    if (data.syndicateInvestment > 0) {
      items.push({ name: 'VC Fund Investment', shares: shareCalculations.vcFundShares, color: colors[2], isInvestor: true });
      items.push({ name: 'Syndicate Investor', shares: shareCalculations.syndicateShares, color: colors[3], isInvestor: false });
    } else {
      items.push({ name: 'Investors', shares: shareCalculations.investmentShares, color: colors[2], isInvestor: true });
    }
    
    if (shareCalculations.convertibleDebtShares > 0) {
      items.push({ name: 'Convertible Debt', shares: shareCalculations.convertibleDebtShares, color: colors[4], isInvestor: false });
    }
    
    const totalShares = items.reduce((sum, item) => sum + item.shares, 0);
    
    return items.map(item => ({
      ...item,
      value: item.shares * pps,
      percent: totalShares > 0 ? (item.shares / totalShares) * 100 : 0,
    }));
  }, [shareCalculations, pps, data.syndicateInvestment]);

  const formatShares = (shares: number) => {
    if (shares >= 1000000) {
      return `${(shares / 1000000).toFixed(2)}M`;
    } else if (shares >= 1000) {
      return `${(shares / 1000).toFixed(1)}K`;
    }
    return shares.toFixed(0);
  };

  const roundOptions: DealDynamics['currentRound'][] = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C'];

  return (
    <SectionCard title="Deal Dynamics">
      <div className="space-y-2">
        <div className="flex items-center justify-between py-1.5 px-1">
          <span className="text-xs text-muted-foreground">Current Round</span>
          <Select
            value={data.currentRound}
            onValueChange={(value: DealDynamics['currentRound']) => onChange({ ...data, currentRound: value })}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roundOptions.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between px-1 py-1.5">
          <span className="text-xs text-muted-foreground">Pre-Money Valuation</span>
          <div className="flex items-center gap-2">
            <Tabs
              value={data.preMoneyMode}
              onValueChange={(v) => {
                const mode = v as 'carta' | 'custom';
                const updates: Partial<DealDynamics> = { preMoneyMode: mode };
                if (mode === 'carta') {
                  updates.preMoney = CARTA_PRE_MONEY[data.currentRound] ?? 16000000;
                }
                onChange({ ...data, ...updates });
              }}
            >
              <TabsList className="h-6">
                <TabsTrigger value="carta" className="text-[10px] px-2 h-5">Carta Q3 2025</TabsTrigger>
                <TabsTrigger value="custom" className="text-[10px] px-2 h-5">Custom</TabsTrigger>
              </TabsList>
            </Tabs>
            {data.preMoneyMode === 'carta' ? (
              <span className="text-xs font-mono font-semibold text-foreground w-16 text-right">
                ${(data.preMoney / 1000000).toFixed(1)}M
              </span>
            ) : (
              <InputField
                label=""
                value={data.preMoney / 1000000}
                onChange={(v) => update('preMoney', v * 1000000)}
                prefix="$"
                suffix="M"
                step={0.5}
              />
            )}
          </div>
        </div>
        <InputField
          label="VC Fund Investment"
          value={data.vcFundInvestment / 1000000}
          onChange={(v) => update('vcFundInvestment', v * 1000000)}
          prefix="$"
          suffix="M"
          step={0.1}
        />
        {averageInitialInvestment !== undefined && (
          <p className="text-[10px] text-muted-foreground px-1 -mt-1">
            Avg. Initial Investment (Portfolio): ${(averageInitialInvestment / 1000000).toFixed(2)}M
          </p>
        )}
        <InputField
          label="Syndicate Investment"
          value={data.syndicateInvestment / 1000000}
          onChange={(v) => update('syndicateInvestment', v * 1000000)}
          prefix="$"
          suffix="M"
          step={0.1}
        />
        <div className="flex items-center justify-between py-1.5 px-1">
          <span className="text-xs text-muted-foreground">Post Money</span>
          <span className="text-xs font-mono font-medium text-foreground">
            ${(postMoney / 1000000).toFixed(1)}M
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5 px-1">
          <span className="text-xs text-muted-foreground">VC Fund Invested Cap Ownership %</span>
          <span className="text-xs font-mono font-medium text-foreground">
            {postMoney > 0 ? ((data.vcFundInvestment / postMoney) * 100).toFixed(2) : '0.00'}%
          </span>
        </div>
        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Cap Table</p>
          <div className="space-y-3 pl-2 border-l-2 border-border/30">
            <InputField
              label="Original Shares Outstanding"
              value={data.originalSharesOutstanding / 1000000}
              onChange={(v) => update('originalSharesOutstanding', v * 1000000)}
              suffix="M"
              step={0.1}
            />
            
            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground/80">Option Pool</p>
              <div className="space-y-2 pl-2">
                <div className="flex items-center justify-between py-1.5 px-1">
                  <Label htmlFor="option-pool-toggle" className="text-xs text-muted-foreground">
                    Option Pool Type
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${!data.isPreMoneyOptionPool ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      Post
                    </span>
                    <Switch
                      id="option-pool-toggle"
                      checked={data.isPreMoneyOptionPool}
                      onCheckedChange={(checked) => update('isPreMoneyOptionPool', checked)}
                    />
                    <span className={`text-xs ${data.isPreMoneyOptionPool ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      Pre
                    </span>
                  </div>
                </div>

                <InputField
                  label="Option Pool %"
                  value={data.esopPercent}
                  onChange={(v) => update('esopPercent', v)}
                  suffix="%"
                  step={1}
                  min={0}
                  max={25}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground/80">Convertible Debt</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addConvertibleInstrument}
                  className="h-6 px-2 text-xs gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
              <div className="space-y-3 pl-2">
                {data.convertibleDebt.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic py-2">No convertible debt added</p>
                ) : (
                  data.convertibleDebt.map((instrument, index) => (
                    <div key={instrument.id} className="space-y-2 p-2 bg-muted/30 rounded-md">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Select
                            value={instrument.type}
                            onValueChange={(value: 'note' | 'safe') => 
                              updateConvertibleInstrument(instrument.id, 'type', value)
                            }
                          >
                            <SelectTrigger className="h-7 w-20 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="note">Note</SelectItem>
                              <SelectItem value="safe">SAFE</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-xs text-muted-foreground">#{index + 1}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeConvertibleInstrument(instrument.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <InputField
                        label="Value"
                        value={instrument.value}
                        onChange={(v) => updateConvertibleInstrument(instrument.id, 'value', v)}
                        prefix="$"
                        step={50000}
                      />
                      <InputField
                        label="Discount Rate"
                        value={instrument.discountRate}
                        onChange={(v) => updateConvertibleInstrument(instrument.id, 'discountRate', v)}
                        suffix="%"
                        step={5}
                        min={0}
                        max={50}
                      />
                      <InputField
                        label="Valuation Cap"
                        value={instrument.cap / 1000000}
                        onChange={(v) => updateConvertibleInstrument(instrument.id, 'cap', v * 1000000)}
                        prefix="$"
                        suffix="M"
                        step={0.5}
                      />
                    </div>
                  ))
                )}
                {data.convertibleDebt.length > 0 && (
                  <div className="flex items-center justify-between py-1 px-1 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">Total Convertible Debt</span>
                    <span className="text-xs font-mono font-medium text-foreground">
                      ${(totalConvertible / 1000000).toFixed(2)}M
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Calculated Shares</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between py-1 px-1">
              <span className="text-xs text-muted-foreground">Founder Shares</span>
              <span className="text-xs font-mono font-medium text-foreground">
                {formatShares(data.originalSharesOutstanding)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 px-1">
              <span className="text-xs text-muted-foreground">Option Pool Shares</span>
              <span className="text-xs font-mono font-medium text-foreground">
                {formatShares(shareCalculations.optionPoolSharesPreDilution)}
              </span>
            </div>
            {data.syndicateInvestment > 0 ? (
              <>
                <div className="flex items-center justify-between py-1 px-1">
                  <span className="text-xs text-muted-foreground">VC Fund Shares</span>
                  <span className="text-xs font-mono font-medium text-foreground">
                    {formatShares(shareCalculations.vcFundShares)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 px-1">
                  <span className="text-xs text-muted-foreground">Syndicate Shares</span>
                  <span className="text-xs font-mono font-medium text-foreground">
                    {formatShares(shareCalculations.syndicateShares)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between py-1 px-1">
                <span className="text-xs text-muted-foreground">Investment Shares</span>
                <span className="text-xs font-mono font-medium text-foreground">
                  {formatShares(shareCalculations.investmentShares)}
                </span>
              </div>
            )}
            {shareCalculations.convertibleDebtShares > 0 && (
              <div className="flex items-center justify-between py-1 px-1">
                <span className="text-xs text-muted-foreground">Convertible Debt Shares</span>
                <span className="text-xs font-mono font-medium text-foreground">
                  {formatShares(shareCalculations.convertibleDebtShares)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-1 px-1 border-t border-border/30 mt-1 pt-2">
              <span className="text-xs text-muted-foreground font-medium">Post Money Shares</span>
              <span className="text-xs font-mono font-semibold text-foreground">
                {formatShares(shareCalculations.postMoneyShares)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Price Per Share</p>
          <div className="flex items-center justify-between py-1.5 px-1 bg-muted/30 rounded">
            <span className="text-xs text-muted-foreground">PPS</span>
            <span className="text-sm font-mono font-semibold text-foreground">
              ${shareCalculations.postMoneyShares > 0 ? (postMoney / shareCalculations.postMoneyShares).toFixed(4) : '0.00'}
            </span>
          </div>
        </div>

        {/* Cap Table Pie Chart - At the bottom */}
        <div className="pt-3 border-t border-border/50">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Current Deal Cap Table</p>
          <div className="flex items-center gap-4">
            <div className="h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={capTableData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="shares"
                    nameKey="name"
                  >
                    {capTableData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke={entry.isInvestor ? 'hsl(142, 76%, 35%)' : undefined}
                        strokeWidth={entry.isInvestor ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                            <p className="text-xs font-medium text-foreground">{data.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Shares: {formatShares(data.shares)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Value: ${(data.value / 1000000).toFixed(2)}M
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {data.percent.toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {capTableData.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between py-1 px-2 text-xs rounded ${
                    item.isInvestor ? 'bg-green-500/10 border border-green-500/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-2.5 h-2.5 rounded-sm ${item.isInvestor ? 'ring-2 ring-green-500/50' : ''}`} 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className={`${item.isInvestor ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono text-muted-foreground text-[10px]">{formatShares(item.shares)}</span>
                    <span className="font-mono text-foreground w-12 text-right">{item.percent.toFixed(1)}%</span>
                    <span className="font-mono text-muted-foreground w-16 text-right">${(item.value / 1000000).toFixed(2)}M</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </SectionCard>
  );
}

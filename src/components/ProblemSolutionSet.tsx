import { AlertTriangle, TrendingDown, Users, Lightbulb, Target, ShieldCheck, ArrowDown } from 'lucide-react';

const problemItems = [
  { icon: AlertTriangle, label: '', stat: 'Lack financial education for teens' },
  { icon: TrendingDown, label: 'of Americans struggle with financial literacy', stat: '72%' },
  { icon: Users, label: 'Banks Ignore Teens', stat: '90%' },
];

const solutionItems = [
  { icon: Lightbulb, label: 'Financial Literacy', detail: 'Integrated curriculum' },
  { icon: Target, label: 'Gamified Earning', detail: 'Real transactions' },
  { icon: Users, label: 'Family Oriented Platform', detail: 'Built for use across multiple teen families' },
];

export const ProblemSolutionSet = () => {
  return (
    <div className="grid grid-cols-2 gap-0">
      {/* Problem Column */}
      <div className="bg-destructive/5 border border-destructive/10 rounded-l-lg p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Problem
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {problemItems.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1 p-2 bg-background/60 border border-destructive/10 rounded-md">
              <item.icon className="w-4 h-4 text-destructive" />
              <span className="text-[11px] font-bold text-destructive">{item.stat}</span>
              {item.label && <span className="text-[9px] font-medium text-muted-foreground leading-tight">{item.label}</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">
          72% of Americans struggle with financial literacy, yet teens—who influence 90% of household purchases—have no access to banking or financial education. Traditional banks ignore the under-18 segment entirely, creating a gap in early money management that compounds into lifelong financial struggles.
        </p>
      </div>

      {/* Solution Column */}
      <div className="bg-primary/5 border border-primary/10 border-l-0 rounded-r-lg p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" /> Solution — Copper
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {solutionItems.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1 p-2 bg-background/60 border border-primary/10 rounded-md">
              <item.icon className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-bold text-primary">{item.label}</span>
              <span className="text-[9px] font-medium text-foreground/70 leading-tight">{item.detail}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">
          Copper provides teen banking with integrated financial literacy curriculum and gamified earning mechanics. Unlike competitors focused on parental controls (Greenlight) or basic debit (Step), Copper teaches money management through real transactions.
        </p>
      </div>
    </div>
  );
};

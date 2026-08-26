import { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="card-terminal rounded-md overflow-hidden h-full flex flex-col">
      <div className="section-header shrink-0">
        <span className="text-xs font-medium">{title}</span>
      </div>
      <div className="p-2 flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
}

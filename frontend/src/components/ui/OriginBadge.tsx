import React from 'react';
import { ValueOrigin } from '@shared/types';
import { Sparkles, Calculator, UserCheck, Sliders, Globe } from 'lucide-react';

interface Props {
  origin: ValueOrigin;
  source?: string;
  timestamp?: string;
  className?: string;
  size?: 'sm' | 'xs';
}

export const OriginBadge: React.FC<Props> = ({
  origin,
  source,
  timestamp,
  className = '',
  size = 'xs'
}) => {
  const isXs = size === 'xs';
  const sizeClasses = isXs ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  switch (origin) {
    case 'Calculated':
      return (
        <span
          title="Computed deterministically by the calculation engine"
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 ${sizeClasses} ${className}`}
        >
          <Calculator className={isXs ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          Calculated
        </span>
      );

    case 'Manual Input':
      return (
        <span
          title="Entered directly by user"
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-sky-950/60 text-sky-400 border border-sky-500/30 ${sizeClasses} ${className}`}
        >
          <UserCheck className={isXs ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          Manual Input
        </span>
      );

    case 'Assumption':
      return (
        <span
          title="Editable baseline engineering assumption"
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-950/60 text-amber-400 border border-amber-500/30 ${sizeClasses} ${className}`}
        >
          <Sliders className={isXs ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          Assumption
        </span>
      );

    case 'Live Data':
      return (
        <span
          title={source ? `Source: ${source} (${timestamp ? new Date(timestamp).toLocaleDateString() : 'Live'})` : 'Live market feed'}
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/30 ${sizeClasses} ${className}`}
        >
          <Globe className={isXs ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          Live Data
        </span>
      );

    case 'AI Recommendation':
      return (
        <span
          title="Recommended by Gemma 4 engineering model"
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 ${sizeClasses} ${className}`}
        >
          <Sparkles className={isXs ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          Gemma 4
        </span>
      );

    default:
      return null;
  }
};

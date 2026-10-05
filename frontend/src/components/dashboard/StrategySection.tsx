import React from 'react';
import { AIStrategyAnalysis } from '@shared/types';
import { OriginBadge } from '../ui/OriginBadge';
import { Sparkles, TrendingDown, AlertTriangle, ShieldCheck, ArrowRight, Lightbulb } from 'lucide-react';

interface Props {
  strategy: AIStrategyAnalysis | null;
  loading: boolean;
  onRefreshStrategy: () => void;
}

export const StrategySection: React.FC<Props> = ({
  strategy,
  loading,
  onRefreshStrategy
}) => {
  if (loading) {
    return (
      <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-8 shadow-xl text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 mx-auto flex items-center justify-center animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Gemma 4 Strategic Analysis In Progress</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Synthesizing cost drivers, process inflection thresholds, and risk trade-offs from verified figures...
        </p>
      </section>
    );
  }

  if (!strategy) return null;

  return (
    <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white m-0">7. AI Strategic Optimization & Insights</h2>
              <OriginBadge
                origin={strategy.provider.includes('Gemma') ? 'AI Recommendation' : 'Assumption'}
              />
            </div>
            <p className="text-xs text-slate-400">
              Executive strategic synthesis interpreting calculated results (Confidence: {strategy.confidenceScore}%)
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshStrategy}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 transition-colors"
        >
          Re-Analyze Strategy
        </button>
      </div>

      {/* Best Strategy Recommendation Hero */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/50 via-slate-950 to-slate-950 border border-indigo-500/30 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
          <Lightbulb className="w-4 h-4" />
          <span>Core Strategy Recommendation</span>
        </div>
        <p className="text-sm font-medium text-slate-200 leading-relaxed">
          {strategy.bestStrategyRecommendation}
        </p>
      </div>

      {/* Primary Cost Drivers & Process Inflection Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cost Drivers */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
            <TrendingDown className="w-4 h-4" />
            <span>Primary Cost Drivers Identified</span>
          </div>
          <ul className="space-y-2">
            {strategy.costDrivers.map((driver, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                <span>{driver}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Process Inflection Points */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <ArrowRight className="w-4 h-4" />
            <span>Process Switching Inflection Points</span>
          </div>
          <ul className="space-y-2">
            {strategy.processInflectionPoints.map((pt, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actionable Cost Reduction Opportunities with Trade-offs */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
          Actionable Cost Savings & Engineering Trade-Offs
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {strategy.potentialSavingsOpportunities.map((opp, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{opp.opportunity}</span>
                <span className="text-xs font-bold font-mono-num text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30">
                  ~{opp.estimatedSavingsPct}% savings
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <strong className="text-slate-300 block mb-0.5">Trade-off / Requirement:</strong>
                {opp.tradeoff}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manufacturing Risks */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4" />
          <span>Manufacturing Risks & Quality Sensitivity</span>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
          {strategy.manufacturingRisks.map((risk, idx) => (
            <li key={idx} className="text-xs text-slate-300 p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
              <span>{risk}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

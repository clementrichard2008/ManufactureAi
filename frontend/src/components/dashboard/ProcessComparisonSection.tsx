import React from 'react';
import { ProcessComparisonItem, ManufacturingProcessType, ParadigmEvaluation } from '@shared/types';
import { OriginBadge } from '../ui/OriginBadge';
import { Wrench, CheckCircle2, XCircle, AlertTriangle, ArrowUpDown, Cpu, Sparkles, Box, Layers } from 'lucide-react';

interface Props {
  rankings: ProcessComparisonItem[];
  selectedProcess: ManufacturingProcessType;
  quantity: number;
  paradigmEvaluation?: ParadigmEvaluation;
  onSelectProcess: (process: ManufacturingProcessType) => void;
}

export const ProcessComparisonSection: React.FC<Props> = ({
  rankings,
  selectedProcess,
  quantity,
  paradigmEvaluation,
  onSelectProcess
}) => {
  return (
    <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white m-0">3. Manufacturing Process Recommendation & Comparison</h2>
              <OriginBadge origin="Calculated" />
            </div>
            <p className="text-xs text-slate-400">
              Multi-process ranking across 14 manufacturing methods with 3D printing vs conventional evaluation for {quantity} units
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Active Process: <strong className="text-cyan-400">{selectedProcess}</strong>
        </div>
      </div>

      {/* Strategic Paradigm Callout Banner */}
      {paradigmEvaluation && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Integrated Manufacturing Recommendation
              </span>
              <span className="text-sm font-extrabold text-white">
                Optimal Route: <span className="text-cyan-400">{paradigmEvaluation.recommendedParadigm}</span>
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-300 max-w-xl text-left sm:text-right">
            <span>{paradigmEvaluation.processComparison.crossoverVolumeBreakEven}</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">
              Tooling: {paradigmEvaluation.processComparison.toolingInvestmentComparison}
            </span>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Process</th>
              <th className="py-3 px-3">Suitability</th>
              <th className="py-3 px-3 text-right">Tooling Cost (₹)</th>
              <th className="py-3 px-3 text-right">Setup Cost (₹)</th>
              <th className="py-3 px-3 text-right">Unit Variable (₹)</th>
              <th className="py-3 px-3 text-right font-bold text-cyan-400">Total / Unit (₹)</th>
              <th className="py-3 px-3 text-right">Cycle Time</th>
              <th className="py-3 px-3 text-center">Tolerance</th>
              <th className="py-3 px-3 text-center">Finish (Ra)</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono-num text-slate-300">
            {rankings.map(item => {
              const isSelected = selectedProcess === item.process;

              let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
              if (item.productionSuitability === 'Ideal') {
                badgeColor = 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30';
              } else if (item.productionSuitability === 'Feasible') {
                badgeColor = 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30';
              } else if (item.productionSuitability === 'Suboptimal') {
                badgeColor = 'bg-amber-950/80 text-amber-400 border-amber-500/30';
              } else if (item.productionSuitability === 'Unsuitable') {
                badgeColor = 'bg-red-950/80 text-red-400 border-red-500/30';
              }

              const isParadigmProcess =
                paradigmEvaluation &&
                paradigmEvaluation.processComparison.recommendedProcess === item.process;

              return (
                <tr
                  key={item.process}
                  className={`transition-colors ${
                    isSelected ? 'bg-cyan-950/30 font-semibold' : 'hover:bg-slate-900/50'
                  }`}
                >
                  <td className="py-3 px-4 font-sans font-medium text-white flex items-center gap-2">
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    <span>{item.process}</span>
                    {isParadigmProcess && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                        AI Recommended
                      </span>
                    )}
                    {item.process === 'Additive Manufacturing' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                        3D Print
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-sans">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badgeColor}`}>
                      {item.suitabilityScore}/100 • {item.productionSuitability}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right text-slate-400">
                    ₹{item.initialToolingCost.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3 px-3 text-right text-slate-400">
                    ₹{item.setupCost.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3 px-3 text-right text-slate-300">
                    ₹{item.unitVariableCost.toFixed(2)}
                  </td>

                  <td className="py-3 px-3 text-right font-bold text-cyan-400">
                    ₹{item.totalCostPerUnit.toFixed(2)}
                  </td>

                  <td className="py-3 px-3 text-right text-slate-400">
                    {item.cycleTimeMinutes} min
                  </td>

                  <td className="py-3 px-3 text-center text-slate-400 font-sans text-[11px]">
                    ±{item.achievableToleranceMm} mm
                  </td>

                  <td className="py-3 px-3 text-center text-slate-400 font-sans text-[11px]">
                    {item.achievableSurfaceFinishRa} µm
                  </td>

                  <td className="py-3 px-4 text-center font-sans">
                    <button
                      onClick={() => onSelectProcess(item.process)}
                      disabled={!item.isViableForGeometry}
                      className={`cursor-target px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/40'
                          : item.isViableForGeometry
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'bg-slate-900/40 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {isSelected ? 'Active' : item.isViableForGeometry ? 'Select' : 'Incompatible'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>Economics adapt automatically as batch volume scales, material shifts between plastic/metal, or geometry changes.</span>
        <span>Click "Select" on any process to recompute all manufacturing costs under that method.</span>
      </div>
    </section>
  );
};

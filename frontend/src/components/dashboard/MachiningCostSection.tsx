import React from 'react';
import { MachiningCostResult, TotalCostBreakdown, MachiningCostAssumptions } from '@shared/types';
import { OriginBadge } from '../ui/OriginBadge';
import { Cpu, Clock, DollarSign, Zap, Sliders, ShieldCheck, Percent, Layers } from 'lucide-react';

interface Props {
  machiningResult: MachiningCostResult;
  totalCostBreakdown: TotalCostBreakdown;
  assumptions: MachiningCostAssumptions;
  quantity: number;
  onOpenAssumptions: () => void;
}

export const MachiningCostSection: React.FC<Props> = ({
  machiningResult,
  totalCostBreakdown,
  assumptions,
  quantity,
  onOpenAssumptions
}) => {
  const tc = totalCostBreakdown;

  const costItems = [
    { label: 'Raw Material', value: tc.rawMaterialCostPerUnit.value, origin: tc.rawMaterialCostPerUnit.origin, icon: <Layers className="w-3.5 h-3.5 text-cyan-400" />, note: 'Net stock - scrap credit' },
    { label: 'Machine Spindle', value: tc.machiningCostPerUnit.value, origin: tc.machiningCostPerUnit.origin, icon: <Cpu className="w-3.5 h-3.5 text-sky-400" />, note: `${machiningResult.totalCycleTimeMin.value.toFixed(1)} min @ ₹${assumptions.machineHourlyRateUsd}/hr` },
    { label: 'Setup Allocation', value: tc.setupAllocationPerUnit.value, origin: tc.setupAllocationPerUnit.origin, icon: <Clock className="w-3.5 h-3.5 text-amber-400" />, note: `${assumptions.setupTimeHours}h setup ÷ ${quantity} units` },
    { label: 'Machinist Labour', value: tc.labourCostPerUnit.value, origin: tc.labourCostPerUnit.origin, icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />, note: `₹${assumptions.labourHourlyRateUsd}/hr (${assumptions.operatorRatio}x ratio)` },
    { label: 'Tooling Wear', value: tc.toolingCostPerUnit.value, origin: tc.toolingCostPerUnit.origin, icon: <Sliders className="w-3.5 h-3.5 text-indigo-400" />, note: `₹${assumptions.toolingCostPerPartUsd}/part (${assumptions.toolLifeMinutes} min life)` },
    { label: 'Energy Consumption', value: tc.energyCostPerUnit.value, origin: tc.energyCostPerUnit.origin, icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />, note: `${assumptions.energyConsumptionKw} kW @ ₹${assumptions.energyRatePerKwhUsd}/kWh` },
    { label: 'Surface Finishing', value: tc.finishingCostPerUnit.value, origin: tc.finishingCostPerUnit.origin, icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />, note: 'Deburring & cleaning' },
    { label: 'Inspection / QA', value: tc.inspectionCostPerUnit.value, origin: tc.inspectionCostPerUnit.origin, icon: <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />, note: 'Dimensional verification' },
    { label: 'Scrap & Rework', value: tc.scrapCostPerUnit.value, origin: tc.scrapCostPerUnit.origin, icon: <Percent className="w-3.5 h-3.5 text-rose-400" />, note: `${assumptions.scrapRatePct}% scrap factor` },
    { label: 'Shop Overhead', value: tc.overheadCostPerUnit.value, origin: tc.overheadCostPerUnit.origin, icon: <DollarSign className="w-3.5 h-3.5 text-slate-400" />, note: `${assumptions.overheadRatePct}% SG&A & facility` }
  ];

  return (
    <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white m-0">4. Machining Cycle Time & Total Cost Breakdown (INR ₹)</h2>
              <OriginBadge origin="Calculated" />
            </div>
            <p className="text-xs text-slate-400">
              Deterministic cycle time computed from Material Removal Rate (MRR) and Indian manufacturing rates
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAssumptions}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 transition-colors cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Edit Shop Cost Assumptions (₹)</span>
        </button>
      </div>

      {/* Cycle time mechanics strip */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <span className="block text-[10px] text-slate-400 uppercase font-medium">Spindle Baseline MRR</span>
          <span className="text-sm font-bold text-white font-mono-num">
            {machiningResult.mrrUsedMm3PerMin.value.toLocaleString()}
          </span>
          <span className="block text-[10px] text-slate-500">mm³/min (roughing)</span>
        </div>

        <div>
          <span className="block text-[10px] text-slate-400 uppercase font-medium">Roughing Time</span>
          <span className="text-sm font-bold text-cyan-400 font-mono-num">
            {machiningResult.roughingCycleTimeMin.value.toFixed(1)}
          </span>
          <span className="block text-[10px] text-slate-500">minutes/unit</span>
        </div>

        <div>
          <span className="block text-[10px] text-slate-400 uppercase font-medium">Finishing & Features</span>
          <span className="text-sm font-bold text-sky-400 font-mono-num">
            {(machiningResult.finishingCycleTimeMin.value + machiningResult.featureOperationsTimeMin.value).toFixed(1)}
          </span>
          <span className="block text-[10px] text-slate-500">minutes/unit</span>
        </div>

        <div>
          <span className="block text-[10px] text-emerald-400 uppercase font-medium">Total Cycle Time</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono-num">
            {machiningResult.totalCycleTimeMin.value.toFixed(1)}
          </span>
          <span className="block text-[10px] text-slate-400">minutes per unit</span>
        </div>
      </div>

      {/* Itemized 10-Element Cost Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4">Cost Element</th>
              <th className="py-2.5 px-3">Origin</th>
              <th className="py-2.5 px-4">Calculation Basis / Operational Rate</th>
              <th className="py-2.5 px-4 text-right">Cost / Unit (₹)</th>
              <th className="py-2.5 px-4 text-right font-mono-num">% of Unit Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono-num text-slate-300">
            {costItems.map((item, idx) => {
              const pct = tc.totalCostPerUnit.value > 0 ? (item.value / tc.totalCostPerUnit.value) * 100 : 0;
              return (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 px-4 font-sans font-medium text-white flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <OriginBadge origin={item.origin} size="xs" />
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-400 text-xs">
                    {item.note}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-white">
                    ₹{item.value.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-400">
                    {pct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-cyan-950/30 border-t-2 border-cyan-500/50 font-sans">
            <tr>
              <td colSpan={3} className="py-3 px-4 font-bold text-cyan-300 text-sm">
                Total Manufacturing & Material Cost / Unit
              </td>
              <td className="py-3 px-4 text-right font-extrabold text-cyan-400 text-base font-mono-num">
                ₹{tc.totalCostPerUnit.value.toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right font-mono-num text-slate-400 text-xs">
                100.0%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Amortization highlight */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div>
          Total Order Fixed Setup: <strong className="text-white font-mono-num">₹{tc.fixedCostsTotal.value.toFixed(2)}</strong> • Variable Cost per Unit: <strong className="text-white font-mono-num">₹{tc.variableCostPerUnit.value.toFixed(2)}</strong>
        </div>
        <div className="text-cyan-400">
          Order Batch Size: <strong className="font-mono-num text-white">{quantity} units</strong> (Setup: ₹{tc.setupAllocationPerUnit.value.toFixed(2)}/unit)
        </div>
      </div>
    </section>
  );
};

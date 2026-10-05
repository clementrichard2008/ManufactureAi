import React from 'react';
import { MachiningCostAssumptions } from '@shared/types';
import { Sliders, X, RotateCcw, DollarSign, Clock, Zap, Percent, ShieldCheck } from 'lucide-react';
import { DEFAULT_MACHINING_ASSUMPTIONS } from '@shared/calculation-engine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assumptions: MachiningCostAssumptions;
  machiningAllowancePct: number;
  onUpdateAssumptions: (updated: MachiningCostAssumptions) => void;
  onUpdateAllowancePct: (pct: number) => void;
}

export const AssumptionsPanel: React.FC<Props> = ({
  isOpen,
  onClose,
  assumptions,
  machiningAllowancePct,
  onUpdateAssumptions,
  onUpdateAllowancePct
}) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof MachiningCostAssumptions, value: any) => {
    onUpdateAssumptions({
      ...assumptions,
      [key]: value
    });
  };

  const handleReset = () => {
    onUpdateAssumptions({ ...DEFAULT_MACHINING_ASSUMPTIONS });
    onUpdateAllowancePct(15);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-left">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-base font-bold text-white">Cost Model Assumptions (INR ₹)</h3>
            <span className="text-[11px] text-amber-400 font-medium">All numbers update live</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset to Indian machine shop defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Assumptions body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Machine & Spindle */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5" />
            <span>Machine & Hourly Rates</span>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Machine Class</label>
            <select
              value={assumptions.machineType}
              onChange={e => handleChange('machineType', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-500"
            >
              <option value="3-Axis CNC Mill">3-Axis CNC Mill (VMC)</option>
              <option value="5-Axis CNC Mill">5-Axis High-Precision CNC Mill</option>
              <option value="CNC Lathe">CNC Lathe / Turning Center</option>
              <option value="Turning Center with Live Tooling">Turning Center with Live Tooling (Mill-Turn)</option>
              <option value="Surface Grinder">Surface Grinder</option>
              <option value="Industrial 3D Printer">Industrial DMLS/SLS 3D Printer</option>
              <option value="Laser Cutter">Fiber Laser Cutting Center</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Machine Rate (₹/hr)</label>
              <input
                type="number"
                min="500"
                step="100"
                value={assumptions.machineHourlyRateUsd}
                onChange={e => handleChange('machineHourlyRateUsd', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Setup Time (hrs)</label>
              <input
                type="number"
                min="0.1"
                step="0.25"
                value={assumptions.setupTimeHours}
                onChange={e => handleChange('setupTimeHours', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Labour & Operator */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Labour & Operator Model</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Machinist Wage (₹/hr)</label>
              <input
                type="number"
                min="200"
                step="50"
                value={assumptions.labourHourlyRateUsd}
                onChange={e => handleChange('labourHourlyRateUsd', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Operator Ratio</label>
              <input
                type="number"
                min="0.1"
                max="2.0"
                step="0.1"
                value={assumptions.operatorRatio}
                onChange={e => handleChange('operatorRatio', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500">0.5 = 1 operator / 2 machines</span>
            </div>
          </div>
        </div>

        {/* Tooling & Energy */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Tooling & Energy</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Tool Cost / Part (₹)</label>
              <input
                type="number"
                min="0"
                step="25"
                value={assumptions.toolingCostPerPartUsd}
                onChange={e => handleChange('toolingCostPerPartUsd', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Tool Life (min)</label>
              <input
                type="number"
                min="10"
                step="10"
                value={assumptions.toolLifeMinutes}
                onChange={e => handleChange('toolLifeMinutes', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Machine Power (kW)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={assumptions.energyConsumptionKw}
                onChange={e => handleChange('energyConsumptionKw', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Electricity (₹/kWh)</label>
              <input
                type="number"
                min="2"
                step="0.5"
                value={assumptions.energyRatePerKwhUsd}
                onChange={e => handleChange('energyRatePerKwhUsd', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Finishing & Inspection */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Finishing & Quality Assurance</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Finishing (₹/part)</label>
              <input
                type="number"
                min="0"
                step="25"
                value={assumptions.finishingCostPerPartUsd}
                onChange={e => handleChange('finishingCostPerPartUsd', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Inspection (₹/part)</label>
              <input
                type="number"
                min="0"
                step="25"
                value={assumptions.inspectionCostPerPartUsd}
                onChange={e => handleChange('inspectionCostPerPartUsd', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Factors & Scrap */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
            <Percent className="w-3.5 h-3.5" />
            <span>Overhead & Scrap Factors</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Scrap Rate (%)</label>
              <input
                type="number"
                min="0"
                max="25"
                step="0.5"
                value={assumptions.scrapRatePct}
                onChange={e => handleChange('scrapRatePct', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Shop Overhead (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                value={assumptions.overheadRatePct}
                onChange={e => handleChange('overheadRatePct', Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Machining Stock Allowance */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-400 uppercase tracking-wider">Stock Allowance</span>
            <span className="font-mono text-white font-bold">+{machiningAllowancePct}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="40"
            value={machiningAllowancePct}
            onChange={e => onUpdateAllowancePct(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <p className="text-[11px] text-slate-400">
            Excess raw stock volume purchased per unit to allow for tool entry, clamping, and facing cuts.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/70">
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
        >
          Done & Apply Rates
        </button>
      </div>
    </div>
  );
};

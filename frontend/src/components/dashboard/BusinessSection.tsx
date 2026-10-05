import React, { useState } from 'react';
import { BusinessMetrics, QuantityTierComparison, TotalCostBreakdown } from '@shared/types';
import { OriginBadge } from '../ui/OriginBadge';
import { TrendingUp, AlertTriangle, CheckCircle2, DollarSign, Target, Award, ArrowUpRight } from 'lucide-react';

interface Props {
  business: BusinessMetrics;
  totalCost: TotalCostBreakdown;
  quantityTiers: QuantityTierComparison[];
  targetSellingPriceOverride?: number;
  targetMarginPct?: number;
  onUpdateSellingPrice: (price?: number) => void;
  onUpdateTargetMargin: (margin: number) => void;
}

export const BusinessSection: React.FC<Props> = ({
  business,
  totalCost,
  quantityTiers,
  targetSellingPriceOverride,
  targetMarginPct = 30,
  onUpdateSellingPrice,
  onUpdateTargetMargin
}) => {
  const [sellingPriceInput, setSellingPriceInput] = useState(
    targetSellingPriceOverride !== undefined ? String(targetSellingPriceOverride) : ''
  );
  const [marginInput, setMarginInput] = useState(String(targetMarginPct));

  const handlePriceApply = () => {
    const val = parseFloat(sellingPriceInput);
    if (!isNaN(val) && val > 0) {
      onUpdateSellingPrice(val);
    } else {
      onUpdateSellingPrice(undefined);
    }
  };

  const handleMarginApply = (m: number) => {
    setMarginInput(String(m));
    onUpdateTargetMargin(m);
    onUpdateSellingPrice(undefined); // clear fixed override to let margin drive price
    setSellingPriceInput('');
  };

  const isProfitable = business.profitPerUnit.value > 0;
  const hasBreakEven = business.breakEvenQuantity.value !== null;

  return (
    <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white m-0">5. Business Economics & Break-Even Analysis (INR ₹)</h2>
              <OriginBadge origin={business.sellingPricePerUnit.origin} />
            </div>
            <p className="text-xs text-slate-400">
              Commercial pricing model, contribution margin, break-even threshold, and volume tiers in ₹
            </p>
          </div>
        </div>

        {/* Target margin quick chips */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-1">Target Margin:</span>
          {[20, 30, 40, 50].map(m => (
            <button
              key={m}
              onClick={() => handleMarginApply(m)}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                Number(marginInput) === m && targetSellingPriceOverride === undefined
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {m}%
            </button>
          ))}
        </div>
      </div>

      {/* 4 Financial KPI Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Unit Selling Price */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Selling Price / Unit</span>
            <OriginBadge origin={business.sellingPricePerUnit.origin} size="xs" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-white font-mono-num">
              ₹{business.sellingPricePerUnit.value.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="number"
              placeholder="Override ₹"
              value={sellingPriceInput}
              onChange={e => setSellingPriceInput(e.target.value)}
              className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono-num text-xs focus:border-cyan-500"
            />
            <button
              onClick={handlePriceApply}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Set
            </button>
          </div>
        </div>

        {/* Card 2: Profit / Unit */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Unit Net Profit</span>
            <OriginBadge origin="Calculated" size="xs" />
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-2xl font-extrabold font-mono-num ${
                isProfitable ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfitable ? '+' : ''}₹{business.profitPerUnit.value.toFixed(2)}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono-num">
            Cost: ₹{business.totalCostPerUnit.value.toFixed(2)} / unit
          </div>
        </div>

        {/* Card 3: Gross Margin % */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Gross Margin</span>
            <OriginBadge origin="Calculated" size="xs" />
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-2xl font-extrabold font-mono-num ${
                business.grossMarginPct.value >= 25
                  ? 'text-emerald-400'
                  : business.grossMarginPct.value > 0
                  ? 'text-cyan-400'
                  : 'text-rose-400'
              }`}
            >
              {business.grossMarginPct.value.toFixed(1)}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono-num">
            ROI: {business.returnOnInvestmentPct.value.toFixed(1)}% on order
          </div>
        </div>

        {/* Card 4: Break-Even Quantity */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Break-Even Quantity</span>
            <OriginBadge origin="Calculated" size="xs" />
          </div>
          {hasBreakEven ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-cyan-400 font-mono-num">
                {business.breakEvenQuantity.value}
              </span>
              <span className="text-xs text-slate-400">units</span>
            </div>
          ) : (
            <div className="text-sm font-bold text-rose-400 leading-tight">
              No break-even at this price
            </div>
          )}
          <div className="text-[11px] text-slate-500 font-mono-num">
            {hasBreakEven
              ? `Fixed: ₹${totalCost.fixedCostsTotal.value.toFixed(0)} • Variable: ₹${totalCost.variableCostPerUnit.value.toFixed(2)}/u`
              : 'Selling price ≤ Variable cost/unit'}
          </div>
        </div>
      </div>

      {/* Production Quantity Tiers Optimization */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>Production Quantity Tiers & Optimal Process Selection (INR ₹)</span>
          </div>
          <span className="text-xs text-slate-400">
            Setup amortizes and high-volume tooling becomes viable
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quantityTiers.map(tier => (
            <div
              key={tier.tierName}
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{tier.tierName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                  {tier.quantity} units
                </span>
              </div>

              <div className="pt-1">
                <span className="text-[11px] text-slate-400 block">Recommended Process:</span>
                <span className="text-xs font-bold text-cyan-400">{tier.optimalProcess}</span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs font-mono-num">
                <div className="flex justify-between">
                  <span className="text-slate-400">Unit Cost:</span>
                  <span className="font-bold text-white">₹{tier.unitCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unit Profit:</span>
                  <span className={tier.unitProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    ₹{tier.unitProfit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Margin:</span>
                  <span className={tier.marginPct >= 20 ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                    {tier.marginPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {tier.savingsVsPrimaryProcessPct > 0 && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{tier.savingsVsPrimaryProcessPct}% savings vs standard CNC</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

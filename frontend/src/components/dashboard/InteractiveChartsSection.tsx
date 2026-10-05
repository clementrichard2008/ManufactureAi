import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { ChartDataPoint, BusinessMetrics } from '@shared/types';
import { OriginBadge } from '../ui/OriginBadge';
import { LineChart as LineChartIcon, Sliders, TrendingUp, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';

interface Props {
  chartData: ChartDataPoint[];
  business: BusinessMetrics;
  currentQuantity: number;
  onQuantityChange: (qty: number) => void;
}

export const InteractiveChartsSection: React.FC<Props> = ({
  chartData,
  business,
  currentQuantity,
  onQuantityChange
}) => {
  const [activeTab, setActiveTab] = useState<'unitVsProfit' | 'unitMarginCurve' | 'costRevenue'>('unitVsProfit');

  const breakEvenQty = business.breakEvenQuantity.value;
  const maxQtyInSlider = Math.max(100, Math.ceil(currentQuantity * 2.5));

  const currentPoint = chartData.find(p => p.quantity === currentQuantity) || chartData[0];
  const isProfitableAtCurrent = business.totalProfitAtQty.value > 0;

  // Format currency in Indian Rupees
  const formatInr = (val: number): string => {
    if (Math.abs(val) >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    if (Math.abs(val) >= 1000) {
      return `₹${(val / 1000).toFixed(1)}k`;
    }
    return `₹${val.toFixed(0)}`;
  };

  return (
    <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
      {/* Header with Graph View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <LineChartIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white m-0">6. Interactive Economic Graphs: Unit vs Profit (INR ₹)</h2>
              <OriginBadge origin="Calculated" />
            </div>
            <p className="text-xs text-slate-400">
              Break-even threshold visualization, unit vs net profit curves, and volume sensitivity in ₹
            </p>
          </div>
        </div>

        {/* Tab switcher: Perfect Graph Options */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('unitVsProfit')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'unitVsProfit'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Unit vs Net Total Profit (₹)
          </button>
          <button
            onClick={() => setActiveTab('unitMarginCurve')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'unitMarginCurve'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Unit vs Profit per Unit (₹/unit)
          </button>
          <button
            onClick={() => setActiveTab('costRevenue')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'costRevenue'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cost vs Revenue & Break-Even
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip for Instant Decision Making */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {/* KPI 1: Break-even status */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Break-Even Point</span>
          <span className="text-base font-extrabold text-cyan-400 font-mono-num">
            {breakEvenQty ? `${breakEvenQty} units` : 'N/A (Loss)'}
          </span>
          <span className="block text-[10px] text-slate-500">
            {breakEvenQty ? `Reaches ₹0 profit at Q=${breakEvenQty}` : 'Selling price below variable cost'}
          </span>
        </div>

        {/* KPI 2: Current batch units */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Active Batch Size</span>
          <span className="text-base font-extrabold text-white font-mono-num">
            {currentQuantity} units
          </span>
          <span className="block text-[10px] text-slate-500">
            {breakEvenQty && currentQuantity >= breakEvenQty ? '✓ Profitable Zone' : '⚠ In Loss Zone'}
          </span>
        </div>

        {/* KPI 3: Total Profit at Q */}
        <div className={`p-3 rounded-xl border ${
          isProfitableAtCurrent
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
        }`}>
          <span className="block text-[10px] uppercase font-semibold">Net Total Profit (₹)</span>
          <span className="text-base font-extrabold font-mono-num">
            {isProfitableAtCurrent ? '+' : ''}₹{business.totalProfitAtQty.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="block text-[10px]">
            {isProfitableAtCurrent ? 'Operating gain' : 'Unrecovered setup costs'}
          </span>
        </div>

        {/* KPI 4: Unit Profit & Margin */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Profit / Unit & Margin</span>
          <span className={`text-base font-extrabold font-mono-num ${business.profitPerUnit.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{business.profitPerUnit.value.toFixed(2)}/unit
          </span>
          <span className="block text-[10px] text-slate-400 font-mono-num">
            {business.grossMarginPct.value.toFixed(1)}% gross margin
          </span>
        </div>
      </div>

      {/* Live Interactive Quantity Slider (Mandated in Prompt) */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Interactive Production Quantity Slider:</span>
            <span className="text-base font-extrabold text-cyan-400 font-mono-num">
              {currentQuantity} units
            </span>
          </div>

          <div className="text-xs text-slate-400 font-mono-num">
            Order Revenue: <strong className="text-white">₹{(business.sellingPricePerUnit.value * currentQuantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
          </div>
        </div>

        <input
          type="range"
          min="1"
          max={maxQtyInSlider}
          value={currentQuantity}
          onChange={e => onQuantityChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        <div className="flex justify-between text-[11px] text-slate-500 font-mono-num">
          <span>1 unit (Prototype)</span>
          {breakEvenQty && (
            <span className="text-cyan-400 font-medium">
              ★ Break-Even: {breakEvenQty} units
            </span>
          )}
          <span>{maxQtyInSlider} units (Volume Production)</span>
        </div>
      </div>

      {/* The Perfect Graph Canvas */}
      <div className="h-84 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'unitVsProfit' ? (
            /* Graph 1: Perfect Unit vs Net Total Profit (₹) with Shaded Loss and Profit Zones */
            <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: 20, bottom: 15 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.05} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.45} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="quantity"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Production Units (Q)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={formatInr}
                label={{ value: 'Net Profit in INR (₹)', angle: -90, position: 'insideLeft', offset: -5, fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, name]}
                labelFormatter={l => `Batch Size: ${l} units`}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              {/* Zero Profit Line */}
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} label={{ value: 'Break-Even (₹0)', fill: '#94a3b8', fontSize: 11, position: 'insideTopLeft' }} />

              {/* Break-Even Quantity Marker */}
              {breakEvenQty && (
                <ReferenceLine
                  x={breakEvenQty}
                  stroke="#00d2ff"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: `Break-Even: ${breakEvenQty} units`, fill: '#00d2ff', fontSize: 11, position: 'top' }}
                />
              )}

              {/* Current Quantity Marker */}
              <ReferenceLine
                x={currentQuantity}
                stroke="#f59e0b"
                strokeWidth={2}
                label={{ value: `Current Qty (${currentQuantity})`, fill: '#f59e0b', fontSize: 11, position: 'insideTopRight' }}
              />

              <Area
                type="monotone"
                dataKey="profitLoss"
                name="Net Total Profit / Loss (₹)"
                stroke="#00d2ff"
                fill="url(#profitGrad)"
                strokeWidth={3}
              />
            </ComposedChart>
          ) : activeTab === 'unitMarginCurve' ? (
            /* Graph 2: Unit vs Profit per Unit (₹/unit) & Margin Sensitivity */
            <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: 20, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="quantity"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Production Units (Q)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={val => `₹${val.toFixed(0)}`}
                label={{ value: 'Unit Profit (₹/unit)', angle: -90, position: 'insideLeft', offset: -5, fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={val => `${val.toFixed(0)}%`}
                label={{ value: 'Gross Margin %', angle: 90, position: 'insideRight', offset: 5, fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: any, name: any) => [
                  name.includes('%') ? `${Number(val).toFixed(1)}%` : `₹${Number(val).toFixed(2)}`,
                  name
                ]}
                labelFormatter={l => `Batch Size: ${l} units`}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" strokeWidth={1} />

              {breakEvenQty && (
                <ReferenceLine
                  yAxisId="left"
                  x={breakEvenQty}
                  stroke="#00d2ff"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{ value: `Break-Even: ${breakEvenQty}`, fill: '#00d2ff', fontSize: 11, position: 'top' }}
                />
              )}

              <Line yAxisId="left" type="monotone" dataKey="unitProfit" name="Profit per Unit (₹)" stroke="#10b981" strokeWidth={3} dot={{ r: 2 }} />
              <Line yAxisId="right" type="monotone" dataKey="marginPct" name="Gross Margin (%)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" dot={false} />
            </ComposedChart>
          ) : (
            /* Graph 3: Classical Total Cost vs Revenue & Break-Even */
            <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: 20, bottom: 15 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="quantity"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Production Units (Q)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={formatInr}
                label={{ value: 'Total Amount (₹)', angle: -90, position: 'insideLeft', offset: -5, fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, name]}
                labelFormatter={l => `Batch Size: ${l} units`}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              <Area type="monotone" dataKey="totalRevenue" name="Total Revenue (₹)" stroke="#10b981" fillOpacity={1} fill="url(#revenueGrad)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="totalCost" name="Total Cost (₹)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="fixedCost" name="Fixed Setup (₹)" stroke="#64748b" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />

              {breakEvenQty && (
                <ReferenceLine
                  x={breakEvenQty}
                  stroke="#00d2ff"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: `Break-Even: ${breakEvenQty} units`, fill: '#00d2ff', fontSize: 11, position: 'top' }}
                />
              )}

              <ReferenceLine
                x={currentQuantity}
                stroke="#e2e8f0"
                strokeWidth={1.5}
                label={{ value: `Current: ${currentQuantity}`, fill: '#e2e8f0', fontSize: 10, position: 'insideTopRight' }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
};

import React from 'react';
import {
  PartDimensions,
  CadMeshStats,
  MaterialProperties,
  FullCalculationResult,
  ManufacturingProcessType,
  MachiningCostAssumptions
} from '@shared/types';
import { Printer, X, Download, ShieldCheck, CheckCircle2, Box, Cpu, FileText, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dimensions: PartDimensions | null;
  material: MaterialProperties;
  calculation: FullCalculationResult | null;
  selectedProcess: ManufacturingProcessType;
  cadMeshStats?: CadMeshStats | null;
  cadStats?: CadMeshStats | null;
  assumptions?: MachiningCostAssumptions;
  rawPricePerKg?: number;
  aiModelUsed?: string;
}

export const QuotationPrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  dimensions,
  material,
  calculation,
  selectedProcess,
  cadMeshStats,
  cadStats,
  assumptions: userAssumptions,
  rawPricePerKg: userRawPrice,
  aiModelUsed
}) => {
  if (!isOpen || !dimensions || !calculation) return null;

  const activeStats = cadMeshStats || cadStats || null;
  const rawPrice = userRawPrice ?? calculation.rawMaterial.pricePerKg.value;

  const quoteDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const quoteId = `MFG-QTN-${Math.abs(
    (dimensions.partName + quoteDate).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  ).toString().padStart(6, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  const { rawMaterial, machining, totalCost, business, quantityTiers } = calculation;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:bg-white print:text-black">
        {/* Modal Toolbar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-cyan-400">
            <FileText className="w-5 h-5" />
            <h2 className="text-base font-bold text-white m-0">Formal Manufacturing Quotation & Engineering Spec</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="cursor-target flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="cursor-target p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-quotation" className="p-6 sm:p-10 space-y-8 print:p-4 print:space-y-6 text-slate-200 print:text-black bg-slate-950 print:bg-white font-sans">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-800 print:border-neutral-300">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-slate-950 font-black text-sm print:bg-neutral-800 print:text-white">
                  M
                </div>
                <span className="text-2xl font-black tracking-tight text-white print:text-black">ManufactureAI</span>
              </div>
              <p className="text-xs text-slate-400 print:text-neutral-600 font-medium">
                Advanced Precision Engineering & Deterministic Cost Estimation
              </p>
              {aiModelUsed && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-cyan-400 print:text-neutral-700">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Synthesized via <strong>{aiModelUsed}</strong></span>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold mb-1 print:border-neutral-400 print:bg-neutral-100 print:text-neutral-900">
                OFFICIAL QUOTATION
              </div>
              <div className="text-xs font-mono text-slate-400 print:text-neutral-600">
                Ref: <strong className="text-white print:text-black">{quoteId}</strong>
              </div>
              <div className="text-xs text-slate-400 print:text-neutral-600">
                Date: {quoteDate}
              </div>
            </div>
          </div>

          {/* Section 1: Product & 3D Engineering Specification */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 print:text-neutral-900 mb-3 flex items-center gap-1.5">
              <Box className="w-4 h-4" />
              <span>1. Product & CAD Geometry Specification</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-900/60 print:bg-neutral-50 border border-slate-800 print:border-neutral-300 text-xs">
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Part Identifier:</span>
                <strong className="text-white print:text-black text-sm">{dimensions.partName}</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Geometry Type:</span>
                <strong className="text-white print:text-black">{dimensions.geometryType}</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Bounding Envelope:</span>
                <strong className="text-cyan-400 print:text-black font-mono">
                  {dimensions.diameter ? (
                    <>Ø{dimensions.diameter} × {dimensions.height || dimensions.thickness || dimensions.length} mm</>
                  ) : (
                    <>{dimensions.length} × {dimensions.width} × {dimensions.height || dimensions.thickness} mm</>
                  )}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Net Part Volume:</span>
                <strong className="text-emerald-400 print:text-black font-mono">
                  {activeStats ? activeStats.volumeMm3.toLocaleString() : (dimensions.customVolumeMm3?.toLocaleString() || 'N/A')} mm³
                </strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Surface Area:</span>
                <span className="text-slate-200 print:text-neutral-800 font-mono">
                  {activeStats ? `${activeStats.surfaceAreaMm2.toLocaleString()} mm²` : 'Analytical Envelope'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Tolerance Standard:</span>
                <span className="text-slate-200 print:text-neutral-800 font-mono">±{dimensions.toleranceMm ?? 0.05} mm</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Surface Finish (Ra):</span>
                <span className="text-slate-200 print:text-neutral-800 font-mono">{dimensions.surfaceFinishRaUm ?? 1.6} µm</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Topology Solid:</span>
                <span className="text-emerald-400 print:text-neutral-800 font-medium">
                  {activeStats?.isWatertight ? 'Watertight Manifold Solid' : 'Verified Solid Model'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Material & Raw Stock Details */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 print:text-neutral-900 mb-3 flex items-center gap-1.5">
              <span>2. Material & Raw Stock Specification</span>
            </h3>
            <table className="w-full text-xs text-left border-collapse border border-slate-800 print:border-neutral-300">
              <tbody>
                <tr className="border-b border-slate-800 print:border-neutral-300 bg-slate-900/40 print:bg-neutral-100">
                  <td className="p-2.5 font-semibold text-slate-400 print:text-neutral-600 w-1/3">Selected Material Grade</td>
                  <td className="p-2.5 font-bold text-white print:text-black">{material.name} ({material.category})</td>
                  <td className="p-2.5 font-semibold text-slate-400 print:text-neutral-600">Material Density</td>
                  <td className="p-2.5 font-mono text-white print:text-black">{material.densityGPerCm3} g/cm³</td>
                </tr>
                <tr className="border-b border-slate-800 print:border-neutral-300">
                  <td className="p-2.5 font-semibold text-slate-400 print:text-neutral-600">Finished Part Mass</td>
                  <td className="p-2.5 font-mono text-white print:text-black">{rawMaterial.netPartMassKg.value.toFixed(3)} kg</td>
                  <td className="p-2.5 font-semibold text-slate-400 print:text-neutral-600">Raw Stock Mass</td>
                  <td className="p-2.5 font-mono text-white print:text-black">{rawMaterial.stockMassKg.value.toFixed(3)} kg</td>
                </tr>
                <tr className="border-b border-slate-800 print:border-neutral-300 bg-slate-900/20 print:bg-white">
                  <td className="p-2.5 font-semibold text-slate-400 print:text-neutral-600">Raw Material Base Rate</td>
                  <td className="p-2.5 font-mono text-white print:text-black">₹{rawPrice.toFixed(2)} / kg</td>
                  <td className="p-2.5 font-semibold text-slate-400 print:text-neutral-600">Gross Stock Cost</td>
                  <td className="p-2.5 font-mono text-white print:text-black">₹{rawMaterial.grossMaterialCostPerUnit.value.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-400 print:text-neutral-600">Scrap Recovery Credit</td>
                  <td className="p-2.5 font-mono text-emerald-400 print:text-neutral-800">- ₹{rawMaterial.scrapCreditPerUnit.value.toFixed(2)}</td>
                  <td className="p-2.5 font-bold text-slate-300 print:text-black">Net Material Cost / Unit</td>
                  <td className="p-2.5 font-mono font-bold text-emerald-400 print:text-black">₹{rawMaterial.netMaterialCostPerUnit.value.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Manufacturing Process & Cycle Time Breakdown */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 print:text-neutral-900 mb-3 flex items-center gap-1.5">
              <span>3. Manufacturing Engineering & Cycle Time</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-900/60 print:bg-neutral-50 border border-slate-800 print:border-neutral-300 text-xs mb-3">
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Selected Process:</span>
                <strong className="text-white print:text-black">{selectedProcess}</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Machine Type:</span>
                <span className="text-slate-200 print:text-neutral-800">{userAssumptions?.machineType || 'CNC Machining Center'}</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Machine Rate:</span>
                <span className="text-slate-200 print:text-neutral-800 font-mono">
                  ₹{userAssumptions ? userAssumptions.machineHourlyRateUsd.toFixed(2) : '3,500.00'} / hr
                </span>
              </div>
              <div>
                <span className="text-slate-400 print:text-neutral-500 block text-[11px]">Cycle Time per Unit:</span>
                <strong className="text-cyan-400 print:text-black font-mono">{machining.totalCycleTimeMin.value.toFixed(1)} mins</strong>
              </div>
            </div>

            {/* Cost Breakdown Table */}
            <table className="w-full text-xs text-left border-collapse border border-slate-800 print:border-neutral-300">
              <thead>
                <tr className="bg-slate-900 print:bg-neutral-200 border-b border-slate-800 print:border-neutral-300 text-slate-300 print:text-black font-bold">
                  <th className="p-2">Cost Element</th>
                  <th className="p-2 text-right">Cost / Unit (INR ₹)</th>
                  <th className="p-2">Engineering Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 print:divide-neutral-200">
                <tr>
                  <td className="p-2">Net Material Cost</td>
                  <td className="p-2 text-right font-mono">₹{totalCost.rawMaterialCostPerUnit.value.toFixed(2)}</td>
                  <td className="p-2 text-slate-400 print:text-neutral-600">Stock alloy mass minus recycled scrap value</td>
                </tr>
                <tr>
                  <td className="p-2">Machining & Spindle Run Cost</td>
                  <td className="p-2 text-right font-mono">₹{totalCost.machiningCostPerUnit.value.toFixed(2)}</td>
                  <td className="p-2 text-slate-400 print:text-neutral-600">Active cutting & toolpath feed time</td>
                </tr>
                <tr>
                  <td className="p-2">Batch Setup Amortization</td>
                  <td className="p-2 text-right font-mono">₹{totalCost.setupAllocationPerUnit.value.toFixed(2)}</td>
                  <td className="p-2 text-slate-400 print:text-neutral-600">Amortized fixture & CAM zeroing over {dimensions.quantity} units</td>
                </tr>
                <tr>
                  <td className="p-2">Operator Labor Cost</td>
                  <td className="p-2 text-right font-mono">₹{totalCost.labourCostPerUnit.value.toFixed(2)}</td>
                  <td className="p-2 text-slate-400 print:text-neutral-600">Skilled machinist loading & supervision</td>
                </tr>
                <tr>
                  <td className="p-2">Cutting Tool Wear & Inserts</td>
                  <td className="p-2 text-right font-mono">₹{totalCost.toolingCostPerUnit.value.toFixed(2)}</td>
                  <td className="p-2 text-slate-400 print:text-neutral-600">Carbide endmill depreciation per part</td>
                </tr>
                <tr>
                  <td className="p-2">Energy & Electricity Consumption</td>
                  <td className="p-2 text-right font-mono">₹{totalCost.energyCostPerUnit.value.toFixed(2)}</td>
                  <td className="p-2 text-slate-400 print:text-neutral-600">Spindle kW/h draw at industrial tariff</td>
                </tr>
                <tr>
                  <td className="p-2">Surface Finishing & Deburring</td>
                  <td className="p-2 text-right font-mono">₹{totalCost.finishingCostPerUnit.value.toFixed(2)}</td>
                  <td className="p-2 text-slate-400 print:text-neutral-600">Manual edge break, vibratory tumble</td>
                </tr>
                <tr>
                  <td className="p-2">Metrology & CMM Inspection</td>
                  <td className="p-2 text-right font-mono">₹{totalCost.inspectionCostPerUnit.value.toFixed(2)}</td>
                  <td className="p-2 text-slate-400 print:text-neutral-600">First-article & batch tolerance QA</td>
                </tr>
                <tr>
                  <td className="p-2">Scrap Allowance & Factory Overhead</td>
                  <td className="p-2 text-right font-mono">₹{(totalCost.scrapCostPerUnit.value + totalCost.overheadCostPerUnit.value).toFixed(2)}</td>
                  <td className="p-2 text-slate-400 print:text-neutral-600">
                    {userAssumptions?.scrapRatePct ?? 3}% scrap rate + {userAssumptions?.overheadRatePct ?? 15}% SG&A overhead
                  </td>
                </tr>
                <tr className="bg-slate-900/60 print:bg-neutral-100 font-bold border-t-2 border-slate-700 print:border-black">
                  <td className="p-2.5 text-white print:text-black">TOTAL MANUFACTURING COST PER UNIT</td>
                  <td className="p-2.5 text-right font-mono text-cyan-300 print:text-black text-sm">
                    ₹{totalCost.totalCostPerUnit.value.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-slate-300 print:text-black">COGS for quantity = {dimensions.quantity} units</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 4: Commercial Economics & Quoted Price */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-indigo-950/40 print:bg-neutral-50 border border-cyan-500/40 print:border-neutral-400">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300 print:text-neutral-900 mb-3">
              4. Commercial Quotation & Financial Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-slate-950/70 print:bg-white border border-slate-800 print:border-neutral-300">
                <span className="text-[11px] text-slate-400 print:text-neutral-600 block">Quoted Price / Unit:</span>
                <span className="text-lg font-black text-cyan-400 print:text-black font-mono">
                  ₹{business.sellingPricePerUnit.value.toFixed(2)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 print:bg-white border border-slate-800 print:border-neutral-300">
                <span className="text-[11px] text-slate-400 print:text-neutral-600 block">Unit Profit:</span>
                <span className="text-lg font-black text-emerald-400 print:text-neutral-800 font-mono">
                  ₹{business.profitPerUnit.value.toFixed(2)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 print:bg-white border border-slate-800 print:border-neutral-300">
                <span className="text-[11px] text-slate-400 print:text-neutral-600 block">Gross Profit Margin:</span>
                <span className="text-lg font-black text-amber-400 print:text-neutral-800 font-mono">
                  {business.grossMarginPct.value.toFixed(1)}%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 print:bg-white border border-slate-800 print:border-neutral-300">
                <span className="text-[11px] text-slate-400 print:text-neutral-600 block">Break-Even Quantity:</span>
                <span className="text-lg font-black text-purple-400 print:text-neutral-800 font-mono">
                  {business.breakEvenQuantity.value ? `${business.breakEvenQuantity.value} Units` : (business.breakEvenStatus === 'Calculated' ? 'Immediate' : 'Loss')}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 print:border-neutral-300 flex flex-wrap justify-between items-center text-xs">
              <span className="text-slate-400 print:text-neutral-600">
                Batch Order Quantity: <strong className="text-white print:text-black">{dimensions.quantity} Units</strong>
              </span>
              <span className="text-slate-400 print:text-neutral-600">
                Total Order Value: <strong className="text-cyan-300 print:text-black font-mono text-sm">₹{(business.sellingPricePerUnit.value * dimensions.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
              </span>
            </div>
          </div>

          {/* Section 5: Volume Discount Tier Scale */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 print:text-neutral-900 mb-3">
              5. Production Volume Pricing Schedule
            </h3>
            <table className="w-full text-xs text-left border-collapse border border-slate-800 print:border-neutral-300">
              <thead>
                <tr className="bg-slate-900 print:bg-neutral-200 border-b border-slate-800 print:border-neutral-300 text-slate-300 print:text-black font-semibold">
                  <th className="p-2">Production Tier</th>
                  <th className="p-2 text-center">Batch Quantity</th>
                  <th className="p-2 text-right">Unit Manufacturing Cost</th>
                  <th className="p-2 text-right">Recommended Selling Price</th>
                  <th className="p-2 text-right">Tier Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 print:divide-neutral-200">
                {quantityTiers.map(tier => (
                  <tr key={tier.quantity} className={tier.quantity === dimensions.quantity ? 'bg-cyan-950/30 print:bg-neutral-100 font-bold' : ''}>
                    <td className="p-2 text-slate-200 print:text-black">{tier.tierName}</td>
                    <td className="p-2 text-center font-mono">{tier.quantity} pcs</td>
                    <td className="p-2 text-right font-mono">₹{tier.unitCost.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono text-cyan-400 print:text-black">₹{tier.sellingPrice.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono text-emerald-400 print:text-neutral-800">
                      {tier.savingsVsPrimaryProcessPct > 0 ? `-${tier.savingsVsPrimaryProcessPct.toFixed(1)}%` : 'Baseline'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Formal Terms & Sign-off Footer */}
          <div className="pt-6 border-t border-slate-800 print:border-neutral-300 text-[11px] text-slate-400 print:text-neutral-600 space-y-2">
            <p>
              <strong>Quotation Validity:</strong> 30 calendar days from date of issue. Pricing is based on deterministic physical cycle time calculations and declared material market rates. Final invoice may adjust if part geometry or CAD revisions occur.
            </p>
            <div className="flex justify-between items-end pt-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Prepared by:</p>
                <p className="font-bold text-white print:text-black">ManufactureAI Engineering Calculation Engine</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Authorized Signature:</p>
                <div className="h-8 border-b border-slate-600 print:border-neutral-400 w-44 mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

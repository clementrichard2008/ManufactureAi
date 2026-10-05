import React, { useState } from 'react';
import { MaterialProperties, MaterialRecommendation, RawMaterialCostResult, ParadigmEvaluation, MaterialCategory } from '@shared/types';
import { STANDARD_MATERIALS, getMaterialById } from '@shared/materials';
import { OriginBadge } from '../ui/OriginBadge';
import {
  Layers,
  Sparkles,
  Check,
  ChevronDown,
  Scale,
  ShieldCheck,
  AlertCircle,
  Bot,
  RefreshCw,
  Cpu,
  Flame,
  Zap,
  ArrowRight,
  TrendingDown,
  Box,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface Props {
  selectedMaterial: MaterialProperties;
  rawMaterialCost: RawMaterialCostResult;
  recommendations: MaterialRecommendation[];
  priceOverridePerKg?: number;
  aiSuggestedMaterialId?: string;
  aiModelUsed?: string;
  aiDesignRationale?: string;
  paradigmEvaluation?: ParadigmEvaluation;
  onSelectMaterial: (material: MaterialProperties) => void;
  onUpdatePricePerKg: (newPrice: number) => void;
  onUpdateDensity: (newDensity: number) => void;
}

export const MaterialSection: React.FC<Props> = ({
  selectedMaterial,
  rawMaterialCost,
  recommendations,
  priceOverridePerKg,
  aiSuggestedMaterialId,
  aiModelUsed = 'AI Assistant',
  aiDesignRationale,
  paradigmEvaluation,
  onSelectMaterial,
  onUpdatePricePerKg,
  onUpdateDensity
}) => {
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [catalogueFilter, setCatalogueFilter] = useState<'All' | 'Plastics' | 'High-Performance' | 'Metals'>('All');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(
    priceOverridePerKg !== undefined
      ? String(priceOverridePerKg)
      : String(rawMaterialCost.pricePerKg.value)
  );

  const handlePriceSave = () => {
    const p = parseFloat(priceInput);
    if (!isNaN(p) && p > 0) {
      onUpdatePricePerKg(p);
    }
    setIsEditingPrice(false);
  };

  const aiSuggestedMaterial = aiSuggestedMaterialId ? getMaterialById(aiSuggestedMaterialId) : null;
  const isUserOverride = Boolean(aiSuggestedMaterial && selectedMaterial.id !== aiSuggestedMaterial.id);

  // Curated quick switch options covering requested industrial plastics and metals
  const quickSwitchOptions = [
    { id: 'al-6061-t6', label: 'Aluminium 6061', tag: 'Lightweight Alloy' },
    { id: 'abs-plastic', label: 'ABS Plastic', tag: '3D Printing & Molding' },
    { id: 'pp-polypropylene', label: 'Polypropylene (PP)', tag: 'Ultra-Light & Chemical' },
    { id: 'nylon-pa6', label: 'Nylon 6 (PA6)', tag: 'Wear & Low Friction' },
    { id: 'delrin-pom', label: 'Delrin (POM)', tag: 'Precision Gears' },
    { id: 'polycarbonate-pc', label: 'Polycarbonate (PC)', tag: 'High-Impact Toughness' },
    { id: 'peek', label: 'PEEK Polymer', tag: '250°C Aerospace High-Temp' },
    { id: 'cf-nylon-pa12', label: 'CF-Nylon', tag: 'Metal Replacement Composite' },
    { id: 'steel-4140', label: 'Alloy Steel 4140', tag: 'High Tensile Structural' }
  ];

  // Filter materials for the catalogue drawer
  const filteredMaterials = STANDARD_MATERIALS.filter(m => {
    if (catalogueFilter === 'Plastics') return m.category === 'Engineering Plastics';
    if (catalogueFilter === 'High-Performance') return m.category === 'High-Performance Polymers' || m.category === 'Composite Polymers';
    if (catalogueFilter === 'Metals') return !m.isPolymer;
    return true;
  });

  return (
    <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white m-0">2. Material Selection & Stock Cost (INR ₹)</h2>
              <OriginBadge origin={rawMaterialCost.pricePerKg.origin} source={rawMaterialCost.pricePerKg.source} />
            </div>
            <p className="text-xs text-slate-400">
              Industrial metals, engineering plastics & 3D printing polymers with automated paradigm evaluation
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCatalogue(!showCatalogue)}
          className="cursor-target flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
        >
          <span>All Materials ({STANDARD_MATERIALS.length})</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCatalogue ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Strategic Manufacturing Paradigm Recommendation Banner */}
      {paradigmEvaluation && (
        <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 p-5 space-y-4 shadow-lg shadow-cyan-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  AI Strategic Manufacturing Paradigm
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                    {paradigmEvaluation.recommendedParadigm}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                    {paradigmEvaluation.score}/100 Match • {paradigmEvaluation.confidencePct}% Confidence
                  </span>
                </div>
              </div>
            </div>

            {/* Quick 4-Way Paradigm Badge Matrix */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {(['Metal + Machining', 'Plastic + Injection Molding', 'Plastic + 3D Printing', 'Advanced Polymer + 3D Printing'] as const).map(p => {
                const isActive = paradigmEvaluation.recommendedParadigm === p;
                return (
                  <span
                    key={p}
                    className={`px-2 py-0.5 rounded-md border font-semibold transition-all ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-sm shadow-cyan-500/40 scale-105'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800'
                    }`}
                  >
                    {p}
                  </span>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {paradigmEvaluation.reasoning}
          </p>

          {/* Comparative Deep Dive: Plastic vs Metal & 3D Printing vs Conventional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {/* Column A: Plastic vs Metal Comparison */}
            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Plastic vs Metal Comparison</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {paradigmEvaluation.materialComparison.selectedCategory}
                </span>
              </div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Mass & Weight:</strong> {paradigmEvaluation.materialComparison.massComparison}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Raw Stock Cost:</strong> {paradigmEvaluation.materialComparison.costComparison}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Specific Strength:</strong> {paradigmEvaluation.materialComparison.strengthToWeightComparison}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Thermal / Friction:</strong> {paradigmEvaluation.materialComparison.temperatureComparison} {paradigmEvaluation.materialComparison.chemicalWearComparison}</span>
                </div>
              </div>
            </div>

            {/* Column B: 3D Printing vs Conventional Manufacturing */}
            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5" />
                  <span>3D Printing vs Conventional Manufacturing</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {paradigmEvaluation.processComparison.recommendedProcess}
                </span>
              </div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Tooling Investment:</strong> {paradigmEvaluation.processComparison.toolingInvestmentComparison}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Break-Even Crossover:</strong> {paradigmEvaluation.processComparison.crossoverVolumeBreakEven}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Geometric Feasibility:</strong> {paradigmEvaluation.processComparison.geometryFeasibility}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Production Lead Time:</strong> {paradigmEvaluation.processComparison.leadTimeComparison}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative Paradigm Switching Triggers */}
          {paradigmEvaluation.alternatives.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold text-slate-300">Alternative Switch Triggers:</span>
              {paradigmEvaluation.alternatives.map((alt, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-slate-400">
                  <strong className="text-cyan-300">{alt.paradigm}:</strong> {alt.whenToSwitch}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Automated Material Selection & User Override Indicator */}
      {aiSuggestedMaterial && (
        <div className={`p-4 rounded-xl border transition-all ${
          isUserOverride
            ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
            : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <Bot className={`w-4 h-4 ${isUserOverride ? 'text-amber-400' : 'text-cyan-400'}`} />
              <span className="text-xs font-bold uppercase tracking-wider">
                {isUserOverride ? 'User Material Override Active' : 'Automated AI Material Selection'}
              </span>
            </div>

            {isUserOverride ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-400">
                Custom Choice: {selectedMaterial.name}
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                Recommended by {aiModelUsed}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {isUserOverride ? (
              <>
                You switched to <strong className="text-white">{selectedMaterial.name}</strong> ({selectedMaterial.category}). The original AI recommendation was <strong className="text-cyan-300">{aiSuggestedMaterial.name}</strong>. All raw material costs and machining cycle times below have been automatically recalculated for {selectedMaterial.name}.
              </>
            ) : (
              <>
                <strong className="text-cyan-300">{selectedMaterial.name}</strong> was automatically selected based on functional geometry and performance intent. {aiDesignRationale || ''}
              </>
            )}
          </p>

          {/* Quick-switch buttons for user override */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Switch / Override:</span>
            {quickSwitchOptions.map(opt => {
              const mat = getMaterialById(opt.id);
              if (!mat) return null;
              const isCurrent = selectedMaterial.id === mat.id;
              const isAiChoice = aiSuggestedMaterial.id === mat.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectMaterial(mat)}
                  className={`cursor-target flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isCurrent
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm shadow-cyan-500/30'
                      : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title={`${mat.name} (${mat.category}) - ₹${mat.typicalRawPricePerKg}/kg`}
                >
                  {isCurrent && <Check className="w-3 h-3 text-slate-950" />}
                  <span>{opt.label}</span>
                  {isAiChoice && !isCurrent && (
                    <span className="text-[9px] text-cyan-400 font-mono">(AI Rec)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Material Recommendations Grid (Evaluated across the 8 criteria) */}
      {recommendations && recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Top AI Material Recommendations
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Ranked across strength, weight, friction & thermal specs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recommendations.map(rec => {
              const isSelected = selectedMaterial.id === rec.materialId;
              return (
                <div
                  key={rec.materialId}
                  onClick={() => onSelectMaterial(rec.properties)}
                  className={`cursor-target p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/50 border-cyan-400 ring-1 ring-cyan-500 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <span className="font-bold text-xs text-white leading-tight">{rec.materialName}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300 font-mono whitespace-nowrap">
                        {rec.suitabilityScore}/100
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {rec.properties.category}
                      </span>
                      {rec.properties.is3DPrintable && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                          3D Printable
                        </span>
                      )}
                      {rec.paradigmFit && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                          {rec.paradigmFit}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 mb-3">
                      {rec.reasoning}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Density (Mass):</span>
                      <span className="text-slate-200 font-mono">{rec.properties.densityGPerCm3} g/cm³</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tensile Yield:</span>
                      <span className="text-slate-200 font-mono">{rec.properties.yieldStrengthMpa} MPa</span>
                    </div>
                    {rec.properties.continuousServiceTempC && (
                      <div className="flex justify-between">
                        <span>Max Service Temp:</span>
                        <span className="text-amber-400 font-mono">{rec.properties.continuousServiceTempC}°C</span>
                      </div>
                    )}
                    {rec.properties.frictionCoefficient && (
                      <div className="flex justify-between">
                        <span>Friction Coeff (μ):</span>
                        <span className="text-emerald-400 font-mono">{rec.properties.frictionCoefficient}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Market Rate:</span>
                      <span className="text-emerald-400 font-mono">₹{rec.properties.typicalRawPricePerKg}/kg</span>
                    </div>

                    {isSelected && (
                      <div className="mt-2 flex items-center justify-center gap-1 py-1 rounded bg-cyan-500 text-slate-950 text-xs font-bold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active Selection</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded Material Catalogue Drawer with Category Filters */}
      {showCatalogue && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Material Catalogue ({filteredMaterials.length} materials)
            </span>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {(['All', 'Plastics', 'High-Performance', 'Metals'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCatalogueFilter(tab)}
                  className={`cursor-target px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    catalogueFilter === tab
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'All' ? 'All (19)' : tab === 'Plastics' ? 'Industrial Plastics (6)' : tab === 'High-Performance' ? 'High-Performance & Composites (3)' : 'Metals (10)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredMaterials.map(m => {
              const isSelected = selectedMaterial.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectMaterial(m);
                    setShowCatalogue(false);
                  }}
                  className={`cursor-target p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white truncate">{m.name}</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">₹{m.typicalRawPricePerKg}/kg</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>ρ: {m.densityGPerCm3} g/cm³</span>
                    <span>σ: {m.yieldStrengthMpa} MPa</span>
                    {m.continuousServiceTempC && <span>{m.continuousServiceTempC}°C</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[9px]">
                    <span className="text-slate-500 truncate">{m.category}</span>
                    {m.is3DPrintable && (
                      <span className="px-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                        3D Print
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock Mass & Raw Material Cost Formula Breakdown in INR ₹ */}
      <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Active Material: <strong className="text-white">{selectedMaterial.name}</strong> ({selectedMaterial.category})
            </span>
            {selectedMaterial.isPolymer && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-semibold">
                Polymer / Plastic
              </span>
            )}
            {selectedMaterial.is3DPrintable && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold">
                Additive Ready
              </span>
            )}
          </div>
          <OriginBadge origin={rawMaterialCost.netMaterialCostPerUnit.origin} size="xs" />
        </div>

        {/* The 7 Mandated Material Outputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="block text-[10px] text-slate-400 uppercase font-medium">Part Volume</span>
            <span className="text-sm font-bold text-white font-mono-num">
              {rawMaterialCost.partVolumeMm3.value.toLocaleString()}
            </span>
            <span className="block text-[10px] text-slate-500">mm³</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="block text-[10px] text-amber-400 uppercase font-medium">Allowance</span>
            <span className="text-sm font-bold text-amber-300 font-mono-num">
              +{rawMaterialCost.machiningAllowancePct.value}%
            </span>
            <span className="block text-[10px] text-slate-500">oversize</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="block text-[10px] text-slate-400 uppercase font-medium">Stock Volume</span>
            <span className="text-sm font-bold text-cyan-400 font-mono-num">
              {rawMaterialCost.stockVolumeMm3.value.toLocaleString()}
            </span>
            <span className="block text-[10px] text-slate-500">mm³</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="block text-[10px] text-slate-400 uppercase font-medium">Density (ρ)</span>
            <span className="text-sm font-bold text-white font-mono-num">
              {rawMaterialCost.densityGPerCm3.value}
            </span>
            <span className="block text-[10px] text-slate-500">g/cm³</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="block text-[10px] text-emerald-400 uppercase font-medium">Stock Mass</span>
            <span className="text-sm font-bold text-emerald-400 font-mono-num">
              {rawMaterialCost.stockMassKg.value.toFixed(3)}
            </span>
            <span className="block text-[10px] text-slate-500">kg/unit</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60 relative group">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-medium mb-0.5">
              <span>Price / kg (₹)</span>
            </div>
            {isEditingPrice ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="1"
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  className="w-16 px-1 py-0.5 rounded bg-slate-950 border border-cyan-500 text-white font-mono-num text-xs"
                />
                <button
                  onClick={handlePriceSave}
                  className="cursor-target p-1 rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingPrice(true)}
                className="cursor-target hover:text-cyan-400 transition-colors"
                title="Click to override raw material price per kg in INR ₹"
              >
                <span className="text-sm font-bold text-white font-mono-num">
                  ₹{rawMaterialCost.pricePerKg.value.toFixed(0)}
                </span>
                <span className="block text-[10px] text-cyan-400">Click to edit</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 col-span-2 sm:col-span-1">
            <span className="block text-[10px] text-cyan-300 uppercase font-bold">Material Cost</span>
            <span className="text-base font-extrabold text-cyan-400 font-mono-num">
              ₹{rawMaterialCost.netMaterialCostPerUnit.value.toFixed(2)}
            </span>
            <span className="block text-[10px] text-slate-400">per unit</span>
          </div>
        </div>

        {/* Mass mechanics & scrap recovery notes */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <div>
            Net finished part mass: <strong className="text-slate-200 font-mono-num">{rawMaterialCost.netPartMassKg.value.toFixed(3)} kg</strong> • Stock mass: <strong className="text-slate-200 font-mono-num">{rawMaterialCost.stockMassKg.value.toFixed(3)} kg</strong>
          </div>
          <div>
            Scrap credit applied: <strong className="text-emerald-400 font-mono-num">-₹{rawMaterialCost.scrapCreditPerUnit.value.toFixed(2)}/unit</strong>
          </div>
        </div>
      </div>
    </section>
  );
};

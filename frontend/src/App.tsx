import React, { useState, useEffect, useCallback } from 'react';
import {
  PartDimensions,
  CadMeshStats,
  MaterialProperties,
  FullCalculationResult,
  ManufacturingProcessType,
  MachiningCostAssumptions,
  ServiceStatus,
  AIStrategyAnalysis,
  MaterialRecommendation,
  AiCadPromptResult
} from '@shared/types';
import { STANDARD_MATERIALS, getDefaultMaterial, getMaterialById } from '@shared/materials';
import { DEFAULT_MACHINING_ASSUMPTIONS, runFullCalculation } from '@shared/calculation-engine';

// UI Components
import { TopNavBar } from './components/ui/TopNavBar';
import { EmptyState } from './components/EmptyState';
import { FooterDisclaimer } from './components/ui/FooterDisclaimer';
import { ManualInputForm } from './components/ManualInputForm';
import { CadViewer } from './components/CadViewer';
import { AssumptionsPanel } from './components/AssumptionsPanel';
import { PartAnalysisSection } from './components/dashboard/PartAnalysisSection';
import { MaterialSection } from './components/dashboard/MaterialSection';
import { ProcessComparisonSection } from './components/dashboard/ProcessComparisonSection';
import { MachiningCostSection } from './components/dashboard/MachiningCostSection';
import { BusinessSection } from './components/dashboard/BusinessSection';
import { InteractiveChartsSection } from './components/dashboard/InteractiveChartsSection';
import { StrategySection } from './components/dashboard/StrategySection';
import { ChatAssistantDrawer } from './components/chat/ChatAssistantDrawer';
import { QuotationPrintModal } from './components/QuotationPrintModal';
import { TargetCursor } from './components/ui/TargetCursor';
import { DotGrid } from './components/ui/DotGrid';
import { soundManager } from './utils/soundEffects';
import { synthesizeClientCad } from './utils/clientCadGenerator';

export function App() {
  // Service health status
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);

  // Core Project State (STARTS COMPLETELY NULL - CORE PRINCIPLE 1)
  const [dimensions, setDimensions] = useState<PartDimensions | null>(null);
  const [cadMeshStats, setCadMeshStats] = useState<CadMeshStats | null>(null);
  const [cadFileBuffer, setCadFileBuffer] = useState<ArrayBuffer | null>(null);
  const [cadFileName, setCadFileName] = useState<string>('');

  // Selected engineering parameters
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialProperties>(getDefaultMaterial());
  const [priceOverridePerKg, setPriceOverridePerKg] = useState<number | undefined>(undefined);
  const [machiningAllowancePct, setMachiningAllowancePct] = useState<number>(15);
  const [selectedProcess, setSelectedProcess] = useState<ManufacturingProcessType>('CNC Milling');
  const [machiningAssumptions, setMachiningAssumptions] = useState<MachiningCostAssumptions>(DEFAULT_MACHINING_ASSUMPTIONS);
  const [targetSellingPriceOverride, setTargetSellingPriceOverride] = useState<number | undefined>(undefined);
  const [targetMarginPct, setTargetMarginPct] = useState<number>(30);

  // Calculation Results
  const [calculation, setCalculation] = useState<FullCalculationResult | null>(null);

  // AI Inference State
  const [materialRecs, setMaterialRecs] = useState<MaterialRecommendation[]>([]);
  const [partAnalysisData, setPartAnalysisData] = useState<any>(null);
  const [strategyAnalysis, setStrategyAnalysis] = useState<AIStrategyAnalysis | null>(null);
  const [strategyLoading, setStrategyLoading] = useState<boolean>(false);

  // Modal / Drawer visibility
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isCadModalOpen, setIsCadModalOpen] = useState<boolean>(false);
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isQuotationOpen, setIsQuotationOpen] = useState<boolean>(false);

  // AI CAD Synthesis & Automated Material State (Edit 1 & Edit 2)
  const [isGeneratingAiCad, setIsGeneratingAiCad] = useState<boolean>(false);
  const [aiSuggestedMaterialId, setAiSuggestedMaterialId] = useState<string | undefined>(undefined);
  const [aiModelUsedForCad, setAiModelUsedForCad] = useState<string | undefined>(undefined);
  const [aiDesignRationale, setAiDesignRationale] = useState<string | undefined>(undefined);

  // 1. Fetch system & backend status on mount
  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(status => setServiceStatus(status))
      .catch(() => {
        // Fallback status if offline
        setServiceStatus({
          gemma: {
            available: false,
            model: 'gemma-4-31b-it',
            status: 'Fallback',
            details: 'Local rule engine active'
          },
          perplexity: {
            available: false,
            status: 'Fallback (Manual Input)'
          },
          cadParser: {
            available: true,
            status: 'Active (Native STL/OBJ)',
            stepSupported: true
          }
        });
      });
  }, []);

  // Global mechanical tick sound effect on mouse click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent | PointerEvent) => {
      // Trigger on primary left mouse click or touch
      if ('button' in e && e.button !== 0) return;
      soundManager.playClick(true);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, []);

  // 2. Deterministic Calculation Engine Execution
  const runCalculation = useCallback((
    currentDims: PartDimensions,
    currentMat: MaterialProperties,
    priceOverride?: number,
    allowancePct?: number,
    process?: ManufacturingProcessType,
    assumptions?: MachiningCostAssumptions,
    targetPrice?: number,
    targetMargin?: number
  ) => {
    const rawPrice = priceOverride !== undefined ? priceOverride : currentMat.typicalRawPricePerKg;
    const origin = priceOverride !== undefined ? 'Manual Input' : 'Assumption';

    const result = runFullCalculation({
      dimensions: currentDims,
      material: currentMat,
      rawPricePerKg: rawPrice,
      rawPriceOrigin: origin,
      priceSource: priceOverride !== undefined ? 'User Override' : 'Engineering Baseline',
      machiningAssumptions: assumptions || machiningAssumptions,
      selectedProcess: process || selectedProcess,
      customMachiningAllowancePct: allowancePct ?? machiningAllowancePct,
      targetSellingPriceOverride: targetPrice,
      targetMarginPct: targetMargin ?? targetMarginPct
    });

    setCalculation(result);
    return result;
  }, [machiningAssumptions, selectedProcess, machiningAllowancePct, targetMarginPct]);

  // 3. Trigger AI Insights (Materials, Geometry & Strategy)
  const triggerAiAnalysis = async (dims: PartDimensions, currentMat: MaterialProperties, calc: FullCalculationResult) => {
    try {
      // Material Recommendations
      fetch('/api/ai/recommend-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensions: dims })
      })
        .then(r => r.json())
        .then(data => {
          if (data.recommendations) {
            setMaterialRecs(data.recommendations);
          }
        })
        .catch(err => console.warn('Material recommendations error:', err));

      // Part Feature Analysis
      fetch('/api/ai/analyze-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensions: dims,
          cadStats: cadMeshStats ? {
            volumeMm3: cadMeshStats.volumeMm3,
            surfaceAreaMm2: cadMeshStats.surfaceAreaMm2,
            isWatertight: cadMeshStats.isWatertight
          } : undefined
        })
      })
        .then(r => r.json())
        .then(data => setPartAnalysisData(data))
        .catch(err => console.warn('Part analysis error:', err));

      // Strategy Synthesis
      setStrategyLoading(true);
      fetch('/api/ai/analyze-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensions: dims,
          materialId: currentMat.id,
          calculation: calc
        })
      })
        .then(r => r.json())
        .then(data => {
          setStrategyAnalysis(data);
          setStrategyLoading(false);
        })
        .catch(err => {
          console.warn('Strategy error:', err);
          setStrategyLoading(false);
        });
    } catch (err) {
      console.error('AI pipeline error:', err);
      setStrategyLoading(false);
    }
  };

  // Handler: Manual Dimensions Submitted
  const handleManualSubmit = (dims: PartDimensions) => {
    setDimensions(dims);
    setIsManualModalOpen(false);

    // Initial calculation
    const calc = runCalculation(
      dims,
      selectedMaterial,
      priceOverridePerKg,
      machiningAllowancePct,
      selectedProcess,
      machiningAssumptions,
      dims.targetSellingPrice || targetSellingPriceOverride,
      targetMarginPct
    );

    // Trigger AI pipeline
    triggerAiAnalysis(dims, selectedMaterial, calc);
  };

  // Handler: CAD Loaded
  const handleCadLoaded = (stats: CadMeshStats, buffer: ArrayBuffer, filename: string) => {
    setCadMeshStats(stats);
    setCadFileBuffer(buffer);
    setCadFileName(filename);
    setIsCadModalOpen(false);

    // Construct part dimensions from extracted CAD bounding box and volume
    const newDims: PartDimensions = {
      geometryType: 'Custom',
      partName: filename.replace(/\.[^/.]+$/, ''),
      length: stats.boundingBoxMm.length,
      width: stats.boundingBoxMm.width,
      height: stats.boundingBoxMm.height,
      customVolumeMm3: stats.volumeMm3,
      quantity: dimensions?.quantity || 25,
      toleranceMm: 0.05,
      surfaceFinishRaUm: 1.6,
      application: 'CAD Analyzed Mechanical Component',
      mechanicalRequirements: 'Precision structural tolerances'
    };

    setDimensions(newDims);

    const calc = runCalculation(
      newDims,
      selectedMaterial,
      priceOverridePerKg,
      machiningAllowancePct,
      selectedProcess,
      machiningAssumptions,
      targetSellingPriceOverride,
      targetMarginPct
    );

    triggerAiAnalysis(newDims, selectedMaterial, calc);
  };

  // Handler: Generate 3D CAD & Analyze with Prompt2CAD, Gemini or Claude
  const handleGenerateAiCad = async (prompt: string, model: 'prompt2cad' | 'claude' | 'gemini') => {
    setIsGeneratingAiCad(true);
    try {
      let data: AiCadPromptResult;
      try {
        const res = await fetch('/api/ai/generate-cad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, aiModel: model })
        });

        if (res.ok) {
          data = await res.json();
        } else {
          // If server returns error or 404 on static hosts like Netlify, fall back to autonomous client CAD synthesis
          console.info('Backend API unavailable, utilizing autonomous browser CAD synthesis engine...');
          data = synthesizeClientCad(prompt, model);
        }
      } catch (networkErr: any) {
        // Offline or static Netlify hosting -> instantaneous client synthesis
        console.info('Network unreachable or Netlify static mode, synthesizing CAD in browser:', networkErr);
        data = synthesizeClientCad(prompt, model);
      }

      // Convert Base64 string to ArrayBuffer for Three.js STLLoader / OBJLoader
      const binaryString = window.atob(data.stlBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = bytes.buffer;

      const fileExt = data.meshFormat === 'obj' ? 'obj' : 'stl';
      setCadMeshStats(data.cadStats);
      setCadFileBuffer(buffer);
      setCadFileName(`${data.dimensions.partName.replace(/[^a-zA-Z0-9_-]/g, '_')}.${fileExt}`);
      setDimensions(data.dimensions);

      // Automated material selection
      const suggestedMat = getMaterialById(data.suggestedMaterialId) || getDefaultMaterial();
      setSelectedMaterial(suggestedMat);
      setAiSuggestedMaterialId(data.suggestedMaterialId);
      setAiModelUsedForCad(data.aiModelUsed);
      setAiDesignRationale(data.designRationale);
      setPriceOverridePerKg(undefined);

      // Run deterministic calculation engine
      const calc = runCalculation(
        data.dimensions,
        suggestedMat,
        undefined,
        machiningAllowancePct,
        selectedProcess,
        machiningAssumptions,
        undefined,
        targetMarginPct
      );

      // Run AI pipeline
      if (calc) {
        triggerAiAnalysis(data.dimensions, suggestedMat, calc);
      }
    } catch (err: any) {
      console.error('AI CAD generation error:', err);
      alert(`CAD Generation Notice: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingAiCad(false);
    }
  };

  // Handler: Change Material
  const handleSelectMaterial = (mat: MaterialProperties) => {
    setSelectedMaterial(mat);
    setPriceOverridePerKg(undefined); // reset to material default or live lookup

    if (dimensions) {
      const calc = runCalculation(
        dimensions,
        mat,
        undefined,
        machiningAllowancePct,
        selectedProcess,
        machiningAssumptions,
        targetSellingPriceOverride,
        targetMarginPct
      );

      // Refresh strategy with new material figures
      if (calc) {
        triggerAiAnalysis(dimensions, mat, calc);
      }
    }
  };

  // Handler: Update Price Override
  const handleUpdatePrice = (newPrice: number) => {
    setPriceOverridePerKg(newPrice);
    if (dimensions) {
      runCalculation(
        dimensions,
        selectedMaterial,
        newPrice,
        machiningAllowancePct,
        selectedProcess,
        machiningAssumptions,
        targetSellingPriceOverride,
        targetMarginPct
      );
    }
  };

  // Handler: Update Process
  const handleSelectProcess = (proc: ManufacturingProcessType) => {
    setSelectedProcess(proc);
    if (dimensions) {
      runCalculation(
        dimensions,
        selectedMaterial,
        priceOverridePerKg,
        machiningAllowancePct,
        proc,
        machiningAssumptions,
        targetSellingPriceOverride,
        targetMarginPct
      );
    }
  };

  // Handler: Update Machining Assumptions
  const handleUpdateAssumptions = (newAssumptions: MachiningCostAssumptions) => {
    setMachiningAssumptions(newAssumptions);
    if (dimensions) {
      runCalculation(
        dimensions,
        selectedMaterial,
        priceOverridePerKg,
        machiningAllowancePct,
        selectedProcess,
        newAssumptions,
        targetSellingPriceOverride,
        targetMarginPct
      );
    }
  };

  // Handler: Update Allowance
  const handleUpdateAllowance = (pct: number) => {
    setMachiningAllowancePct(pct);
    if (dimensions) {
      runCalculation(
        dimensions,
        selectedMaterial,
        priceOverridePerKg,
        pct,
        selectedProcess,
        machiningAssumptions,
        targetSellingPriceOverride,
        targetMarginPct
      );
    }
  };

  // Handler: Update Quantity from Slider
  const handleQuantityChange = (newQty: number) => {
    if (!dimensions) return;
    const updatedDims = { ...dimensions, quantity: newQty };
    setDimensions(updatedDims);

    runCalculation(
      updatedDims,
      selectedMaterial,
      priceOverridePerKg,
      machiningAllowancePct,
      selectedProcess,
      machiningAssumptions,
      targetSellingPriceOverride,
      targetMarginPct
    );
  };

  // Handler: New Analysis (Full Reset - Mandated by Prompt)
  const handleNewAnalysis = () => {
    setDimensions(null);
    setCadMeshStats(null);
    setCadFileBuffer(null);
    setCadFileName('');
    setCalculation(null);
    setMaterialRecs([]);
    setPartAnalysisData(null);
    setStrategyAnalysis(null);
    setPriceOverridePerKg(undefined);
    setTargetSellingPriceOverride(undefined);
    setSelectedMaterial(getDefaultMaterial());
    setMachiningAssumptions(DEFAULT_MACHINING_ASSUMPTIONS);
    setMachiningAllowancePct(15);
    setAiSuggestedMaterialId(undefined);
    setAiModelUsedForCad(undefined);
    setAiDesignRationale(undefined);
  };

  const hasAnalysis = Boolean(dimensions && calculation);

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Precision Engineering Target Cursor (React Bits) */}
      <TargetCursor
        targetSelector=".cursor-target, button, a, [role='button'], input[type='range']"
        spinDuration={2}
        hideDefaultCursor={true}
        parallaxOn={true}
        cursorColor="#00d2ff"
        cursorColorOnTarget="#00ffff"
      />

      {/* Interactive Dot Grid Background (React Bits) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
        <DotGrid
          dotSize={10}
          gap={18}
          baseColor="#28324a"
          activeColor="#00e5ff"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>

      {/* Persistent Technical Navigation Bar */}
      <TopNavBar
        serviceStatus={serviceStatus}
        hasActiveAnalysis={hasAnalysis}
        onNewAnalysis={handleNewAnalysis}
        onOpenAssumptions={() => setIsAssumptionsOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenQuotation={() => setIsQuotationOpen(true)}
        chatOpen={isChatOpen}
        assumptionsOpen={isAssumptionsOpen}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {!dimensions || !calculation ? (
          /* Core Principle 1: Real Input Only empty state */
          <EmptyState
            onEnterManual={() => setIsManualModalOpen(true)}
            onUploadCad={() => setIsCadModalOpen(true)}
            onGenerateAiCad={handleGenerateAiCad}
            isGenerating={isGeneratingAiCad}
          />
        ) : (
          /* Live Dashboard */
          <div className="space-y-8 animate-fadeIn">
            {/* Section 1: Part Analysis & Geometry */}
            <PartAnalysisSection
              dimensions={dimensions}
              cadStats={cadMeshStats}
              fileBuffer={cadFileBuffer}
              fileName={cadFileName}
              partAnalysisData={partAnalysisData}
              onOpenCadViewer={() => setIsCadModalOpen(true)}
              onEditDimensions={() => setIsManualModalOpen(true)}
            />

            {/* Section 2: Material Selection & Stock Cost */}
            <MaterialSection
              selectedMaterial={selectedMaterial}
              rawMaterialCost={calculation.rawMaterial}
              recommendations={materialRecs}
              priceOverridePerKg={priceOverridePerKg}
              aiSuggestedMaterialId={aiSuggestedMaterialId}
              aiModelUsed={aiModelUsedForCad}
              aiDesignRationale={aiDesignRationale}
              paradigmEvaluation={calculation.paradigmEvaluation}
              onSelectMaterial={handleSelectMaterial}
              onUpdatePricePerKg={handleUpdatePrice}
              onUpdateDensity={d => setSelectedMaterial(m => ({ ...m, densityGPerCm3: d }))}
            />

            {/* Section 3: Manufacturing Process Comparison (14 Processes) */}
            <ProcessComparisonSection
              rankings={calculation.processRankings}
              selectedProcess={selectedProcess}
              quantity={dimensions.quantity}
              paradigmEvaluation={calculation.paradigmEvaluation}
              onSelectProcess={handleSelectProcess}
            />

            {/* Section 4: Machining Cycle Time & Full Cost Breakdown */}
            <MachiningCostSection
              machiningResult={calculation.machining}
              totalCostBreakdown={calculation.totalCost}
              assumptions={machiningAssumptions}
              quantity={dimensions.quantity}
              onOpenAssumptions={() => setIsAssumptionsOpen(true)}
            />

            {/* Section 5: Business Economics, Break-Even & Quantity Tiers */}
            <BusinessSection
              business={calculation.business}
              totalCost={calculation.totalCost}
              quantityTiers={calculation.quantityTiers}
              targetSellingPriceOverride={targetSellingPriceOverride}
              targetMarginPct={targetMarginPct}
              onUpdateSellingPrice={p => {
                setTargetSellingPriceOverride(p);
                runCalculation(
                  dimensions,
                  selectedMaterial,
                  priceOverridePerKg,
                  machiningAllowancePct,
                  selectedProcess,
                  machiningAssumptions,
                  p,
                  targetMarginPct
                );
              }}
              onUpdateTargetMargin={m => {
                setTargetMarginPct(m);
                runCalculation(
                  dimensions,
                  selectedMaterial,
                  priceOverridePerKg,
                  machiningAllowancePct,
                  selectedProcess,
                  machiningAssumptions,
                  undefined,
                  m
                );
              }}
            />

            {/* Section 6: Interactive Recharts Graphs & Sensitivity Slider */}
            <InteractiveChartsSection
              chartData={calculation.chartData}
              business={calculation.business}
              currentQuantity={dimensions.quantity}
              onQuantityChange={handleQuantityChange}
            />

            {/* Section 7: AI Strategic Optimization (Gemma 4) */}
            <StrategySection
              strategy={strategyAnalysis}
              loading={strategyLoading}
              onRefreshStrategy={() => triggerAiAnalysis(dimensions, selectedMaterial, calculation)}
            />
          </div>
        )}
      </main>

      {/* Manual Input Modal */}
      <ManualInputForm
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleManualSubmit}
        initialValues={dimensions}
      />

      {/* CAD Upload & 3D Viewer Modal */}
      {isCadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl h-[600px]">
            <CadViewer
              meshStats={cadMeshStats}
              fileBuffer={cadFileBuffer}
              fileName={cadFileName}
              onCadLoaded={handleCadLoaded}
              onClose={() => setIsCadModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Assumptions Side Drawer */}
      <AssumptionsPanel
        isOpen={isAssumptionsOpen}
        onClose={() => setIsAssumptionsOpen(false)}
        assumptions={machiningAssumptions}
        machiningAllowancePct={machiningAllowancePct}
        onUpdateAssumptions={handleUpdateAssumptions}
        onUpdateAllowancePct={handleUpdateAllowance}
      />

      {/* Ask ManufactureAI Chat Drawer */}
      <ChatAssistantDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        dimensions={dimensions}
        material={selectedMaterial}
        calculation={calculation}
        selectedProcess={selectedProcess}
        rawPricePerKg={priceOverridePerKg || selectedMaterial.typicalRawPricePerKg}
      />

      {/* Official Printable Quotation & Specification Sheet */}
      {dimensions && calculation && (
        <QuotationPrintModal
          isOpen={isQuotationOpen}
          onClose={() => setIsQuotationOpen(false)}
          dimensions={dimensions}
          material={selectedMaterial}
          calculation={calculation}
          selectedProcess={selectedProcess}
          cadMeshStats={cadMeshStats}
          aiModelUsed={aiModelUsedForCad}
        />
      )}

      {/* Mandatory Engineering & Support Disclaimer */}
      <FooterDisclaimer />
    </div>
  );
}

export default App;

import { AIProvider } from './types';
import {
  PartDimensions,
  MaterialRecommendation,
  ManufacturingProcessType,
  AIStrategyAnalysis,
  ChatMessage,
  FullCalculationResult,
  MaterialProperties
} from '../../../shared/src/types';
import { rankProcesses } from '../../../shared/src/calculation-engine';

export class RuleBasedProvider implements AIProvider {
  name = 'Rule-Based Fallback';

  isAvailable(): boolean {
    return true; // Always available as local rule engine
  }

  async analyzePart(
    dimensions: PartDimensions,
    cadStats?: { volumeMm3: number; surfaceAreaMm2: number; isWatertight: boolean }
  ) {
    const isRotational = dimensions.geometryType === 'Cylinder' || dimensions.geometryType === 'Shaft';
    const isSheet = dimensions.geometryType === 'Plate' && (dimensions.thickness || 5) <= 12;
    const hasHoles = (dimensions.holeCount || 0) > 0;
    const hasPockets = (dimensions.pocketCount || 0) > 0;

    const criticalFeatures: string[] = [];
    if (isRotational) criticalFeatures.push('Cylindrical turning surfaces & concentricity requirements');
    if (isSheet) criticalFeatures.push('Uniform plate thickness & edge cut quality');
    if (hasHoles) criticalFeatures.push(`${dimensions.holeCount} drilled/reamed hole features (dia ${dimensions.holeDiameter || 10} mm)`);
    if (hasPockets) criticalFeatures.push(`${dimensions.pocketCount} internal milled pockets`);
    if ((dimensions.toleranceMm || 0.1) <= 0.05) criticalFeatures.push(`Precision tolerance requirement (±${dimensions.toleranceMm} mm)`);

    const complexity = (hasHoles ? 1 : 0) + (hasPockets ? 2 : 0) + ((dimensions.toleranceMm || 0.1) <= 0.05 ? 1 : 0);
    const complexityRating = complexity >= 3 ? 'High' : complexity >= 2 ? 'Medium' : 'Low';

    return {
      summary: `Part "${dimensions.partName}" classified as ${dimensions.geometryType} geometry with ${dimensions.quantity} units requested. ${cadStats ? `Analyzed from CAD mesh (${cadStats.volumeMm3.toLocaleString()} mm³ volume).` : 'Evaluated from entered dimensional parameters.'}`,
      complexityRating: complexityRating as 'Low' | 'Medium' | 'High' | 'Very High',
      criticalFeatures,
      manufacturingConsiderations: [
        isRotational ? 'Lathe chucking or between-centers setup required' : 'Standard 3-axis CNC vise or vacuum fixture clamping',
        (dimensions.toleranceMm || 0.1) < 0.05 ? 'High precision requires secondary finishing passes and CMM verification' : 'Standard commercial machining tolerances achievable without grinding',
        dimensions.quantity > 500 ? 'Production volume warrants multi-part fixturing or dedicated tooling' : 'Low to medium volume favors rapid setup standard tooling'
      ],
      suggestedTolerances: `Standard ISO 2768-m (±${dimensions.toleranceMm || 0.1} mm) with Ra ${dimensions.surfaceFinishRaUm || 1.6} µm finish.`,
      provider: 'Rule-Based Fallback' as const
    };
  }

  async recommendMaterials(
    dimensions: PartDimensions,
    availableMaterials: MaterialProperties[]
  ) {
    const app = (dimensions.application || '').toLowerCase();
    const req = (dimensions.mechanicalRequirements || '').toLowerCase();
    const qty = dimensions.quantity;
    const hasComplexFeatures = (dimensions.pocketCount || 0) > 1 || (dimensions.holeCount || 0) > 2;

    const scored: MaterialRecommendation[] = availableMaterials.map(mat => {
      let score = 70;
      const pros: string[] = [];
      const cons: string[] = [];
      const isPolymer = mat.isPolymer || mat.category === 'Engineering Plastics' || mat.category === 'High-Performance Polymers' || mat.category === 'Composite Polymers';

      // 1. Strength and Weight Evaluation
      const requiresLightweight = req.includes('light') || req.includes('weight') || app.includes('aero') || app.includes('drone') || app.includes('mobile') || app.includes('robot');
      if (requiresLightweight) {
        if (isPolymer) {
          score += 24;
          pros.push(`Low density (${mat.densityGPerCm3} g/cm³) delivers superior lightweighting (up to ${Math.round((1 - mat.densityGPerCm3 / 7.87) * 100)}% lighter than steel)`);
        } else if (mat.category === 'Aluminum' || mat.category === 'Titanium') {
          score += 15;
          pros.push(`High specific strength aerospace metal alloy (${mat.densityGPerCm3} g/cm³)`);
        } else {
          score -= 20;
          cons.push(`Heavy density (${mat.densityGPerCm3} g/cm³) severely penalizes lightweighting targets`);
        }
      }

      // 2. Temperature Resistance
      const requiresHighTemp = req.includes('temp') || req.includes('heat') || req.includes('thermal') || app.includes('engine') || app.includes('steam') || app.includes('exhaust');
      if (requiresHighTemp) {
        if (mat.continuousServiceTempC && mat.continuousServiceTempC >= 250) {
          score += 26;
          pros.push(`High continuous temperature retention up to ${mat.continuousServiceTempC}°C`);
        } else if (mat.continuousServiceTempC && mat.continuousServiceTempC < 100) {
          score -= 30;
          cons.push(`Low thermal deflection threshold (${mat.continuousServiceTempC}°C); unsuitable for elevated heat`);
        } else if (!isPolymer) {
          score += 15;
          pros.push(`Metal alloy maintains structural modulus at elevated temperatures`);
        }
      }

      // 3. Chemical & Corrosion Resistance
      const requiresCorrosionResistance = req.includes('corros') || req.includes('marine') || req.includes('food') || req.includes('chemical') || req.includes('acid') || req.includes('water') || app.includes('bottle') || app.includes('valve');
      if (requiresCorrosionResistance) {
        if (mat.corrosionResistance === 'Extreme / Inert' || mat.corrosionResistance === 'Excellent') {
          score += 22;
          pros.push(`Superior chemical inertness; zero oxidation in humid, chemical, or washdown environments`);
        } else if (mat.corrosionResistance === 'Poor') {
          score -= 28;
          cons.push('Prone to rapid oxidation/rust; requires secondary protective plating or painting');
        }
      }

      // 4. Wear and Friction
      const requiresWearFriction = req.includes('wear') || req.includes('frict') || req.includes('slid') || req.includes('gear') || req.includes('bush') || req.includes('bearing') || req.includes('guide');
      if (requiresWearFriction) {
        if (mat.frictionCoefficient && mat.frictionCoefficient <= 0.20) {
          score += 24;
          pros.push(`Self-lubricating dry sliding contact (friction coeff: ${mat.frictionCoefficient}) reduces wear and eliminates grease`);
        } else if (mat.wearResistanceRating === 'Supreme / Self-Lubricating' || mat.wearResistanceRating === 'High') {
          score += 18;
          pros.push(`Proven tribological durability under abrasive sliding contact`);
        }
      }

      // 5. Part Complexity & 3D Printing / Additive Suitability
      let additiveSuitability: MaterialRecommendation['additiveSuitability'] = 'Metal Machining Preferred';
      if (mat.id === 'peek') {
        additiveSuitability = 'High-Temp Industrial (PEEK)';
      } else if (mat.id === 'cf-nylon-pa12') {
        additiveSuitability = 'Carbon-Fiber Composite';
      } else if (mat.is3DPrintable) {
        additiveSuitability = 'Standard 3D Printing (FDM/SLS)';
      }

      if (hasComplexCavities && mat.is3DPrintable) {
        score += 12;
        pros.push('Fully compatible with Additive Manufacturing (3D Printing) for complex internal cavities with zero hard tooling');
      }

      // 6. Production Quantity & Manufacturing Cost
      if (qty >= 500 && isPolymer) {
        score += 18;
        pros.push(`High production quantity (${qty} units) unlocks ultra-low per-unit injection molding cycle times`);
      } else if (qty <= 50 && mat.is3DPrintable) {
        score += 15;
        pros.push(`Low prototype volume (${qty} units) benefits from rapid 3D printing with ₹0 mold tooling investment`);
      }

      if (mat.typicalRawPricePerKg <= 300) {
        pros.push(`Highly economical raw material base (₹${mat.typicalRawPricePerKg}/kg)`);
      } else if (mat.typicalRawPricePerKg >= 3000) {
        cons.push(`Premium high-value material investment (₹${mat.typicalRawPricePerKg.toLocaleString('en-IN')}/kg)`);
      }

      // Determine Strategic Manufacturing Paradigm Fit
      let paradigmFit: StrategicManufacturingParadigm;
      if (mat.category === 'High-Performance Polymers' || mat.category === 'Composite Polymers') {
        paradigmFit = qty >= 2500 ? 'Plastic + Injection Molding' : 'Advanced Polymer + 3D Printing';
      } else if (isPolymer) {
        paradigmFit = qty >= 500 ? 'Plastic + Injection Molding' : 'Plastic + 3D Printing';
      } else {
        paradigmFit = 'Metal + Machining';
      }

      // Plastic vs Metal comparison note
      let plasticVsMetalNotes = '';
      if (isPolymer) {
        plasticVsMetalNotes = `Weighs ~${mat.densityGPerCm3} g/cm³ (${Math.round((1 - mat.densityGPerCm3 / 2.70) * 100)}% lighter than aluminum). Corrosion-free and self-damping.`;
      } else {
        plasticVsMetalNotes = `Delivers ${mat.tensileStrengthMpa} MPa tensile strength and high stiffness, but carries higher mass (${mat.densityGPerCm3} g/cm³).`;
      }

      return {
        materialId: mat.id,
        materialName: mat.name,
        suitabilityScore: Math.min(98, Math.max(15, score)),
        reasoning: `Recommended for ${mat.category} profile: tensile ${mat.tensileStrengthMpa} MPa, density ${mat.densityGPerCm3} g/cm³, max temp ${mat.continuousServiceTempC ?? 100}°C, and optimal fit for ${paradigmFit}.`,
        pros: pros.length > 0 ? pros : ['Reliable baseline engineering performance', 'Widely available commercial stock'],
        cons: cons.length > 0 ? cons : ['Standard commercial tolerances apply'],
        isPrimary: false,
        properties: mat,
        paradigmFit,
        plasticVsMetalNotes,
        additiveSuitability
      };
    });

    scored.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
    if (scored.length > 0) {
      scored[0].isPrimary = true;
    }

    return {
      recommendations: scored.slice(0, 5),
      selectionRationale: `Evaluated ${availableMaterials.length} materials across strength, weight, thermal resistance, friction, part complexity, and batch economics (${dimensions.quantity} units).`,
      provider: 'Rule-Based Fallback' as const
    };
  }

  async recommendProcesses(
    dimensions: PartDimensions,
    selectedMaterial: MaterialProperties
  ) {
    const rankings = rankProcesses(dimensions, selectedMaterial, dimensions.quantity);
    const viable = rankings.filter(r => r.isViableForGeometry);
    const primary = viable[0] || rankings[0];
    const alts = viable.slice(1, 4).map(r => r.process);

    return {
      primaryProcess: primary.process,
      alternativeProcesses: alts,
      processRationale: `Primary recommendation is ${primary.process} (score: ${primary.suitabilityScore}/100) based on ${dimensions.geometryType} geometry and target batch of ${dimensions.quantity} units.`,
      toolingConsiderations: `Initial tooling estimated at $${primary.initialToolingCost}, setup cost $${primary.setupCost}. Tooling is amortized across ${dimensions.quantity} units ($${(primary.initialToolingCost / Math.max(1, dimensions.quantity)).toFixed(2)}/unit).`,
      provider: 'Rule-Based Fallback' as const
    };
  }

  async analyzeStrategy(
    dimensions: PartDimensions,
    material: MaterialProperties,
    calculation: FullCalculationResult
  ): Promise<AIStrategyAnalysis> {
    const tc = calculation.totalCost;
    const totalUnit = tc.totalCostPerUnit.value;
    const rawPct = Math.round((tc.rawMaterialCostPerUnit.value / totalUnit) * 100);
    const machPct = Math.round((tc.machiningCostPerUnit.value / totalUnit) * 100);
    const setupPct = Math.round((tc.setupAllocationPerUnit.value / totalUnit) * 100);

    const costDrivers: string[] = [];
    if (setupPct > 25) {
      costDrivers.push(`Setup amortization accounts for ${setupPct}% of unit cost due to low batch size (${dimensions.quantity} units).`);
    }
    if (rawPct > 35) {
      costDrivers.push(`Raw stock material cost is a dominant driver (${rawPct}% of unit cost at $${tc.rawMaterialCostPerUnit.value.toFixed(2)}/unit).`);
    }
    if (machPct > 30) {
      costDrivers.push(`Machine spindle time accounts for ${machPct}% of unit cost.`);
    }

    const inflectionPoints: string[] = [
      `At 1–10 units: Standard CNC milling or 3D printing minimizes non-recurring engineering (NRE).`,
      `At 100–500 units: Amortized setup drops below $2/unit; CNC cycle time becomes the main variable driver.`,
      `At 2,000+ units: Permanent tooling processes (die casting or injection molding) dramatically drop variable cost by up to 60%.`
    ];

    const savings: AIStrategyAnalysis['potentialSavingsOpportunities'] = [
      {
        opportunity: 'Increase batch quantity from current level',
        estimatedSavingsPct: Math.min(45, Math.round(setupPct * 0.8)),
        tradeoff: 'Requires higher upfront working capital and finished goods inventory holding.'
      },
      {
        opportunity: 'Relax non-critical tolerances from ±0.05 mm to ±0.1 mm',
        estimatedSavingsPct: 12,
        tradeoff: 'Requires confirmation that mating assembly interfaces do not bind.'
      },
      {
        opportunity: 'Standardize corner pocket radii to allow larger endmill roughing',
        estimatedSavingsPct: 8,
        tradeoff: 'Slightly modifies aesthetic internal corner fillet.'
      }
    ];

    return {
      costDrivers: costDrivers.length > 0 ? costDrivers : ['Balanced distribution between raw stock and machining time.'],
      bestStrategyRecommendation: `Optimize order batch size to achieve break-even at ${calculation.business.breakEvenQuantity.value ?? 'N/A'} units. Maintain current material (${material.name}) for functional compliance while implementing multi-part fixturing to slash per-unit setup.`,
      processInflectionPoints: inflectionPoints,
      potentialSavingsOpportunities: savings,
      manufacturingRisks: [
        'Tool deflection on deep pockets or small corner radii',
        'Thermal expansion distortion if machining aggressive roughing passes without flood coolant',
        'Raw material price volatility in spot metal markets'
      ],
      qualityTolerancesTradeoffs: `Achieving ±${dimensions.toleranceMm || 0.1} mm tolerance represents ~15% of finishing spindle time. Relaxing non-mating faces would yield immediate machining time reduction.`,
      confidenceScore: 92,
      provider: 'Rule-Based Fallback'
    };
  }

  async chat(
    history: ChatMessage[],
    userMessage: string,
    context: {
      dimensions: PartDimensions | null;
      material: MaterialProperties | null;
      calculation: FullCalculationResult | null;
      selectedProcess?: ManufacturingProcessType;
      rawPricePerKg?: number;
    }
  ) {
    const q = userMessage.toLowerCase();
    const facts: string[] = [];

    if (!context.dimensions || !context.calculation) {
      return {
        response: 'No part analysis data is currently loaded. Please enter part dimensions or upload a CAD model so I can reference the verified calculated numbers.',
        groundedFactsCited: [],
        provider: 'Rule-Based Fallback' as const
      };
    }

    const { dimensions, material, calculation } = context;
    const tc = calculation.totalCost;
    const biz = calculation.business;

    facts.push(`Part: ${dimensions.partName} (${dimensions.geometryType})`);
    facts.push(`Quantity: ${dimensions.quantity} units`);
    facts.push(`Material: ${material?.name || 'Unspecified'}`);
    facts.push(`Total Cost / Unit: $${tc.totalCostPerUnit.value.toFixed(2)}`);
    facts.push(`Selling Price / Unit: $${biz.sellingPricePerUnit.value.toFixed(2)}`);
    facts.push(`Break-Even Qty: ${biz.breakEvenQuantity.value ?? 'No break-even'}`);

    let response = '';

    if (q.includes('why this material') || q.includes('material')) {
      response = `We selected **${material?.name}** because its mechanical properties match your requirements:
- Density: **${material?.densityGPerCm3} g/cm³** (Net part mass: **${calculation.rawMaterial.netPartMassKg.value.toFixed(3)} kg**)
- Machinability index: **${material?.machinabilityIndex}%** relative to standard 1018 steel
- Yield strength: **${material?.yieldStrengthMpa} MPa** with **${material?.corrosionResistance}** corrosion resistance.
- Raw material cost contribution: **$${tc.rawMaterialCostPerUnit.value.toFixed(2)}/unit** at **$${calculation.rawMaterial.pricePerKg.value.toFixed(2)}/kg**.`;
    } else if (q.includes('reduce cost') || q.includes('cheaper') || q.includes('savings')) {
      response = `Based on the deterministic cost breakdown of **$${tc.totalCostPerUnit.value.toFixed(2)}/unit**, here are the top 3 verified cost reduction levers:
1. **Batch Scaling**: Setup allocation is currently **$${tc.setupAllocationPerUnit.value.toFixed(2)}/unit**. Increasing batch from ${dimensions.quantity} to ${dimensions.quantity * 5} units will amortize the fixed setup of $${tc.fixedCostsTotal.value.toFixed(2)} down by 80%.
2. **Tolerance Relaxation**: Current tolerance is ±${dimensions.toleranceMm ?? 0.1} mm. Opening non-critical surfaces reduces finishing cycle time (currently ${calculation.machining.finishingCycleTimeMin.value.toFixed(1)} min).
3. **Corner Radii**: Increasing internal pocket radii allows larger roughing endmills with higher Material Removal Rate (MRR: ${calculation.machining.mrrUsedMm3PerMin.value.toLocaleString()} mm³/min).`;
    } else if (q.includes('break-even') || q.includes('break even')) {
      if (biz.breakEvenQuantity.value === null) {
        response = `Under current settings, **break-even cannot be reached** because the selling price ($${biz.sellingPricePerUnit.value.toFixed(2)}) is less than or equal to the variable cost per unit ($${tc.variableCostPerUnit.value.toFixed(2)}). Every unit produced yields a loss. Increase the selling price above $${tc.variableCostPerUnit.value.toFixed(2)} to establish positive unit contribution.`;
      } else {
        response = `The calculated break-even point is **${biz.breakEvenQuantity.value} units**.
- Fixed setup costs: **$${tc.fixedCostsTotal.value.toFixed(2)}**
- Variable cost per unit: **$${tc.variableCostPerUnit.value.toFixed(2)}**
- Unit contribution (Selling Price - Variable Cost): **$${(biz.sellingPricePerUnit.value - tc.variableCostPerUnit.value).toFixed(2)}**
At your current planned quantity of **${dimensions.quantity} units**, you are ${dimensions.quantity >= biz.breakEvenQuantity.value ? 'operating profitably above break-even' : `operating below break-even (need ${biz.breakEvenQuantity.value - dimensions.quantity} more units)`}.`;
      }
    } else if (q.includes('process') || q.includes('quantity increases') || q.includes('when should the process change')) {
      response = `For your current quantity of **${dimensions.quantity} units**, **${context.selectedProcess || 'CNC Milling'}** is recommended.
- Prototype tier (1–10 units): CNC Milling or Additive Manufacturing has zero hard tooling penalty.
- At 100–1,000 units: CNC Milling remains optimal with multi-part tombstone fixtures.
- When production exceeds **2,500+ units**, switching to **Die Casting** or **Stamping** becomes economically superior: die tooling ($16,000) amortizes to <$6/unit while cycle time drops from minutes to seconds per piece.`;
    } else {
      response = `Here is the current manufacturing summary for **${dimensions.partName}**:
- Dimensions & Geometry: ${dimensions.geometryType} (${dimensions.length || dimensions.outerDiameter} x ${dimensions.width || dimensions.thickness || '-'} x ${dimensions.height || '-'} mm)
- Material: ${material?.name} (${calculation.rawMaterial.netPartMassKg.value.toFixed(3)} kg part mass)
- Batch Quantity: ${dimensions.quantity} units
- Total Unit Cost: **$${tc.totalCostPerUnit.value.toFixed(2)}**
- Recommended Selling Price: **$${biz.sellingPricePerUnit.value.toFixed(2)}** (Margin: ${biz.grossMarginPct.value}%)
- Break-Even: **${biz.breakEvenQuantity.value ?? 'No break-even'} units**
Ask me specific questions regarding material trade-offs, cost drivers, or volume scaling!`;
    }

    return {
      response,
      groundedFactsCited: facts,
      provider: 'Rule-Based Fallback' as const
    };
  }
}

import {
  PartDimensions,
  MaterialProperties,
  MachiningCostAssumptions,
  RawMaterialCostResult,
  MachiningCostResult,
  TotalCostBreakdown,
  BusinessMetrics,
  QuantityTierComparison,
  ChartDataPoint,
  ProcessComparisonItem,
  ManufacturingProcessType,
  LabeledValue,
  FullCalculationResult,
  ParadigmEvaluation,
  StrategicManufacturingParadigm
} from './types';
import { PROCESS_PROFILES } from './processes';

export interface CalculationInput {
  dimensions: PartDimensions;
  material: MaterialProperties;
  rawPricePerKg: number;
  rawPriceOrigin: 'Manual Input' | 'Live Data' | 'Assumption';
  priceSource?: string;
  priceTimestamp?: string;
  machiningAssumptions: MachiningCostAssumptions;
  selectedProcess?: ManufacturingProcessType;
  customMachiningAllowancePct?: number;
  targetSellingPriceOverride?: number;
  targetMarginPct?: number;
}

export function computeGeometryMetrics(dimensions: PartDimensions): {
  grossVolumeMm3: number;
  netVolumeMm3: number;
  surfaceAreaMm2: number;
  boundingBoxMm: { length: number; width: number; height: number };
} {
  const {
    geometryType,
    length = 100,
    width = 50,
    height = 25,
    diameter = 40,
    thickness = 5,
    shaftDiameter,
    outerDiameter,
    innerDiameter,
    customVolumeMm3,
    holeCount = 0,
    holeDiameter = 0,
    holeDepth = 0,
    pocketCount = 0,
    pocketLength = 0,
    pocketWidth = 0,
    pocketDepth = 0
  } = dimensions;

  let grossVolumeMm3 = 0;
  let surfaceAreaMm2 = 0;
  let bbL = length;
  let bbW = width;
  let bbH = height;

  switch (geometryType) {
    case 'Block':
      bbL = Math.max(1, length);
      bbW = Math.max(1, width);
      bbH = Math.max(1, height);
      grossVolumeMm3 = bbL * bbW * bbH;
      surfaceAreaMm2 = 2 * (bbL * bbW + bbL * bbH + bbW * bbH);
      break;

    case 'Plate':
      bbL = Math.max(1, length);
      bbW = Math.max(1, width);
      bbH = Math.max(0.5, thickness);
      grossVolumeMm3 = bbL * bbW * bbH;
      surfaceAreaMm2 = 2 * (bbL * bbW + bbL * bbH + bbW * bbH);
      break;

    case 'Cylinder': {
      const d = Math.max(1, diameter);
      const l = Math.max(1, length);
      const r = d / 2;
      bbL = l;
      bbW = d;
      bbH = d;
      grossVolumeMm3 = Math.PI * r * r * l;
      surfaceAreaMm2 = 2 * Math.PI * r * r + 2 * Math.PI * r * l;
      break;
    }

    case 'Shaft': {
      const d = Math.max(1, shaftDiameter || diameter);
      const l = Math.max(1, length);
      const r = d / 2;
      bbL = l;
      bbW = d;
      bbH = d;
      grossVolumeMm3 = Math.PI * r * r * l;
      surfaceAreaMm2 = 2 * Math.PI * r * r + 2 * Math.PI * r * l;
      break;
    }

    case 'Tube': {
      const od = Math.max(2, outerDiameter || diameter);
      const th = Math.max(0.5, thickness);
      const id = innerDiameter !== undefined && innerDiameter > 0 ? innerDiameter : Math.max(0.1, od - 2 * th);
      const l = Math.max(1, length);
      const ro = od / 2;
      const ri = id / 2;
      bbL = l;
      bbW = od;
      bbH = od;
      grossVolumeMm3 = Math.PI * (ro * ro - ri * ri) * l;
      surfaceAreaMm2 = 2 * Math.PI * (ro * ro - ri * ri) + 2 * Math.PI * ro * l + 2 * Math.PI * ri * l;
      break;
    }

    case 'Custom':
    default:
      grossVolumeMm3 = customVolumeMm3 && customVolumeMm3 > 0 ? customVolumeMm3 : 100000;
      // Approximate bounding box as cube if custom
      const approxSide = Math.cbrt(grossVolumeMm3);
      bbL = approxSide;
      bbW = approxSide;
      bbH = approxSide;
      surfaceAreaMm2 = 6 * approxSide * approxSide;
      break;
  }

  // Deduct holes
  let holesVolume = 0;
  if (holeCount > 0 && holeDiameter > 0) {
    const effHoleDepth = holeDepth > 0 ? Math.min(holeDepth, bbH) : bbH;
    const holeRadius = holeDiameter / 2;
    holesVolume = holeCount * Math.PI * holeRadius * holeRadius * effHoleDepth;
  }

  // Deduct pockets
  let pocketsVolume = 0;
  if (pocketCount > 0 && pocketLength > 0 && pocketWidth > 0) {
    const effPocketDepth = pocketDepth > 0 ? Math.min(pocketDepth, bbH * 0.8) : bbH * 0.5;
    pocketsVolume = pocketCount * pocketLength * pocketWidth * effPocketDepth;
  }

  const netVolumeMm3 = Math.max(grossVolumeMm3 * 0.05, grossVolumeMm3 - holesVolume - pocketsVolume);

  return {
    grossVolumeMm3: Math.round(grossVolumeMm3 * 100) / 100,
    netVolumeMm3: Math.round(netVolumeMm3 * 100) / 100,
    surfaceAreaMm2: Math.round(surfaceAreaMm2 * 100) / 100,
    boundingBoxMm: {
      length: Math.round(bbL * 10) / 10,
      width: Math.round(bbW * 10) / 10,
      height: Math.round(bbH * 10) / 10
    }
  };
}

export function calculateRawMaterialCost(
  netVolumeMm3: number,
  material: MaterialProperties,
  rawPricePerKg: number,
  priceOrigin: 'Manual Input' | 'Live Data' | 'Assumption',
  priceSource?: string,
  priceTimestamp?: string,
  machiningAllowancePct: number = 15
): RawMaterialCostResult {
  const stockVolumeMm3 = netVolumeMm3 * (1 + machiningAllowancePct / 100);

  // Density in g/cm^3. Conversion: 1 cm^3 = 1,000 mm^3. 1 kg = 1,000 g.
  // Mass (kg) = Volume (mm^3) * Density (g/cm^3) * 1e-6
  const netPartMassKg = netVolumeMm3 * material.densityGPerCm3 * 1e-6;
  const stockMassKg = stockVolumeMm3 * material.densityGPerCm3 * 1e-6;
  const removedMassKg = Math.max(0, stockMassKg - netPartMassKg);

  const grossMaterialCost = stockMassKg * rawPricePerKg;
  const scrapCredit = removedMassKg * rawPricePerKg * (material.scrapValueRatio || 0.2);
  const netMaterialCost = Math.max(0, grossMaterialCost - scrapCredit);

  return {
    partVolumeMm3: { value: Math.round(netVolumeMm3 * 100) / 100, origin: 'Calculated' },
    machiningAllowancePct: { value: machiningAllowancePct, origin: 'Assumption' },
    stockVolumeMm3: { value: Math.round(stockVolumeMm3 * 100) / 100, origin: 'Calculated' },
    densityGPerCm3: { value: material.densityGPerCm3, origin: 'Assumption' },
    netPartMassKg: { value: Math.round(netPartMassKg * 1000) / 1000, origin: 'Calculated' },
    stockMassKg: { value: Math.round(stockMassKg * 1000) / 1000, origin: 'Calculated' },
    removedMassKg: { value: Math.round(removedMassKg * 1000) / 1000, origin: 'Calculated' },
    pricePerKg: {
      value: Math.round(rawPricePerKg * 100) / 100,
      origin: priceOrigin,
      source: priceSource,
      timestamp: priceTimestamp
    },
    grossMaterialCostPerUnit: { value: Math.round(grossMaterialCost * 100) / 100, origin: 'Calculated' },
    scrapCreditPerUnit: { value: Math.round(scrapCredit * 100) / 100, origin: 'Calculated' },
    netMaterialCostPerUnit: { value: Math.round(netMaterialCost * 100) / 100, origin: 'Calculated' }
  };
}

export function calculateMachiningCost(
  netVolumeMm3: number,
  stockVolumeMm3: number,
  surfaceAreaMm2: number,
  dimensions: PartDimensions,
  material: MaterialProperties,
  assumptions: MachiningCostAssumptions,
  processType: ManufacturingProcessType = 'CNC Milling'
): MachiningCostResult {
  const removedVolumeMm3 = Math.max(0, stockVolumeMm3 - netVolumeMm3);
  const mrr = Math.max(1000, material.mrrReferenceMm3PerMin || 35000);

  // 1. Roughing cycle time (minutes)
  const roughingMin = removedVolumeMm3 / mrr;

  // 2. Finishing cycle time
  const tolerance = dimensions.toleranceMm ?? 0.1;
  const finishRa = dimensions.surfaceFinishRaUm ?? 1.6;

  let toleranceFactor = 1.0;
  if (tolerance < 0.02) toleranceFactor = 2.2;
  else if (tolerance < 0.05) toleranceFactor = 1.5;
  else if (tolerance > 0.2) toleranceFactor = 0.7;

  let finishFactor = 1.0;
  if (finishRa < 0.8) finishFactor = 2.0;
  else if (finishRa < 1.6) finishFactor = 1.3;
  else if (finishRa > 3.2) finishFactor = 0.7;

  // Area sweep finishing time (assume 10,000 mm^2 per minute finishing pass)
  const finishingMin = (surfaceAreaMm2 / 10000) * toleranceFactor * finishFactor;

  // 3. Feature operations time
  const holeCount = dimensions.holeCount ?? 0;
  const holeDepth = dimensions.holeDepth ?? 10;
  // Drilling cycle: ~0.15 min per 10mm depth + 0.1 min positioning/tool switch
  const drillingMin = holeCount * ((holeDepth / 10) * 0.15 + 0.1);

  const pocketCount = dimensions.pocketCount ?? 0;
  const pocketMin = pocketCount * 1.5; // average pocket clearing time

  const featureOperationsMin = drillingMin + pocketMin;

  // Total cycle time per unit
  const processMult = PROCESS_PROFILES[processType]?.variableCostMultiplier ?? 1.0;
  const baseCycleTimeMin = (roughingMin + finishingMin + featureOperationsMin) * processMult;
  const totalCycleTimeMin = Math.max(0.5, baseCycleTimeMin);
  const totalCycleTimeHours = totalCycleTimeMin / 60;

  const qty = Math.max(1, dimensions.quantity || 1);

  // Direct machine cost
  const machineCostPerUnit = totalCycleTimeHours * assumptions.machineHourlyRateUsd;

  // Setup allocation per unit (amortized over order batch quantity)
  const setupAllocationPerUnit = (assumptions.setupTimeHours * assumptions.machineHourlyRateUsd) / qty;

  // Labour cost per unit (both cycle labour and setup labour amortized)
  const labourHoursPerUnit = (totalCycleTimeHours + assumptions.setupTimeHours / qty) * assumptions.operatorRatio;
  const labourCostPerUnit = labourHoursPerUnit * assumptions.labourHourlyRateUsd;

  // Tooling cost per unit
  const toolWearFraction = totalCycleTimeMin / Math.max(10, assumptions.toolLifeMinutes);
  const toolingCostPerUnit = toolWearFraction * assumptions.toolingCostPerPartUsd;

  // Energy cost per unit
  const energyCostPerUnit = assumptions.energyConsumptionKw * totalCycleTimeHours * assumptions.energyRatePerKwhUsd;

  // Finishing & Inspection
  const finishingCostPerUnit = assumptions.finishingCostPerPartUsd;
  const inspectionMultiplier = tolerance < 0.05 ? 1.5 : 1.0;
  const inspectionCostPerUnit = assumptions.inspectionCostPerPartUsd * inspectionMultiplier;

  // Subtotal before scrap and overhead
  const directSubtotal =
    machineCostPerUnit +
    setupAllocationPerUnit +
    labourCostPerUnit +
    toolingCostPerUnit +
    energyCostPerUnit +
    finishingCostPerUnit +
    inspectionCostPerUnit;

  // Scrap cost
  const scrapCostPerUnit = directSubtotal * (assumptions.scrapRatePct / 100);

  // Overhead
  const overheadCostPerUnit = (directSubtotal + scrapCostPerUnit) * (assumptions.overheadRatePct / 100);

  const totalManufacturingCostPerUnit = directSubtotal + scrapCostPerUnit + overheadCostPerUnit;

  return {
    mrrUsedMm3PerMin: { value: Math.round(mrr), origin: 'Assumption' },
    roughingCycleTimeMin: { value: Math.round(roughingMin * 100) / 100, origin: 'Calculated' },
    finishingCycleTimeMin: { value: Math.round(finishingMin * 100) / 100, origin: 'Calculated' },
    featureOperationsTimeMin: { value: Math.round(featureOperationsMin * 100) / 100, origin: 'Calculated' },
    totalCycleTimeMin: { value: Math.round(totalCycleTimeMin * 100) / 100, origin: 'Calculated' },
    totalCycleTimeHours: { value: Math.round(totalCycleTimeHours * 1000) / 1000, origin: 'Calculated' },

    machineCostPerUnit: { value: Math.round(machineCostPerUnit * 100) / 100, origin: 'Calculated' },
    setupAllocationPerUnit: { value: Math.round(setupAllocationPerUnit * 100) / 100, origin: 'Calculated' },
    labourCostPerUnit: { value: Math.round(labourCostPerUnit * 100) / 100, origin: 'Calculated' },
    toolingCostPerUnit: { value: Math.round(toolingCostPerUnit * 100) / 100, origin: 'Calculated' },
    energyCostPerUnit: { value: Math.round(energyCostPerUnit * 100) / 100, origin: 'Calculated' },
    finishingCostPerUnit: { value: Math.round(finishingCostPerUnit * 100) / 100, origin: 'Assumption' },
    inspectionCostPerUnit: { value: Math.round(inspectionCostPerUnit * 100) / 100, origin: 'Calculated' },
    scrapCostPerUnit: { value: Math.round(scrapCostPerUnit * 100) / 100, origin: 'Calculated' },
    overheadCostPerUnit: { value: Math.round(overheadCostPerUnit * 100) / 100, origin: 'Calculated' },

    totalManufacturingCostPerUnit: {
      value: Math.round(totalManufacturingCostPerUnit * 100) / 100,
      origin: 'Calculated'
    }
  };
}

export function calculateTotalCost(
  rawResult: RawMaterialCostResult,
  machiningResult: MachiningCostResult,
  assumptions: MachiningCostAssumptions,
  quantity: number
): TotalCostBreakdown {
  const qty = Math.max(1, quantity);

  const rawCost = rawResult.netMaterialCostPerUnit.value;
  const machCost = machiningResult.machineCostPerUnit.value;
  const setupCost = machiningResult.setupAllocationPerUnit.value;
  const labourCost = machiningResult.labourCostPerUnit.value;
  const toolingCost = machiningResult.toolingCostPerUnit.value;
  const energyCost = machiningResult.energyCostPerUnit.value;
  const finishingCost = machiningResult.finishingCostPerUnit.value;
  const inspectionCost = machiningResult.inspectionCostPerUnit.value;
  const scrapCost = machiningResult.scrapCostPerUnit.value;
  const overheadCost = machiningResult.overheadCostPerUnit.value;

  const totalCostPerUnit =
    rawCost +
    machCost +
    setupCost +
    labourCost +
    toolingCost +
    energyCost +
    finishingCost +
    inspectionCost +
    scrapCost +
    overheadCost;

  // Fixed costs: total setup machine + total setup labour
  const setupMachineTotal = assumptions.setupTimeHours * assumptions.machineHourlyRateUsd;
  const setupLabourTotal = assumptions.setupTimeHours * assumptions.labourHourlyRateUsd * assumptions.operatorRatio;
  const fixedCostsTotal = setupMachineTotal + setupLabourTotal;

  // Variable cost per unit = Total Cost - (Fixed Costs / Qty)
  const variableCostPerUnit = Math.max(0, totalCostPerUnit - fixedCostsTotal / qty);
  const totalOrderCost = totalCostPerUnit * qty;

  return {
    rawMaterialCostPerUnit: { value: Math.round(rawCost * 100) / 100, origin: 'Calculated' },
    machiningCostPerUnit: { value: Math.round(machCost * 100) / 100, origin: 'Calculated' },
    setupAllocationPerUnit: { value: Math.round(setupCost * 100) / 100, origin: 'Calculated' },
    labourCostPerUnit: { value: Math.round(labourCost * 100) / 100, origin: 'Calculated' },
    toolingCostPerUnit: { value: Math.round(toolingCost * 100) / 100, origin: 'Calculated' },
    energyCostPerUnit: { value: Math.round(energyCost * 100) / 100, origin: 'Calculated' },
    finishingCostPerUnit: { value: Math.round(finishingCost * 100) / 100, origin: 'Assumption' },
    inspectionCostPerUnit: { value: Math.round(inspectionCost * 100) / 100, origin: 'Calculated' },
    scrapCostPerUnit: { value: Math.round(scrapCost * 100) / 100, origin: 'Calculated' },
    overheadCostPerUnit: { value: Math.round(overheadCost * 100) / 100, origin: 'Calculated' },
    totalCostPerUnit: { value: Math.round(totalCostPerUnit * 100) / 100, origin: 'Calculated' },

    totalOrderCost: { value: Math.round(totalOrderCost * 100) / 100, origin: 'Calculated' },
    fixedCostsTotal: { value: Math.round(fixedCostsTotal * 100) / 100, origin: 'Calculated' },
    variableCostPerUnit: { value: Math.round(variableCostPerUnit * 100) / 100, origin: 'Calculated' }
  };
}

export function calculateBusinessMetrics(
  totalCostBreakdown: TotalCostBreakdown,
  quantity: number,
  targetSellingPriceOverride?: number,
  targetMarginPct: number = 30
): BusinessMetrics {
  const qty = Math.max(1, quantity);
  const totalCostPerUnit = totalCostBreakdown.totalCostPerUnit.value;
  const variableCostPerUnit = totalCostBreakdown.variableCostPerUnit.value;
  const fixedCostTotal = totalCostBreakdown.fixedCostsTotal.value;

  let sellingPrice: number;
  let sellingPriceOrigin: 'Manual Input' | 'Calculated';

  if (targetSellingPriceOverride !== undefined && targetSellingPriceOverride > 0) {
    sellingPrice = targetSellingPriceOverride;
    sellingPriceOrigin = 'Manual Input';
  } else {
    // Recommend selling price from desired target margin
    const marginFrac = Math.min(0.9, Math.max(0.05, targetMarginPct / 100));
    sellingPrice = totalCostPerUnit / (1 - marginFrac);
    sellingPriceOrigin = 'Calculated';
  }

  const profitPerUnit = sellingPrice - totalCostPerUnit;
  const grossMarginPct = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;
  const totalRevenue = sellingPrice * qty;
  const totalProfit = profitPerUnit * qty;
  const totalCost = totalCostBreakdown.totalOrderCost.value;
  const roiPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  // Break-even analysis: Fixed Cost / (Selling Price - Variable Cost)
  const contributionPerUnit = sellingPrice - variableCostPerUnit;
  let breakEvenQty: number | null = null;
  let breakEvenStatus: BusinessMetrics['breakEvenStatus'] = 'Calculated';

  if (contributionPerUnit <= 0) {
    breakEvenQty = null;
    breakEvenStatus = 'No break-even at this price (Loss per unit)';
  } else if (fixedCostTotal <= 0) {
    breakEvenQty = 1;
  } else {
    breakEvenQty = Math.ceil(fixedCostTotal / contributionPerUnit);
  }

  return {
    sellingPricePerUnit: {
      value: Math.round(sellingPrice * 100) / 100,
      origin: sellingPriceOrigin
    },
    totalCostPerUnit: { value: Math.round(totalCostPerUnit * 100) / 100, origin: 'Calculated' },
    profitPerUnit: { value: Math.round(profitPerUnit * 100) / 100, origin: 'Calculated' },
    grossMarginPct: { value: Math.round(grossMarginPct * 10) / 10, origin: 'Calculated' },
    breakEvenQuantity: { value: breakEvenQty, origin: 'Calculated' },
    breakEvenStatus,
    totalRevenueAtQty: { value: Math.round(totalRevenue * 100) / 100, origin: 'Calculated' },
    totalProfitAtQty: { value: Math.round(totalProfit * 100) / 100, origin: 'Calculated' },
    returnOnInvestmentPct: { value: Math.round(roiPct * 10) / 10, origin: 'Calculated' }
  };
}

export function rankProcesses(
  dimensions: PartDimensions,
  material: MaterialProperties,
  quantity: number
): ProcessComparisonItem[] {
  const isSheet = dimensions.geometryType === 'Plate' && (dimensions.thickness || 5) <= 15;
  const isRotational = dimensions.geometryType === 'Cylinder' || dimensions.geometryType === 'Shaft';
  const isPlastic = material.category === 'Engineering Plastics' || material.category === 'High-Performance Polymers' || material.category === 'Composite Polymers' || Boolean(material.isPolymer);
  const isMetal = !isPlastic;
  const tolerance = dimensions.toleranceMm ?? 0.1;
  const surfaceFinishRa = dimensions.surfaceFinishRaUm ?? 1.6;

  const result: ProcessComparisonItem[] = [];

  for (const [procKey, profile] of Object.entries(PROCESS_PROFILES)) {
    const process = procKey as ManufacturingProcessType;
    let suitabilityScore = 75;
    let isViable = true;
    let unviabilityReason: string | undefined;

    // Filter checks
    if (profile.rotationalOnly && !isRotational) {
      suitabilityScore -= 50;
      isViable = false;
      unviabilityReason = 'Process is strictly designed for rotational/axisymmetric parts.';
    }

    if (profile.sheetOnly && !isSheet) {
      suitabilityScore -= 45;
      isViable = false;
      unviabilityReason = 'Process requires thin plate or sheet geometry.';
    }

    if (profile.metalsOnly && !isMetal) {
      suitabilityScore -= 60;
      isViable = false;
      unviabilityReason = 'Process cannot accommodate polymer materials.';
    }

    if (profile.plasticsOnly && !isPlastic) {
      suitabilityScore -= 60;
      isViable = false;
      unviabilityReason = 'Injection molding requires thermoplastic polymers.';
    }

    // Tolerance & finish capability
    if (tolerance < profile.achievableToleranceMm) {
      suitabilityScore -= 20;
    }
    if (surfaceFinishRa < profile.achievableSurfaceFinishRaUm) {
      suitabilityScore -= 15;
    }

    // Quantity suitability scoring
    if (quantity < profile.bestQuantityMin) {
      const penalty = Math.min(40, (profile.bestQuantityMin - quantity) / 50);
      suitabilityScore -= penalty;
    } else if (quantity > profile.bestQuantityMax) {
      suitabilityScore -= 25;
    } else {
      suitabilityScore += 15;
    }

    // Polymer / 3D Printing / Injection Molding dynamics
    if (isPlastic) {
      if (process === 'Additive Manufacturing') {
        if (quantity <= 100) {
          suitabilityScore += 18; // 3D printing is premier low-volume polymer method
        }
        if (material.id === 'peek' || material.id === 'cf-nylon-pa12') {
          suitabilityScore += 12; // High-performance polymer 3D printing sweet spot
        }
      } else if (process === 'Injection Molding') {
        if (quantity >= 500) {
          suitabilityScore += 22; // High-volume polymer economy
        }
      }
    }

    // Calculate approximate economics for this process
    const toolingCost = profile.baseToolingCostUsd;
    const setupCost = profile.baseSetupCostUsd;
    const baseUnitVar = 25 * profile.variableCostMultiplier * (material.machinabilityIndex ? 100 / material.machinabilityIndex : 1.0);
    const unitVariableCost = Math.max(2, baseUnitVar);
    const totalCostAtQuantity = toolingCost + setupCost + unitVariableCost * quantity;
    const totalCostPerUnit = totalCostAtQuantity / quantity;

    suitabilityScore = Math.max(5, Math.min(98, Math.round(suitabilityScore)));

    let productionSuitability: ProcessComparisonItem['productionSuitability'] = 'Feasible';
    if (!isViable) productionSuitability = 'Unsuitable';
    else if (suitabilityScore >= 80) productionSuitability = 'Ideal';
    else if (suitabilityScore <= 45) productionSuitability = 'Suboptimal';

    result.push({
      process,
      suitabilityScore,
      initialToolingCost: toolingCost,
      setupCost,
      unitVariableCost: Math.round(unitVariableCost * 100) / 100,
      totalCostAtQuantity: Math.round(totalCostAtQuantity * 100) / 100,
      totalCostPerUnit: Math.round(totalCostPerUnit * 100) / 100,
      cycleTimeMinutes: Math.round(profile.standardCycleTimeMinPerDm3 * 1.2),
      achievableToleranceMm: profile.achievableToleranceMm,
      achievableSurfaceFinishRa: profile.achievableSurfaceFinishRaUm,
      isViableForGeometry: isViable,
      unviabilityReason,
      productionSuitability,
      notes: profile.description
    });
  }

  // Sort descending by suitability score
  return result.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

export function calculateQuantityTiers(
  dimensions: PartDimensions,
  material: MaterialProperties,
  assumptions: MachiningCostAssumptions,
  sellingPricePerUnit: number
): QuantityTierComparison[] {
  const tiers: { tierName: QuantityTierComparison['tierName']; quantity: number }[] = [
    { tierName: 'Prototype (1-10)', quantity: 5 },
    { tierName: 'Small Batch (10-100)', quantity: 50 },
    { tierName: 'Medium Batch (100-1,000)', quantity: 500 },
    { tierName: 'Large Batch (1,000-10,000+)', quantity: 5000 }
  ];

  return tiers.map(tier => {
    const rankings = rankProcesses({ ...dimensions, quantity: tier.quantity }, material, tier.quantity);
    const bestProcess = rankings.find(r => r.isViableForGeometry) || rankings[0];

    const unitCost = bestProcess.totalCostPerUnit;
    const totalCost = unitCost * tier.quantity;
    const unitProfit = sellingPricePerUnit - unitCost;
    const marginPct = sellingPricePerUnit > 0 ? (unitProfit / sellingPricePerUnit) * 100 : 0;

    // Baseline CNC milling comparison
    const cncRank = rankings.find(r => r.process === 'CNC Milling') || bestProcess;
    const baselineCncCost = cncRank.totalCostPerUnit;
    const savingsVsPrimaryProcessPct = baselineCncCost > unitCost
      ? Math.round(((baselineCncCost - unitCost) / baselineCncCost) * 100)
      : 0;

    return {
      tierName: tier.tierName,
      quantity: tier.quantity,
      optimalProcess: bestProcess.process,
      unitCost: Math.round(unitCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      sellingPrice: Math.round(sellingPricePerUnit * 100) / 100,
      unitProfit: Math.round(unitProfit * 100) / 100,
      marginPct: Math.round(marginPct * 10) / 10,
      breakEvenAchieved: unitProfit > 0,
      savingsVsPrimaryProcessPct
    };
  });
}

export function generateChartData(
  totalCostBreakdown: TotalCostBreakdown,
  sellingPricePerUnit: number,
  targetQuantity: number
): ChartDataPoint[] {
  const fixedCost = totalCostBreakdown.fixedCostsTotal.value;
  const variableCost = totalCostBreakdown.variableCostPerUnit.value;

  const points: ChartDataPoint[] = [];
  // Sample points around 1, targetQty, 2x targetQty, etc.
  const maxQty = Math.max(50, Math.ceil(targetQuantity * 2.5));
  const step = Math.max(1, Math.floor(maxQty / 20));

  for (let q = 1; q <= maxQty; q += step) {
    const totalCost = fixedCost + variableCost * q;
    const totalRevenue = sellingPricePerUnit * q;
    const profitLoss = totalRevenue - totalCost;
    const unitCost = totalCost / q;
    const unitProfit = sellingPricePerUnit - unitCost;
    const marginPct = sellingPricePerUnit > 0 ? (unitProfit / sellingPricePerUnit) * 100 : 0;

    points.push({
      quantity: q,
      fixedCost: Math.round(fixedCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      profitLoss: Math.round(profitLoss * 100) / 100,
      unitCost: Math.round(unitCost * 100) / 100,
      unitProfit: Math.round(unitProfit * 100) / 100,
      marginPct: Math.round(marginPct * 10) / 10
    });
  }

  return points;
}

export function evaluateManufacturingParadigm(
  dimensions: PartDimensions,
  material: MaterialProperties,
  quantity: number,
  totalCost: TotalCostBreakdown,
  processRankings: ProcessComparisonItem[]
): ParadigmEvaluation {
  const qty = Math.max(1, quantity);
  const isPolymer = material.isPolymer || material.category === 'Engineering Plastics' || material.category === 'High-Performance Polymers' || material.category === 'Composite Polymers';
  const isHighPerformancePolymer = material.category === 'High-Performance Polymers' || material.id === 'peek' || material.id === 'ptfe-teflon';
  const isCompositePolymer = material.category === 'Composite Polymers' || material.id === 'cf-nylon-pa12';

  const tolerance = dimensions.toleranceMm ?? 0.1;
  const finishRa = dimensions.surfaceFinishRaUm ?? 1.6;
  const hasComplexCavities = (dimensions.pocketCount || 0) > 2 || (dimensions.holeCount || 0) > 4;

  let recommendedParadigm: StrategicManufacturingParadigm;
  let score = 85;
  let reasoning = '';
  const keyDrivers: string[] = [];
  const tradeoffs: string[] = [];

  // Decision Tree for 4 Strategic Paradigms:
  // 1. Metal + Machining
  // 2. Plastic + Injection Molding
  // 3. Plastic + 3D Printing
  // 4. Advanced Polymer + 3D Printing

  if (isHighPerformancePolymer || isCompositePolymer) {
    if (qty >= 2500 && isHighPerformancePolymer && material.id !== 'ptfe-teflon') {
      recommendedParadigm = 'Plastic + Injection Molding';
      score = 88;
      reasoning = `High production volume (${qty} units) in ${material.name} justifies hardened high-temperature tooling, unlocking maximum amortized cost efficiency with extreme thermal capability.`;
      keyDrivers.push(`Production scale (${qty} pcs) overcomes high mold tooling NRE`);
      keyDrivers.push(`High-temperature polymer resistance (${material.continuousServiceTempC ?? 250}°C)`);
      tradeoffs.push('Substantial upfront tool steel mold capital required (₹8,00,000+)');
    } else {
      recommendedParadigm = 'Advanced Polymer + 3D Printing';
      score = 94;
      reasoning = `Advanced high-performance polymer (${material.name}) paired with industrial Additive Manufacturing (FDM/SLS) eliminates expensive hard tooling, provides 60% mass reduction vs metals, and handles extreme operating conditions (up to ${material.continuousServiceTempC ?? 250}°C).`;
      keyDrivers.push(`Zero tooling investment with high-value composite/high-temp polymer (${material.name})`);
      keyDrivers.push(`Lightweight structural capability with ${material.strengthToWeightRatio?.toFixed(1) ?? '112'} MPa/(g/cm³) specific strength`);
      keyDrivers.push(`Extreme chemical inertness and continuous service temperature`);
      tradeoffs.push('Higher raw filament/powder rate per kg compared to standard ABS/PP pellets');
      tradeoffs.push('Slower cycle time per unit compared to high-speed molding');
    }
  } else if (isPolymer) {
    if (qty >= 500) {
      recommendedParadigm = 'Plastic + Injection Molding';
      score = 96;
      reasoning = `For ${material.name} at batch volume of ${qty} units, Injection Molding is the optimal commercial paradigm. Cycle time drops to seconds per part and per-unit manufacturing cost plummets.`;
      keyDrivers.push(`High production volume (${qty} units) amortizes mold tooling to negligible levels`);
      keyDrivers.push(`Rapid cycle times (<30 seconds) and consistent high-gloss/textured surface finish`);
      keyDrivers.push(`60–75% mass savings and superior corrosion immunity vs metal counterparts`);
      tradeoffs.push('Initial tooling lead time (4–6 weeks for CNC tool cavity manufacturing)');
      tradeoffs.push('Design changes become costly once steel mold blocks are cut');
    } else {
      recommendedParadigm = 'Plastic + 3D Printing';
      score = 92;
      reasoning = `For low-to-medium production (${qty} units) in ${material.name}, 3D Printing (Additive Manufacturing) eliminates ₹3.5L+ in mold tooling, supports rapid design revisions, and provides direct production readiness within 24–48 hours.`;
      keyDrivers.push(`Zero tooling cost (₹0 NRE), avoiding premature mold capital expenditure`);
      keyDrivers.push(`Rapid on-demand fabrication and agile revision cycle`);
      keyDrivers.push(`Feasible for hollow, lattice, or enclosed functional geometries`);
      tradeoffs.push('Higher per-unit cycle time compared to high-volume injection cycle');
      tradeoffs.push(`Layer line surface roughness (Ra ~${finishRa > 3 ? finishRa : 3.2} µm) may require vapor smoothing or sanding`);
    }
  } else {
    // Metal (Aluminum, Steel, Stainless, Titanium, Brass)
    recommendedParadigm = 'Metal + Machining';
    score = 90;
    reasoning = `Component requires high modulus, tensile strength (${material.tensileStrengthMpa} MPa), and tight machining tolerances (±${tolerance} mm) that favor CNC subtractive manufacturing in ${material.name}.`;
    keyDrivers.push(`High load-bearing capacity (${material.yieldStrengthMpa} MPa yield strength)`);
    keyDrivers.push(`Precision dimensional stability down to ±${tolerance} mm`);
    keyDrivers.push(`Standard commercial metal stock readily available with established CNC feeds and speeds`);
    tradeoffs.push(`Substantially higher part mass (${material.densityGPerCm3} g/cm³ vs ~1.05 g/cm³ for polymers)`);
    tradeoffs.push('Higher material wastage and cutting tool depreciation per unit');
  }

  // Material Mass & Cost Comparisons:
  const volMm3 = dimensions.customVolumeMm3 || (dimensions.length && dimensions.width && dimensions.height ? dimensions.length * dimensions.width * dimensions.height : 100000);
  const partMassKg = (volMm3 * material.densityGPerCm3 * 1e-6);
  const alMassKg = (volMm3 * 2.70 * 1e-6);
  const steelMassKg = (volMm3 * 7.87 * 1e-6);

  let massComparison = '';
  if (isPolymer) {
    const savingsVsAl = Math.max(10, Math.round((1 - partMassKg / Math.max(0.001, alMassKg)) * 100));
    const savingsVsSteel = Math.max(20, Math.round((1 - partMassKg / Math.max(0.001, steelMassKg)) * 100));
    massComparison = `${partMassKg.toFixed(3)} kg in ${material.name} (${savingsVsAl}% lighter than Aluminum, ${savingsVsSteel}% lighter than Steel).`;
  } else {
    const polymerMassKg = (volMm3 * 1.14 * 1e-6);
    const excessPct = Math.round((partMassKg / Math.max(0.001, polymerMassKg) - 1) * 100);
    massComparison = `${partMassKg.toFixed(3)} kg in ${material.name} (${excessPct}% heavier than engineering polymer alternative).`;
  }

  const rawCostUnit = totalCost.rawMaterialCostPerUnit.value;
  const costComparison = `Raw stock cost is ₹${rawCostUnit.toFixed(2)}/unit at ₹${material.typicalRawPricePerKg}/kg declared rate.`;

  const strengthToWeightComparison = material.strengthToWeightRatio
    ? `${material.name} delivers ${material.strengthToWeightRatio.toFixed(1)} MPa/(g/cm³) specific strength.`
    : `Tensile yield of ${material.yieldStrengthMpa} MPa at density ${material.densityGPerCm3} g/cm³.`;

  const temperatureComparison = `Max continuous operating temperature: ${material.continuousServiceTempC ?? 100}°C.`;
  const chemicalWearComparison = `Friction coefficient: ${material.frictionCoefficient ?? 0.35} (${material.wearResistanceRating ?? 'Moderate'} wear rating); Corrosion: ${material.corrosionResistance}.`;

  const toolingInvestmentComparison = recommendedParadigm.includes('3D Printing')
    ? '₹0 hard tooling investment; direct CAD-to-part production.'
    : recommendedParadigm.includes('Injection Molding')
    ? '₹3,50,000–₹6,50,000 hard tooling investment; amortizes rapidly over 1,000+ units.'
    : '₹15,000–₹35,000 soft modular CNC fixturing.';

  const crossoverVolumeBreakEven = isPolymer
    ? (qty < 300
        ? `Current batch (${qty} pcs) is firmly in 3D Printing sweet spot (crossover with Injection Molding occurs at ~350–500 units).`
        : `Current batch (${qty} pcs) exceeds the crossover threshold (~400 units), making Injection Molding 60–80% cheaper per unit.`)
    : `Machining is optimal for ${qty} units; casting/forging crossover occurs at 2,500+ units.`;

  const geometryFeasibility = hasComplexCavities
    ? 'Contains internal pockets/features that excel in Additive Manufacturing or 5-axis machining.'
    : 'Standard geometric contours suitable for 3-axis machining, molding, or rapid additive deposition.';

  const leadTimeComparison = recommendedParadigm.includes('3D Printing')
    ? '24–48 hours rapid turnaround from CAD upload.'
    : recommendedParadigm.includes('Injection Molding')
    ? '4–6 weeks tooling fabrication + 2–3 days molding cycle.'
    : '3–5 business days for CNC setup, CAM programming, and cutting.';

  const alternatives: ParadigmEvaluation['alternatives'] = [];
  if (recommendedParadigm === 'Metal + Machining') {
    alternatives.push({
      paradigm: 'Advanced Polymer + 3D Printing',
      whenToSwitch: 'If part weight reduction (>60%) or chemical washdown immunity is required without sacrificing tensile integrity (using CF-Nylon or PEEK).',
      estimatedCostDeltaPct: -15
    });
    alternatives.push({
      paradigm: 'Plastic + Injection Molding',
      whenToSwitch: 'If production volume scales above 2,500 units and mechanical stress is under 80 MPa.',
      estimatedCostDeltaPct: -65
    });
  } else if (recommendedParadigm === 'Plastic + 3D Printing') {
    alternatives.push({
      paradigm: 'Plastic + Injection Molding',
      whenToSwitch: 'When production quantity exceeds 400–500 units to unlock 70%+ unit cost savings.',
      estimatedCostDeltaPct: -70
    });
    alternatives.push({
      paradigm: 'Metal + Machining',
      whenToSwitch: 'If operating load exceeds polymer limits or continuous service temp exceeds 120°C.',
      estimatedCostDeltaPct: 45
    });
  } else if (recommendedParadigm === 'Plastic + Injection Molding') {
    alternatives.push({
      paradigm: 'Plastic + 3D Printing',
      whenToSwitch: 'During pilot testing, bridge manufacturing, or if batch is split into runs under 200 units.',
      estimatedCostDeltaPct: 35
    });
    alternatives.push({
      paradigm: 'Metal + Machining',
      whenToSwitch: 'If design requires extreme rigidity, high precision threads, or zero upfront mold NRE.',
      estimatedCostDeltaPct: 120
    });
  } else {
    alternatives.push({
      paradigm: 'Metal + Machining',
      whenToSwitch: 'If raw stock budget is constrained and high-modulus metal (Al 6061 or SS 304) is acceptable despite weight penalty.',
      estimatedCostDeltaPct: -25
    });
    alternatives.push({
      paradigm: 'Plastic + Injection Molding',
      whenToSwitch: 'If high-performance polymer batch scales past 1,500 units and tooling investment (₹8L+) is funded.',
      estimatedCostDeltaPct: -55
    });
  }

  return {
    recommendedParadigm,
    score,
    confidencePct: 94,
    reasoning,
    keyDrivers,
    tradeoffs,
    materialComparison: {
      selectedCategory: isHighPerformancePolymer ? 'Advanced Polymer' : isCompositePolymer ? 'Composite' : isPolymer ? 'Plastic' : 'Metal',
      massComparison,
      costComparison,
      strengthToWeightComparison,
      temperatureComparison,
      chemicalWearComparison
    },
    processComparison: {
      recommendedProcess: recommendedParadigm.includes('3D Printing')
        ? 'Additive Manufacturing'
        : recommendedParadigm.includes('Injection Molding')
        ? 'Injection Molding'
        : 'CNC Milling',
      toolingInvestmentComparison,
      crossoverVolumeBreakEven,
      geometryFeasibility,
      leadTimeComparison
    },
    alternatives
  };
}

export function runFullCalculation(input: CalculationInput): FullCalculationResult {
  const {
    dimensions,
    material,
    rawPricePerKg,
    rawPriceOrigin,
    priceSource,
    priceTimestamp,
    machiningAssumptions,
    selectedProcess = 'CNC Milling',
    customMachiningAllowancePct = 15,
    targetSellingPriceOverride,
    targetMarginPct = 30
  } = input;

  // 1. Geometry
  const geometry = computeGeometryMetrics(dimensions);

  // 2. Raw Material Cost
  const rawMaterial = calculateRawMaterialCost(
    geometry.netVolumeMm3,
    material,
    rawPricePerKg,
    rawPriceOrigin,
    priceSource,
    priceTimestamp,
    customMachiningAllowancePct
  );

  // 3. Machining Cost
  const machining = calculateMachiningCost(
    geometry.netVolumeMm3,
    rawMaterial.stockVolumeMm3.value,
    geometry.surfaceAreaMm2,
    dimensions,
    material,
    machiningAssumptions,
    selectedProcess
  );

  // 4. Total Cost Breakdown
  const totalCost = calculateTotalCost(
    rawMaterial,
    machining,
    machiningAssumptions,
    dimensions.quantity
  );

  // 5. Business Metrics
  const business = calculateBusinessMetrics(
    totalCost,
    dimensions.quantity,
    targetSellingPriceOverride,
    targetMarginPct
  );

  // 6. Process Rankings
  const processRankings = rankProcesses(dimensions, material, dimensions.quantity);

  // 7. Quantity Tiers
  const quantityTiers = calculateQuantityTiers(
    dimensions,
    material,
    machiningAssumptions,
    business.sellingPricePerUnit.value
  );

  // 8. Chart Data
  const chartData = generateChartData(
    totalCost,
    business.sellingPricePerUnit.value,
    dimensions.quantity
  );

  // 9. Strategic Manufacturing Paradigm Evaluation
  const paradigmEvaluation = evaluateManufacturingParadigm(
    dimensions,
    material,
    dimensions.quantity,
    totalCost,
    processRankings
  );

  return {
    rawMaterial,
    machining,
    totalCost,
    business,
    quantityTiers,
    processRankings,
    chartData,
    paradigmEvaluation
  };
}

export const DEFAULT_MACHINING_ASSUMPTIONS: MachiningCostAssumptions = {
  machineType: '3-Axis CNC Mill',
  machineHourlyRateUsd: 2500, // INR ₹2,500/hr
  setupTimeHours: 1.5,
  labourHourlyRateUsd: 600, // INR ₹600/hr
  operatorRatio: 0.5,
  toolingCostPerPartUsd: 350, // INR ₹350/part
  toolLifeMinutes: 90,
  energyConsumptionKw: 12,
  energyRatePerKwhUsd: 10.5, // INR ₹10.50/kWh
  finishingCostPerPartUsd: 250, // INR ₹250/part
  inspectionCostPerPartUsd: 400, // INR ₹400/part
  scrapRatePct: 3.0,
  overheadRatePct: 15.0
};

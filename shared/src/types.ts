export type GeometryType = 'Block' | 'Plate' | 'Cylinder' | 'Shaft' | 'Tube' | 'Custom';

export type ValueOrigin = 'Calculated' | 'Manual Input' | 'Assumption' | 'Live Data' | 'AI Recommendation';

export interface LabeledValue<T> {
  value: T;
  origin: ValueOrigin;
  source?: string;
  timestamp?: string;
  notes?: string;
}

export interface PartDimensions {
  geometryType: GeometryType;
  partName: string;
  // Dimensions in millimeters (mm)
  length?: number;
  width?: number;
  height?: number;
  diameter?: number;
  thickness?: number;
  shaftDiameter?: number;
  outerDiameter?: number;
  innerDiameter?: number;
  customVolumeMm3?: number;

  // Features
  holeCount?: number;
  holeDiameter?: number;
  holeDepth?: number;
  pocketCount?: number;
  pocketLength?: number;
  pocketWidth?: number;
  pocketDepth?: number;

  // Engineering specs
  toleranceMm?: number; // e.g. 0.05 mm
  surfaceFinishRaUm?: number; // e.g. 1.6 um
  quantity: number;
  application?: string;
  mechanicalRequirements?: string; // e.g. "high strength, corrosion resistant, lightweight"
  targetSellingPrice?: number; // optional target selling price
}

export interface CadMeshStats {
  filename: string;
  format: 'STL' | 'OBJ' | 'STEP' | 'IGES';
  triangleCount: number;
  vertexCount: number;
  isWatertight: boolean;
  unit: 'mm' | 'cm' | 'in';
  unitScaleToMm: number;
  boundingBoxMm: {
    minX: number; maxX: number;
    minY: number; maxY: number;
    minZ: number; maxZ: number;
    length: number;
    width: number;
    height: number;
  };
  volumeMm3: number;
  surfaceAreaMm2: number;
  detectedFeatures?: {
    holesDetected: number;
    planarFaces: number;
    curvedFaces: number;
    notes?: string;
  };
}

export type MaterialCategory =
  | 'Aluminum'
  | 'Steel'
  | 'Stainless Steel'
  | 'Titanium'
  | 'Copper/Brass'
  | 'Cast Iron'
  | 'Engineering Plastics'
  | 'High-Performance Polymers'
  | 'Composite Polymers';

export type StrategicManufacturingParadigm =
  | 'Metal + Machining'
  | 'Plastic + Injection Molding'
  | 'Plastic + 3D Printing'
  | 'Advanced Polymer + 3D Printing';

export interface ParadigmEvaluation {
  recommendedParadigm: StrategicManufacturingParadigm;
  score: number; // 0 - 100
  confidencePct: number;
  reasoning: string;
  keyDrivers: string[];
  tradeoffs: string[];
  materialComparison: {
    selectedCategory: 'Metal' | 'Plastic' | 'Advanced Polymer' | 'Composite';
    massComparison: string;
    costComparison: string;
    strengthToWeightComparison: string;
    temperatureComparison: string;
    chemicalWearComparison: string;
  };
  processComparison: {
    recommendedProcess: ManufacturingProcessType;
    toolingInvestmentComparison: string;
    crossoverVolumeBreakEven: string;
    geometryFeasibility: string;
    leadTimeComparison: string;
  };
  alternatives: {
    paradigm: StrategicManufacturingParadigm;
    whenToSwitch: string;
    estimatedCostDeltaPct: number;
  }[];
}

export interface MaterialProperties {
  id: string;
  name: string;
  category: MaterialCategory;
  densityGPerCm3: number; // g/cm^3
  machinabilityIndex: number; // 0 to 100+ (relative to 1018 steel = 100 or 1212 = 100)
  mrrReferenceMm3PerMin: number; // baseline Material Removal Rate (roughing)
  typicalRawPricePerKg: number; // fallback assumption in INR (₹)
  scrapValueRatio: number; // scrap price as fraction of raw price (e.g. 0.25)
  yieldStrengthMpa: number;
  tensileStrengthMpa: number;
  corrosionResistance: 'Poor' | 'Moderate' | 'Good' | 'Excellent' | 'Extreme / Inert';
  hardnessHb: number;
  thermalConductivityWPerMK: number;
  description: string;

  // Industrial Plastic & Advanced Polymer Engineering Metrics
  continuousServiceTempC?: number; // Maximum continuous operating temperature (°C)
  frictionCoefficient?: number; // Dynamic coefficient of friction (dimensionless)
  isPolymer?: boolean;
  is3DPrintable?: boolean;
  suitableParadigm?: StrategicManufacturingParadigm;
  strengthToWeightRatio?: number; // Tensile strength (MPa) / Density (g/cm³)
  chemicalResistanceSummary?: string; // High-level chemical compatibility
  wearResistanceRating?: 'Low' | 'Moderate' | 'High' | 'Supreme / Self-Lubricating';
}

export interface MaterialRecommendation {
  materialId: string;
  materialName: string;
  suitabilityScore: number; // 0 - 100
  reasoning: string;
  pros: string[];
  cons: string[];
  isPrimary: boolean;
  properties: MaterialProperties;
  paradigmFit?: StrategicManufacturingParadigm;
  plasticVsMetalNotes?: string;
  additiveSuitability?: 'Standard 3D Printing (FDM/SLS)' | 'High-Temp Industrial (PEEK)' | 'Carbon-Fiber Composite' | 'Metal Machining Preferred';
}

export interface RawMaterialCostResult {
  partVolumeMm3: LabeledValue<number>;
  machiningAllowancePct: LabeledValue<number>;
  stockVolumeMm3: LabeledValue<number>;
  densityGPerCm3: LabeledValue<number>;
  netPartMassKg: LabeledValue<number>;
  stockMassKg: LabeledValue<number>;
  removedMassKg: LabeledValue<number>;
  pricePerKg: LabeledValue<number>;
  grossMaterialCostPerUnit: LabeledValue<number>;
  scrapCreditPerUnit: LabeledValue<number>;
  netMaterialCostPerUnit: LabeledValue<number>;
}

export type ManufacturingProcessType =
  | 'CNC Milling'
  | 'CNC Turning'
  | 'Drilling'
  | 'Grinding'
  | 'Sand Casting'
  | 'Die Casting'
  | 'Forging'
  | 'Sheet Metal'
  | 'Laser Cutting'
  | 'Waterjet'
  | 'Injection Molding'
  | 'Additive Manufacturing'
  | 'Welding'
  | 'Powder Metallurgy';

export interface ProcessComparisonItem {
  process: ManufacturingProcessType;
  suitabilityScore: number; // 0-100
  initialToolingCost: number;
  setupCost: number;
  unitVariableCost: number;
  totalCostAtQuantity: number;
  totalCostPerUnit: number;
  cycleTimeMinutes: number;
  achievableToleranceMm: number;
  achievableSurfaceFinishRa: number;
  isViableForGeometry: boolean;
  unviabilityReason?: string;
  productionSuitability: 'Ideal' | 'Feasible' | 'Unsuitable' | 'Suboptimal';
  notes: string;
}

export interface MachiningCostAssumptions {
  machineType: '3-Axis CNC Mill' | '5-Axis CNC Mill' | 'CNC Lathe' | 'Turning Center with Live Tooling' | 'Surface Grinder' | 'Industrial 3D Printer' | 'Laser Cutter';
  machineHourlyRateUsd: number;
  setupTimeHours: number;
  labourHourlyRateUsd: number;
  operatorRatio: number; // e.g. 0.5 if one operator runs 2 machines
  toolingCostPerPartUsd: number;
  toolLifeMinutes: number;
  energyConsumptionKw: number;
  energyRatePerKwhUsd: number;
  finishingCostPerPartUsd: number;
  inspectionCostPerPartUsd: number;
  scrapRatePct: number; // e.g. 3%
  overheadRatePct: number; // e.g. 15%
}

export interface MachiningCostResult {
  mrrUsedMm3PerMin: LabeledValue<number>;
  roughingCycleTimeMin: LabeledValue<number>;
  finishingCycleTimeMin: LabeledValue<number>;
  featureOperationsTimeMin: LabeledValue<number>;
  totalCycleTimeMin: LabeledValue<number>;
  totalCycleTimeHours: LabeledValue<number>;

  // Cost components per unit
  machineCostPerUnit: LabeledValue<number>;
  setupAllocationPerUnit: LabeledValue<number>;
  labourCostPerUnit: LabeledValue<number>;
  toolingCostPerUnit: LabeledValue<number>;
  energyCostPerUnit: LabeledValue<number>;
  finishingCostPerUnit: LabeledValue<number>;
  inspectionCostPerUnit: LabeledValue<number>;
  scrapCostPerUnit: LabeledValue<number>;
  overheadCostPerUnit: LabeledValue<number>;

  totalManufacturingCostPerUnit: LabeledValue<number>;
}

export interface TotalCostBreakdown {
  rawMaterialCostPerUnit: LabeledValue<number>;
  machiningCostPerUnit: LabeledValue<number>;
  setupAllocationPerUnit: LabeledValue<number>;
  labourCostPerUnit: LabeledValue<number>;
  toolingCostPerUnit: LabeledValue<number>;
  energyCostPerUnit: LabeledValue<number>;
  finishingCostPerUnit: LabeledValue<number>;
  inspectionCostPerUnit: LabeledValue<number>;
  scrapCostPerUnit: LabeledValue<number>;
  overheadCostPerUnit: LabeledValue<number>;
  totalCostPerUnit: LabeledValue<number>;

  totalOrderCost: LabeledValue<number>;
  fixedCostsTotal: LabeledValue<number>;
  variableCostPerUnit: LabeledValue<number>;
}

export interface BusinessMetrics {
  sellingPricePerUnit: LabeledValue<number>;
  totalCostPerUnit: LabeledValue<number>;
  profitPerUnit: LabeledValue<number>;
  grossMarginPct: LabeledValue<number>;
  breakEvenQuantity: LabeledValue<number | null>; // null if no break-even
  breakEvenStatus: 'Calculated' | 'No break-even at this price (Loss per unit)' | 'Infinite (Zero contribution)';
  totalRevenueAtQty: LabeledValue<number>;
  totalProfitAtQty: LabeledValue<number>;
  returnOnInvestmentPct: LabeledValue<number>;
}

export interface QuantityTierComparison {
  tierName: 'Prototype (1-10)' | 'Small Batch (10-100)' | 'Medium Batch (100-1,000)' | 'Large Batch (1,000-10,000+)';
  quantity: number;
  optimalProcess: ManufacturingProcessType;
  unitCost: number;
  totalCost: number;
  sellingPrice: number;
  unitProfit: number;
  marginPct: number;
  breakEvenAchieved: boolean;
  savingsVsPrimaryProcessPct: number;
}

export interface ChartDataPoint {
  quantity: number;
  fixedCost: number;
  totalCost: number;
  totalRevenue: number;
  profitLoss: number; // Net total profit in INR (₹)
  unitCost: number; // Total cost per unit in INR (₹)
  unitProfit: number; // Unit profit in INR (₹)
  marginPct: number; // Gross margin percentage
}

export interface AiCadPromptRequest {
  prompt: string;
  aiModel?: 'prompt2cad' | 'claude' | 'gemini';
}

export interface AiCadPromptResult {
  dimensions: PartDimensions;
  cadStats: CadMeshStats;
  stlBase64: string;
  designRationale: string;
  aiModelUsed: 'Prompt2CAD™ Engine' | 'Claude AI (Prompt2CAD)' | 'Gemini AI (Prompt2CAD)' | string;
  suggestedMaterialId: string;
  meshFormat?: 'stl' | 'obj';
}

export interface FullCalculationResult {
  rawMaterial: RawMaterialCostResult;
  machining: MachiningCostResult;
  totalCost: TotalCostBreakdown;
  business: BusinessMetrics;
  quantityTiers: QuantityTierComparison[];
  processRankings: ProcessComparisonItem[];
  chartData: ChartDataPoint[];
  paradigmEvaluation: ParadigmEvaluation;
}

export interface AIStrategyAnalysis {
  costDrivers: string[];
  bestStrategyRecommendation: string;
  processInflectionPoints: string[];
  potentialSavingsOpportunities: {
    opportunity: string;
    estimatedSavingsPct: number;
    tradeoff: string;
  }[];
  manufacturingRisks: string[];
  qualityTolerancesTradeoffs: string;
  confidenceScore: number;
  provider: 'Gemma 4 (Gemini API)' | 'Rule-Based Fallback';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  groundedFactsCited?: string[];
}

export interface ServiceStatus {
  gemma: {
    available: boolean;
    model: string;
    status: 'Active' | 'Fallback' | 'Unavailable';
    lastChecked?: string;
    details?: string;
  };
  perplexity: {
    available: boolean;
    status: 'Active' | 'Fallback (Manual Input)' | 'Unavailable';
    lastChecked?: string;
  };
  cadParser: {
    available: boolean;
    status: 'Active (Native STL/OBJ)';
    stepSupported: boolean;
  };
}

export interface ProjectState {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  dimensions: PartDimensions | null;
  cadMeshStats: CadMeshStats | null;
  selectedMaterialId: string | null;
  materialOverride?: Partial<MaterialProperties>;
  priceOverridePerKg?: number;
  priceSourceInfo?: {
    source: string;
    timestamp: string;
    isLive: boolean;
  };
  machiningAssumptions: MachiningCostAssumptions;
  selectedProcess: ManufacturingProcessType;
  targetSellingPriceOverride?: number;
  targetMarginPct?: number;

  // Calculation outputs
  calculations?: {
    rawMaterial: RawMaterialCostResult;
    machining: MachiningCostResult;
    totalCost: TotalCostBreakdown;
    business: BusinessMetrics;
    quantityTiers: QuantityTierComparison[];
    processRankings: ProcessComparisonItem[];
    chartData: ChartDataPoint[];
  };

  // AI analysis
  strategyAnalysis?: AIStrategyAnalysis;
}

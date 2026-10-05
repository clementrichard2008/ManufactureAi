import {
  PartDimensions,
  MaterialRecommendation,
  ManufacturingProcessType,
  AIStrategyAnalysis,
  ChatMessage,
  FullCalculationResult,
  MaterialProperties
} from '../../../shared/src/types';

export interface AIProvider {
  name: string;
  isAvailable(): boolean;

  analyzePart(
    dimensions: PartDimensions,
    cadStats?: { volumeMm3: number; surfaceAreaMm2: number; isWatertight: boolean }
  ): Promise<{
    summary: string;
    complexityRating: 'Low' | 'Medium' | 'High' | 'Very High';
    criticalFeatures: string[];
    manufacturingConsiderations: string[];
    suggestedTolerances: string;
    provider: 'Gemma 4 (Gemini API)' | 'Rule-Based Fallback';
  }>;

  recommendMaterials(
    dimensions: PartDimensions,
    availableMaterials: MaterialProperties[]
  ): Promise<{
    recommendations: MaterialRecommendation[];
    selectionRationale: string;
    provider: 'Gemma 4 (Gemini API)' | 'Rule-Based Fallback';
  }>;

  recommendProcesses(
    dimensions: PartDimensions,
    selectedMaterial: MaterialProperties
  ): Promise<{
    primaryProcess: ManufacturingProcessType;
    alternativeProcesses: ManufacturingProcessType[];
    processRationale: string;
    toolingConsiderations: string;
    provider: 'Gemma 4 (Gemini API)' | 'Rule-Based Fallback';
  }>;

  analyzeStrategy(
    dimensions: PartDimensions,
    material: MaterialProperties,
    calculation: FullCalculationResult
  ): Promise<AIStrategyAnalysis>;

  chat(
    history: ChatMessage[],
    userMessage: string,
    projectContext: {
      dimensions: PartDimensions | null;
      material: MaterialProperties | null;
      calculation: FullCalculationResult | null;
      selectedProcess?: ManufacturingProcessType;
      rawPricePerKg?: number;
    }
  ): Promise<{
    response: string;
    groundedFactsCited: string[];
    provider: 'Gemma 4 (Gemini API)' | 'Rule-Based Fallback';
  }>;
}

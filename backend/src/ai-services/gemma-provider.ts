import { z } from 'zod';
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
import { RuleBasedProvider } from './rule-based-provider';

// Zod schemas for structured validation
const PartAnalysisSchema = z.object({
  summary: z.string(),
  complexityRating: z.enum(['Low', 'Medium', 'High', 'Very High']),
  criticalFeatures: z.array(z.string()),
  manufacturingConsiderations: z.array(z.string()),
  suggestedTolerances: z.string()
});

const MaterialRecsSchema = z.object({
  selectionRationale: z.string(),
  recommendations: z.array(
    z.object({
      materialId: z.string(),
      materialName: z.string(),
      suitabilityScore: z.number(),
      reasoning: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      isPrimary: z.boolean(),
      paradigmFit: z.enum([
        'Metal + Machining',
        'Plastic + Injection Molding',
        'Plastic + 3D Printing',
        'Advanced Polymer + 3D Printing'
      ]).optional(),
      plasticVsMetalNotes: z.string().optional(),
      additiveSuitability: z.enum([
        'Standard 3D Printing (FDM/SLS)',
        'High-Temp Industrial (PEEK)',
        'Carbon-Fiber Composite',
        'Metal Machining Preferred'
      ]).optional()
    })
  )
});

const ProcessRecSchema = z.object({
  primaryProcess: z.string(),
  alternativeProcesses: z.array(z.string()),
  processRationale: z.string(),
  toolingConsiderations: z.string()
});

const StrategySchema = z.object({
  costDrivers: z.array(z.string()),
  bestStrategyRecommendation: z.string(),
  processInflectionPoints: z.array(z.string()),
  potentialSavingsOpportunities: z.array(
    z.object({
      opportunity: z.string(),
      estimatedSavingsPct: z.number(),
      tradeoff: z.string()
    })
  ),
  manufacturingRisks: z.array(z.string()),
  qualityTolerancesTradeoffs: z.string(),
  confidenceScore: z.number()
});

const ChatResponseSchema = z.object({
  response: z.string(),
  groundedFactsCited: z.array(z.string())
});

export class GemmaProvider implements AIProvider {
  name = 'Gemma 4 (Gemini API)';
  private apiKey: string;
  private model: string;
  private fallback: RuleBasedProvider;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMMA_MODEL || 'gemma-4-31b-it';
    this.fallback = new RuleBasedProvider();
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  private async callGeminiApi(prompt: string, expectJson: boolean = true): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${this.apiKey}`;

    const body: Record<string, any> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2
      }
    };

    if (expectJson) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response received from Gemini API.');
    }

    return text;
  }

  private async executeWithValidation<T>(
    prompt: string,
    schema: z.ZodType<T>,
    fallbackAction: () => Promise<T>
  ): Promise<{ data: T; isFallback: boolean }> {
    try {
      // First attempt
      const rawText = await this.callGeminiApi(prompt, true);
      const cleaned = cleanJsonString(rawText);
      const parsed = JSON.parse(cleaned);
      const validated = schema.parse(parsed);
      return { data: validated, isFallback: false };
    } catch (firstErr) {
      console.warn(`[GemmaProvider] First attempt failed: ${firstErr}. Retrying once with strict hint...`);
      try {
        // Retry attempt with explicit JSON formatting request
        const retryPrompt = `${prompt}\n\nIMPORTANT: You must output ONLY a valid JSON object matching the requested schema. Do not enclose in markdown ticks.`;
        const rawText2 = await this.callGeminiApi(retryPrompt, true);
        const cleaned2 = cleanJsonString(rawText2);
        const parsed2 = JSON.parse(cleaned2);
        const validated2 = schema.parse(parsed2);
        return { data: validated2, isFallback: false };
      } catch (retryErr) {
        console.error(`[GemmaProvider] Retry failed: ${retryErr}. Activating rule-based fallback.`);
        const fallbackData = await fallbackAction();
        return { data: fallbackData, isFallback: true };
      }
    }
  }

  async analyzePart(
    dimensions: PartDimensions,
    cadStats?: { volumeMm3: number; surfaceAreaMm2: number; isWatertight: boolean }
  ) {
    if (!this.isAvailable()) {
      return this.fallback.analyzePart(dimensions, cadStats);
    }

    const prompt = `You are Gemma 4, an expert manufacturing engineer. Analyze this mechanical part based ONLY on the measured/entered dimensions provided below. DO NOT invent or fabricate any measurements.

INPUT DIMENSIONS & SPECS:
- Part Name: ${dimensions.partName}
- Geometry Type: ${dimensions.geometryType}
- Dimensions: length=${dimensions.length ?? 'N/A'}, width=${dimensions.width ?? 'N/A'}, height=${dimensions.height ?? 'N/A'}, diameter=${dimensions.diameter ?? 'N/A'}, thickness=${dimensions.thickness ?? 'N/A'} (all mm)
- Features: holes=${dimensions.holeCount ?? 0} (dia ${dimensions.holeDiameter ?? 0} mm), pockets=${dimensions.pocketCount ?? 0}
- Tolerances: ±${dimensions.toleranceMm ?? 0.1} mm, Surface Finish: Ra ${dimensions.surfaceFinishRaUm ?? 1.6} µm
- Planned Quantity: ${dimensions.quantity} units
- Application: ${dimensions.application || 'General mechanical engineering'}
- Requirements: ${dimensions.mechanicalRequirements || 'Standard load'}
${cadStats ? `CAD Mesh Stats: volume=${cadStats.volumeMm3} mm3, surface area=${cadStats.surfaceAreaMm2} mm2, watertight=${cadStats.isWatertight}` : ''}

Respond with a JSON object with this exact schema:
{
  "summary": string,
  "complexityRating": "Low" | "Medium" | "High" | "Very High",
  "criticalFeatures": string[],
  "manufacturingConsiderations": string[],
  "suggestedTolerances": string
}`;

    const { data, isFallback } = await this.executeWithValidation(
      prompt,
      PartAnalysisSchema,
      () => this.fallback.analyzePart(dimensions, cadStats)
    );

    return {
      ...data,
      provider: isFallback ? ('Rule-Based Fallback' as const) : ('Gemma 4 (Gemini API)' as const)
    };
  }

  async recommendMaterials(
    dimensions: PartDimensions,
    availableMaterials: MaterialProperties[]
  ) {
    if (!this.isAvailable()) {
      return this.fallback.recommendMaterials(dimensions, availableMaterials);
    }

    const materialListText = availableMaterials.map(m =>
      `- ID: "${m.id}", Name: "${m.name}", Category: "${m.category}", Density: ${m.densityGPerCm3} g/cm3, Yield: ${m.yieldStrengthMpa} MPa, Machinability: ${m.machinabilityIndex}%, Corrosion: ${m.corrosionResistance}, Fallback Price: $${m.typicalRawPricePerKg}/kg`
    ).join('\n');

    const prompt = `You are Gemma 4, an engineering materials specialist. Recommend suitable materials for the part described below.
Select ONLY from this list of available standard materials:
${materialListText}

PART CONTEXT:
- Name: ${dimensions.partName}
- Geometry: ${dimensions.geometryType}
- Quantity: ${dimensions.quantity}
- Application: ${dimensions.application || 'Industrial'}
- Mechanical Requirements: ${dimensions.mechanicalRequirements || 'Balanced strength and machinability'}
- Tolerance: ±${dimensions.toleranceMm ?? 0.1} mm, Finish: Ra ${dimensions.surfaceFinishRaUm ?? 1.6} µm

Evaluate strength, weight, corrosion, machinability, cost, and batch size.
Respond with a JSON object:
{
  "selectionRationale": string,
  "recommendations": [
    {
      "materialId": string (must match an ID from the list),
      "materialName": string,
      "suitabilityScore": number (0 to 100),
      "reasoning": string,
      "pros": string[],
      "cons": string[],
      "isPrimary": boolean (exactly one primary recommendation)
    }
  ]
}`;

    const { data, isFallback } = await this.executeWithValidation(
      prompt,
      MaterialRecsSchema,
      () => this.fallback.recommendMaterials(dimensions, availableMaterials)
    );

    // Merge in physical properties from availableMaterials
    const enrichedRecs = data.recommendations.map(rec => {
      const match = availableMaterials.find(m => m.id === rec.materialId) || availableMaterials[0];
      return {
        ...rec,
        properties: match
      };
    });

    return {
      recommendations: enrichedRecs,
      selectionRationale: data.selectionRationale,
      provider: isFallback ? ('Rule-Based Fallback' as const) : ('Gemma 4 (Gemini API)' as const)
    };
  }

  async recommendProcesses(
    dimensions: PartDimensions,
    selectedMaterial: MaterialProperties
  ) {
    if (!this.isAvailable()) {
      return this.fallback.recommendProcesses(dimensions, selectedMaterial);
    }

    const prompt = `You are Gemma 4, a manufacturing process planner. Recommend the primary and alternative manufacturing processes for this part.
Supported processes: CNC Milling, CNC Turning, Drilling, Grinding, Sand Casting, Die Casting, Forging, Sheet Metal, Laser Cutting, Waterjet, Injection Molding, Additive Manufacturing, Welding, Powder Metallurgy.

PART DATA:
- Geometry: ${dimensions.geometryType}
- Dimensions: length=${dimensions.length ?? 0}, width=${dimensions.width ?? 0}, height=${dimensions.height ?? 0}, diameter=${dimensions.diameter ?? 0}
- Material: ${selectedMaterial.name} (${selectedMaterial.category})
- Quantity: ${dimensions.quantity}
- Tolerance: ±${dimensions.toleranceMm ?? 0.1} mm, Finish: Ra ${dimensions.surfaceFinishRaUm ?? 1.6} µm

Respond with a JSON object:
{
  "primaryProcess": string (must be one of the supported processes),
  "alternativeProcesses": string[],
  "processRationale": string,
  "toolingConsiderations": string
}`;

    const { data, isFallback } = await this.executeWithValidation(
      prompt,
      ProcessRecSchema,
      () => this.fallback.recommendProcesses(dimensions, selectedMaterial)
    );

    return {
      primaryProcess: data.primaryProcess as ManufacturingProcessType,
      alternativeProcesses: data.alternativeProcesses as ManufacturingProcessType[],
      processRationale: data.processRationale,
      toolingConsiderations: data.toolingConsiderations,
      provider: isFallback ? ('Rule-Based Fallback' as const) : ('Gemma 4 (Gemini API)' as const)
    };
  }

  async analyzeStrategy(
    dimensions: PartDimensions,
    material: MaterialProperties,
    calculation: FullCalculationResult
  ): Promise<AIStrategyAnalysis> {
    if (!this.isAvailable()) {
      return this.fallback.analyzeStrategy(dimensions, material, calculation);
    }

    const tc = calculation.totalCost;
    const biz = calculation.business;

    // Send the already calculated numbers to Gemma
    const prompt = `You are Gemma 4, an executive manufacturing and financial strategist.
CRITICAL MANDATE: DO NOT RECOMPUTE ANY NUMBERS. DO NOT INVENT FINANCIAL OR ENGINEERING VALUES.
All numbers below were computed deterministically by the calculation engine. Your task is to provide expert strategic interpretation, risk analysis, inflection points, and cost reduction advice.

VERIFIED CALCULATED RESULTS:
- Part: "${dimensions.partName}" (${dimensions.geometryType}), Quantity: ${dimensions.quantity} units
- Material: ${material.name} (Density: ${material.densityGPerCm3} g/cm3, Net Mass: ${calculation.rawMaterial.netPartMassKg.value} kg, Stock Mass: ${calculation.rawMaterial.stockMassKg.value} kg)
- Raw Material Cost / Unit: $${tc.rawMaterialCostPerUnit.value.toFixed(2)} (at $${calculation.rawMaterial.pricePerKg.value.toFixed(2)}/kg)
- Machining Cost / Unit: $${tc.machiningCostPerUnit.value.toFixed(2)} (Cycle Time: ${calculation.machining.totalCycleTimeMin.value.toFixed(1)} min)
- Setup Allocation / Unit: $${tc.setupAllocationPerUnit.value.toFixed(2)} (Fixed setup total: $${tc.fixedCostsTotal.value.toFixed(2)})
- Labour Cost / Unit: $${tc.labourCostPerUnit.value.toFixed(2)}
- Tooling Cost / Unit: $${tc.toolingCostPerUnit.value.toFixed(2)}
- Energy Cost / Unit: $${tc.energyCostPerUnit.value.toFixed(2)}
- Finishing & Inspection: $${(tc.finishingCostPerUnit.value + tc.inspectionCostPerUnit.value).toFixed(2)}
- Scrap & Overhead: $${(tc.scrapCostPerUnit.value + tc.overheadCostPerUnit.value).toFixed(2)}
- TOTAL COST / UNIT: $${tc.totalCostPerUnit.value.toFixed(2)}
- Variable Cost / Unit: $${tc.variableCostPerUnit.value.toFixed(2)}
- Selling Price / Unit: $${biz.sellingPricePerUnit.value.toFixed(2)}
- Profit / Unit: $${biz.profitPerUnit.value.toFixed(2)} (Margin: ${biz.grossMarginPct.value}%)
- Break-Even Quantity: ${biz.breakEvenQuantity.value ?? 'No break-even'} (${biz.breakEvenStatus})

Respond with a JSON object:
{
  "costDrivers": string[] (list top 2-4 actual drivers based on above percentages),
  "bestStrategyRecommendation": string (strategic advice for production quantity & margin),
  "processInflectionPoints": string[] (when does switching to casting, stamping, or molding become optimal?),
  "potentialSavingsOpportunities": [
    {
      "opportunity": string,
      "estimatedSavingsPct": number,
      "tradeoff": string
    }
  ],
  "manufacturingRisks": string[],
  "qualityTolerancesTradeoffs": string,
  "confidenceScore": number (80 to 98)
}`;

    const { data, isFallback } = await this.executeWithValidation(
      prompt,
      StrategySchema,
      () => this.fallback.analyzeStrategy(dimensions, material, calculation)
    );

    return {
      ...data,
      provider: isFallback ? 'Rule-Based Fallback' : 'Gemma 4 (Gemini API)'
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
    if (!this.isAvailable()) {
      return this.fallback.chat(history, userMessage, context);
    }

    if (!context.dimensions || !context.calculation) {
      return {
        response: 'No part analysis data is currently loaded. Enter part dimensions or upload a CAD model to begin.',
        groundedFactsCited: [],
        provider: 'Gemma 4 (Gemini API)' as const
      };
    }

    const { dimensions, material, calculation } = context;
    const tc = calculation.totalCost;
    const biz = calculation.business;

    const systemContext = `You are ManufactureAI's engineering assistant powered by Gemma 4.
STRICT RULE: YOU MUST NOT STATE ANY VALUE THAT IS NOT IN THE PROJECT DATA PROVIDED BELOW. IF ASKED FOR A METRIC NOT IN THIS DATA, EXPLICITLY STATE THAT THE INFORMATION IS NOT AVAILABLE.
DO NOT DO THE MATH OR RECOMPUTE FIGURES.

CURRENT VERIFIED PROJECT DATA:
- Part Name: ${dimensions.partName}
- Geometry Type: ${dimensions.geometryType}
- Dimensions: length=${dimensions.length ?? 'N/A'}, width=${dimensions.width ?? 'N/A'}, height=${dimensions.height ?? 'N/A'}, diameter=${dimensions.diameter ?? 'N/A'}, thickness=${dimensions.thickness ?? 'N/A'} (all mm)
- Tolerance: ±${dimensions.toleranceMm ?? 0.1} mm, Finish: Ra ${dimensions.surfaceFinishRaUm ?? 1.6} µm
- Planned Quantity: ${dimensions.quantity} units
- Material: ${material?.name} (Density: ${material?.densityGPerCm3} g/cm3, Yield: ${material?.yieldStrengthMpa} MPa, Machinability: ${material?.machinabilityIndex}%)
- Part Mass: ${calculation.rawMaterial.netPartMassKg.value} kg, Stock Mass: ${calculation.rawMaterial.stockMassKg.value} kg
- Raw Material Price: $${calculation.rawMaterial.pricePerKg.value.toFixed(2)}/kg (${calculation.rawMaterial.pricePerKg.origin})
- Raw Material Cost / Unit: $${tc.rawMaterialCostPerUnit.value.toFixed(2)}
- Machining Cost / Unit: $${tc.machiningCostPerUnit.value.toFixed(2)} (Cycle time: ${calculation.machining.totalCycleTimeMin.value.toFixed(1)} min)
- Setup Allocation / Unit: $${tc.setupAllocationPerUnit.value.toFixed(2)}
- Total Cost / Unit: $${tc.totalCostPerUnit.value.toFixed(2)}
- Selling Price / Unit: $${biz.sellingPricePerUnit.value.toFixed(2)}
- Profit / Unit: $${biz.profitPerUnit.value.toFixed(2)} (Margin: ${biz.grossMarginPct.value}%)
- Break-Even Quantity: ${biz.breakEvenQuantity.value ?? 'No break-even'} (${biz.breakEvenStatus})
- Active Process: ${context.selectedProcess || 'CNC Milling'}`;

    const recentHistory = history.slice(-6).map(h => `${h.sender.toUpperCase()}: ${h.content}`).join('\n');

    const prompt = `${systemContext}

CONVERSATION HISTORY:
${recentHistory}

USER QUESTION:
${userMessage}

Respond with a JSON object:
{
  "response": string (concise, professional markdown response citing exact data),
  "groundedFactsCited": string[] (list of 2-4 exact facts from the project data cited in your answer)
}`;

    const { data, isFallback } = await this.executeWithValidation(
      prompt,
      ChatResponseSchema,
      () => this.fallback.chat(history, userMessage, context)
    );

    return {
      ...data,
      provider: isFallback ? ('Rule-Based Fallback' as const) : ('Gemma 4 (Gemini API)' as const)
    };
  }
}

function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  // Strip ```json and ``` if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

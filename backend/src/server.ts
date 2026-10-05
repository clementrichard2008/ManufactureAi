import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { parseStl } from './cad-processing/stl-parser';
import { parseObj } from './cad-processing/obj-parser';
import { parseStepOrIges, parseStep } from './cad-processing/step-parser';
import { AIManager } from './ai-services/ai-manager';
import { PriceManager } from './price-service/price-manager';
import { ProjectStorage } from './project-storage/storage';
import { STANDARD_MATERIALS, getMaterialById } from '../../shared/src/materials';
import { PartDimensions, ServiceStatus, ProjectState, AiCadPromptRequest } from '../../shared/src/types';
import { runFullCalculation, DEFAULT_MACHINING_ASSUMPTIONS } from '../../shared/src/calculation-engine';
import { generateCadFromPrompt } from './ai-services/cad-prompt-engine';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

const aiManager = new AIManager();
const priceManager = new PriceManager();
const projectStorage = new ProjectStorage();

// Status endpoint
app.get('/api/status', (req: Request, res: Response) => {
  const gemmaStatus = aiManager.getServiceStatus();
  const perplexityAvailable = priceManager.isLiveProviderAvailable();

  const status: ServiceStatus = {
    gemma: gemmaStatus,
    perplexity: {
      available: perplexityAvailable,
      status: perplexityAvailable ? 'Active' : 'Fallback (Manual Input)'
    },
    cadParser: {
      available: true,
      status: 'Active (Native STEP/STP/STL/OBJ)' as any,
      stepSupported: true
    }
  };

  res.json(status);
});

// Materials catalogue
app.get('/api/materials', (req: Request, res: Response) => {
  res.json(STANDARD_MATERIALS);
});

// CAD Upload & Parse endpoint
app.post('/api/cad/parse', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const filename = req.file.originalname;
    const unit = (req.body.unit as 'mm' | 'cm' | 'in') || 'mm';
    const lowerName = filename.toLowerCase();

    if (lowerName.endsWith('.stl')) {
      const stats = parseStl(req.file.buffer, filename, unit);
      return res.json({ success: true, stats });
    } else if (lowerName.endsWith('.obj')) {
      const content = req.file.buffer.toString('utf8');
      const stats = parseObj(content, filename, unit);
      return res.json({ success: true, stats });
    } else if (lowerName.endsWith('.step') || lowerName.endsWith('.stp')) {
      const result = await parseStep(req.file.buffer, filename, unit);
      if (result.success && result.stats) {
        return res.json({
          success: true,
          stats: result.stats,
          stlBase64: result.stlBuffer?.toString('base64')
        });
      } else {
        return res.status(400).json({ error: result.message || 'Failed to parse STEP file.' });
      }
    } else if (lowerName.endsWith('.iges') || lowerName.endsWith('.igs')) {
      const content = req.file.buffer.toString('utf8');
      const result = parseStepOrIges(content, filename);
      return res.json(result);
    } else {
      return res.status(400).json({
        error: `Unsupported file format. Supported formats: .step, .stp, .stl, .obj, .iges, .igs`
      });
    }
  } catch (err: any) {
    console.error('CAD parse error:', err);
    res.status(500).json({
      error: `Failed to parse CAD file: ${err.message || 'Unknown parsing error'}`
    });
  }
});

// AI CAD Model Generation & Analysis (Prompt2CAD / Claude / Gemini)
app.post('/api/ai/generate-cad', async (req: Request, res: Response) => {
  try {
    const { prompt, aiModel = 'claude' } = req.body as AiCadPromptRequest;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required to generate CAD model.' });
    }
    const result = await generateCadFromPrompt(prompt.trim(), aiModel);
    res.json(result);
  } catch (err: any) {
    console.error('AI CAD generation error:', err);
    res.status(500).json({ error: `Failed to generate CAD model: ${err.message}` });
  }
});

// Deterministic Calculation Engine endpoint (Zero AI)
app.post('/api/calculate', (req: Request, res: Response) => {
  try {
    const {
      dimensions,
      materialId,
      materialOverride,
      rawPricePerKg,
      rawPriceOrigin = 'Manual Input',
      priceSource,
      priceTimestamp,
      machiningAssumptions = DEFAULT_MACHINING_ASSUMPTIONS,
      selectedProcess = 'CNC Milling',
      customMachiningAllowancePct = 15,
      targetSellingPriceOverride,
      targetMarginPct = 30
    } = req.body;

    if (!dimensions) {
      return res.status(400).json({ error: 'Missing part dimensions.' });
    }

    const baseMaterial = getMaterialById(materialId) || STANDARD_MATERIALS[0];
    const material = {
      ...baseMaterial,
      ...(materialOverride || {})
    };

    const effectivePrice = typeof rawPricePerKg === 'number' && rawPricePerKg > 0
      ? rawPricePerKg
      : material.typicalRawPricePerKg;

    const result = runFullCalculation({
      dimensions,
      material,
      rawPricePerKg: effectivePrice,
      rawPriceOrigin,
      priceSource,
      priceTimestamp,
      machiningAssumptions,
      selectedProcess,
      customMachiningAllowancePct,
      targetSellingPriceOverride,
      targetMarginPct
    });

    res.json(result);
  } catch (err: any) {
    console.error('Calculation error:', err);
    res.status(500).json({ error: `Calculation failed: ${err.message}` });
  }
});

// AI Part Analysis
app.post('/api/ai/analyze-part', async (req: Request, res: Response) => {
  try {
    const { dimensions, cadStats } = req.body;
    if (!dimensions) {
      return res.status(400).json({ error: 'Missing dimensions for part analysis.' });
    }
    const provider = aiManager.getPrimaryProvider();
    const result = await provider.analyzePart(dimensions, cadStats);
    res.json(result);
  } catch (err: any) {
    console.error('AI analyze-part error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Material Recommendation
app.post('/api/ai/recommend-materials', async (req: Request, res: Response) => {
  try {
    const { dimensions } = req.body;
    if (!dimensions) {
      return res.status(400).json({ error: 'Missing dimensions for material recommendation.' });
    }
    const provider = aiManager.getPrimaryProvider();
    const result = await provider.recommendMaterials(dimensions, STANDARD_MATERIALS);
    res.json(result);
  } catch (err: any) {
    console.error('AI recommend-materials error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Process Recommendation
app.post('/api/ai/recommend-processes', async (req: Request, res: Response) => {
  try {
    const { dimensions, materialId } = req.body;
    const material = getMaterialById(materialId) || STANDARD_MATERIALS[0];
    const provider = aiManager.getPrimaryProvider();
    const result = await provider.recommendProcesses(dimensions, material);
    res.json(result);
  } catch (err: any) {
    console.error('AI recommend-processes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Strategic Analysis (Gemma analyzes already calculated numbers)
app.post('/api/ai/analyze-strategy', async (req: Request, res: Response) => {
  try {
    const { dimensions, materialId, calculation } = req.body;
    if (!dimensions || !calculation) {
      return res.status(400).json({ error: 'Missing dimensions or calculation results for strategy analysis.' });
    }
    const material = getMaterialById(materialId) || STANDARD_MATERIALS[0];
    const provider = aiManager.getPrimaryProvider();
    const result = await provider.analyzeStrategy(dimensions, material, calculation);
    res.json(result);
  } catch (err: any) {
    console.error('AI analyze-strategy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ask ManufactureAI Chat
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { messages, userMessage, context } = req.body;
    if (!userMessage) {
      return res.status(400).json({ error: 'Empty user message.' });
    }
    const provider = aiManager.getPrimaryProvider();
    const result = await provider.chat(messages || [], userMessage, context || {});
    res.json(result);
  } catch (err: any) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Price lookup endpoint
app.post('/api/price/lookup', async (req: Request, res: Response) => {
  try {
    const { materialId } = req.body;
    const material = getMaterialById(materialId) || STANDARD_MATERIALS[0];
    const priceData = await priceManager.getPriceForMaterial(material);
    res.json(priceData);
  } catch (err: any) {
    console.error('Price lookup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Projects storage
app.post('/api/projects/save', (req: Request, res: Response) => {
  try {
    const saved = projectStorage.saveProject(req.body);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', (req: Request, res: Response) => {
  const p = projectStorage.getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found.' });
  res.json(p);
});

app.get('/api/projects', (req: Request, res: Response) => {
  res.json(projectStorage.listProjects());
});

// 404 handler for API routes
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Global JSON error handler (prevents HTML error pages on body-parser/unhandled errors)
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload.' });
  }
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`ManufactureAI Backend REST API active on port ${port}`);
  console.log(`Gemma Model ID: ${process.env.GEMMA_MODEL || 'gemma-4-31b-it'}`);
  console.log(`Gemini Key Present: ${Boolean(process.env.GEMINI_API_KEY)}`);
  console.log(`Perplexity Key Present: ${Boolean(process.env.PERPLEXITY_API_KEY)}`);
});


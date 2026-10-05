import { AiCadPromptResult } from '../../../shared/src/types';
import { buildPrompt2CadModel } from './prompt2cad-engine';

/**
 * High-speed CAD prompt generation engine
 * Powered by Prompt2CAD™ with Claude and Gemini modes
 */
export async function generateCadFromPrompt(
  prompt: string,
  aiModel: 'prompt2cad' | 'claude' | 'gemini' = 'claude'
): Promise<AiCadPromptResult> {
  return await buildPrompt2CadModel(prompt, aiModel);
}

import { AIProvider } from './types';
import { GemmaProvider } from './gemma-provider';
import { RuleBasedProvider } from './rule-based-provider';
import { ServiceStatus } from '../../../shared/src/types';

export class AIManager {
  private gemmaProvider: GemmaProvider;
  private ruleBasedProvider: RuleBasedProvider;

  constructor() {
    this.gemmaProvider = new GemmaProvider();
    this.ruleBasedProvider = new RuleBasedProvider();
  }

  getPrimaryProvider(): AIProvider {
    if (this.gemmaProvider.isAvailable()) {
      return this.gemmaProvider;
    }
    return this.ruleBasedProvider;
  }

  getServiceStatus(): ServiceStatus['gemma'] {
    const isConfigured = this.gemmaProvider.isAvailable();
    const model = process.env.GEMMA_MODEL || 'gemma-4-31b-it';

    return {
      available: isConfigured,
      model,
      status: isConfigured ? 'Active' : 'Fallback',
      details: isConfigured
        ? `Gemma 4 model (${model}) connected via Google Gemini API.`
        : 'GEMINI_API_KEY not configured. Rule-based engineering fallback active.'
    };
  }
}

import { PerplexityProvider, RawPriceLookupResult } from './perplexity-provider';
import { MaterialProperties } from '../../../shared/src/types';

export class PriceManager {
  private perplexity: PerplexityProvider;

  constructor() {
    this.perplexity = new PerplexityProvider();
  }

  isLiveProviderAvailable(): boolean {
    return this.perplexity.isAvailable();
  }

  async getPriceForMaterial(material: MaterialProperties): Promise<{
    pricePerKg: number;
    origin: 'Live Data' | 'Assumption' | 'Manual Input';
    source: string;
    timestamp: string;
    isLive: boolean;
  }> {
    if (this.perplexity.isAvailable()) {
      const live = await this.perplexity.lookupRawPrice(material.name);
      if (live) {
        return {
          pricePerKg: live.pricePerKgUsd,
          origin: 'Live Data',
          source: live.source,
          timestamp: live.timestamp,
          isLive: true
        };
      }
    }

    // Fallback assumption from local database
    return {
      pricePerKg: material.typicalRawPricePerKg,
      origin: 'Assumption',
      source: 'ASM International / Standard Engineering Handbook Base',
      timestamp: new Date().toISOString(),
      isLive: false
    };
  }
}

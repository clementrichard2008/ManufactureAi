export interface RawPriceLookupResult {
  material: string;
  pricePerKgUsd: number;
  currency: string;
  region: string;
  timestamp: string;
  source: string;
  isLive: boolean;
  notes?: string;
}

export class PerplexityProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async lookupRawPrice(materialName: string): Promise<RawPriceLookupResult | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const prompt = `What is the current raw material market spot price per kilogram (USD) for ${materialName} in billet/bar/sheet standard engineering form?
Return ONLY a JSON object with:
{
  "pricePerKgUsd": number,
  "currency": "USD",
  "region": "North America / Global Spot",
  "source": string (e.g. LME, Fastmarkets, MetalMiner, Platts)
}`;

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        console.warn(`[PerplexityProvider] Price lookup failed with status ${response.status}`);
        return null;
      }

      const resData = await response.json();
      const content = resData.choices?.[0]?.message?.content;
      if (!content) return null;

      // Extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.pricePerKgUsd !== 'number' || parsed.pricePerKgUsd <= 0) {
        return null;
      }

      return {
        material: materialName,
        pricePerKgUsd: parsed.pricePerKgUsd,
        currency: parsed.currency || 'USD',
        region: parsed.region || 'Global Spot',
        timestamp: new Date().toISOString(),
        source: parsed.source || 'Perplexity Live Market Index',
        isLive: true,
        notes: 'Live market spot estimate. User manual override available.'
      };
    } catch (err) {
      console.warn(`[PerplexityProvider] Exception querying live price:`, err);
      return null;
    }
  }
}

import { NormalizedMarket, ArbitrageOpportunity } from '../types';
import { logger } from '../utils/logger';

export class ArbitrageDetector {
  private readonly TOLERANCE = 0.0001; // Small tolerance for floating point math

  /**
   * Detects theoretical arbitrage opportunities where YES + NO != 1.
   */
  detect(markets: NormalizedMarket[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const market of markets) {
      const { outcome_yes_price, outcome_no_price, market_id } = market;

      // Skip if either price is missing
      if (outcome_yes_price === null || outcome_no_price === null) {
        continue;
      }

      const sum = outcome_yes_price + outcome_no_price;
      const deviation = sum - 1;

      // Check if the sum deviates from 1 beyond the tolerance
      if (Math.abs(deviation) > this.TOLERANCE) {
        opportunities.push({
          market_id,
          yes_price: outcome_yes_price,
          no_price: outcome_no_price,
          sum,
          deviation,
        });
      }
    }

    return opportunities;
  }
}

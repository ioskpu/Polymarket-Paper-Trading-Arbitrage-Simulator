import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  PolymarketMarket, 
  NormalizedMarket, 
  PolymarketMarketsResponseSchema 
} from '../types';

export class PolymarketService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = config.POLYMARKET_API_URL;
  }

  /**
   * Fetches all active markets from Polymarket with pagination and backoff.
   * Returns both raw and normalized data for persistence.
   */
  async fetchAllActiveMarkets(): Promise<{ raw: PolymarketMarket[], normalized: NormalizedMarket[] }> {
    const rawMarkets: PolymarketMarket[] = [];
    const normalizedMarkets: NormalizedMarket[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    logger.info('Starting ingestion of active markets...');

    try {
      while (hasNextPage) {
        const data = await this.fetchPage(cursor);
        
        for (const market of data.data) {
          rawMarkets.push(market);
          normalizedMarkets.push(this.normalizeMarketData(market));
        }

        cursor = data.next_cursor || null;
        hasNextPage = !!cursor;

        if (hasNextPage) {
          logger.debug(`Fetched ${rawMarkets.length} markets so far, moving to next page...`);
        }
      }

      logger.info(`Successfully ingested ${rawMarkets.length} active markets.`);
      return { raw: rawMarkets, normalized: normalizedMarkets };

    } catch (error) {
      logger.error('Critical failure during market ingestion', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Fetches a single page of markets with basic exponential backoff.
   */
  private async fetchPage(cursor: string | null, retryCount = 0): Promise<{ data: PolymarketMarket[], next_cursor?: string | null }> {
    const MAX_RETRIES = 3;
    const INITIAL_BACKOFF = 1000;

    try {
      const response = await axios.get(`${this.baseUrl}/markets`, {
        params: {
          active: true,
          limit: 100,
          cursor: cursor || undefined,
        },
        timeout: 10000, // 10s timeout
      });

      // Validate response schema using Zod
      const validated = PolymarketMarketsResponseSchema.safeParse(response.data);
      
      if (!validated.success) {
        logger.error('Invalid schema received from Polymarket API', { 
          errors: validated.error.format() 
        });
        throw new Error('Schema validation failed for Polymarket API response');
      }

      return validated.data;

    } catch (error) {
      const isNetworkError = axios.isAxiosError(error) && (error.code === 'ECONNABORTED' || !error.response);
      const isRateLimit = axios.isAxiosError(error) && error.response?.status === 429;

      if ((isNetworkError || isRateLimit) && retryCount < MAX_RETRIES) {
        const waitTime = INITIAL_BACKOFF * Math.pow(2, retryCount);
        logger.warn(`Fetch failed (retry ${retryCount + 1}/${MAX_RETRIES}). Waiting ${waitTime}ms...`, {
          reason: isRateLimit ? 'Rate limit' : 'Network/Timeout'
        });
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.fetchPage(cursor, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Normalizes raw Polymarket market data into internal format.
   * Prices are guaranteed to be between 0 and 1 or null.
   */
  normalizeMarketData(market: PolymarketMarket): NormalizedMarket {
    const yesToken = market.tokens.find(t => t.outcome.toLowerCase() === 'yes');
    const noToken = market.tokens.find(t => t.outcome.toLowerCase() === 'no');

    const validatePrice = (price: number | null | undefined): number | null => {
      if (price === null || price === undefined) return null;
      if (price < 0 || price > 1) {
        logger.warn(`Price out of range [0, 1] for market ${market.id}`, { price });
        return null;
      }
      return price;
    };

    return {
      market_id: market.id,
      event_title: market.question,
      outcome_yes_price: validatePrice(yesToken?.price),
      outcome_no_price: validatePrice(noToken?.price),
      liquidity: market.liquidity ?? null,
      timestamp: new Date().toISOString(),
    };
  }
}

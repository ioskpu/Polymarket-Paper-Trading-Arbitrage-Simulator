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
    let cursor: string | null = null;
    let hasNextPage = true;
    let totalFetched = 0;
    const MAX_MARKETS = 2000; // Safety limit to avoid OOM and infinite loops
    
    const allRaw: PolymarketMarket[] = [];
    const allNormalized: NormalizedMarket[] = [];

    logger.info('Starting ingestion of active markets...');

    try {
      while (hasNextPage && totalFetched < MAX_MARKETS) {
        const currentCursor: string | null = cursor;
        const data = await this.fetchPage(currentCursor);
        
        if (!data.data || data.data.length === 0) {
          logger.info('No more markets found.');
          break;
        }

        const rawPage: PolymarketMarket[] = [];
        const normalizedPage: NormalizedMarket[] = [];

        for (const market of data.data) {
          rawPage.push(market);
          normalizedPage.push(this.normalizeMarketData(market));
        }

        allRaw.push(...rawPage);
        allNormalized.push(...normalizedPage);
        
        totalFetched += rawPage.length;
        cursor = data.next_cursor || null;

        // Break if cursor is same as previous (infinite loop protection)
        if (cursor === currentCursor && cursor !== null) {
          logger.warn('Pagination loop detected (cursor did not change). Stopping fetch.');
          break;
        }

        hasNextPage = !!cursor;

        if (hasNextPage) {
          logger.debug(`Fetched ${totalFetched} markets so far...`);
        }
      }

      logger.info(`Successfully ingested ${totalFetched} active markets.`);
      return { raw: allRaw, normalized: allNormalized };

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
      logger.debug(`Fetching page with cursor: ${cursor || 'none'}`);
      const response = await axios.get(`${this.baseUrl}/markets`, {
        params: {
          active: true,
          limit: 50,
          cursor: cursor || undefined,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 30000,
      });

      logger.debug(`API response received. Status: ${response.status}`);

      // LOG THE RESPONSE FOR DEBUGGING
      if (retryCount === 0) {
        if (response.data && (response.data.data || Array.isArray(response.data))) {
          const items = response.data.data || response.data;
          logger.debug(`Sample API data structure (${items.length} items):`, {
            keys: items.length > 0 ? Object.keys(items[0]) : [],
            first_item_sample: items.length > 0 ? JSON.stringify(items[0]).slice(0, 200) : 'empty'
          });
        } else {
          logger.warn('Unexpected API response structure', { data: JSON.stringify(response.data).slice(0, 200) });
        }
      }

      const validated = PolymarketMarketsResponseSchema.safeParse(response.data);
      if (!validated.success) {
        logger.error('Zod Validation Error details:', {
          errors: validated.error.format(),
          data_summary: response.data?.data?.length ? `Array of ${response.data.data.length} items` : 'No data'
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
    const conditionId = market.condition_id || market.conditionId || 'unknown';
    const yesToken = market.tokens?.find(t => t.outcome.toLowerCase() === 'yes');
    const noToken = market.tokens?.find(t => t.outcome.toLowerCase() === 'no');

    const validatePrice = (price: number | null | undefined): number | null => {
      if (price === null || price === undefined) return null;
      if (price < 0 || price > 1) {
        logger.warn(`Price out of range [0, 1] for market ${conditionId}`, { price });
        return null;
      }
      return price;
    };

    return {
      market_id: conditionId,
      event_title: market.question || 'Untitled Market',
      outcome_yes_price: validatePrice(yesToken?.price),
      outcome_no_price: validatePrice(noToken?.price),
      liquidity: market.liquidity ?? null,
      timestamp: new Date().toISOString(),
    };
  }
}

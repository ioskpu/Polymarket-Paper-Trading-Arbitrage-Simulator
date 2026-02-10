import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NormalizedMarket, PolymarketMarket } from '../types';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', { err });
    });
  }

  /**
   * Persists a batch of normalized markets and their snapshots using a transaction.
   * Ensures idempotency for the 'markets' table.
   */
  async saveMarketSnapshots(rawMarkets: PolymarketMarket[], normalizedMarkets: NormalizedMarket[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (let i = 0; i < normalizedMarkets.length; i++) {
        const normalized = normalizedMarkets[i];
        const raw = rawMarkets[i];

        // 1. Idempotent write to 'markets' table
        await client.query(`
          INSERT INTO markets (id, question, condition_id, slug, resolution_source, end_date_iso, active, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            question = EXCLUDED.question,
            active = EXCLUDED.active,
            updated_at = CURRENT_TIMESTAMP
        `, [
          raw.id,
          raw.question,
          raw.condition_id,
          raw.slug,
          raw.resolution_source,
          raw.end_date_iso,
          raw.active
        ]);

        // 2. Insert into 'market_snapshots'
        // We store the normalized prices in a structured way within JSONB for now
        // to match the existing schema while keeping it "normalized"
        const bids = [{ price: normalized.outcome_yes_price, type: 'YES' }];
        const asks = [{ price: normalized.outcome_no_price, type: 'NO' }];

        await client.query(`
          INSERT INTO market_snapshots (market_id, bids, asks, timestamp)
          VALUES ($1, $2, $3, $4)
        `, [
          normalized.market_id,
          JSON.stringify(bids),
          JSON.stringify(asks),
          normalized.timestamp
        ]);
      }

      await client.query('COMMIT');
      logger.info(`Persisted ${normalizedMarkets.length} market snapshots to database.`);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to persist market snapshots. Transaction rolled back.', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

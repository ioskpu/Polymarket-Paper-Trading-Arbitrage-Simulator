import { config } from './config';
import { logger } from './utils/logger';
import { PolymarketService } from './services/polymarket';
import { DatabaseService } from './services/database';

async function main() {
  logger.info('Starting Market Scanner Service...', {
    interval: config.SCAN_INTERVAL_MS,
    env: config.NODE_ENV,
  });

  const polymarket = new PolymarketService();
  const db = new DatabaseService();

  try {
    const scan = async () => {
      try {
        logger.info('Initiating market scan...');
        
        // 1. Fetch all active markets with pagination and backoff
        const { raw, normalized } = await polymarket.fetchAllActiveMarkets();
        
        logger.info(`Processing ${normalized.length} normalized markets...`);

        // 2. Persist to PostgreSQL using a transaction
        await db.saveMarketSnapshots(raw, normalized);

        // 3. Log samples for debugging
        if (normalized.length > 0) {
          const sample = normalized[0];
          logger.debug('Sample Normalized Market Data', {
            id: sample.market_id,
            title: sample.event_title,
            yes: sample.outcome_yes_price,
            no: sample.outcome_no_price,
            liq: sample.liquidity,
          });
        }

        logger.info('Market scan completed successfully');
      } catch (error) {
        logger.error('Error during market scan cycle', { error });
      } finally {
        setTimeout(scan, config.SCAN_INTERVAL_MS);
      }
    };

    // Start the first scan
    await scan();

  } catch (error) {
    logger.error('Fatal error in Market Scanner', { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Cleaning up...');
  process.exit(0);
});

main();

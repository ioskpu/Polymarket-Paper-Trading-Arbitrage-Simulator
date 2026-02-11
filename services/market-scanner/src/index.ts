import { config } from './config';
import { logger } from './utils/logger';
import { PolymarketService } from './services/polymarket';
import { DatabaseService } from './services/database';
import { ArbitrageDetector } from './services/arbitrage';

async function main() {
  logger.info('Starting Market Scanner Service...', {
    interval: config.SCAN_INTERVAL_MS,
    env: config.NODE_ENV,
  });

  const polymarket = new PolymarketService();
  const db = new DatabaseService();
  const arbitrage = new ArbitrageDetector();

  try {
    const scan = async () => {
      const startTime = Date.now();
      let marketsScanned = 0;
      let arbitrageDetected = 0;

      try {
        logger.info('Initiating market scan cycle...');
        
        // 1. Fetch all active markets with pagination and backoff
        const { raw, normalized } = await polymarket.fetchAllActiveMarkets();
        marketsScanned = normalized.length;
        
        logger.info('Market ingestion completed', { count: marketsScanned });

        // 2. Persist to PostgreSQL using a transaction
        await db.saveMarketSnapshots(raw, normalized);

        // 3. Detect Theoretical Arbitrage
        const opportunities = arbitrage.detect(normalized);
        arbitrageDetected = opportunities.length;
        
        if (arbitrageDetected > 0) {
          logger.info('Theoretical arbitrage detected', { 
            count: arbitrageDetected,
            top_deviations: opportunities
              .sort((a, b) => Math.abs(b.deviation || 0) - Math.abs(a.deviation || 0))
              .slice(0, 3)
              .map(o => ({ id: o.market_id, dev: o.deviation?.toFixed(4) }))
          });
        }

        const durationMs = Date.now() - startTime;
        logger.info('Market scan cycle completed successfully', {
          duration_ms: durationMs,
          markets_scanned: marketsScanned,
          arbitrage_detected: arbitrageDetected,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        const durationMs = Date.now() - startTime;
        logger.error('Market scan cycle failed', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          duration_ms: durationMs,
          markets_scanned_before_failure: marketsScanned,
          phase: marketsScanned === 0 ? 'ingestion' : 'persistence/detection'
        });
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

-- Polymarket Paper Trading Arbitrage Simulator Schema

-- 1. Markets: Reference data for available prediction markets
CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    resolution_source TEXT,
    end_date_iso TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Market Snapshots: Point-in-time orderbook data (bids/asks)
CREATE TABLE IF NOT EXISTS market_snapshots (
    id SERIAL PRIMARY KEY,
    market_id TEXT REFERENCES markets(id) ON DELETE CASCADE,
    bids JSONB NOT NULL, -- Array of [price, size]
    asks JSONB NOT NULL, -- Array of [price, size]
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_snapshots_market_timestamp ON market_snapshots(market_id, timestamp DESC);

-- 3. Arbitrage Opportunities: Detected spreads by the strategy engine
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id SERIAL PRIMARY KEY,
    market_a_id TEXT REFERENCES markets(id),
    market_b_id TEXT REFERENCES markets(id),
    spread_percentage DECIMAL(10, 4) NOT NULL,
    potential_profit DECIMAL(20, 8),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    snapshot_a_id INTEGER REFERENCES market_snapshots(id),
    snapshot_b_id INTEGER REFERENCES market_snapshots(id)
);

-- 4. Balances: Virtual funds for paper trading
CREATE TABLE IF NOT EXISTS balances (
    asset_ticker TEXT PRIMARY KEY, -- e.g., 'USDC'
    amount DECIMAL(20, 8) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Paper Trades: Simulated execution records
CREATE TABLE IF NOT EXISTS paper_trades (
    id SERIAL PRIMARY KEY,
    market_id TEXT REFERENCES markets(id),
    opportunity_id INTEGER REFERENCES arbitrage_opportunities(id),
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    outcome TEXT NOT NULL, -- e.g., 'Yes' or 'No'
    price DECIMAL(10, 4) NOT NULL,
    size DECIMAL(20, 8) NOT NULL,
    status TEXT DEFAULT 'filled' CHECK (status IN ('pending', 'filled', 'cancelled')),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial seed for paper trading balance
INSERT INTO balances (asset_ticker, amount) VALUES ('USDC', 10000.00) ON CONFLICT DO NOTHING;

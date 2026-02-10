# Polymarket Paper Trading Arbitrage Simulator

A production-grade monorepo for simulating arbitrage opportunities on Polymarket.

## Architecture

The system is composed of several services:

- **`market-scanner` (Node.js)**: Responsible for fetching market data from Polymarket API and storing it in the database.
- **`strategy-engine` (Python)**: Analyzes market data to find arbitrage opportunities and simulates paper trading.
- **`db` (PostgreSQL)**: Central data store for market data, opportunities, and paper trading state.

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development)
- Python 3.10+ (for local development)

### Running the System

```bash
docker-compose up --build
```

## Development

### Local Setup (without Docker)

If you wish to run services locally for faster iteration:

#### Database
You can still use Docker for the database:
```bash
docker-compose up db -d
```

#### Market Scanner (Node.js)
```bash
cd services/market-scanner
npm install
npm run dev
```

#### Strategy Engine (Python)
```bash
cd services/strategy-engine
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

## Architecture Details

- **Deterministic Behavior**: All market data is timestamped and stored in PostgreSQL, allowing for reproducible simulation results.
- **Separation of Concerns**: Node.js handles the high-concurrency I/O of market scanning, while Python handles the data-intensive strategy analysis.
- **Paper Trading**: Trades are recorded in the `paper_trades` table and do not interact with any real execution APIs.

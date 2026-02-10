# Service Data Contracts

This document defines the data structures exchanged between services. While services primarily communicate via the PostgreSQL database, these shapes represent the logical contracts between producers and consumers.

## 1. Market Snapshot
**Purpose**: Captures the current state of a market's orderbook.

*   **Producer**: Market Scanner (Node.js)
*   **Consumer**: Strategy Engine (Python), Dashboard (Next.js)
*   **Format**: JSON

### Fields
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `market_id` | `string` | Yes | Unique identifier (from Polymarket) |
| `bids` | `array` | Yes | List of `[price, size]` pairs |
| `asks` | `array` | Yes | List of `[price, size]` pairs |
| `timestamp` | `string` | Yes | ISO 8601 timestamp of the fetch |
| `sequence_id` | `number` | No | Incremental ID for ordering updates |

---

## 2. Arbitrage Opportunity
**Purpose**: Signal that a profitable spread has been detected.

*   **Producer**: Strategy Engine (Python)
*   **Consumer**: Paper Trading Engine (Python), Dashboard (Next.js)
*   **Format**: JSON

### Fields
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `opportunity_id` | `string` | Yes | Unique UUID for this detection |
| `market_a` | `object` | Yes | `{ market_id, side, price }` |
| `market_b` | `object` | Yes | `{ market_id, side, price }` |
| `spread_pct` | `number` | Yes | The calculated spread (e.g., 0.02 for 2%) |
| `estimated_profit` | `number` | Yes | Net profit after hypothetical fees |
| `snapshot_ids` | `array` | Yes | IDs of the snapshots used for calculation |
| `expires_at` | `string` | No | TTL for the opportunity |

---

## 3. Paper Trade Record
**Purpose**: Documentation of a simulated trade execution.

*   **Producer**: Paper Trading Engine (Python)
*   **Consumer**: Dashboard (Next.js)
*   **Format**: JSON

### Fields
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `trade_id` | `string` | Yes | Internal simulation ID |
| `opportunity_id`| `string` | Yes | Reference to the triggering opportunity |
| `market_id` | `string` | Yes | Market where trade occurred |
| `side` | `string` | Yes | `buy` or `sell` |
| `price` | `number` | Yes | Execution price |
| `size` | `number` | Yes | Quantity traded |
| `status` | `string` | Yes | `filled`, `pending`, or `cancelled` |
| `executed_at` | `string` | Yes | ISO 8601 timestamp of execution |

---

## 4. Portfolio State
**Purpose**: Current standing of the paper trading account.

*   **Producer**: Paper Trading Engine (Python)
*   **Consumer**: Dashboard (Next.js)
*   **Format**: JSON

### Fields
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `asset` | `string` | Yes | e.g., `USDC` |
| `total_balance` | `number` | Yes | Settled + locked funds |
| `available_cash`| `number` | Yes | Funds available for new trades |
| `positions` | `array` | Yes | List of `{ market_id, outcome, size, avg_price }` |
| `last_updated` | `string` | Yes | ISO 8601 timestamp |

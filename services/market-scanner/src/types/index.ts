import { z } from 'zod';

// Polymarket API Response Schemas
export const PolymarketTokenSchema = z.object({
  token_id: z.string(),
  outcome: z.string(),
  price: z.coerce.number().nullable().optional(),
});

export const PolymarketMarketSchema = z.object({
  condition_id: z.string().optional(),
  conditionId: z.string().optional(),
  question: z.string().optional(),
  market_slug: z.string().optional(),
  slug: z.string().optional(),
  active: z.boolean().default(true),
  closed: z.boolean().default(false),
  tokens: z.array(PolymarketTokenSchema).default([]),
  liquidity: z.coerce.number().optional().nullable(),
  end_date_iso: z.string().optional().nullable(),
}).passthrough();

export const PolymarketMarketsResponseSchema = z.union([
  z.object({
    data: z.array(PolymarketMarketSchema),
    next_cursor: z.string().optional().nullable(),
  }),
  z.array(PolymarketMarketSchema).transform(data => ({
    data,
    next_cursor: null
  }))
]);

export type PolymarketToken = z.infer<typeof PolymarketTokenSchema>;
export type PolymarketMarket = z.infer<typeof PolymarketMarketSchema>;
export type PolymarketMarketsResponse = z.infer<typeof PolymarketMarketsResponseSchema>;

// Normalized Internal Types
export interface NormalizedMarket {
  market_id: string;
  event_title: string;
  outcome_yes_price: number | null;
  outcome_no_price: number | null;
  liquidity: number | null;
  timestamp: string;
}

export interface ArbitrageOpportunity {
  market_id: string;
  yes_price: number | null;
  no_price: number | null;
  sum: number | null;
  deviation: number | null;
}

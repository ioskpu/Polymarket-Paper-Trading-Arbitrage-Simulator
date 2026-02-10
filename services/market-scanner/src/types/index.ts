import { z } from 'zod';

// Polymarket API Response Schemas
export const PolymarketTokenSchema = z.object({
  token_id: z.string(),
  outcome: z.string(),
  price: z.coerce.number().nullable().optional(),
});

export const PolymarketMarketSchema = z.object({
  id: z.string(),
  question: z.string(),
  condition_id: z.string(),
  slug: z.string(),
  resolution_source: z.string().optional().nullable(),
  end_date_iso: z.string().optional().nullable(),
  active: z.boolean().default(true),
  tokens: z.array(PolymarketTokenSchema),
  liquidity: z.coerce.number().optional().nullable(),
});

export const PolymarketMarketsResponseSchema = z.object({
  data: z.array(PolymarketMarketSchema),
  next_cursor: z.string().optional().nullable(),
});

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

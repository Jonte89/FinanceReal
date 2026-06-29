import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { prisma } from "@/lib/prisma";

// yahoo-finance2 v3 is class-based and must be instantiated.
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface QuoteResult {
  regularMarketPrice?: number;
  currency?: string;
}

export interface StockRow {
  id: string;
  ticker: string;
  shares: number;
  currency: string;
  priceNative: number | null;
  priceSEK: number | null;
  valueSEK: number | null;
  error?: string;
}

async function getSekRate(currency: string, cache: Map<string, number>): Promise<number> {
  if (currency === "SEK") return 1;
  if (cache.has(currency)) return cache.get(currency)!;
  const fx = (await yahooFinance.quote(`${currency}SEK=X`)) as QuoteResult | null;
  const rate = fx?.regularMarketPrice ?? 0;
  cache.set(currency, rate);
  return rate;
}

export async function GET() {
  const holdings = await prisma.stockHolding.findMany({ orderBy: { createdAt: "asc" } });
  const fxCache = new Map<string, number>();

  const rows: StockRow[] = await Promise.all(
    holdings.map(async (h): Promise<StockRow> => {
      try {
        const quote = (await yahooFinance.quote(h.ticker)) as QuoteResult | null;
        const priceNative = quote?.regularMarketPrice ?? null;
        const currency = quote?.currency ?? "SEK";
        if (priceNative == null) {
          return {
            id: h.id, ticker: h.ticker, shares: h.shares, currency,
            priceNative: null, priceSEK: null, valueSEK: null,
            error: "No price available",
          };
        }
        const rate = await getSekRate(currency, fxCache);
        const priceSEK = priceNative * rate;
        return {
          id: h.id, ticker: h.ticker, shares: h.shares, currency,
          priceNative, priceSEK, valueSEK: priceSEK * h.shares,
        };
      } catch {
        return {
          id: h.id, ticker: h.ticker, shares: h.shares, currency: "?",
          priceNative: null, priceSEK: null, valueSEK: null,
          error: "Failed to fetch quote",
        };
      }
    })
  );

  const total = rows.reduce((sum, r) => sum + (r.valueSEK ?? 0), 0);
  return NextResponse.json({ holdings: rows, total });
}

export async function POST(request: Request) {
  const body = await request.json();
  const ticker = typeof body?.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
  const shares = Number(body?.shares);

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }
  if (!Number.isFinite(shares) || shares <= 0) {
    return NextResponse.json({ error: "shares must be a positive number" }, { status: 400 });
  }

  const holding = await prisma.stockHolding.create({ data: { ticker, shares } });
  return NextResponse.json(holding, { status: 201 });
}

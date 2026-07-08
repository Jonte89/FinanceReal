import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// yahoo-finance2 v3 is class-based and must be instantiated.
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface QuoteResult {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
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
  changePercent: number | null;
  error?: string;
}

// Returns null when no FX quote is available (so callers can surface an error
// instead of silently valuing the holding at 0). The cache stores the promise,
// not the value, so concurrent rows share a single FX request per currency.
function getSekRate(currency: string, cache: Map<string, Promise<number | null>>): Promise<number | null> {
  if (currency === "SEK") return Promise.resolve(1);
  let cached = cache.get(currency);
  if (!cached) {
    cached = yahooFinance
      .quote(`${currency}SEK=X`)
      .then((fx) => (fx as QuoteResult | null)?.regularMarketPrice ?? null)
      .catch(() => null);
    cache.set(currency, cached);
  }
  return cached;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const holdings = await prisma.stockHolding.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const fxCache = new Map<string, Promise<number | null>>();

  const rows: StockRow[] = await Promise.all(
    holdings.map(async (h): Promise<StockRow> => {
      try {
        const quote = (await yahooFinance.quote(h.ticker)) as QuoteResult | null;
        const priceNative = quote?.regularMarketPrice ?? null;
        const currency = quote?.currency ?? "SEK";
        const changePercent = quote?.regularMarketChangePercent ?? null;
        if (priceNative == null) {
          return {
            id: h.id, ticker: h.ticker, shares: h.shares, currency,
            priceNative: null, priceSEK: null, valueSEK: null, changePercent: null,
            error: "No price available",
          };
        }
        const rate = await getSekRate(currency, fxCache);
        if (rate == null || rate <= 0) {
          return {
            id: h.id, ticker: h.ticker, shares: h.shares, currency,
            priceNative, priceSEK: null, valueSEK: null, changePercent,
            error: `No ${currency}/SEK rate`,
          };
        }
        const priceSEK = priceNative * rate;
        return {
          id: h.id, ticker: h.ticker, shares: h.shares, currency,
          priceNative, priceSEK, valueSEK: priceSEK * h.shares, changePercent,
        };
      } catch {
        return {
          id: h.id, ticker: h.ticker, shares: h.shares, currency: "?",
          priceNative: null, priceSEK: null, valueSEK: null, changePercent: null,
          error: "Failed to fetch quote",
        };
      }
    })
  );

  const total = rows.reduce((sum, r) => sum + (r.valueSEK ?? 0), 0);
  return NextResponse.json({ holdings: rows, total });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const ticker = typeof body?.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
  const shares = Number(body?.shares);

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }
  if (!Number.isFinite(shares) || shares <= 0) {
    return NextResponse.json({ error: "shares must be a positive number" }, { status: 400 });
  }

  const holding = await prisma.stockHolding.create({ data: { ticker, shares, userId } });
  return NextResponse.json(holding, { status: 201 });
}

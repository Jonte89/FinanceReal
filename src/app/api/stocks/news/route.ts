import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string | null;
}

interface RawNews {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime?: Date | string | number;
  relatedTickers?: string[];
}

function toNewsItem(n: RawNews): NewsItem {
  return {
    uuid: n.uuid,
    title: n.title,
    publisher: n.publisher,
    link: n.link,
    publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime).toISOString() : null,
  };
}

/**
 * Reduce a symbol to its company "root" for relevance matching: drop the
 * exchange suffix (after the last ".") and the share-class suffix (after "-" or
 * a space). e.g. "INVE-B.ST" -> "INVE", "SWED-A.ST" -> "SWED", "EVO.ST" -> "EVO".
 */
function tickerRoot(symbol: string): string {
  return symbol.split(".")[0].split(/[-\s]/)[0].toUpperCase();
}

// Provider / fund-structure words that carry no thematic meaning, so they are
// dropped when deriving a search keyword from an ETF's name.
const FUND_STOPWORDS = new Set([
  "amundi", "ishares", "xtrackers", "spdr", "vanguard", "lyxor", "invesco",
  "wisdomtree", "etf", "etc", "etn", "ucits", "physical", "fund", "trust",
  "index", "acc", "dist", "hedged", "eur", "usd", "gbp", "sek", "plc", "ag",
  "core", "the",
]);

function fundKeywords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9&\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FUND_STOPWORDS.has(w));
}

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.trim();
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  try {
    const quote = await yahooFinance.quote(ticker);
    const name = quote?.longName || quote?.shortName || ticker;
    const isEquity = quote?.quoteType === "EQUITY";

    let news: NewsItem[];

    if (isEquity) {
      // Stocks: search by company name, then keep only items whose
      // relatedTickers point back at this company (drops generic noise).
      const root = tickerRoot(ticker);
      const result = await yahooFinance.search(name, { newsCount: 12, quotesCount: 0 });
      news = (result.news ?? [])
        .filter((n) => (n.relatedTickers ?? []).some((rt) => tickerRoot(rt) === root))
        .slice(0, 5)
        .map(toNewsItem);
    } else {
      // ETFs / commodities aren't tagged with relatedTickers, so we instead
      // search the fund's theme (e.g. "gold") and keep only headlines that
      // actually mention that theme.
      const keywords = fundKeywords(name);
      const query = keywords.join(" ") || name;
      const result = await yahooFinance.search(query, { newsCount: 12, quotesCount: 0 });
      news = (result.news ?? [])
        .filter((n) =>
          keywords.length === 0
            ? true
            : keywords.some((k) => n.title.toLowerCase().includes(k))
        )
        .slice(0, 5)
        .map(toNewsItem);
    }

    return NextResponse.json({ news });
  } catch {
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 502 });
  }
}

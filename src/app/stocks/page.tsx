"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Newspaper, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatSEK } from "@/lib/currency";

interface StockRow {
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

interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string | null;
}

export default function StocksPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");

  // Per-row news, lazily fetched when a holding is expanded.
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newsByTicker, setNewsByTicker] = useState<Record<string, NewsItem[]>>({});
  const [newsLoading, setNewsLoading] = useState<Record<string, boolean>>({});

  async function toggleNews(row: StockRow) {
    if (expanded === row.id) {
      setExpanded(null);
      return;
    }
    setExpanded(row.id);
    if (newsByTicker[row.ticker] || newsLoading[row.ticker]) return; // already loaded/loading

    setNewsLoading((p) => ({ ...p, [row.ticker]: true }));
    try {
      const res = await fetch(`/api/stocks/news?ticker=${encodeURIComponent(row.ticker)}`);
      const data = await res.json();
      setNewsByTicker((p) => ({ ...p, [row.ticker]: data.news ?? [] }));
    } catch {
      setNewsByTicker((p) => ({ ...p, [row.ticker]: [] }));
    }
    setNewsLoading((p) => ({ ...p, [row.ticker]: false }));
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/stocks");
      const data = await res.json();
      setRows(data.holdings ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Could not load prices");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    const numShares = Number(shares);
    if (!ticker.trim()) {
      toast.error("Enter a ticker");
      return;
    }
    if (!Number.isFinite(numShares) || numShares <= 0) {
      toast.error("Enter a valid number of shares");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, shares: numShares }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not add holding");
      return;
    }
    toast.success("Holding added");
    setOpen(false);
    setTicker("");
    setShares("");
    load();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/stocks/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Removed");
      load();
    } else {
      toast.error("Could not remove");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Stock Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Live prices via Yahoo Finance, converted to SEK.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add holding</DialogTitle>
                <DialogDescription>
                  Use the Yahoo Finance symbol, e.g. INVE-B.ST or AAPL.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="ticker">Ticker</Label>
                  <Input
                    id="ticker" value={ticker}
                    onChange={(e) => setTicker(e.target.value)} placeholder="INVE-B.ST"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shares">Shares</Label>
                  <Input
                    id="shares" type="number" min="0" step="any" value={shares}
                    onChange={(e) => setShares(e.target.value)} placeholder="10"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Holdings</CardTitle>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total value</div>
            <div className="text-lg font-bold">{formatSEK(total)}</div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Ticker</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Value (SEK)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Fetching prices…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No holdings yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const isOpen = expanded === r.id;
                  const news = newsByTicker[r.ticker];
                  return (
                    <Fragment key={r.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggleNews(r)}
                      >
                        <TableCell className="text-muted-foreground">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.ticker}
                          {r.currency && r.currency !== "SEK" && r.currency !== "?" && (
                            <Badge variant="outline" className="ml-2">{r.currency}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{r.shares}</TableCell>
                        <TableCell className="text-right">
                          {r.error ? (
                            <span className="text-xs text-red-600">{r.error}</span>
                          ) : r.priceSEK != null ? (
                            formatSEK(r.priceSEK)
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.changePercent != null ? (
                            <span
                              className={
                                r.changePercent < 0 ? "text-red-600" : "text-emerald-600"
                              }
                            >
                              {r.changePercent >= 0 ? "+" : ""}
                              {r.changePercent.toFixed(2)}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {r.valueSEK != null ? formatSEK(r.valueSEK) : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(r.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={7} className="bg-slate-50/60 p-4">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <Newspaper className="h-3.5 w-3.5" />
                              Latest news · {r.ticker}
                            </div>
                            {newsLoading[r.ticker] ? (
                              <p className="py-2 text-sm text-muted-foreground">Loading news…</p>
                            ) : !news || news.length === 0 ? (
                              <p className="py-2 text-sm text-muted-foreground">No recent news found.</p>
                            ) : (
                              <ul className="divide-y divide-slate-200/70">
                                {news.map((n) => (
                                  <li key={n.uuid}>
                                    <a
                                      href={n.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex items-start justify-between gap-3 py-2"
                                    >
                                      <div>
                                        <p className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 group-hover:underline">
                                          {n.title}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                          {n.publisher}
                                          {n.publishedAt &&
                                            ` · ${new Date(n.publishedAt).toLocaleDateString("sv-SE")}`}
                                        </p>
                                      </div>
                                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-emerald-600" />
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

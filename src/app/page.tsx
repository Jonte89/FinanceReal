"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatSEK } from "@/lib/currency";
import { categoryColor, categoryHex } from "@/lib/categories";

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  description: string | null;
  date: string;
}

interface AccentCardProps {
  label: string;
  value: string;
  subtitle: React.ReactNode;
  accent: string; // left border colour
  valueClass?: string;
}

function AccentCard({ label, value, subtitle, accent, valueClass }: AccentCardProps) {
  return (
    <div className={`rounded-lg border-l-4 ${accent} bg-white p-4 shadow-sm`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${valueClass ?? "text-slate-800"}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
    </div>
  );
}

// The pay period runs from the cut-off day of one month to the day before the
// cut-off of the next (e.g. cut-off 25 → "25 Jun – 24 Jul"). Cut-off 1 is a
// plain calendar month. Stored in localStorage under this key.
const CUTOFF_STORAGE_KEY = "periodCutoffDay";
const DEFAULT_CUTOFF_DAY = 25;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// "2026-06" key for the period that *starts* in June 2026. The cut-off is
// clamped to the month's length so e.g. day 28 still works in February.
function periodKey(d: Date, cutoffDay: number): string {
  let y = d.getFullYear();
  let m = d.getMonth();
  if (d.getDate() < Math.min(cutoffDay, daysInMonth(y, m))) {
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function periodLabel(key: string, cutoffDay: number): string {
  const [y, m] = key.split("-").map(Number);
  if (cutoffDay === 1) {
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }
  const start = new Date(y, m - 1, Math.min(cutoffDay, daysInMonth(y, m - 1)));
  const end = new Date(y, m, Math.min(cutoffDay, daysInMonth(y, m)) - 1);
  const short = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${short(start)} – ${short(end)} ${end.getFullYear()}`;
}

function ordinal(n: number): string {
  const suffix = n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${n >= 11 && n <= 13 ? "th" : suffix}`;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const largeArc = end - start <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 0 ${e.x} ${e.y} Z`;
}

interface Slice {
  category: string;
  value: number;
}

function ExpensesPie({ slices, total }: { slices: Slice[]; total: number }) {
  const size = 320;
  const r = 148;
  const cx = size / 2;
  const cy = size / 2;
  const [hovered, setHovered] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  if (total <= 0) {
    return (
      <div className="flex h-[320px] w-[320px] items-center justify-center rounded-full bg-slate-50 text-center text-xs text-slate-400">
        No expenses
        <br />
        this period
      </div>
    );
  }

  // Geometry for each slice. A single category is rendered as a full circle
  // since an arc from 0–360° is degenerate.
  let cumulative = 0;
  const arcs = slices.map((s) => {
    const start = (cumulative / total) * 360;
    cumulative += s.value;
    const end = (cumulative / total) * 360;
    return { ...s, start, end, mid: (start + end) / 2 };
  });

  function sliceStyle(category: string, mid: number): React.CSSProperties {
    const isHover = hovered === category;
    const dim = hovered !== null && !isHover;
    // Nudge the hovered slice outward along its mid-angle for a "pop" effect.
    const offset = isHover ? polar(0, 0, 7, mid) : { x: 0, y: 0 };
    return {
      transform: `translate(${offset.x}px, ${offset.y}px)`,
      transition: "transform 160ms ease, opacity 160ms ease, filter 160ms ease",
      opacity: dim ? 0.45 : 1,
      filter: isHover
        ? "brightness(1.18) drop-shadow(0 2px 5px rgba(0,0,0,0.28))"
        : "none",
      cursor: "pointer",
    };
  }

  function onMove(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const hoveredArc = arcs.find((a) => a.category === hovered);

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        setHovered(null);
        setTip(null);
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.length === 1 ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={categoryHex(arcs[0].category)}
            style={sliceStyle(arcs[0].category, arcs[0].mid)}
            onMouseEnter={() => setHovered(arcs[0].category)}
          />
        ) : (
          arcs.map((a) => (
            <path
              key={a.category}
              d={arcPath(cx, cy, r, a.start, a.end)}
              fill={categoryHex(a.category)}
              stroke="#fff"
              strokeWidth={2}
              style={sliceStyle(a.category, a.mid)}
              onMouseEnter={() => setHovered(a.category)}
            />
          ))
        )}
      </svg>
      {hoveredArc && tip && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          <span className="font-semibold">{hoveredArc.category}</span>
          <span className="ml-1.5 text-slate-300">
            {formatSEK(hoveredArc.value)} · {Math.round((hoveredArc.value / total) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [savingsTotal, setSavingsTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [cutoffDay, setCutoffDay] = useState(DEFAULT_CUTOFF_DAY);
  // null = "current period"; explicit key once the user picks one.
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  // Load the saved cut-off day (client-only to avoid hydration mismatch).
  useEffect(() => {
    const stored = Number(localStorage.getItem(CUTOFF_STORAGE_KEY));
    if (Number.isInteger(stored) && stored >= 1 && stored <= 28) setCutoffDay(stored);
  }, []);

  function updateCutoffDay(day: number) {
    setCutoffDay(day);
    setSelectedPeriod(null); // period boundaries moved; snap back to "now"
    localStorage.setItem(CUTOFF_STORAGE_KEY, String(day));
  }

  useEffect(() => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((txs: Transaction[]) => setTransactions(txs))
      .catch(() => {})
      .finally(() => setLoaded(true));

    fetch("/api/stocks")
      .then((r) => r.json())
      .then((d) => setStockTotal(d.total ?? 0))
      .catch(() => {});

    fetch("/api/savings")
      .then((r) => r.json())
      .then((d) => setSavingsTotal(d.account ? d.total ?? 0 : 0))
      .catch(() => {});
  }, []);

  const currentPeriod = periodKey(new Date(), cutoffDay);

  // Income/expenses for the current pay period (summary cards).
  const { income, expenses } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of transactions) {
      if (periodKey(new Date(t.date), cutoffDay) !== currentPeriod) continue;
      if (t.type === "INCOME") inc += t.amount;
      else exp += t.amount;
    }
    return { income: inc, expenses: exp };
  }, [transactions, cutoffDay, currentPeriod]);

  // Periods that have any transactions, newest first, with the current period
  // always present so the picker is never empty.
  const periodOptions = useMemo(() => {
    const keys = new Set<string>([currentPeriod]);
    for (const t of transactions) keys.add(periodKey(new Date(t.date), cutoffDay));
    return Array.from(keys).sort().reverse();
  }, [transactions, cutoffDay, currentPeriod]);

  const activePeriod = selectedPeriod ?? currentPeriod;

  // Expenses for the selected period, grouped by category and sorted desc.
  const { pieSlices, pieTotal } = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "EXPENSE") continue;
      if (periodKey(new Date(t.date), cutoffDay) !== activePeriod) continue;
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
    }
    const slices = Array.from(byCategory, ([category, value]) => ({ category, value })).sort(
      (a, b) => b.value - a.value
    );
    return { pieSlices: slices, pieTotal: slices.reduce((s, x) => s + x.value, 0) };
  }, [transactions, activePeriod, cutoffDay]);

  const totalBalance = stockTotal + savingsTotal;
  const cashflow = income - expenses;
  const monthLabel = periodLabel(currentPeriod, cutoffDay);
  const maxBar = Math.max(income, expenses, 1);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Dashboard</h1>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Month starts on
          <select
            value={cutoffDay}
            onChange={(e) => updateCutoffDay(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                the {ordinal(d)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AccentCard
          label="Total Wealth"
          value={formatSEK(totalBalance)}
          subtitle="Stocks + savings"
          accent="border-emerald-500"
          valueClass="text-emerald-600"
        />
        <AccentCard
          label="Monthly Income"
          value={formatSEK(income)}
          subtitle={monthLabel}
          accent="border-blue-500"
          valueClass="text-blue-600"
        />
        <AccentCard
          label="Monthly Expenses"
          value={formatSEK(expenses)}
          subtitle={monthLabel}
          accent="border-rose-500"
          valueClass="text-rose-600"
        />
        <AccentCard
          label="Net Cashflow"
          value={formatSEK(cashflow)}
          subtitle="Income − expenses"
          accent="border-amber-500"
          valueClass={cashflow < 0 ? "text-rose-600" : "text-amber-600"}
        />
      </div>

      {/* Expenses by category */}
      <div className="rounded-lg border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Expenses by Category</h2>
          <select
            value={activePeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {periodOptions.map((key) => (
              <option key={key} value={key}>
                {periodLabel(key, cutoffDay)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col items-center justify-center gap-8 sm:flex-row sm:items-center lg:gap-16">
          <ExpensesPie slices={pieSlices} total={pieTotal} />
          <div className="w-full space-y-2 sm:w-80">
            {pieTotal <= 0 ? (
              <p className="text-sm text-slate-400">No expenses recorded for this period.</p>
            ) : (
              <>
                {pieSlices.map((s) => (
                  <div key={s.category} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <span className={`h-2.5 w-2.5 rounded-full ${categoryColor(s.category)}`} />
                      {s.category}
                    </span>
                    <span className="text-slate-700">
                      <span className="font-medium">{formatSEK(s.value)}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        {Math.round((s.value / pieTotal) * 100)}%
                      </span>
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold text-slate-800">
                  <span>Total</span>
                  <span>{formatSEK(pieTotal)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lower panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Income vs Expenses */}
        <div className="rounded-lg border border-slate-200/70 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-slate-800">Income vs Expenses</h2>
          <div className="space-y-5">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Income</span>
                <span className="font-medium text-emerald-600">{formatSEK(income)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${(income / maxBar) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Expenses</span>
                <span className="font-medium text-rose-600">{formatSEK(expenses)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all"
                  style={{ width: `${(expenses / maxBar) * 100}%` }}
                />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
              {monthLabel} · net {formatSEK(cashflow)}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-lg border border-slate-200/70 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Recent Transactions</h2>
          {!loaded ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No transactions yet.{" "}
              <Link href="/transactions" className="text-emerald-600 hover:underline">
                Add one →
              </Link>
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-left font-medium">Description</th>
                  <th className="pb-2 text-left font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 8).map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="py-2.5 whitespace-nowrap text-slate-500">
                      {new Date(t.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="py-2.5 text-slate-700">{t.description ?? t.category}</td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <span className={`h-2 w-2 rounded-full ${categoryColor(t.category)}`} />
                        {t.category}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 text-right font-medium ${
                        t.type === "INCOME" ? "text-emerald-600" : "text-slate-700"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatSEK(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

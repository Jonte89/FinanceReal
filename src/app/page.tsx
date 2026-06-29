"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatSEK } from "@/lib/currency";
import { categoryColor } from "@/lib/categories";

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

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [stockTotal, setStockTotal] = useState(0);
  const [savingsTotal, setSavingsTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((txs: Transaction[]) => {
        setTransactions(txs);
        const now = new Date();
        const m = now.getMonth();
        const y = now.getFullYear();
        let inc = 0;
        let exp = 0;
        for (const t of txs) {
          const d = new Date(t.date);
          if (d.getMonth() === m && d.getFullYear() === y) {
            if (t.type === "INCOME") inc += t.amount;
            else exp += t.amount;
          }
        }
        setIncome(inc);
        setExpenses(exp);
      })
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

  const totalBalance = stockTotal + savingsTotal;
  const cashflow = income - expenses;
  const monthLabel = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const maxBar = Math.max(income, expenses, 1);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-800">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AccentCard
          label="Total Balance"
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

"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatSEK } from "@/lib/currency";
import { CATEGORIES, categoryColor } from "@/lib/categories";
import { evaluateExpression } from "@/lib/expression";
import { AccentCard } from "@/components/accent-card";

interface Transaction {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  description: string | null;
}

const todayInput = () => new Date().toISOString().slice(0, 10);

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(todayInput());
  const [description, setDescription] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  // history filters
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      setTransactions(await res.json());
    } catch {
      toast.error("Could not load transactions");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    const evaluated = evaluateExpression(amount);
    if (evaluated === null || evaluated <= 0) {
      toast.error("Enter a valid positive amount or expression");
      return;
    }
    // Round to cents to avoid floating-point noise from division.
    const value = Math.round(evaluated * 100) / 100;
    setSaving(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: value, category, date, description }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save transaction");
      return;
    }
    toast.success("Transaction added");
    setOpen(false);
    setAmount("");
    setDescription("");
    setDate(todayInput());
    load();
  }

  async function handleDelete(tx: Transaction) {
    const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete");
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
    toast.success("Transaction deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          // Recreate the transaction (it gets a fresh id).
          const restore = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: tx.type,
              amount: tx.amount,
              category: tx.category,
              date: tx.date,
              description: tx.description ?? "",
            }),
          });
          if (restore.ok) {
            toast.success("Restored");
            load();
          } else {
            toast.error("Could not restore");
          }
        },
      },
    });
  }

  const rawPreview = evaluateExpression(amount);
  const amountPreview = rawPreview === null ? null : Math.round(rawPreview * 100) / 100;

  const visibleTransactions = transactions.filter(
    (t) =>
      (filterType === "ALL" || t.type === filterType) &&
      (filterCategory === "ALL" || t.category === filterCategory)
  );
  const filtersActive = filterType !== "ALL" || filterCategory !== "ALL";

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);
  const netCashFlow = totalIncome - totalExpense;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Transactions</h1>
          <p className="text-sm text-muted-foreground">Income and expenses in SEK.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              amountRef.current?.focus();
            }}
          >
            <DialogHeader>
              <DialogTitle>Add transaction</DialogTitle>
              <DialogDescription>Record a new income or expense.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd();
              }}
            >
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as "INCOME" | "EXPENSE")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (SEK)</Label>
                <Input
                  ref={amountRef}
                  id="amount" type="text" inputMode="text" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100 + 50 * 2"
                />
                {amountPreview !== null && (
                  <p className="text-xs text-muted-foreground">= {formatSEK(amountPreview)}</p>
                )}
                {amount.trim() !== "" && amountPreview === null && (
                  <p className="text-xs text-rose-600">Invalid expression</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description (optional)</Label>
                <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <AccentCard
          label="Income"
          value={formatSEK(totalIncome)}
          subtitle="All income"
          accent="border-emerald-500"
          valueClass="text-emerald-600"
        />
        <AccentCard
          label="Expenses"
          value={formatSEK(totalExpense)}
          subtitle="All expenses"
          accent="border-rose-500"
          valueClass="text-rose-600"
        />
        <AccentCard
          label="Net Cash Flow"
          value={formatSEK(netCashFlow)}
          subtitle="Income − expenses"
          accent="border-amber-500"
          valueClass={netCashFlow < 0 ? "text-rose-600" : "text-amber-600"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">History</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filterType}
              onValueChange={(v) => setFilterType(v as "ALL" | "INCOME" | "EXPENSE")}
            >
              <SelectTrigger className="h-8 w-[130px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expenses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-[160px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={() => {
                  setFilterType("ALL");
                  setFilterCategory("ALL");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : visibleTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {filtersActive ? "No transactions match the filters." : "No transactions yet."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString("sv-SE")}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <span className={`h-2 w-2 rounded-full ${categoryColor(t.category)}`} />
                        {t.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.description ?? "—"}</TableCell>
                    <TableCell
                      className={
                        t.type === "INCOME"
                          ? "text-right font-medium text-emerald-600"
                          : "text-right font-medium text-rose-600"
                      }
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatSEK(t.amount)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

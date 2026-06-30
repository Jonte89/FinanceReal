"use client";

import { useEffect, useState } from "react";
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

interface Transaction {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  description: string | null;
}

const todayInput = () => new Date().toISOString().slice(0, 10);

interface AccentCardProps {
  label: string;
  value: string;
  subtitle: string;
  accent: string;
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

  async function load() {
    setLoading(true);
    const res = await fetch("/api/transactions");
    setTransactions(await res.json());
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

  async function handleDelete(id: string) {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success("Deleted");
    } else {
      toast.error("Could not delete");
    }
  }

  const rawPreview = evaluateExpression(amount);
  const amountPreview = rawPreview === null ? null : Math.round(rawPreview * 100) / 100;

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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add transaction</DialogTitle>
              <DialogDescription>Record a new income or expense.</DialogDescription>
            </DialogHeader>
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
                  id="amount" type="text" inputMode="text" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100 + 50 * 2"
                />
                {amountPreview !== null && (
                  <p className="text-xs text-muted-foreground">= {formatSEK(amountPreview)}</p>
                )}
                {amount.trim() !== "" && amountPreview === null && (
                  <p className="text-xs text-red-600">Invalid expression</p>
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
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
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
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
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
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
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
                          : "text-right font-medium text-red-600"
                      }
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatSEK(t.amount)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
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

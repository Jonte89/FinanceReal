"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { AccentCard } from "@/components/accent-card";

interface SavingsAccount {
  id: string;
  name: string;
  principalBalance: number;
  accruedInterest: number;
  lastCalculatedDate: string;
}

interface SavingsTransaction {
  id: string;
  date: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
}

interface SavingsData {
  account: SavingsAccount | null;
  total?: number;
  annualRate?: number;
  history?: SavingsTransaction[];
}

export default function SavingsPage() {
  const [data, setData] = useState<SavingsData | null>(null);
  const [loading, setLoading] = useState(true);

  // setup form
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingInterest, setOpeningInterest] = useState("");
  const [settingUp, setSettingUp] = useState(false);

  // deposit/withdraw dialog
  const [open, setOpen] = useState(false);
  const [txType, setTxType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/savings");
      setData(await res.json());
    } catch {
      toast.error("Could not load savings account");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSetup() {
    const principal = Number(openingBalance);
    const interest = Number(openingInterest || "0");
    if (!Number.isFinite(principal) || principal < 0) {
      toast.error("Enter a valid opening balance");
      return;
    }
    setSettingUp(true);
    const res = await fetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ principalBalance: principal, accruedInterest: interest }),
    });
    setSettingUp(false);
    if (!res.ok) {
      toast.error("Could not create account");
      return;
    }
    toast.success("Savings account created");
    load();
  }

  async function handleTx() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/savings/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: txType, amount: value }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Could not save");
      return;
    }
    toast.success(txType === "DEPOSIT" ? "Deposit recorded" : "Withdrawal recorded");
    setOpen(false);
    setAmount("");
    load();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  // ---- Setup state ----
  if (!data?.account) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Nordiska Flex Plus</h1>
          <p className="text-sm text-muted-foreground">Set up your savings account to start tracking.</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opening balance</CardTitle>
            <CardDescription>
              Enter the balance as of today. Interest accrues daily from now on.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSetup();
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="balance">Principal balance (SEK)</Label>
                <Input
                  id="balance" type="number" min="0" step="0.01" inputMode="decimal" value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)} placeholder="50000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="interest">Accrued interest to date (SEK, optional)</Label>
                <Input
                  id="interest" type="number" min="0" step="0.01" inputMode="decimal" value={openingInterest}
                  onChange={(e) => setOpeningInterest(e.target.value)} placeholder="0"
                />
              </div>
              <Button type="submit" disabled={settingUp}>
                {settingUp ? "Creating…" : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Active account ----
  const { account, total = 0, annualRate = 0.02, history = [] } = data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{account.name}</h1>
          <p className="text-sm text-muted-foreground">
            Interest updated through {new Date(account.lastCalculatedDate).toLocaleDateString("sv-SE")}.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Deposit / Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              amountRef.current?.focus();
            }}
          >
            <DialogHeader>
              <DialogTitle>Move money</DialogTitle>
              <DialogDescription>Record a deposit or withdrawal.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTx();
              }}
            >
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={txType} onValueChange={(v) => setTxType(v as "DEPOSIT" | "WITHDRAWAL")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tx-amount">Amount (SEK)</Label>
                <Input
                  ref={amountRef}
                  id="tx-amount" type="number" min="0" step="0.01" inputMode="decimal" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                />
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
          label="Total value"
          value={formatSEK(total)}
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                {(annualRate * 100).toFixed(2).replace(".", ",")}% annual rate
              </span>
              ≈ {formatSEK(total * annualRate)}/year
            </span>
          }
          accent="border-emerald-500"
          valueClass="text-emerald-600"
        />
        <AccentCard
          label="Principal"
          value={formatSEK(account.principalBalance)}
          subtitle="Capitalised on Dec 31"
          accent="border-blue-500"
          valueClass="text-blue-600"
        />
        <AccentCard
          label="Accrued interest"
          value={formatSEK(account.accruedInterest)}
          subtitle="Awaiting capitalisation"
          accent="border-amber-500"
          valueClass="text-amber-600"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deposits & withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No deposits or withdrawals yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{new Date(h.date).toLocaleDateString("sv-SE")}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          h.type === "DEPOSIT"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }
                      >
                        {h.type === "DEPOSIT" ? "Deposit" : "Withdrawal"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={
                        h.type === "DEPOSIT"
                          ? "text-right font-medium text-emerald-600"
                          : "text-right font-medium text-rose-600"
                      }
                    >
                      {h.type === "DEPOSIT" ? "+" : "−"}
                      {formatSEK(h.amount)}
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

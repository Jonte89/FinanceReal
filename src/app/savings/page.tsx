"use client";

import { useEffect, useState } from "react";
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

  async function load() {
    setLoading(true);
    const res = await fetch("/api/savings");
    setData(await res.json());
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
      <div className="mx-auto max-w-3xl">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  // ---- Setup state ----
  if (!data?.account) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Nordiska Flex Plus</h1>
          <p className="text-sm text-muted-foreground">Set up your savings account to start tracking.</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opening balance</CardTitle>
            <CardDescription>
              Enter the balance as of today. Interest accrues daily from now on.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="balance">Principal balance (SEK)</Label>
              <Input
                id="balance" type="number" min="0" step="0.01" value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)} placeholder="50000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interest">Accrued interest to date (SEK, optional)</Label>
              <Input
                id="interest" type="number" min="0" step="0.01" value={openingInterest}
                onChange={(e) => setOpeningInterest(e.target.value)} placeholder="0"
              />
            </div>
            <Button onClick={handleSetup} disabled={settingUp}>
              {settingUp ? "Creating…" : "Create account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Active account ----
  const { account, total = 0, annualRate = 0.02, history = [] } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{account.name}</h1>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move money</DialogTitle>
              <DialogDescription>Record a deposit or withdrawal.</DialogDescription>
            </DialogHeader>
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
                  id="tx-amount" type="number" min="0" step="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleTx} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSEK(total)}</div>
            <Badge variant="secondary" className="mt-2">
              {(annualRate * 100).toFixed(2).replace(".", ",")}% rate
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Principal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSEK(account.principalBalance)}</div>
            <CardDescription className="mt-1">Capitalised on Dec 31</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accrued interest</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatSEK(account.accruedInterest)}
            </div>
            <CardDescription className="mt-1">Awaiting capitalisation</CardDescription>
          </CardContent>
        </Card>
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
                      <Badge variant={h.type === "DEPOSIT" ? "default" : "secondary"}>
                        {h.type === "DEPOSIT" ? "Deposit" : "Withdrawal"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={
                        h.type === "DEPOSIT"
                          ? "text-right font-medium text-emerald-600"
                          : "text-right font-medium text-red-600"
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

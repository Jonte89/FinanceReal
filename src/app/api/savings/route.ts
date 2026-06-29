import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accrueSavings, annualRateFor } from "@/lib/savings";

export async function GET() {
  const account = await prisma.savingsAccount.findFirst();
  if (!account) {
    return NextResponse.json({ account: null });
  }

  // Roll the balances forward to today and persist any change.
  const updated = accrueSavings({
    principalBalance: account.principalBalance,
    accruedInterest: account.accruedInterest,
    lastCalculatedDate: account.lastCalculatedDate,
  });

  const saved = await prisma.savingsAccount.update({
    where: { id: account.id },
    data: {
      principalBalance: updated.principalBalance,
      accruedInterest: updated.accruedInterest,
      lastCalculatedDate: updated.lastCalculatedDate,
    },
  });

  const history = await prisma.savingsTransaction.findMany({ orderBy: { date: "desc" } });
  const total = saved.principalBalance + saved.accruedInterest;

  return NextResponse.json({
    account: saved,
    total,
    annualRate: annualRateFor(saved.principalBalance),
    history,
  });
}

export async function POST(request: Request) {
  const existing = await prisma.savingsAccount.findFirst();
  if (existing) {
    return NextResponse.json({ error: "Account already exists" }, { status: 409 });
  }

  const body = await request.json();
  const principalBalance = Number(body?.principalBalance);
  const accruedInterest = Number(body?.accruedInterest ?? 0);

  if (!Number.isFinite(principalBalance) || principalBalance < 0) {
    return NextResponse.json({ error: "principalBalance must be a non-negative number" }, { status: 400 });
  }
  if (!Number.isFinite(accruedInterest) || accruedInterest < 0) {
    return NextResponse.json({ error: "accruedInterest must be a non-negative number" }, { status: 400 });
  }

  const account = await prisma.savingsAccount.create({
    data: {
      principalBalance,
      accruedInterest,
      lastCalculatedDate: new Date(),
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}

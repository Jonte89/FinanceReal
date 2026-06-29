import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accrueSavings } from "@/lib/savings";

export async function POST(request: Request) {
  const account = await prisma.savingsAccount.findFirst();
  if (!account) {
    return NextResponse.json({ error: "Set up the savings account first" }, { status: 400 });
  }

  const body = await request.json();
  const type = body?.type;
  const amount = Number(body?.amount);

  if (type !== "DEPOSIT" && type !== "WITHDRAWAL") {
    return NextResponse.json({ error: "type must be DEPOSIT or WITHDRAWAL" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  // Accrue up to today before mutating the principal so interest is correct.
  const accrued = accrueSavings({
    principalBalance: account.principalBalance,
    accruedInterest: account.accruedInterest,
    lastCalculatedDate: account.lastCalculatedDate,
  });

  const delta = type === "DEPOSIT" ? amount : -amount;
  const newPrincipal = accrued.principalBalance + delta;

  if (newPrincipal < 0) {
    return NextResponse.json({ error: "Withdrawal exceeds available balance" }, { status: 400 });
  }

  const [, updated] = await prisma.$transaction([
    prisma.savingsTransaction.create({
      data: { date: new Date(), type, amount },
    }),
    prisma.savingsAccount.update({
      where: { id: account.id },
      data: {
        principalBalance: newPrincipal,
        accruedInterest: accrued.accruedInterest,
        lastCalculatedDate: accrued.lastCalculatedDate,
      },
    }),
  ]);

  return NextResponse.json({ account: updated }, { status: 201 });
}

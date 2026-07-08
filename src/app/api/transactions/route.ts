import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { date, type, amount, category, description } = body ?? {};

  if (type !== "INCOME" && type !== "EXPENSE") {
    return NextResponse.json({ error: "type must be INCOME or EXPENSE" }, { status: 400 });
  }
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (!category || typeof category !== "string") {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  const parsedDate = date ? new Date(date) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "date is invalid" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      date: parsedDate,
      type,
      amount: parsedAmount,
      category,
      description: description || null,
      userId,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}

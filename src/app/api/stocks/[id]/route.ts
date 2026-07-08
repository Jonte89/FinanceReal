import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  // deleteMany so the userId filter applies: you can only delete your own rows.
  const { count } = await prisma.stockHolding.deleteMany({ where: { id, userId } });
  if (count === 0) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

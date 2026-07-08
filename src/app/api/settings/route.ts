import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const DEFAULT_CUTOFF_DAY = 25;

// Each user has (at most) one AppSetting row, keyed by userId.

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const setting = await prisma.appSetting.findUnique({ where: { userId } });
  return NextResponse.json({
    cutoffDay: setting?.cutoffDay ?? DEFAULT_CUTOFF_DAY,
    persisted: setting !== null,
  });
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const cutoffDay = Number(body?.cutoffDay);

  if (!Number.isInteger(cutoffDay) || cutoffDay < 1 || cutoffDay > 28) {
    return NextResponse.json(
      { error: "cutoffDay must be an integer between 1 and 28" },
      { status: 400 }
    );
  }

  const setting = await prisma.appSetting.upsert({
    where: { userId },
    update: { cutoffDay },
    create: { cutoffDay, userId },
  });

  return NextResponse.json({ cutoffDay: setting.cutoffDay, persisted: true });
}

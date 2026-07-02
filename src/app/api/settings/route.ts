import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_CUTOFF_DAY = 25;

// App-wide settings live in a single AppSetting row (id "main").

export async function GET() {
  const setting = await prisma.appSetting.findUnique({ where: { id: "main" } });
  return NextResponse.json({
    cutoffDay: setting?.cutoffDay ?? DEFAULT_CUTOFF_DAY,
    persisted: setting !== null,
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const cutoffDay = Number(body?.cutoffDay);

  if (!Number.isInteger(cutoffDay) || cutoffDay < 1 || cutoffDay > 28) {
    return NextResponse.json(
      { error: "cutoffDay must be an integer between 1 and 28" },
      { status: 400 }
    );
  }

  const setting = await prisma.appSetting.upsert({
    where: { id: "main" },
    update: { cutoffDay },
    create: { id: "main", cutoffDay },
  });

  return NextResponse.json({ cutoffDay: setting.cutoffDay, persisted: true });
}

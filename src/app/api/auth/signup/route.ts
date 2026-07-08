import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Signup is invite-only: INVITE_CODE must be set in the environment and
// match. In dev (no INVITE_CODE, not production) signup is open for
// convenience.
export async function POST(request: Request) {
  const body = await request.json();
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode.trim() : "";

  const expectedCode = process.env.INVITE_CODE;
  if (expectedCode) {
    if (inviteCode !== expectedCode) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Signup is disabled" }, { status: 403 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });

  await createSession(user.id);
  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}

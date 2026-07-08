import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session";

// Server-side auth helpers for route handlers. The proxy only does an
// optimistic cookie check; every API route must call requireUserId() itself.

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return Promise.resolve(false); // e.g. the unclaimable "legacy" user
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await signSessionToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The logged-in user's id, or null when there is no valid session. */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

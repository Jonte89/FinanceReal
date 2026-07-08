import { SignJWT, jwtVerify } from "jose";

// Stateless session tokens (JWT signed with SESSION_SECRET). This module is
// edge-safe (jose only, no Node-only deps) so the proxy can import it too.

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production");
    }
    // Dev fallback so the app runs without setup; never used in production.
    return new TextEncoder().encode("insecure-dev-secret");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setSubject(userId)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Returns the userId the token was issued for, or null if invalid/expired. */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup" ? { email, password, inviteCode } : { email, password }
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Something went wrong");
        return;
      }
      // Only allow internal redirect targets from ?from=.
      const from = searchParams.get("from");
      router.push(from?.startsWith("/") && !from.startsWith("//") ? from : "/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-teal-500 text-sm font-bold text-white">
            FT
          </div>
          <CardTitle>{mode === "login" ? "Welcome back" : "Create your account"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Sign in to your wealth tracker"
              : "You need an invite code to sign up"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="inviteCode">Invite code</Label>
                <Input
                  id="inviteCode"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Have an invite code?{" "}
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-4"
                  onClick={() => setMode("signup")}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-4"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary during prerendering.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

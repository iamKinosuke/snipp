"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiError, login, register } from "@/lib/api";
import { MIN_PASSWORD_LENGTH } from "@/lib/config";
import { saveSession } from "@/lib/session-client";

type Mode = "login" | "signup";

const COPY = {
  login: {
    title: "Sign in",
    description: "Open your dashboard to see your links and their analytics.",
    submit: "Sign in",
    submitting: "Signing in",
    switchPrompt: "No account yet?",
    switchLabel: "Create one",
    switchHref: "/app/signup",
  },
  signup: {
    title: "Create account",
    description: "Keep a history of your links and track clicks over time.",
    submit: "Create account",
    submitting: "Creating account",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/app/login",
  },
} as const satisfies Record<Mode, unknown>;

export function AuthForm({ mode, notice }: { mode: Mode; notice?: string }) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const copy = COPY[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const credentials = { email: email.trim(), password };
      const session =
        mode === "signup"
          ? await register(credentials)
          : await login(credentials);

      saveSession({ token: session.token, email: session.user.email });
      router.replace("/app");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Something went wrong. Please try again.",
      );
      setPassword("");
      setSubmitting(false);
    }
  }

  const canSubmit =
    email.trim() !== "" &&
    password.length >= (mode === "signup" ? MIN_PASSWORD_LENGTH : 1);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {notice !== undefined ? (
            <p className="text-muted-foreground border-border bg-muted/40 rounded-md border px-3 py-2.5 text-sm">
              {notice}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                type="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter Email Address"
                required
                autoComplete="email"
                autoFocus
                aria-invalid={error !== null}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={passwordId}>Password</Label>
              <PasswordInput
                id={passwordId}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter Password"
                required
                minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                aria-invalid={error !== null}
              />
              {mode === "signup" ? (
                <p className="text-muted-foreground text-xs">
                  At least {MIN_PASSWORD_LENGTH} characters.
                </p>
              ) : null}
            </div>

            {error !== null ? <Alert>{error}</Alert> : null}

            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !canSubmit}
              className="mt-1 w-full"
            >
              {submitting ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  {copy.submitting}
                </>
              ) : (
                copy.submit
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-sm">
        {copy.switchPrompt}{" "}
        <Link
          href={copy.switchHref}
          className="text-foreground decoration-border hover:decoration-foreground font-medium underline underline-offset-4 transition-colors duration-150"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}

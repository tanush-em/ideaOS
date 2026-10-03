"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Sparkles, Mail, ArrowLeft } from "lucide-react";
import { signInWithEmail } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthState = { error?: string; success?: boolean } | null;

async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  return signInWithEmail(formData);
}

export function LoginForm({ redirect }: { redirect: string }) {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to IdeaOS</CardTitle>
            <CardDescription>
              Sign in with a magic link — no password needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state?.success ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center text-sm">
                <Mail className="mx-auto mb-2 size-8 text-primary" />
                <p className="font-medium">Check your email</p>
                <p className="mt-1 text-muted-foreground">
                  We sent you a magic link to sign in.
                </p>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="redirect" value={redirect} />
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="founder@startup.com"
                    required
                    autoComplete="email"
                  />
                </div>
                {state?.error && (
                  <p className="text-sm text-destructive">{state.error}</p>
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Sending link…" : "Send magic link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

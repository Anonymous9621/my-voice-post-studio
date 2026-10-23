import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { pageMeta } from "@/lib/seo";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => pageMeta("Sign in", "Sign in or create your MyVoice AI account."),
  component: AuthPage,
});

/** Only allow same-origin relative paths as post-login targets. */
function safeRedirect(value?: string) {
  if (!value) return "/dashboard";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "/dashboard";
    const path = url.pathname + url.search;
    return path.startsWith("/auth") ? "/dashboard" : path;
  } catch {
    return "/dashboard";
  }
}

type View = "signin" | "signup" | "forgot" | "check-email" | "reset-sent";

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [view, setView] = useState<View>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google" | "lovable">(null);
  const [error, setError] = useState<string | null>(null);

  const goNext = () => navigate({ href: safeRedirect(search.redirect), replace: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goNext();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) goNext();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (view !== "forgot" && password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy("email");
    try {
      if (view === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { display_name: name.trim() || undefined },
          },
        });
        if (error) throw error;
        if (!data.session) setView("check-email");
      } else if (view === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (view === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setView("reset-sent");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function social(provider: "google" | "lovable") {
    setBusy(provider);
    setError(null);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      setBusy(null);
      toast.error(result.error.message || "Sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    setBusy(null);
    goNext();
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          {view === "check-email" || view === "reset-sent" ? (
            <div className="animate-fade-up text-center">
              <span className="mx-auto mb-5 inline-flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-accent-foreground">
                <MailCheck className="size-5" />
              </span>
              <h1 className="font-display text-4xl">Check your inbox</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {view === "check-email"
                  ? `We sent a confirmation link to ${email}. Open it to activate your account.`
                  : `If an account exists for ${email}, you'll get a link to reset your password.`}
              </p>
              <Button variant="ghost" className="mt-6" onClick={() => setView("signin")}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <div className="animate-fade-up">
              <h1 className="font-display text-[42px] leading-none">
                {view === "signup" ? "Create your account" : view === "forgot" ? "Reset password" : "Welcome back"}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {view === "signup"
                  ? "Start free. No card needed."
                  : view === "forgot"
                    ? "We'll email you a link to choose a new password."
                    : "Sign in to keep writing in your voice."}
              </p>

              {view !== "forgot" && (
                <div className="mt-8 space-y-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    disabled={busy !== null}
                    onClick={() => social("google")}
                  >
                    {busy === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
                    Continue with Google
                  </Button>
                  <button
                    type="button"
                    className="lovable-auth-button w-full"
                    disabled={busy !== null}
                    onClick={() => social("lovable")}
                  >
                    Continue with Lovable
                  </button>
                  <div className="flex items-center gap-3 py-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
                  </div>
                </div>
              )}

              <form onSubmit={onSubmit} className={view === "forgot" ? "mt-8 space-y-4" : "space-y-4"} noValidate>
                {view === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-11" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="h-11"
                    required
                  />
                </div>
                {view !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {view === "signin" && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setView("forgot")}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={view === "signup" ? "new-password" : "current-password"}
                      className="h-11"
                      required
                    />
                  </div>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="h-11 w-full" disabled={busy !== null}>
                  {busy === "email" && <Loader2 className="animate-spin" />}
                  {view === "signup" ? "Create account" : view === "forgot" ? "Send reset link" : "Sign in"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {view === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button className="font-medium text-foreground hover:underline" onClick={() => setView("signin")}>
                      Sign in
                    </button>
                  </>
                ) : view === "forgot" ? (
                  <button className="font-medium text-foreground hover:underline" onClick={() => setView("signin")}>
                    Back to sign in
                  </button>
                ) : (
                  <>
                    New to MyVoice?{" "}
                    <button className="font-medium text-foreground hover:underline" onClick={() => setView("signup")}>
                      Create an account
                    </button>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l bg-secondary lg:block">
        <div className="absolute inset-0 bg-paper" />
        <div className="relative flex h-full flex-col justify-center px-16">
          <p className="font-display text-5xl leading-[1.05] text-foreground">
            “Finally, captions that <em className="text-brand">sound like me</em> — not a robot.”
          </p>
          <div className="mt-10 max-w-md rounded-2xl border bg-card p-5 shadow-lift">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">My Voice draft</p>
            <p className="mt-3 text-[15px] font-medium text-foreground">okay this batch came out of the kiln looking unreal.</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              speckled glaze, a little wobbly on purpose, and exactly the size of my morning coffee. only six of these
              so I'm not overthinking it.
            </p>
            <p className="mt-3 text-sm text-foreground">link's in bio if one needs a home ☕</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h5.9a5.05 5.05 0 0 1-2.2 3.3v2.75h3.55c2.08-1.92 3.25-4.74 3.25-8.08Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.55-2.75c-.98.66-2.24 1.05-3.73 1.05-2.87 0-5.3-1.94-6.17-4.54H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.83 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.65-2.84Z" />
      <path fill="#EA4335" d="M12 5.35c1.62 0 3.07.56 4.21 1.65l3.15-3.15A10.97 10.97 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.65 2.84C6.7 7.29 9.13 5.35 12 5.35Z" />
    </svg>
  );
}

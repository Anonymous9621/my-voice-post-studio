import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Feather, Fingerprint, MessageCircle, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyVoice AI — Marketing posts that sound like you wrote them" },
      {
        name: "description",
        content:
          "Paste a few of your posts. MyVoice AI learns your tone and drafts social posts for your products that sound like you, not a robot.",
      },
      { property: "og:title", content: "MyVoice AI — Marketing posts that sound like you wrote them" },
      {
        property: "og:description",
        content: "Social posts for creators and small businesses, in your own writing style.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

function Landing() {
  const signedIn = useSignedIn();
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-paper">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo />
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild>
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Start free
                  </Link>
                </Button>
              </>
            )}
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div className="animate-fade-up">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-brand" /> For creators, sellers and small businesses
            </p>
            <h1 className="font-display text-[56px] leading-[0.98] text-balance text-foreground sm:text-7xl">
              Marketing posts that sound like <em className="text-brand">you</em> wrote them.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Paste a few of your own posts. MyVoice learns your tone, words and rhythm, then drafts captions for your
              products — without the generic AI gloss.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="brand">
                <Link to={signedIn ? "/dashboard" : "/auth"} search={signedIn ? undefined : { mode: "signup" }}>
                  Find my voice <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">How it works</a>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">Free plan · no card needed</p>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="surface rotate-[-1.5deg] p-5 opacity-80">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Generic AI</p>
              <p className="mt-2 text-sm text-muted-foreground line-through decoration-brand/60">
                ✨ Elevate your mornings with our game-changing ceramic mug! ☕🔥 Say goodbye to boring coffee and
                unlock a whole new level of cozy. 🙌
              </p>
            </div>
            <div className="surface relative -mt-3 ml-6 rotate-[1deg] p-6 shadow-lift">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent-foreground">My Voice</p>
                <Feather className="size-4 text-brand" />
              </div>
              <p className="mt-3 text-[17px] font-semibold leading-snug">okay this batch came out of the kiln looking unreal.</p>
              <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">
                speckled glaze, a little wobbly on purpose, and exactly the size of my morning coffee. only six of these
                so I'm not overthinking it.
              </p>
              <p className="mt-3 text-[15px] font-medium">link's in bio if one needs a home ☕</p>
            </div>
          </div>
        </section>
      </div>

      <section id="how" className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="max-w-xl font-display text-5xl leading-none">Three steps. Your words.</h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              {
                icon: Fingerprint,
                title: "Teach it your style",
                text: "Paste a handful of your posts. We map your tone, vocabulary, sentence length, emoji habits and favorite phrases.",
              },
              {
                icon: Camera,
                title: "Describe the product",
                text: "Add the details, the offer and an optional photo. We only use facts you confirm — no invented prices or claims.",
              },
              {
                icon: Sparkles,
                title: "Pick, edit, post",
                text: "Get three different posts with a hook, caption, call to action and visual idea. Edit, regenerate or save.",
              },
            ].map(({ icon: Icon, title, text }, i) => (
              <div key={title}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-soft text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-2xl text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="surface p-8">
            <Feather className="size-5 text-brand" />
            <h3 className="mt-4 font-display text-3xl">My Voice</h3>
            <p className="mt-2 text-muted-foreground">
              Follows your saved writing style. Close to how you write — you stay the editor, because no tool can copy a
              voice perfectly.
            </p>
          </div>
          <div className="surface p-8">
            <MessageCircle className="size-5 text-brand" />
            <h3 className="mt-4 font-display text-3xl">Natural</h3>
            <p className="mt-2 text-muted-foreground">
              No style yet? Get clear, conversational copy without clichés, emoji overload or robotic hooks.
            </p>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-center text-center">
          <h2 className="font-display text-5xl leading-none text-balance">Sound like yourself, faster.</h2>
          <Button asChild size="lg" variant="brand" className="mt-8">
            <Link to={signedIn ? "/dashboard" : "/auth"} search={signedIn ? undefined : { mode: "signup" }}>
              Get started free <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <Logo />
          <p>Works in English, Thai and many more languages.</p>
        </div>
      </footer>
    </div>
  );
}

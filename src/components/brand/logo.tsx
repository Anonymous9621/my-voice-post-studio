import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      <span className="font-display text-[19px] leading-none italic">v</span>
      <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-brand" />
    </span>
  );
}

export function Logo({ to = "/", className }: { to?: "/" | "/dashboard"; className?: string }) {
  return (
    <Link to={to} className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        MyVoice <span className="text-muted-foreground font-normal">AI</span>
      </span>
    </Link>
  );
}

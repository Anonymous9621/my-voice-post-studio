import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl leading-[1.05] text-foreground sm:text-[44px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-12 animate-fade-up", className)}>
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-brand-soft text-accent-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
      {action}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-8 h-11 w-72" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="mt-6 h-64 rounded-2xl" />
    </PageContainer>
  );
}

export function PageError({ error }: { error: Error }) {
  return (
    <PageContainer>
      <div className="rounded-2xl border border-destructive/30 bg-card p-6">
        <h2 className="font-semibold text-foreground">We couldn't load this page</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </PageContainer>
  );
}

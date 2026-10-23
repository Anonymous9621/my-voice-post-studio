import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Fingerprint,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  Plus,
  Settings,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { profileQuery, usageQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { UsageBar } from "./usage-meter";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/create", label: "Create post", icon: PenLine },
  { to: "/styles", label: "Writing styles", icon: Fingerprint },
  { to: "/history", label: "History", icon: History },
  { to: "/saved", label: "Saved posts", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{
            className: "bg-sidebar-accent !text-sidebar-accent-foreground font-medium",
          }}
        >
          <Icon className="size-4 opacity-80" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { data: usage } = useQuery(usageQuery);
  const { data: profile } = useQuery(profileQuery);
  const signOut = useSignOut();
  return (
    <div className="mt-auto space-y-4">
      {usage && (
        <div className="rounded-xl border border-sidebar-border bg-card p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">{usage.plan.name} plan</span>
            <Link to="/settings" className="text-xs text-muted-foreground hover:text-foreground">
              Details
            </Link>
          </div>
          <UsageBar label="Generations this month" used={usage.generationsUsed} limit={usage.plan.monthlyGenerations} />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="truncate text-sm text-sidebar-foreground">
          {profile?.display_name || profile?.business_name || "Your account"}
        </span>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out">
          <LogOut />
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="px-2 pt-1">
          <Logo to="/dashboard" />
        </div>
        <Button asChild variant="brand" className="justify-start">
          <Link to="/create">
            <Plus /> New post
          </Link>
        </Button>
        <NavList />
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:hidden">
          <Logo to="/dashboard" />
          <div className="flex items-center gap-1">
            <Button asChild size="sm" variant="brand">
              <Link to="/create">
                <Plus /> New
              </Link>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col gap-6 bg-sidebar p-4">
                <SheetTitle className="px-2 pt-1">
                  <Logo to="/dashboard" />
                </SheetTitle>
                <NavList onNavigate={() => setOpen(false)} />
                <SidebarFooter />
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

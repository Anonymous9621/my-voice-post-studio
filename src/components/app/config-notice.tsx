import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { aiStatusQuery } from "@/lib/queries";

/** Shown wherever AI features are offered, when the server has no AI key. */
export function useAiConfigured() {
  const { data, isLoading } = useQuery(aiStatusQuery);
  return { configured: data?.configured ?? false, loading: isLoading };
}

export function ConfigNotice({ className }: { className?: string }) {
  const { configured, loading } = useAiConfigured();
  if (loading || configured) return null;
  return (
    <div
      className={`flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-warning-foreground ${className ?? ""}`}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">AI writing requires configuration</p>
        <p className="mt-0.5 opacity-90">
          The server's AI key isn't set, so style analysis, photo analysis and post generation are
          turned off. Everything else works.
        </p>
      </div>
    </div>
  );
}

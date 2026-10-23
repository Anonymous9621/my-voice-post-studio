import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";

import { MODE_LABELS, type WritingMode } from "@/lib/content-options";
import { Badge } from "@/components/ui/badge";

export interface GenerationSummary {
  id: string;
  title: string;
  mode: string;
  created_at: string;
  style_profiles: { name: string } | null;
  posts: { count: number }[];
}

export function GenerationRow({ generation: g }: { generation: GenerationSummary }) {
  const count = g.posts?.[0]?.count ?? 0;
  return (
    <Link
      to="/generations/$id"
      params={{ id: g.id }}
      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{g.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {count} {count === 1 ? "post" : "posts"} · {formatDistanceToNow(new Date(g.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="hidden gap-1.5 sm:flex">
        <Badge variant={g.mode === "my_voice" ? "brand" : "secondary"}>{MODE_LABELS[g.mode as WritingMode]}</Badge>
        {g.style_profiles?.name && <Badge variant="outline">{g.style_profiles.name}</Badge>}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

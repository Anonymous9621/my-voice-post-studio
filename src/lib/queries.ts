// Browser data access. Row-level security scopes every query to the
// signed-in user, so no user id filter is needed on reads.
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getAiStatus } from "./ai.functions";
import { toAnalysis } from "./content-types";
import { GENERATION_USAGE_KINDS, getPlan, usagePeriodStart } from "./plans";

function check<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function checkList<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => check(await supabase.from("profiles").select("*").maybeSingle()),
});

export const aiStatusQuery = queryOptions({
  queryKey: ["ai-status"],
  queryFn: () => getAiStatus(),
  staleTime: 5 * 60_000,
});

export const stylesQuery = queryOptions({
  queryKey: ["styles"],
  queryFn: async () => {
    const rows = checkList(
      await supabase
        .from("style_profiles")
        .select("id,name,analysis,language,is_default,created_at,updated_at")
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false }),
    );
    return rows.map((r) => ({ ...r, analysis: toAnalysis(r.analysis) }));
  },
});

export const styleQuery = (id: string) =>
  queryOptions({
    queryKey: ["styles", id],
    queryFn: async () => {
      const row = check(await supabase.from("style_profiles").select("*").eq("id", id).maybeSingle());
      return row ? { ...row, analysis: toAnalysis(row.analysis) } : null;
    },
  });

export const generationsQuery = (limit = 50) =>
  queryOptions({
    queryKey: ["generations", { limit }],
    queryFn: async () =>
      checkList(
        await supabase
          .from("generations")
          .select("id,title,mode,created_at,style_profiles(name),posts(count)")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
  });

export const generationQuery = (id: string) =>
  queryOptions({
    queryKey: ["generations", "detail", id],
    queryFn: async () => {
      const gen = check(
        await supabase.from("generations").select("*, style_profiles(id,name)").eq("id", id).maybeSingle(),
      );
      if (!gen) return null;
      const posts = checkList(
        await supabase.from("posts").select("*").eq("generation_id", id).order("position"),
      );
      let imageUrl: string | null = null;
      if (gen.image_path) {
        const { data } = await supabase.storage
          .from("product-images")
          .createSignedUrl(gen.image_path, 60 * 60);
        imageUrl = data?.signedUrl ?? null;
      }
      return { ...gen, posts, imageUrl };
    },
  });

export const savedPostsQuery = queryOptions({
  queryKey: ["posts", "saved"],
  queryFn: async () =>
    checkList(
      await supabase
        .from("posts")
        .select("*, generations(id,title,mode)")
        .eq("is_saved", true)
        .order("updated_at", { ascending: false }),
    ),
});

export const usageQuery = queryOptions({
  queryKey: ["usage"],
  queryFn: async () => {
    const since = usagePeriodStart().toISOString();
    const [sub, gens, images, styles, saved] = await Promise.all([
      supabase.from("subscriptions").select("plan,status").maybeSingle(),
      supabase
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .in("kind", [...GENERATION_USAGE_KINDS])
        .gte("created_at", since),
      supabase
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", "image_analysis")
        .gte("created_at", since),
      supabase.from("style_profiles").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_saved", true),
    ]);
    const plan = getPlan(sub.data?.plan, sub.data?.status);
    return {
      plan,
      generationsUsed: gens.count ?? 0,
      imageAnalysesUsed: images.count ?? 0,
      styleCount: styles.count ?? 0,
      savedCount: saved.count ?? 0,
    };
  },
});

// Server functions for all AI features. Every function requires a signed-in
// user and runs database queries as that user (row-level security applies).
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

import { AiError, generateStructured, getAiConfig } from "./ai/gateway.server";
import {
  briefBlock,
  generationInstructions,
  generationSchema,
  imageInsightsSchema,
  imageInstructions,
  singlePostSchema,
  styleAnalysisInstructions,
  styleAnalysisSchema,
  styleBlock,
} from "./ai/prompts.server";
import { OUTPUT_LANGUAGES } from "./content-options";
import {
  splitSamples,
  toAnalysis,
  type ActionResult,
  type ImageInsights,
  type StyleAnalysis,
} from "./content-types";
import { checkLimit, GENERATION_USAGE_KINDS, getPlan, usagePeriodStart } from "./plans";

type Db = SupabaseClient<Database>;
type UsageKind = Database["public"]["Tables"]["usage_events"]["Insert"]["kind"];

function fail(error: unknown): { ok: false; error: string; code: string } {
  if (error instanceof AiError) return { ok: false, error: error.message, code: error.code };
  console.error("[ai.functions]", error);
  return { ok: false, error: "Something went wrong. Please try again.", code: "unknown" };
}

async function getEntitlements(db: Db) {
  const { data } = await db.from("subscriptions").select("plan,status").maybeSingle();
  return getPlan(data?.plan, data?.status);
}

async function countUsage(db: Db, kinds: readonly UsageKind[]) {
  const { count, error } = await db
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .in("kind", kinds as UsageKind[])
    .gte("created_at", usagePeriodStart().toISOString());
  if (error) throw error;
  return count ?? 0;
}

async function assertGenerationAllowance(db: Db) {
  const plan = await getEntitlements(db);
  const used = await countUsage(db, GENERATION_USAGE_KINDS);
  if (!checkLimit(plan.monthlyGenerations, used).allowed) {
    throw new AiError(
      `You've used all ${plan.monthlyGenerations} generations on the ${plan.name} plan this month. Your allowance resets on the 1st.`,
      "limit_reached",
    );
  }
}

async function logUsage(db: Db, userId: string, kind: UsageKind) {
  const { error } = await db.from("usage_events").insert({ user_id: userId, kind });
  if (error) console.error("[usage] failed to log", error);
}

// ---------------------------------------------------------------------------

export const getAiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const cfg = getAiConfig();
    return { configured: cfg.configured };
  });

// ---------------------------------------------------------------------------

const analyzeStyleInput = z.object({
  styleId: z.string().uuid().nullable(),
  name: z.string().trim().min(1, "Give your style a name").max(80),
  samples: z
    .string()
    .trim()
    .min(200, "Paste at least 200 characters of your own posts")
    .max(20000, "Please keep samples under 20,000 characters"),
});

export const analyzeStyle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof analyzeStyleInput>) => analyzeStyleInput.parse(input))
  .handler(async ({ data, context }): Promise<ActionResult<{ id: string }>> => {
    const db = context.supabase;
    try {
      const { count } = await db.from("style_profiles").select("id", { count: "exact", head: true });
      if (!data.styleId) {
        const plan = await getEntitlements(db);
        if (!checkLimit(plan.maxStyleProfiles, count ?? 0).allowed) {
          throw new AiError(
            `The ${plan.name} plan includes ${plan.maxStyleProfiles} writing styles. Delete one to add another.`,
            "limit_reached",
          );
        }
      }

      const samples = splitSamples(data.samples);
      const { output } = await generateStructured<StyleAnalysis>({
        schema: styleAnalysisSchema,
        instructions: styleAnalysisInstructions(),
        messages: [
          {
            role: "user",
            content: `Analyze the writing style in these ${samples.length} social media posts written by the same person.\n\n${samples
              .map((s, i) => `--- Post ${i + 1} ---\n${s}`)
              .join("\n\n")}`,
          },
        ],
      });

      const analysis = toAnalysis(output);
      const row = {
        name: data.name,
        sample_posts: data.samples,
        analysis: analysis as unknown as Json,
        language: analysis.detected_language || null,
      };

      let id = data.styleId;
      if (id) {
        const { error } = await db.from("style_profiles").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await db
          .from("style_profiles")
          .insert({ ...row, user_id: context.userId, is_default: (count ?? 0) === 0 })
          .select("id")
          .single();
        if (error) throw error;
        id = inserted.id;
      }
      await logUsage(db, context.userId, "style_analysis");
      return { ok: true, data: { id: id! } };
    } catch (e) {
      return fail(e);
    }
  });

// ---------------------------------------------------------------------------

const imageInput = z.object({ path: z.string().min(3).max(300) });

export const analyzeProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof imageInput>) => imageInput.parse(input))
  .handler(async ({ data, context }): Promise<ActionResult<ImageInsights>> => {
    const db = context.supabase;
    try {
      if (!data.path.startsWith(`${context.userId}/`)) {
        throw new AiError("That image doesn't belong to your account.", "forbidden");
      }
      const plan = await getEntitlements(db);
      const used = await countUsage(db, ["image_analysis"]);
      if (!checkLimit(plan.monthlyImageAnalyses, used).allowed) {
        throw new AiError(
          `You've used all ${plan.monthlyImageAnalyses} photo analyses this month. You can still describe the product in the form.`,
          "limit_reached",
        );
      }

      const { data: blob, error } = await db.storage.from("product-images").download(data.path);
      if (error || !blob) throw new AiError("We couldn't read that image. Try uploading it again.", "not_found");
      const mediaType = blob.type || "image/jpeg";
      if (!mediaType.startsWith("image/")) throw new AiError("Please upload an image file.", "bad_request");
      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      const cfg = getAiConfig();

      const { output } = await generateStructured<ImageInsights>({
        schema: imageInsightsSchema,
        instructions: imageInstructions(),
        model: cfg.visionModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe what is visible in this product photo." },
              { type: "image", image: new URL(`data:${mediaType};base64,${base64}`) },
            ],
          },
        ],
      });
      await logUsage(db, context.userId, "image_analysis");
      return { ok: true, data: output };
    } catch (e) {
      return fail(e);
    }
  });

// ---------------------------------------------------------------------------

const briefSchema = z.object({
  product: z.string().trim().min(2, "Add the product or service").max(160),
  description: z.string().trim().min(10, "Describe the product and its selling points").max(3000),
  promotion: z.string().trim().max(1000),
  audience: z.string().trim().max(500),
  goal: z.string().trim().max(120),
  tone: z.string().trim().max(120),
  language: z.enum(OUTPUT_LANGUAGES),
  cta: z.string().trim().max(300),
});

const generateInput = z.object({
  mode: z.enum(["my_voice", "natural"]),
  styleProfileId: z.string().uuid().nullable(),
  brief: briefSchema,
  imagePath: z.string().max(300).nullable(),
  imageNotes: z.string().max(3000).nullable(),
});

async function loadStyle(db: Db, id: string | null) {
  if (!id) return null;
  const { data, error } = await db
    .from("style_profiles")
    .select("id,name,analysis,sample_posts")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return styleBlock(toAnalysis(data.analysis), splitSamples(data.sample_posts));
}

export const generatePosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof generateInput>) => generateInput.parse(input))
  .handler(async ({ data, context }): Promise<ActionResult<{ id: string }>> => {
    const db = context.supabase;
    try {
      if (data.imagePath && !data.imagePath.startsWith(`${context.userId}/`)) {
        throw new AiError("That image doesn't belong to your account.", "forbidden");
      }
      if (data.mode === "my_voice" && !data.styleProfileId) {
        throw new AiError("Choose a writing style for My Voice mode, or switch to Natural mode.", "bad_request");
      }
      await assertGenerationAllowance(db);
      const style = data.mode === "my_voice" ? await loadStyle(db, data.styleProfileId) : null;
      if (data.mode === "my_voice" && !style) {
        throw new AiError("That writing style no longer exists. Pick another one.", "not_found");
      }

      const { output, model } = await generateStructured({
        schema: generationSchema,
        instructions: generationInstructions({ mode: data.mode, language: data.brief.language, style }),
        messages: [
          {
            role: "user",
            content: `${briefBlock(data.brief, data.imageNotes)}\n\nWrite 3 distinct post variations.`,
          },
        ],
      });

      const posts = output.posts.slice(0, 3);
      if (posts.length === 0) throw new AiError("The AI didn't return any posts. Please try again.", "empty");

      const { data: gen, error } = await db
        .from("generations")
        .insert({
          user_id: context.userId,
          mode: data.mode,
          style_profile_id: data.mode === "my_voice" ? data.styleProfileId : null,
          title: data.brief.product,
          inputs: data.brief,
          image_path: data.imagePath,
          image_notes: data.imageNotes,
          clarifying_questions: output.clarifying_questions.slice(0, 5),
          model,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: postsError } = await db.from("posts").insert(
        posts.map((p, i) => ({
          user_id: context.userId,
          generation_id: gen.id,
          position: i,
          hook: p.hook,
          caption: p.caption,
          cta: p.cta,
          visual_direction: p.visual_direction,
        })),
      );
      if (postsError) throw postsError;

      await logUsage(db, context.userId, "generation");
      return { ok: true, data: { id: gen.id } };
    } catch (e) {
      return fail(e);
    }
  });

// ---------------------------------------------------------------------------

const regenerateInput = z.object({
  postId: z.string().uuid(),
  instruction: z.string().trim().max(300).nullable(),
});

export interface RegeneratedPost {
  id: string;
  hook: string;
  caption: string;
  cta: string;
  visual_direction: string;
}

export const regeneratePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof regenerateInput>) => regenerateInput.parse(input))
  .handler(async ({ data, context }): Promise<ActionResult<RegeneratedPost>> => {
    const db = context.supabase;
    try {
      const { data: post, error } = await db
        .from("posts")
        .select("id,generation_id,position")
        .eq("id", data.postId)
        .maybeSingle();
      if (error) throw error;
      if (!post) throw new AiError("That post no longer exists.", "not_found");

      const { data: gen, error: genError } = await db
        .from("generations")
        .select("mode,style_profile_id,inputs,image_notes")
        .eq("id", post.generation_id)
        .single();
      if (genError) throw genError;

      await assertGenerationAllowance(db);
      const brief = briefSchema.parse(gen.inputs);
      const mode = gen.mode as "my_voice" | "natural";
      const style = mode === "my_voice" ? await loadStyle(db, gen.style_profile_id) : null;

      const { data: siblings } = await db
        .from("posts")
        .select("id,hook,caption")
        .eq("generation_id", post.generation_id);
      const others = (siblings ?? [])
        .map((s) => `${s.id === post.id ? "CURRENT (replace this one)" : "OTHER"}:\n${s.hook}\n${s.caption.slice(0, 400)}`)
        .join("\n\n");

      const { output } = await generateStructured({
        schema: singlePostSchema,
        instructions: generationInstructions({ mode, language: brief.language, style }).replace(
          "Return exactly 3 posts.",
          "Return exactly 1 post in the `post` field.",
        ),
        messages: [
          {
            role: "user",
            content: `${briefBlock(brief, gen.image_notes)}\n\nExisting variations:\n${others}\n\nWrite one new variation to replace CURRENT. It must feel fresh and different from the others.${
              data.instruction ? `\nExtra direction from the user: ${data.instruction}` : ""
            }\nSet clarifying questions aside for this task.`,
          },
        ],
      });

      const { data: updated, error: upError } = await db
        .from("posts")
        .update({
          hook: output.post.hook,
          caption: output.post.caption,
          cta: output.post.cta,
          visual_direction: output.post.visual_direction,
        })
        .eq("id", post.id)
        .select("id,hook,caption,cta,visual_direction")
        .single();
      if (upError) throw upError;

      await logUsage(db, context.userId, "regeneration");
      return { ok: true, data: updated };
    } catch (e) {
      return fail(e);
    }
  });

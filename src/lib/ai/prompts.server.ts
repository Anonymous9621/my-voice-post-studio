import { z } from "zod";

import type { GenerationBrief, StyleAnalysis } from "../content-types";
import type { WritingMode } from "../content-options";

// ---------- Schemas (strict: every field required, objects only) ----------

export const styleAnalysisSchema = z.object({
  summary: z.string(),
  tone: z.string(),
  vocabulary: z.string(),
  sentence_length: z.string(),
  emoji_usage: z.string(),
  formatting: z.string(),
  common_expressions: z.array(z.string()),
  signature_patterns: z.array(z.string()),
  avoid: z.array(z.string()),
  detected_language: z.string(),
  confidence_note: z.string(),
});

export const imageInsightsSchema = z.object({
  product_type: z.string(),
  summary: z.string(),
  visible_details: z.array(z.string()),
  visible_text: z.array(z.string()),
  not_determinable: z.array(z.string()),
});

const postSchema = z.object({
  angle: z.string(),
  hook: z.string(),
  caption: z.string(),
  cta: z.string(),
  visual_direction: z.string(),
});

export const generationSchema = z.object({
  posts: z.array(postSchema),
  clarifying_questions: z.array(z.string()),
});

export const singlePostSchema = z.object({ post: postSchema });

// ---------- Shared rules ----------

const FACT_RULES = `FACTUAL RULES (strict):
- Use only facts given in the brief or the confirmed image notes.
- Never invent prices, discounts, percentages, dates, deadlines, stock levels, ingredients, materials, sizes, certifications, health or results claims, guarantees, shipping terms, or promotion conditions.
- If a detail is not provided, leave it out of the copy. Do not use placeholders like [price].
- If an important detail is missing (for example the offer has no end date, or price is referenced but not given), add a short, specific question to clarifying_questions. Return an empty list if nothing important is missing.`;

const ANTI_CLICHE_RULES = `WRITE LIKE A REAL PERSON:
- Avoid AI clichés: "elevate", "unlock", "unleash", "game-changer", "revolutionize", "look no further", "say goodbye to", "in today's fast-paced world", "whether you're… or…", "dive in", "level up", "seamless", "must-have", "take it to the next level", "imagine a world".
- No stacked rhetorical questions, no "Ready to…?" openers on every post, no fake urgency.
- Use plain, specific words. Vary sentence length naturally. Prefer concrete details over adjectives.
- Avoid excessive em dashes, exclamation marks, and hashtags (max 3 hashtags, only if natural).`;

function list(items: string[]) {
  return items.length ? items.map((i) => `- ${i}`).join("\n") : "- (none noted)";
}

export function styleBlock(analysis: StyleAnalysis, samples: string[]) {
  const excerpts = samples
    .slice(0, 6)
    .map((s, i) => `Sample ${i + 1}:\n${s.slice(0, 700)}`)
    .join("\n\n");
  return `WRITER'S STYLE PROFILE (approximate):
Summary: ${analysis.summary}
Tone: ${analysis.tone}
Vocabulary: ${analysis.vocabulary}
Sentence length: ${analysis.sentence_length}
Emoji usage: ${analysis.emoji_usage}
Formatting: ${analysis.formatting}
Common expressions:
${list(analysis.common_expressions)}
Signature patterns:
${list(analysis.signature_patterns)}
Things this writer avoids:
${list(analysis.avoid)}

REFERENCE SAMPLES (match rhythm, word choice and formatting; never copy sentences verbatim):
${excerpts || "(no samples saved)"}`;
}

export function modeInstructions(mode: WritingMode, hasStyle: boolean) {
  if (mode === "my_voice" && hasStyle) {
    return `MODE: My Voice. Write as this specific person would. Mirror their tone, vocabulary level, sentence length, emoji habits, line breaks and recurring expressions from the style profile. Their habits override general marketing conventions. Use their common expressions sparingly so it doesn't feel like a parody.`;
  }
  return `MODE: Natural. Write natural, conversational copy that sounds like a thoughtful small-business owner wrote it. At most 1–2 emojis per post, and only where they add meaning. Short paragraphs, honest tone, no hype.`;
}

export function briefBlock(brief: GenerationBrief, imageNotes: string | null) {
  const line = (label: string, value: string) => `${label}: ${value.trim() || "(not provided)"}`;
  return `BRIEF
${line("Product or service", brief.product)}
${line("Description and key selling points", brief.description)}
${line("Promotion or offer", brief.promotion)}
${line("Target audience", brief.audience)}
${line("Marketing goal", brief.goal)}
${line("Desired tone", brief.tone)}
${line("Call to action", brief.cta)}
${line("Confirmed product photo details", imageNotes ?? "")}`;
}

export function generationInstructions(opts: {
  mode: WritingMode;
  language: string;
  style: string | null;
}) {
  return `You write social media marketing posts for creators, online sellers and small businesses.

${modeInstructions(opts.mode, Boolean(opts.style))}

${opts.style ?? ""}

${ANTI_CLICHE_RULES}

${FACT_RULES}

OUTPUT
- Write everything (hook, caption, cta, visual_direction, clarifying_questions) in ${opts.language}.
- Return exactly 3 posts. Each must take a clearly different angle (for example: a story or personal moment, a benefit or problem-solution, a detail or behind-the-scenes). Put a 2–5 word label for the angle in "angle".
- hook: the opening line (one sentence, under 140 characters).
- caption: the body of the post after the hook, ready to paste. Use line breaks where the writer would. Do not repeat the hook.
- cta: one natural closing line based on the requested call to action.
- visual_direction: 1–2 sentences describing a photo or short video that would suit the post, using only what is known about the product.`;
}

export function styleAnalysisInstructions() {
  return `You analyze a person's social media writing so another writer can imitate it.
Be specific and evidence-based: quote short real phrases from the samples in common_expressions (up to 8) and describe concrete habits.
- tone, vocabulary, sentence_length, emoji_usage, formatting: 1–2 sentences each, concrete (e.g. "Mostly 5–12 word sentences, often fragments").
- signature_patterns: 3–6 habits to reproduce (openers, line-break style, sign-offs, punctuation, capitalization).
- avoid: 2–5 things this writer never or rarely does.
- detected_language: main language(s) of the samples, in English.
- summary: 2 sentences, written in English.
- confidence_note: one honest sentence about how reliable this profile is given the amount and variety of samples. Never claim the style can be reproduced perfectly.
Write all fields except common_expressions in English. Keep common_expressions in the original language.`;
}

export function imageInstructions() {
  return `You describe product photos for a marketing copywriter.
Only report what is actually visible. Do not guess brand claims, prices, discounts, ingredients, materials, sizes or quality claims that cannot be seen.
- product_type: short label of what the product appears to be.
- summary: one neutral sentence.
- visible_details: up to 8 concrete visible facts (colors, shape, packaging, setting, quantity).
- visible_text: exact text readable on the product or packaging (empty list if none).
- not_determinable: up to 5 important things a copywriter might want but cannot be confirmed from the photo (e.g. price, size, ingredients).
Write in English, except visible_text which stays exactly as printed.`;
}

import type { WritingMode } from "./content-options";

export interface StyleAnalysis {
  summary: string;
  tone: string;
  vocabulary: string;
  sentence_length: string;
  emoji_usage: string;
  formatting: string;
  common_expressions: string[];
  signature_patterns: string[];
  avoid: string[];
  detected_language: string;
  confidence_note: string;
}

export const EMPTY_ANALYSIS: StyleAnalysis = {
  summary: "",
  tone: "",
  vocabulary: "",
  sentence_length: "",
  emoji_usage: "",
  formatting: "",
  common_expressions: [],
  signature_patterns: [],
  avoid: [],
  detected_language: "",
  confidence_note: "",
};

export function toAnalysis(value: unknown): StyleAnalysis {
  const v = (value && typeof value === "object" ? value : {}) as Partial<StyleAnalysis>;
  const arr = (x: unknown) => (Array.isArray(x) ? x.filter((s) => typeof s === "string") : []);
  const str = (x: unknown) => (typeof x === "string" ? x : "");
  return {
    summary: str(v.summary),
    tone: str(v.tone),
    vocabulary: str(v.vocabulary),
    sentence_length: str(v.sentence_length),
    emoji_usage: str(v.emoji_usage),
    formatting: str(v.formatting),
    common_expressions: arr(v.common_expressions),
    signature_patterns: arr(v.signature_patterns),
    avoid: arr(v.avoid),
    detected_language: str(v.detected_language),
    confidence_note: str(v.confidence_note),
  };
}

export function hasAnalysis(a: StyleAnalysis) {
  return Boolean(a.summary || a.tone);
}

export interface GenerationBrief {
  product: string;
  description: string;
  promotion: string;
  audience: string;
  goal: string;
  tone: string;
  language: string;
  cta: string;
}

export interface GenerationRequest {
  mode: WritingMode;
  styleProfileId: string | null;
  brief: GenerationBrief;
  imagePath: string | null;
  imageNotes: string | null;
}

export interface ImageInsights {
  product_type: string;
  summary: string;
  visible_details: string[];
  visible_text: string[];
  not_determinable: string[];
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string };

/** Split pasted posts on blank lines or "---" separators. */
export function splitSamples(text: string): string[] {
  return text
    .split(/\n\s*(?:-{3,}|={3,})\s*\n|\n\s*\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

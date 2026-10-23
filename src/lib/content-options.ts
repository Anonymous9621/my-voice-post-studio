// Shared option lists for forms (client + server).

export const OUTPUT_LANGUAGES = [
  "English",
  "Thai",
  "Spanish",
  "Portuguese",
  "French",
  "German",
  "Italian",
  "Indonesian",
  "Vietnamese",
  "Malay",
  "Filipino",
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Hindi",
  "Arabic",
  "Turkish",
  "Dutch",
] as const;

export const MARKETING_GOALS = [
  "Drive sales",
  "Announce a launch",
  "Promote an offer",
  "Build awareness",
  "Grow engagement",
  "Get sign-ups or bookings",
  "Educate customers",
] as const;

export const TONES = [
  "Match my style",
  "Warm and friendly",
  "Playful",
  "Confident and direct",
  "Calm and premium",
  "Professional",
  "Enthusiastic",
] as const;

export const BUSINESS_TYPES = [
  "Creator",
  "Online seller",
  "Small business",
  "Freelancer or agency",
  "Other",
] as const;

export type WritingMode = "my_voice" | "natural";

export const MODE_LABELS: Record<WritingMode, string> = {
  my_voice: "My Voice",
  natural: "Natural",
};

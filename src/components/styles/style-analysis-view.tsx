import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";

import type { StyleAnalysis } from "@/lib/content-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TRAITS: { key: keyof StyleAnalysis; label: string }[] = [
  { key: "tone", label: "Tone" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "sentence_length", label: "Sentence length" },
  { key: "emoji_usage", label: "Emoji usage" },
  { key: "formatting", label: "Formatting" },
];

const LISTS: { key: "common_expressions" | "signature_patterns" | "avoid"; label: string }[] = [
  { key: "common_expressions", label: "Common expressions" },
  { key: "signature_patterns", label: "Signature habits" },
  { key: "avoid", label: "Usually avoids" },
];

export function StyleAnalysisView({
  analysis,
  onSave,
}: {
  analysis: StyleAnalysis;
  onSave?: (next: StyleAnalysis) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(analysis);
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft(analysis);
    setEditing(true);
  };

  async function save() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({
        ...draft,
        common_expressions: draft.common_expressions.map((s) => s.trim()).filter(Boolean),
        signature_patterns: draft.signature_patterns.map((s) => s.trim()).filter(Boolean),
        avoid: draft.avoid.map((s) => s.trim()).filter(Boolean),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="surface p-5 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Style profile</p>
          {editing ? (
            <Textarea
              className="mt-2 min-h-20"
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            />
          ) : (
            <p className="mt-2 font-display text-2xl leading-snug text-foreground">{analysis.summary}</p>
          )}
        </div>
        {onSave && !editing && (
          <Button variant="outline" size="sm" onClick={start}>
            <Pencil /> Edit
          </Button>
        )}
      </div>

      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {TRAITS.map(({ key, label }) => (
          <div key={key}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground">
              {editing ? (
                <Input
                  value={draft[key] as string}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              ) : (
                (analysis[key] as string) || "—"
              )}
            </dd>
          </div>
        ))}
        {analysis.detected_language && !editing && (
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Language</dt>
            <dd className="mt-1 text-sm text-foreground">{analysis.detected_language}</dd>
          </div>
        )}
      </dl>

      <div className="mt-7 grid gap-6 border-t pt-6 sm:grid-cols-3">
        {LISTS.map(({ key, label }) => (
          <div key={key}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
            {editing ? (
              <Textarea
                className="min-h-28 text-sm"
                value={draft[key].join("\n")}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value.split("\n") })}
                placeholder="One per line"
              />
            ) : analysis[key].length ? (
              <ul className="space-y-1.5">
                {analysis[key].map((item, i) => (
                  <li
                    key={i}
                    className={
                      key === "common_expressions"
                        ? "inline-block mr-1.5 mb-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs text-accent-foreground"
                        : "text-sm leading-relaxed text-foreground"
                    }
                  >
                    {key === "common_expressions" ? `“${item}”` : item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        ))}
      </div>

      {analysis.confidence_note && !editing && (
        <p className="mt-6 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          {analysis.confidence_note}
        </p>
      )}

      {editing && (
        <div className="mt-6 flex gap-2">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Save changes
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

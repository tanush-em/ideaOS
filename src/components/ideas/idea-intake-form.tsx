"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FOUNDER_PROMPTS = [
  "AI tool that helps freelancers get paid faster",
  "B2B SaaS for small agency project management",
  "Developer tool that automates API documentation",
];

interface IdeaIntakeFormProps {
  ideaId: string;
  initialValue: string;
  onSaved?: (rawInput: string) => void;
}

export function IdeaIntakeForm({
  ideaId,
  initialValue,
  onSaved,
}: IdeaIntakeFormProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (value.trim().length < 10) {
      toast.error("Add more detail — at least 10 characters");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: value.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      toast.success("Idea saved");
      onSaved?.(value.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="raw-input">Your founder idea</Label>
        <Textarea
          id="raw-input"
          placeholder="What problem are you solving? Who is it for? Any constraints (budget, timeline, skills)?"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Be specific. Agents use this to generate and critique directions.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FOUNDER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setValue(prompt)}
            className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={save}
        disabled={saving || value === initialValue}
      >
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Save idea
      </Button>
    </div>
  );
}

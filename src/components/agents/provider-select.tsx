"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderInfo } from "@/providers/llm/types";

interface ProviderSelectProps {
  providers: ProviderInfo[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ProviderSelect({
  providers,
  value,
  onChange,
  disabled,
}: ProviderSelectProps) {
  const available = providers.filter((p) => p.available);

  if (available.length === 0) {
    return (
      <p className="text-xs text-destructive">
        No LLM API keys configured. Add keys to .env.local
      </p>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Select provider" />
      </SelectTrigger>
      <SelectContent>
        {available.map((p) => (
          <SelectItem key={p.name} value={p.name}>
            {p.label} ({p.defaultModel})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

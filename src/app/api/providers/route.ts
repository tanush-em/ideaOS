import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProviderName } from "@/providers/llm/types";

export async function GET() {
  const providers = [
    {
      name: "openai" as ProviderName,
      label: "OpenAI",
      defaultModel: "gpt-4o-mini",
      available: Boolean(process.env.OPENAI_API_KEY),
    },
    {
      name: "anthropic" as ProviderName,
      label: "Anthropic",
      defaultModel: "claude-3-5-haiku-20241022",
      available: Boolean(process.env.ANTHROPIC_API_KEY),
    },
    {
      name: "google" as ProviderName,
      label: "Google",
      defaultModel: "gemini-3.6-flash",
      available: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    },
  ];

  return NextResponse.json(providers);
}

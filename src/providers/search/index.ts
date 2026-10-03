import type { SearchProvider } from "./types";
import { DuckDuckGoProvider } from "./duckduckgo";
import { TavilyProvider } from "./tavily";

const providers: Record<string, SearchProvider> = {
  duckduckgo: new DuckDuckGoProvider(),
  tavily: new TavilyProvider(),
};

export function getAvailableSearchProviders(): SearchProvider[] {
  return Object.values(providers).filter((p) => p.isAvailable());
}

export function resolveSearchProvider(name?: string | null): SearchProvider {
  if (name && providers[name]) {
    if (!providers[name].isAvailable()) {
      throw new Error(`Search provider "${name}" is not configured`);
    }
    return providers[name];
  }

  const available = getAvailableSearchProviders();
  if (available.length === 0) {
    throw new Error("No search provider available (check API keys)");
  }
  // Deterministic preference
  return available.find((p) => p.name === "tavily") ?? available[0];
}


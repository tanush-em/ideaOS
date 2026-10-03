import type { SearchProvider, SearchResult } from "./types";

export class TavilyProvider implements SearchProvider {
  name = "tavily";

  isAvailable(): boolean {
    return Boolean(process.env.TAVILY_API_KEY);
  }

  async search(query: string, limit = 5): Promise<SearchResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY not configured");

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: limit,
        search_depth: "basic",
        include_answer: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Tavily search failed (${res.status})`);
    }

    const json = (await res.json()) as any;
    const results = (json?.results ?? []) as any[];

    return results.map((r) => ({
      title: String(r.title ?? "Untitled"),
      url: String(r.url ?? ""),
      snippet: String(r.content ?? r.snippet ?? ""),
      relevance: typeof r.score === "number" ? r.score : 0.7,
      provider: this.name,
    }));
  }
}


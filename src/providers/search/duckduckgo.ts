import type { SearchProvider, SearchResult } from "./types";

function normalizeRelatedTopics(topics: any[]): any[] {
  const results: any[] = [];
  for (const t of topics ?? []) {
    // DuckDuckGo returns either {Text, FirstURL} or {Topics:[...]}
    if (t?.Topics?.length) results.push(...normalizeRelatedTopics(t.Topics));
    else if (t?.Text && t?.FirstURL) results.push(t);
  }
  return results;
}

export class DuckDuckGoProvider implements SearchProvider {
  name = "duckduckgo";

  isAvailable(): boolean {
    return true; // no API key required
  }

  async search(query: string, limit = 5): Promise<SearchResult[]> {
    const url =
      "https://api.duckduckgo.com/" +
      `?q=${encodeURIComponent(query)}` +
      "&format=json" +
      "&no_html=1" +
      "&skip_disambig=1" +
      "&no_redirect=1";

    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      throw new Error(`DuckDuckGo search failed (${res.status})`);
    }

    const json = (await res.json()) as any;
    const topics = normalizeRelatedTopics(json.RelatedTopics);

    const rawResults = topics
      .slice(0, limit)
      .map((t: any) => ({
        title: String(t.Text).replace(/\\s\\-\\s/g, " — "),
        url: String(t.FirstURL),
        snippet: String(t.Text),
      }));

    // DuckDuckGo doesn't return real scores; approximate by rank.
    return rawResults.map((r: any, i: number) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      relevance: Math.max(0.2, 1 - i * 0.15),
      provider: this.name,
    }));
  }
}


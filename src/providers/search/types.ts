export type SearchEvidenceType =
  | "competitor"
  | "market_trend"
  | "user_pain"
  | "pricing"
  | "distribution"
  | "regulatory";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number; // 0-1 rough
  provider: string;
}

export interface SearchProvider {
  name: string;
  isAvailable(): boolean;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}


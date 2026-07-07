import type { GrammarBreakdown, SimilarSentence } from "./learning-types";

export interface TranslateResponse {
  lemma: string;
  word: string;
  pos: string;
  sentence_id: string;
  meaning: string;
  collocation?: string;
  seen_count: number;
  from_cache: boolean;
}

export interface GrammarResponse {
  sentence_id: string;
  selection: string;
  from_cache: boolean;
  translation: string;
  vocabulary: Array<{
    text: string;
    translation: string;
    note?: string;
    seen_count: number;
  }>;
  grammar: GrammarBreakdown;
  why_written: string;
  similar_sentences: SimilarSentence[];
}

export interface MarkResponse {
  lemma: string;
  mark_count: number;
  recent_mark_time: string;
  message: string;
}

export interface ApiProxyRequest {
  type: "KEEPMARK_API";
  path: string;
  method: string;
  body?: unknown;
}

export interface ApiProxyResponse {
  ok: boolean;
  status: number;
  data?: Record<string, unknown>;
  error?: string;
}

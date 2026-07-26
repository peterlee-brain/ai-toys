import type { GrammarBreakdown, SimilarSentence } from "./learning-types";
import type { GrammarResponse, MarkResponse, TranslateResponse } from "./api-types";

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key] as T;
    }
  }
  return undefined;
}

export function normalizeTranslate(raw: Record<string, unknown>): TranslateResponse {
  const lemma = String(pick(raw, "lemma", "Lemma") ?? "");
  const word = String(pick(raw, "word", "Word") ?? lemma);
  return {
    lemma,
    word,
    pos: String(pick(raw, "pos", "Pos") ?? ""),
    sentence_id: String(pick(raw, "sentence_id", "SentenceID") ?? ""),
    meaning: String(pick(raw, "translation", "meaning", "Translation", "Meaning") ?? ""),
    collocation: pick<string>(raw, "collocation", "Collocation"),
    seen_count: Number(pick(raw, "seen_count", "SeenCount") ?? 0),
    from_cache: Boolean(pick(raw, "from_cache", "FromCache")),
  };
}

export function normalizeGrammar(raw: Record<string, unknown>): GrammarResponse {
  const vocabularyRaw = (pick<unknown[]>(raw, "vocabulary", "Vocabulary") ?? []) as Record<
    string,
    unknown
  >[];

  const grammarRaw = (pick<Record<string, unknown>>(raw, "grammar", "Grammar") ?? {}) as Record<
    string,
    unknown
  >;

  const similarRaw = (pick<unknown[]>(raw, "similar_sentences", "SimilarSentences") ??
    []) as Record<string, unknown>[];

  return {
    sentence_id: String(pick(raw, "sentence_id", "SentenceID") ?? ""),
    selection: String(pick(raw, "selection", "Selection") ?? ""),
    from_cache: Boolean(pick(raw, "from_cache", "FromCache")),
    translation: String(pick(raw, "translation", "Translation") ?? ""),
    vocabulary: vocabularyRaw.map((item) => ({
      text: String(pick(item, "text", "Text") ?? ""),
      translation: String(pick(item, "translation", "Translation") ?? ""),
      note: pick<string>(item, "note", "Note"),
      seen_count: Number(pick(item, "seen_count", "SeenCount") ?? 0),
    })),
    grammar: {
      main_clause: String(pick(grammarRaw, "main_clause", "MainClause") ?? ""),
      clauses: (pick<string[]>(grammarRaw, "clauses", "Clauses") ?? []).map(String),
      subject: pick<string>(grammarRaw, "subject", "Subject"),
      predicate: pick<string>(grammarRaw, "predicate", "Predicate"),
      object: pick<string>(grammarRaw, "object", "Object"),
      modifiers: (pick<string[]>(grammarRaw, "modifiers", "Modifiers") ?? []).map(String),
      details: (pick<string[]>(grammarRaw, "details", "Details") ?? []).map(String),
    } satisfies GrammarBreakdown,
    why_written: String(pick(raw, "why_written", "WhyWritten") ?? ""),
    similar_sentences: similarRaw.map((item) => ({
      english: String(pick(item, "english", "English") ?? ""),
      translation: String(pick(item, "translation", "Translation") ?? ""),
    })) satisfies SimilarSentence[],
  };
}

export function normalizeMark(raw: Record<string, unknown>): MarkResponse {
  const recent = pick<string>(raw, "recent_mark_time", "RecentMarkTime") ?? "";
  return {
    lemma: String(pick(raw, "lemma", "Lemma") ?? ""),
    mark_count: Number(pick(raw, "mark_count", "MarkCount") ?? 0),
    recent_mark_time: recent,
    message: String(pick(raw, "message", "Message") ?? "已留标"),
  };
}

export function parseApiError(raw: Record<string, unknown>, status: number): string {
  const err = raw as { message?: string; Message?: string; reason?: string; Reason?: string };
  const msg = err.message || err.Message || err.reason || err.Reason;
  if (msg) return msg;
  if (status === 504 || status === 408) return "服务响应超时，请稍后重试";
  if (status === 502 || status === 503) return "翻译服务暂时不可用，请稍后重试";
  if (status >= 500) return "服务异常，请稍后重试";
  return status ? `请求失败（HTTP ${status}）` : "网络请求失败";
}

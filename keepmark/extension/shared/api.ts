import type { LearningResult } from "./learning-types";
import { API_BASE } from "./api-base";
import {
  normalizeGrammar,
  normalizeMark,
  normalizeTranslate,
  parseApiError,
} from "./api-normalize";
import type {
  ApiProxyRequest,
  ApiProxyResponse,
  GrammarResponse,
  MarkResponse,
  TranslateResponse,
} from "./api-types";

export type {
  GrammarResponse,
  MarkResponse,
  TranslateResponse,
} from "./api-types";

async function apiRequest<T>(
  path: string,
  init: RequestInit,
  normalize: (raw: Record<string, unknown>) => T
): Promise<T> {
  const message: ApiProxyRequest = {
    type: "KEEPMARK_API",
    path,
    method: init.method || "GET",
    body: init.body ? JSON.parse(String(init.body)) : undefined,
  };

  const response = (await chrome.runtime.sendMessage(message)) as
    | ApiProxyResponse
    | undefined;

  if (!response) {
    throw new Error("扩展后台未响应，请重新加载插件");
  }

  if (!response.ok) {
    throw new Error(response.error || `HTTP ${response.status}`);
  }

  return normalize(response.data ?? {});
}

export function apiTranslate(body: {
  selection: string;
  sentence: string;
  page_url?: string;
}): Promise<TranslateResponse> {
  return apiRequest<TranslateResponse>(
    "/v1/translate",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    normalizeTranslate
  );
}

export function apiGrammar(body: {
  selection?: string;
  sentence: string;
  page_url?: string;
  force_refresh?: boolean;
}): Promise<GrammarResponse> {
  return apiRequest<GrammarResponse>(
    "/v1/grammar",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    normalizeGrammar
  );
}

export function apiMark(body: {
  lemma: string;
  sentence_id?: string;
}): Promise<MarkResponse> {
  return apiRequest<MarkResponse>(
    "/v1/words/mark",
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
    normalizeMark
  );
}

export function grammarToLearning(res: GrammarResponse): LearningResult {
  return {
    translation: res.translation,
    vocabulary: res.vocabulary.map((item) => ({
      text: item.text,
      translation: item.translation,
      note: item.note,
      occurrence_count: item.seen_count,
    })),
    grammar: res.grammar,
    why_written: res.why_written,
    similar_sentences: res.similar_sentences,
  };
}

export function getApiBaseUrl(): string {
  return API_BASE;
}

export function formatApiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("empty json") ||
    msg.includes("decode json") ||
    msg.includes("kimi translate") ||
    msg.includes("missing meaning")
  ) {
    return "翻译服务暂时不可用，请稍后重试";
  }
  if (msg.includes("kimi learning") || msg.includes("grammar")) {
    return "学习服务暂时不可用，请稍后重试";
  }
  return msg;
}

export { parseApiError };

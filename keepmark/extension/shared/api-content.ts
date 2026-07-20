import type { DictEntry } from "./types";
import type { LearningResult } from "./learning-types";
import { runtimeApiFetch } from "./runtime-api-client.ts";

export interface TranslateInput {
  selection: string;
  sentence: string;
}

export interface TranslateOutput {
  lemma: string;
  pos: string;
  translation: string;
  seen_count: number;
  recent_seen_time: string;
  from_cache: boolean;
}

export interface GrammarInput {
  sentence: string;
}

export interface GrammarOutput extends LearningResult {
  sentence_id: string;
  text: string;
  from_cache: boolean;
}

export interface MarkInput {
  lemma: string;
  source: "translate" | "grammar";
  sentence: string;
}

export interface MarkOutput {
  lemma: string;
  mark_count: number;
  recent_mark_time: string;
  message: string;
}

/** Content-script API: requests are executed by the extension Service Worker. */
export async function translate(input: TranslateInput): Promise<TranslateOutput> {
  return runtimeApiFetch<TranslateOutput>("POST", "/v1/translate", input);
}

export async function explainGrammar(input: GrammarInput): Promise<GrammarOutput> {
  return runtimeApiFetch<GrammarOutput>("POST", "/v1/grammar", input);
}

export async function recordMark(input: MarkInput): Promise<MarkOutput> {
  return runtimeApiFetch<MarkOutput>("PUT", "/v1/words/mark", input);
}

export function toDictEntry(out: TranslateOutput): DictEntry {
  return {
    pos: out.pos,
    meaning: out.translation,
  };
}

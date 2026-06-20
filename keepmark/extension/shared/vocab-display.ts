import type { VocabItem } from "./learning-types";
import type { KeepMarkState } from "./types";
import { vocabLemma } from "./state-logic";

export function vocabKindLabel(item: VocabItem): string {
  if (item.kind) return item.kind;
  return item.text.trim().includes(" ") ? "短语" : "单词";
}

export function vocabOccurrenceCount(
  state: KeepMarkState,
  item: VocabItem
): number {
  if (item.occurrence_count != null) return item.occurrence_count;
  const lemma = vocabLemma(item.text);
  return state.bank[lemma]?.count ?? 1;
}

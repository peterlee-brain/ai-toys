import { lookupEntry } from "./mock-dict";
import { normalizeWord } from "./text-utils";
import type { KeepMarkState } from "./types";

export function vocabLemma(text: string): string {
  return text.trim().toLowerCase();
}

export function isLemmaSaved(state: KeepMarkState, lemma: string): boolean {
  if (!state.sentence) return false;
  return state.savedKeys.includes(`${lemma}::${state.sentence.slice(0, 80)}`);
}

export function getSaveKey(state: KeepMarkState, word?: string): string {
  const target = word || state.selection;
  if (!target || !state.sentence) return "";
  const lemma = vocabLemma(target) || normalizeWord(target);
  return `${lemma}::${state.sentence.slice(0, 80)}`;
}

export interface SaveResult {
  ok: boolean;
  message: string;
  type: "success" | "warning";
}

export function saveWord(
  state: KeepMarkState,
  wordOverride?: string,
  meaningOverride?: string
): SaveResult {
  const targetWord = wordOverride || state.selection;
  if (!targetWord || !state.sentence) {
    return { ok: false, message: "请先选中英文", type: "warning" };
  }

  const lemma = vocabLemma(targetWord) || normalizeWord(targetWord);
  const meaning =
    meaningOverride?.trim() || lookupEntry(targetWord).meaning;
  const key = `${lemma}::${state.sentence.slice(0, 80)}`;

  if (state.savedKeys.includes(key)) {
    return {
      ok: false,
      message: `已在本句记录过「${targetWord.trim()}」`,
      type: "warning",
    };
  }

  state.savedKeys.push(key);
  if (!state.markedLemmas.includes(lemma)) {
    state.markedLemmas.push(lemma);
  }

  if (!state.bank[lemma]) {
    state.bank[lemma] = {
      lemma: targetWord.trim(),
      meaning,
      count: 1,
    };
    state.stats.new += 1;
    state.stats.review += 1;
    return {
      ok: true,
      message: `已留标「${targetWord.trim()}」`,
      type: "success",
    };
  }

  state.bank[lemma].count += 1;
  return {
    ok: true,
    message: `已记录「${targetWord.trim()}」的新语境`,
    type: "success",
  };
}

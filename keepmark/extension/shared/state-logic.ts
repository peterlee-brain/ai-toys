import { recordMark } from "./api-content";
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

export async function saveWord(
  state: KeepMarkState,
  source: "translate" | "grammar",
  wordOverride?: string,
  meaningOverride?: string
): Promise<SaveResult> {
  const targetWord = wordOverride || state.selection;
  if (!targetWord || !state.sentence) {
    return { ok: false, message: "请先选中英文", type: "warning" };
  }

  const lemma = vocabLemma(targetWord) || normalizeWord(targetWord);
  const key = `${lemma}::${state.sentence.slice(0, 80)}`;

  if (state.savedKeys.includes(key)) {
    return {
      ok: false,
      message: `已在本句记录过「${targetWord.trim()}」`,
      type: "warning",
    };
  }

  try {
    const out = await recordMark({
      lemma,
      source,
      sentence: state.sentence,
    });

    state.savedKeys.push(key);
    if (!state.markedLemmas.includes(lemma)) {
      state.markedLemmas.push(lemma);
    }

    const meaning = meaningOverride?.trim() || state.lastTranslate?.meaning || "";
    if (!state.bank[lemma]) {
      state.bank[lemma] = {
        lemma: targetWord.trim(),
        meaning,
        count: out.mark_count,
      };
      state.stats.new += 1;
      state.stats.review += 1;
    } else {
      state.bank[lemma].count = out.mark_count;
    }

    return {
      ok: true,
      message: `${out.message}（累计 ${out.mark_count} 次）`,
      type: "success",
    };
  } catch (err) {
    console.error("[KeepMark] mark failed", err);
    return {
      ok: false,
      message: "留标失败，请稍后重试",
      type: "warning",
    };
  }
}

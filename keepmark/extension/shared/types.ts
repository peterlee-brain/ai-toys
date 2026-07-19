import type { LearningResult, VocabItem } from "./learning-types";

export interface DictEntry {
  pos: string;
  meaning: string;
  collocation?: string;
}

export interface BankEntry {
  lemma: string;
  meaning: string;
  count: number;
}

export interface KeepMarkState {
  selection: string;
  sentence: string;
  contextBefore: string;
  contextAfter: string;
  autoTranslate: boolean;
  bank: Record<string, BankEntry>;
  markedLemmas: string[];
  savedKeys: string[];
  sidePanelTab: "grammar" | "bank";
  grammarReady: boolean;
  /** Kimi 推荐的重点词汇，打开学习面板后填充 */
  vocabulary: VocabItem[];
  /** 最近一次 grammar API 返回的完整学习数据 */
  learning: LearningResult | null;
  /** 当前句子 id（translate / grammar 响应） */
  sentenceId: string;
  /** 当前选中词的 normalize lemma */
  lemma: string;
  pageUrl: string;
  pageTitle: string;
  expandedBankLemma: string;
}

export const DEFAULT_STATE: KeepMarkState = {
  selection: "",
  sentence: "",
  contextBefore: "",
  contextAfter: "",
  autoTranslate: true,
  bank: {},
  markedLemmas: [],
  savedKeys: [],
  sidePanelTab: "grammar",
  grammarReady: false,
  vocabulary: [],
  learning: null,
  sentenceId: "",
  lemma: "",
  pageUrl: "",
  pageTitle: "",
  expandedBankLemma: "",
};

export type MessageType =
  | { type: "KEEPMARK_OPEN_SIDE_PANEL"; tab?: "grammar" | "bank" }
  | { type: "KEEPMARK_RENDER_GRAMMAR" }
  | { type: "KEEPMARK_STATE_UPDATED" }
  | { type: "KEEPMARK_TOGGLE_AUTO" };

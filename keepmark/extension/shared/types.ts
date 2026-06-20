import type { VocabItem } from "./learning-types";

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
  stats: { new: number; review: number };
  sidePanelTab: "grammar" | "bank";
  grammarReady: boolean;
  /** Kimi 推荐的重点词汇，打开学习面板后填充 */
  vocabulary: VocabItem[];
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
  stats: { new: 0, review: 0 },
  sidePanelTab: "grammar",
  grammarReady: false,
  vocabulary: [],
  pageUrl: "",
  pageTitle: "",
  expandedBankLemma: "",
};

export type MessageType =
  | { type: "KEEPMARK_OPEN_SIDE_PANEL"; tab?: "grammar" | "bank" }
  | { type: "KEEPMARK_RENDER_GRAMMAR" }
  | { type: "KEEPMARK_STATE_UPDATED" };

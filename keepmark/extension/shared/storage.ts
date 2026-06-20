import { DEFAULT_STATE, type KeepMarkState } from "./types";

const STORAGE_KEY = "keepmark_state";

export async function loadState(): Promise<KeepMarkState> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<KeepMarkState> | undefined;
  return { ...DEFAULT_STATE, ...stored };
}

export async function saveState(state: KeepMarkState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  await chrome.runtime.sendMessage({ type: "KEEPMARK_STATE_UPDATED" }).catch(() => {
    /* side panel may be closed */
  });
}

export function onStateChanged(listener: () => void): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string
  ) => {
    if (area === "local" && changes[STORAGE_KEY]) listener();
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

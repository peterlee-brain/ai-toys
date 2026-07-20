const STORAGE_KEY = "keepmark_api_base";

/** 默认远端 HTTP 接口（无需 HTTPS） */
export const DEFAULT_API_BASE = "http://43.165.167.70:8080";

export function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_API_BASE;
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

export async function getApiBase(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY];
  if (typeof stored === "string" && stored.trim()) {
    return normalizeApiBase(stored);
  }
  return DEFAULT_API_BASE;
}

export async function setApiBase(base: string): Promise<string> {
  const normalized = normalizeApiBase(base);
  await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
  return normalized;
}

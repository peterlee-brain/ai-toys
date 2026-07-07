import { API_BASE } from "../shared/api-base";
import { parseApiError } from "../shared/api-normalize";
import type { ApiProxyRequest, ApiProxyResponse } from "../shared/api-types";

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "keepmark-translate",
      title: "KeepMark · 翻译选中文本",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "keepmark-grammar",
      title: "KeepMark · 语法讲解",
      contexts: ["selection"],
    });
  });

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    /* older Chrome */
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id || !info.selectionText) return;
    const isGrammar = info.menuItemId === "keepmark-grammar";
    chrome.tabs.sendMessage(tab.id, {
      type: isGrammar ? "KEEPMARK_FORCE_GRAMMAR" : "KEEPMARK_FORCE_TRANSLATE",
      text: info.selectionText,
    });
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "KEEPMARK_API") {
      void handleApiProxy(message as ApiProxyRequest)
        .then(sendResponse)
        .catch((err: unknown) => {
          sendResponse({
            ok: false,
            status: 0,
            error: err instanceof Error ? err.message : "网络请求失败",
          } satisfies ApiProxyResponse);
        });
      return true;
    }

    if (message?.type === "KEEPMARK_OPEN_SIDE_PANEL" && sender.tab?.id) {
      void chrome.sidePanel
        .open({ tabId: sender.tab.id })
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    return false;
  });
});

async function handleApiProxy(message: ApiProxyRequest): Promise<ApiProxyResponse> {
  const res = await fetch(`${API_BASE}${message.path}`, {
    method: message.method,
    headers: {
      "Content-Type": "application/json",
    },
    body: message.body !== undefined ? JSON.stringify(message.body) : undefined,
  });

  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: parseApiError(raw, res.status),
    };
  }

  return {
    ok: true,
    status: res.status,
    data: raw,
  };
}

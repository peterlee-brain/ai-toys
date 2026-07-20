import { handleApiMessage } from "../shared/api-background.ts";

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
    if (handleApiMessage(message, sendResponse)) return true;

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

import { toDictEntry, translate, explainGrammar } from "../shared/api-content";
import type { DictEntry, KeepMarkState } from "../shared/types";
import uiStyles from "../assets/styles/ui.css?inline";
import { loadState, saveState } from "../shared/storage";
import {
  getSaveKey,
  saveWord,
} from "../shared/state-logic";
import {
  escapeHtml,
  extractSentence,
  getContext,
  hasEnglishText,
} from "../shared/text-utils";

interface SelectionSnapshot {
  text: string;
  rect: DOMRect;
}

function captureSelection(): SelectionSnapshot | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const text = sel.toString().trim();
  if (!text || text.length > 500 || !hasEnglishText(text)) return null;

  const range = sel.getRangeAt(0);
  if (!document.body.contains(range.commonAncestorContainer)) return null;

  const rect = range.getBoundingClientRect();
  return { text, rect };
}

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  runAt: "document_idle",
  allFrames: false,
  main() {
    const host = document.createElement("div");
    host.id = "keepmark-root";
    host.style.cssText =
      "position:fixed;inset:0;z-index:2147483644;pointer-events:none;";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = uiStyles;
    shadow.appendChild(style);

    const layer = document.createElement("div");
    layer.style.cssText =
      "position:fixed;left:0;top:0;pointer-events:none;z-index:1;";
    layer.className = "km-hidden";
    layer.innerHTML = `
      <div class="km-popover" style="pointer-events:auto">
        <div class="km-popover-header">
          <p class="word-title" data-ref="word">—</p>
          <div class="km-popover-actions">
            <button type="button" class="km-btn km-btn-outline" data-ref="grammar">学习</button>
            <button type="button" class="km-btn km-btn-outline km-btn-save-star" data-ref="save" title="留标">☆</button>
            <button type="button" class="km-btn km-btn-icon" data-ref="close" title="关闭">×</button>
          </div>
        </div>
        <div class="km-popover-body" data-ref="body"></div>
      </div>`;
    shadow.appendChild(layer);

    const toastWrap = document.createElement("div");
    toastWrap.className = "km-toast-wrap km-hidden";
    toastWrap.innerHTML = `<div class="km-toast" data-ref="toast"><span data-ref="toastText"></span></div>`;
    shadow.appendChild(toastWrap);

    const refs = {
      word: layer.querySelector('[data-ref="word"]') as HTMLElement,
      body: layer.querySelector('[data-ref="body"]') as HTMLElement,
      save: layer.querySelector('[data-ref="save"]') as HTMLButtonElement,
      grammar: layer.querySelector('[data-ref="grammar"]') as HTMLButtonElement,
      close: layer.querySelector('[data-ref="close"]') as HTMLButtonElement,
      toastWrap,
      toastText: toastWrap.querySelector('[data-ref="toastText"]') as HTMLElement,
      toast: toastWrap.querySelector(".km-toast") as HTMLElement,
    };

    let state: KeepMarkState | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let translateTimer: ReturnType<typeof setTimeout> | null = null;
    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    let popoverOpen = false;
    let lastRequestKey = "";
    let lastRect: DOMRect | null = null;
    let pendingSnapshot: SelectionSnapshot | null = null;
    let isSelecting = false;

    void loadState().then((s) => {
      state = s;
    });

    function pageRootText(): string {
      return document.body?.innerText || "";
    }

    function showToast(message: string, type: "success" | "warning" = "success") {
      if (toastTimer) clearTimeout(toastTimer);
      refs.toastText.textContent = message;
      refs.toast.classList.toggle("warning", type === "warning");
      toastWrap.classList.remove("km-hidden");
      toastTimer = setTimeout(() => toastWrap.classList.add("km-hidden"), 2000);
    }

    async function persist(next: KeepMarkState) {
      state = next;
      try {
        await saveState(next);
      } catch {
        /* storage unavailable — still show UI */
      }
    }

    function positionPopover() {
      const gap = 8;
      const popWidth = 300;
      const popHeight = 240;

      let top = window.innerHeight / 2 - popHeight / 2;
      let left = window.innerWidth / 2;

      if (lastRect && (lastRect.width > 0 || lastRect.height > 0)) {
        top = lastRect.bottom + gap;
        if (lastRect.bottom + popHeight + gap > window.innerHeight) {
          top = Math.max(gap, lastRect.top - gap - popHeight);
        }
        left = lastRect.left + lastRect.width / 2;
        left = Math.max(
          12 + popWidth / 2,
          Math.min(left, window.innerWidth - 12 - popWidth / 2)
        );
      }

      layer.style.transform = `translate(${left - popWidth / 2}px, ${top}px)`;
      layer.classList.remove("km-hidden");
    }

    function hidePopover() {
      popoverOpen = false;
      if (translateTimer) clearTimeout(translateTimer);
      layer.classList.add("km-hidden");
    }

    function closeAll() {
      hidePopover();
      pendingSnapshot = null;
      window.getSelection()?.removeAllRanges();
    }

    function updateSaveButton() {
      if (!state) return;
      const saved = state.savedKeys.includes(getSaveKey(state));
      refs.save.textContent = saved ? "★" : "☆";
      refs.save.classList.toggle("saved", saved);
      refs.save.title = saved ? "已留标" : "留标";
    }

    function renderLoading() {
      refs.body.innerHTML = `
        <div class="km-skeleton">
          <div class="km-skeleton-line w80"></div>
          <div class="km-skeleton-line w60"></div>
        </div>`;
    }

    function renderError(message: string) {
      refs.body.innerHTML = `
        <p class="km-meaning" style="color:var(--km-error)">
          ${escapeHtml(message)}
        </p>`;
    }

    function renderContent(entry: DictEntry, word: string) {
      refs.word.textContent =
        word.length > 28 ? word.slice(0, 28) + "…" : word;
      refs.body.innerHTML = `
        <p class="km-meaning">
          <span class="km-pos-tag">${escapeHtml(entry.pos)}</span>${escapeHtml(entry.meaning)}
        </p>`;
    }

    async function openTranslate(force = false) {
      if (!state?.selection) return;
      if (!state.autoTranslate && !force) return;

      const requestKey = state.selection.trim();
      if (!force && popoverOpen && lastRequestKey === requestKey) {
        updateSaveButton();
        return;
      }

      lastRequestKey = requestKey;
      popoverOpen = true;
      positionPopover();
      renderLoading();
      updateSaveButton();
      refs.word.textContent =
        state.selection.length > 28
          ? state.selection.slice(0, 28) + "…"
          : state.selection;

      try {
        const out = await translate({
          selection: state.selection,
          sentence: state.sentence,
        });
        if (state) {
          await persist({
            ...state,
            lastTranslate: {
              word: state.selection,
              pos: out.pos,
              meaning: out.translation,
              lemma: out.lemma,
            },
          });
        }
        renderContent(toDictEntry(out), state.selection);
      } catch (err) {
        refs.body.innerHTML = `
          <p class="km-meaning" style="color:var(--km-text-secondary)">
            翻译失败，请稍后重试
          </p>`;
        showToast("翻译失败", "warning");
        console.error("[KeepMark] translate failed", err);
      }
    }

    function scheduleSelectionCheck() {
      const snap = captureSelection();
      if (snap) pendingSnapshot = snap;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void handleSelection();
      }, 280);
    }

    async function handleSelection() {
      if (!state) state = await loadState();

      const snap = pendingSnapshot ?? captureSelection();
      pendingSnapshot = null;

      if (!snap) {
        if (!popoverOpen && !isSelecting) hidePopover();
        return;
      }

      lastRect = snap.rect;
      const rootText = pageRootText();
      const sentence = extractSentence(snap.text, rootText);
      const ctx = getContext(snap.text, rootText);

      const next: KeepMarkState = {
        ...state,
        selection: snap.text,
        sentence,
        contextBefore: ctx.before,
        contextAfter: ctx.after,
        pageUrl: location.href,
        pageTitle: document.title,
        grammarReady: false,
        vocabulary: [],
        sidePanelTab: "bank",
      };

      state = next;

      if (next.autoTranslate) openTranslate();

      void persist(next);
    }

    async function handleSave() {
      if (!state) state = await loadState();
      const result = await saveWord(state, "translate");
      if (!result.ok) {
        showToast(result.message, result.type);
        updateSaveButton();
        return;
      }
      await persist({ ...state });
      showToast(result.message, result.type);
      updateSaveButton();
    }

    async function openGrammarPanel() {
      if (!state?.sentence) return;
      renderLoading();

      const start = performance.now();
      try {
        const timeoutMs = 30000;
        const learning = await Promise.race([
          explainGrammar({ sentence: state.sentence }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("学习请求超时，请检查网络或后端服务")), timeoutMs)
          ),
        ]);
        const next: KeepMarkState = {
          ...state,
          grammarReady: true,
          vocabulary: learning.vocabulary,
          grammarResult: learning,
          sidePanelTab: "grammar" as const,
        };
        await persist(next);
        console.log(`[KeepMark content] grammar request took ${Math.round(performance.now() - start)}ms`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        renderError(message.includes("超时") ? "学习请求超时" : "学习请求失败");
        showToast(message.includes("超时") ? "学习请求超时" : "学习请求失败", "warning");
        console.error("[KeepMark] grammar failed", err);
      }
    }

    refs.grammar.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // 同步发送打开侧边栏消息，保留用户手势上下文
      void chrome.runtime
        .sendMessage({ type: "KEEPMARK_OPEN_SIDE_PANEL", tab: "grammar" })
        .catch(() => {});
      console.log("[KeepMark content] open side panel message sent synchronously");
      void openGrammarPanel();
    });
    refs.save.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void handleSave();
    });
    refs.close.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAll();
    });

    document.addEventListener(
      "mouseup",
      () => {
        isSelecting = false;
        scheduleSelectionCheck();
      },
      true
    );

    document.addEventListener(
      "mousedown",
      (e) => {
        const path = e.composedPath();
        if (path.includes(host)) return;
        isSelecting = true;
        if (popoverOpen) hidePopover();
      },
      true
    );

    document.addEventListener("selectionchange", () => {
      if (isSelecting) scheduleSelectionCheck();
    });

    document.addEventListener("keyup", (e) => {
      if (e.shiftKey || e.key.startsWith("Arrow")) scheduleSelectionCheck();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAll();
        return;
      }
      if (!state?.selection) return;
      if (e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        void openGrammarPanel();
      }
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    });

    window.addEventListener(
      "scroll",
      () => {
        if (!popoverOpen || !state?.selection) return;
        const snap = captureSelection();
        if (snap?.rect && (snap.rect.width || snap.rect.height)) {
          lastRect = snap.rect;
          positionPopover();
        }
      },
      true
    );

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "KEEPMARK_TOGGLE_AUTO") {
        void loadState().then((s) => {
          state = s;
          if (!s.autoTranslate) closeAll();
        });
      }
      if (message?.type === "KEEPMARK_FORCE_TRANSLATE" && message.text) {
        void loadState().then(async (s) => {
          state = { ...s, selection: String(message.text), autoTranslate: true };
          openTranslate(true);
        });
      }
      if (message?.type === "KEEPMARK_FORCE_GRAMMAR" && message.text) {
        void loadState().then(async (s) => {
          const sentence = extractSentence(String(message.text), pageRootText());
          state = {
            ...s,
            selection: String(message.text),
            sentence,
            grammarReady: false,
            vocabulary: [],
            grammarResult: undefined,
            sidePanelTab: "grammar",
          };
          await persist(state);
          void openGrammarPanel();
        });
      }
    });
  },
});

import {
  apiGrammar,
  apiMark,
  apiTranslate,
  formatApiError,
  grammarToLearning,
  type TranslateResponse,
} from "../shared/api";
import { loadState, saveState } from "../shared/storage";
import {
  getSaveKey,
  saveWord,
  vocabLemma,
} from "../shared/state-logic";
import {
  escapeHtml,
  blockTextFromRange,
  extractSentence,
  getContext,
  hasEnglishText,
} from "../shared/text-utils";
import type { KeepMarkState } from "../shared/types";
import uiStyles from "../assets/styles/ui.css?inline";

interface SelectionSnapshot {
  text: string;
  rect: DOMRect;
  range: Range;
}

function captureSelection(): SelectionSnapshot | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const text = sel.toString().trim();
  if (!text || text.length > 500 || !hasEnglishText(text)) return null;

  const range = sel.getRangeAt(0);
  if (!document.body.contains(range.commonAncestorContainer)) return null;

  const cloned = range.cloneRange();
  const rect = cloned.getBoundingClientRect();
  return { text, rect, range: cloned };
}

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  runAt: "document_idle",
  allFrames: false,
  main() {
    const host = document.createElement("div");
    host.id = "keepmark-root";
    host.style.cssText =
      "all:initial;position:fixed;inset:0;z-index:2147483644;pointer-events:none;color:#1a1d23;-webkit-text-fill-color:#1a1d23;font-family:system-ui,-apple-system,sans-serif;";
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
          <div class="word-title" data-ref="word">—</div>
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
    let lastRange: Range | null = null;
    let pendingSnapshot: SelectionSnapshot | null = null;
    let isSelecting = false;
    let followRaf = 0;

    void loadState().then(async (s) => {
      // 页面刷新/注入时清掉可能残留的加载态，避免侧栏假转圈
      if (s.grammarLoading) {
        state = { ...s, grammarLoading: false, grammarReady: true };
        await persist(state);
      } else {
        state = s;
      }
    });

    function pageRootText(): string {
      return document.body?.innerText || "";
    }

    function sentenceRootForSnapshot(snap: SelectionSnapshot): string {
      const block = blockTextFromRange(snap.range);
      return block || pageRootText();
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

    function readAnchorRect(): DOMRect | null {
      if (lastRange) {
        try {
          const rect = lastRange.getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) return rect;
        } catch {
          lastRange = null;
        }
      }
      const snap = captureSelection();
      if (snap) {
        lastRange = snap.range;
        return snap.rect;
      }
      return lastRect;
    }

    function positionPopover(opts: { animate?: boolean } = {}) {
      const gap = 8;
      const popWidth = 280;
      const pop = layer.querySelector(".km-popover") as HTMLElement | null;
      const animate = opts.animate === true;

      let top = window.innerHeight / 2;
      let left = window.innerWidth / 2;

      const rect = readAnchorRect();
      if (rect && (rect.width > 0 || rect.height > 0)) {
        lastRect = rect;
        // 始终贴在选区下方，并随滚动更新
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2;
        left = Math.max(
          12 + popWidth / 2,
          Math.min(left, window.innerWidth - 12 - popWidth / 2)
        );
      }

      if (pop) {
        pop.style.transformOrigin = "center top";
        pop.classList.remove("km-pop-above");
        if (animate) {
          pop.classList.remove("km-pop-anim");
          void pop.offsetWidth;
          pop.classList.add("km-pop-anim");
        }
      }

      layer.style.transform = `translate(${left - popWidth / 2}px, ${top}px)`;
      layer.classList.remove("km-hidden");
    }

    function followSelection() {
      if (!popoverOpen) return;
      if (followRaf) cancelAnimationFrame(followRaf);
      followRaf = requestAnimationFrame(() => {
        followRaf = 0;
        positionPopover({ animate: false });
      });
    }

    function hidePopover() {
      popoverOpen = false;
      if (translateTimer) clearTimeout(translateTimer);
      if (followRaf) {
        cancelAnimationFrame(followRaf);
        followRaf = 0;
      }
      const pop = layer.querySelector(".km-popover");
      pop?.classList.remove("km-pop-anim");
      layer.classList.add("km-hidden");
    }

    function closeAll() {
      hidePopover();
      pendingSnapshot = null;
      lastRange = null;
      lastRect = null;
      window.getSelection()?.removeAllRanges();
    }

    function updateSaveButton() {
      if (!state) return;
      const saved = state.savedKeys.includes(getSaveKey(state));
      refs.save.textContent = saved ? "★" : "☆";
      refs.save.classList.toggle("saved", saved);
      refs.save.title = saved ? "已留标" : "留标";
    }

    function setWordTitle(text: string) {
      const display = text.trim() || "—";
      refs.word.textContent =
        display.length > 28 ? `${display.slice(0, 28)}…` : display;
      refs.word.setAttribute("title", display);
      refs.word.style.setProperty("color", "#0f172a", "important");
      refs.word.style.setProperty("-webkit-text-fill-color", "#0f172a", "important");
      refs.word.style.setProperty("opacity", "1", "important");
    }

    function renderLoading() {
      refs.body.innerHTML = `
        <div class="km-skeleton">
          <div class="km-skeleton-line w80"></div>
          <div class="km-skeleton-line w60"></div>
        </div>`;
    }

    function renderContent(entry: TranslateResponse) {
      const display = (state?.selection || entry.word || entry.lemma || "").trim();
      setWordTitle(display);
      const count =
        entry.seen_count > 0
          ? `<span class="km-seen-inline">【${entry.seen_count}次】</span>`
          : "";
      refs.body.innerHTML = `
        <p class="km-meaning">
          <span class="km-pos-tag">${escapeHtml(entry.pos)}</span>${escapeHtml(entry.meaning)}${count}
        </p>`;
    }

    async function fetchTranslate(force = false) {
      if (!state?.selection || !state.sentence) return;

      const requestKey = `${state.selection.trim()}::${state.sentence.slice(0, 80)}`;
      if (!force && popoverOpen && lastRequestKey === requestKey) {
        updateSaveButton();
        return;
      }

      lastRequestKey = requestKey;
      popoverOpen = true;
      positionPopover({ animate: true });
      renderLoading();
      updateSaveButton();
      setWordTitle(state.selection);

      try {
        const entry = await apiTranslate({
          selection: state.selection,
          sentence: state.sentence,
        });
        state = {
          ...state,
          lemma: entry.lemma,
          sentenceId: entry.sentence_id,
        };
        renderContent(entry);
        void persist(state);
      } catch (err) {
        refs.body.innerHTML = `<p class="km-meaning km-error">${escapeHtml(
          formatApiError(err)
        )}</p>`;
      }
    }

    function openTranslate(force = false) {
      if (!state?.selection) return;
      if (!state.autoTranslate && !force) return;

      if (translateTimer) clearTimeout(translateTimer);
      translateTimer = setTimeout(() => {
        void fetchTranslate(force);
      }, 250);
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

      // 学习请求进行中：忽略选区变化，避免把 grammarLoading 冲掉
      if (state.grammarLoading) return;

      const snap = pendingSnapshot ?? captureSelection();
      pendingSnapshot = null;

      if (!snap) {
        if (!popoverOpen && !isSelecting) hidePopover();
        return;
      }

      lastRect = snap.rect;
      lastRange = snap.range;
      const rootText = sentenceRootForSnapshot(snap);
      const sentence = extractSentence(snap.text, rootText);
      const ctx = getContext(snap.text, rootText);

      // 选中只更新快译语境；保留已加载的学习内容，避免点「学习」后被选区事件清空
      const next: KeepMarkState = {
        ...state,
        selection: snap.text,
        sentence,
        contextBefore: ctx.before,
        contextAfter: ctx.after,
        pageUrl: location.href,
        pageTitle: document.title,
        lemma: "",
      };

      state = next;

      if (next.autoTranslate) openTranslate();

      void persist(next);
    }

    async function handleSave() {
      if (!state) state = await loadState();

      const saveKey = getSaveKey(state);
      if (saveKey && state.savedKeys.includes(saveKey)) {
        showToast(`已在本句记录过「${state.selection.trim()}」`, "warning");
        updateSaveButton();
        return;
      }

      const lemma =
        state.lemma || vocabLemma(state.selection) || state.selection.trim();

      try {
        const res = await apiMark({
          lemma,
          source: "translate",
          sentence: state.sentence,
        });
        const result = saveWord(state);
        if (!result.ok) {
          showToast(result.message, result.type);
          updateSaveButton();
          return;
        }
        await persist({ ...state });
        showToast(res.message || result.message, result.type);
        updateSaveButton();
      } catch (err) {
        showToast(formatApiError(err), "warning");
      }
    }

    async function openGrammarPanel() {
      if (!state?.selection || !state.sentence) return;

      refs.grammar.disabled = true;

      const sentence = state.sentence.trim();
      if (sentence.length > 400) {
        showToast("句子截取异常（过长），请重新选中一句英文", "warning");
        refs.grammar.disabled = false;
        const fallback = {
          ...state,
          grammarLoading: false,
          grammarReady: true,
          learning: null,
          vocabulary: [],
          sidePanelTab: "grammar" as const,
        };
        state = fallback;
        await persist(fallback);
        return;
      }

      const loading = {
        ...state,
        grammarLoading: true,
        grammarReady: false,
        learning: null,
        vocabulary: [],
        sidePanelTab: "grammar" as const,
      };
      state = loading;
      // 先写入加载态，再开侧栏；保留 Popover，不因点「学习」而关闭
      await persist(loading);

      await chrome.runtime
        .sendMessage({ type: "KEEPMARK_OPEN_SIDE_PANEL", tab: "grammar" })
        .catch(() => {});

      const start = performance.now();
      try {
        const res = await apiGrammar({
          sentence,
        });
        const learning = grammarToLearning(res);
        const next = {
          ...state,
          grammarLoading: false,
          grammarReady: true,
          learning,
          vocabulary: learning.vocabulary,
          sentenceId: res.sentence_id,
          sidePanelTab: "grammar" as const,
        };
        await persist(next);
        console.log(`[KeepMark content] grammar request took ${Math.round(performance.now() - start)}ms`);
      } catch (err) {
        const error = formatApiError(err);
        showToast(error, "warning");
        const fallback = {
          ...state,
          grammarLoading: false,
          grammarReady: true,
          learning: null,
          vocabulary: [],
          sidePanelTab: "grammar" as const,
        };
        await persist(fallback);
      } finally {
        refs.grammar.disabled = false;
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

    window.addEventListener("scroll", followSelection, true);
    document.addEventListener("scroll", followSelection, true);
    window.addEventListener("resize", followSelection);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("scroll", followSelection);
      window.visualViewport.addEventListener("resize", followSelection);
    }

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
          const snap = captureSelection();
          const root = snap
            ? sentenceRootForSnapshot(snap)
            : pageRootText();
          const sentence = extractSentence(String(message.text), root);
          state = {
            ...s,
            selection: String(message.text),
            sentence,
            grammarLoading: true,
            grammarReady: false,
            learning: null,
            vocabulary: [],
            sidePanelTab: "grammar",
          };
          await persist(state);
          void openGrammarPanel();
        });
      }
    });
  },
});

import { apiMark } from "../../shared/api";
import { renderLearningHtml } from "../../shared/render-learning";
import { loadState, onStateChanged, saveState } from "../../shared/storage";
import {
  isLemmaSaved,
  saveWord,
  vocabLemma,
} from "../../shared/state-logic";
import { escapeHtml } from "../../shared/text-utils";
import {
  vocabKindLabel,
  vocabOccurrenceCount,
} from "../../shared/vocab-display";
import type { KeepMarkState } from "../../shared/types";
import uiStyles from "../../assets/styles/ui.css?inline";

const app = document.getElementById("app")!;

const style = document.createElement("style");
style.textContent = uiStyles;
document.head.appendChild(style);

app.innerHTML = `
  <div class="km-panel">
    <div class="km-panel-header">
      <span class="km-panel-header-title">KeepMark</span>
      <div class="km-panel-header-toggle">
        <span class="km-panel-header-toggle-label">选中即翻译</span>
        <button type="button" id="toggleAuto" class="km-toggle on" aria-label="选中即翻译"></button>
      </div>
      <button type="button" id="btnClosePanel" class="km-btn km-btn-icon" title="关闭侧栏" aria-label="关闭侧栏">×</button>
    </div>
    <div class="km-tabs">
      <button type="button" class="km-tab active" data-tab="grammar">学习</button>
      <button type="button" class="km-tab" data-tab="bank">词库</button>
    </div>
    <div class="km-side-body">
      <div id="panelGrammar" class="km-tab-panel active">
        <div id="grammarEmpty" class="km-empty">
          <div class="km-empty-icon">📖</div>
          在网页中选中英文后<br />点击 Popover「学习」或 <kbd>Alt+G</kbd>
        </div>
        <div id="grammarContent" class="km-hidden"></div>
      </div>
      <div id="panelBank" class="km-tab-panel">
        <div id="bankHeader" class="km-bank-header km-hidden"></div>
        <div id="bankList"></div>
        <div id="bankEmpty" class="km-empty">
          <div class="km-empty-icon">📚</div>
          打开「学习」面板后<br />此处展示 Kimi 推荐的重点词汇<br /><span style="font-size:12px;color:var(--km-text-tertiary)">点击 ☆ 留标你想学的词或短语</span>
        </div>
      </div>
    </div>
  </div>`;

const grammarEmpty = document.getElementById("grammarEmpty")!;
const grammarContent = document.getElementById("grammarContent")!;
const bankHeader = document.getElementById("bankHeader")!;
const bankList = document.getElementById("bankList")!;
const bankEmpty = document.getElementById("bankEmpty")!;
const toggleAuto = document.getElementById("toggleAuto")!;

document.getElementById("btnClosePanel")!.addEventListener("click", () => {
  window.close();
});

toggleAuto.addEventListener("click", () => {
  void loadState().then(async (state) => {
    const next = { ...state, autoTranslate: !state.autoTranslate };
    await saveState(next);
    toggleAuto.classList.toggle("on", next.autoTranslate);
    chrome.runtime.sendMessage({ type: "KEEPMARK_TOGGLE_AUTO" }).catch(() => {});
  });
});

function switchTab(tabName: "grammar" | "bank") {
  document.querySelectorAll(".km-tab").forEach((t) => {
    t.classList.toggle("active", (t as HTMLElement).dataset.tab === tabName);
  });
  document.querySelectorAll(".km-tab-panel").forEach((p) => p.classList.remove("active"));
  document
    .getElementById(tabName === "grammar" ? "panelGrammar" : "panelBank")
    ?.classList.add("active");
}

document.querySelectorAll(".km-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const name = (tab as HTMLElement).dataset.tab as "grammar" | "bank";
    switchTab(name);
    void loadState().then(async (state) => {
      await saveState({ ...state, sidePanelTab: name });
    });
  });
});

function renderGrammar(state: KeepMarkState) {
  if (!state.selection || !state.grammarReady || !state.learning) {
    grammarEmpty.classList.remove("km-hidden");
    grammarContent.classList.add("km-hidden");
    if (state.selection && !state.grammarReady) {
      grammarEmpty.innerHTML = `
        <div class="km-empty-icon">⏳</div>
        正在加载学习内容…`;
    }
    return;
  }

  grammarEmpty.classList.add("km-hidden");
  grammarContent.classList.remove("km-hidden");

  grammarContent.innerHTML = renderLearningHtml(state.learning, {
    prefix: "km-",
    stream: true,
  });

  if (state.sidePanelTab === "grammar") switchTab("grammar");
}

function renderBank(state: KeepMarkState) {
  bankList.innerHTML = "";

  if (!state.grammarReady || state.vocabulary.length === 0) {
    bankHeader.classList.add("km-hidden");
    bankEmpty.classList.remove("km-hidden");
    if (state.sentence && !state.grammarReady) {
      bankEmpty.innerHTML = `
        <div class="km-empty-icon">📚</div>
        请先打开「学习」面板<br /><span style="font-size:12px;color:var(--km-text-tertiary)">Kimi 会推荐本句重点词汇，由你自行选择留标</span>`;
    } else {
      bankEmpty.innerHTML = `
        <div class="km-empty-icon">📚</div>
        打开「学习」面板后<br />此处展示 Kimi 推荐的重点词汇<br /><span style="font-size:12px;color:var(--km-text-tertiary)">点击 ☆ 留标你想学的词或短语</span>`;
    }
    return;
  }

  bankEmpty.classList.add("km-hidden");
  bankHeader.classList.remove("km-hidden");
  bankHeader.textContent = `重点词汇 · ${state.vocabulary.length} 项 · 点击行展开详情，☆ 留标`;

  state.vocabulary.forEach((item) => {
    const lemma = vocabLemma(item.text);
    const saved = isLemmaSaved(state, lemma);
    const isExpanded = state.expandedBankLemma === lemma;
    const kind = vocabKindLabel(item);
    const count = vocabOccurrenceCount(state, item);
    const row = document.createElement("div");
    row.className =
      "km-word-row" + (isExpanded ? " expanded" : "") + (saved ? " marked" : "");

    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.className =
      "km-btn km-btn-outline km-btn-save-star km-word-row-star" +
      (saved ? " saved" : "");
    starBtn.textContent = saved ? "★" : "☆";
    starBtn.title = saved ? "已留标" : "留标";
    starBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      void loadState().then(async (s) => {
        const lemma = vocabLemma(item.text);
        const saveKey = `${lemma}::${s.sentence.slice(0, 80)}`;
        if (s.savedKeys.includes(saveKey)) return;

        try {
          await apiMark({
            lemma,
            sentence_id: s.sentenceId || undefined,
          });
          saveWord(s, item.text, item.translation);
          await saveState({ ...s });
          renderAll(s);
        } catch {
          /* ignore — user sees no star change */
        }
      });
    });

    const noteHtml = item.note
      ? `<p class="km-word-row-detail-meta">${escapeHtml(item.note)}</p>`
      : "";

    row.innerHTML = `
      <div class="km-word-row-main">
        <span class="km-word-row-chevron" aria-hidden="true">›</span>
        <span class="km-word-row-lemma">${escapeHtml(item.text)}</span>
        <span class="km-word-row-pos">${escapeHtml(kind)}</span>
        <span class="km-word-row-count">${count} 次</span>
      </div>
      <div class="km-word-row-detail">
        <div class="km-word-row-detail-label">释义</div>
        <p class="km-word-row-detail-text">${escapeHtml(item.translation)}</p>
        ${noteHtml}
      </div>`;

    row.querySelector(".km-word-row-main")?.appendChild(starBtn);

    row.addEventListener("click", () => {
      void loadState().then(async (s) => {
        const nextLemma = s.expandedBankLemma === lemma ? "" : lemma;
        await saveState({ ...s, expandedBankLemma: nextLemma });
        renderAll({ ...s, expandedBankLemma: nextLemma });
      });
    });

    bankList.appendChild(row);
  });

  if (state.sidePanelTab === "bank") switchTab("bank");
}

function renderFooter(state: KeepMarkState) {
  toggleAuto.classList.toggle("on", state.autoTranslate);
}

function renderAll(state: KeepMarkState) {
  renderGrammar(state);
  renderBank(state);
  renderFooter(state);
  switchTab(state.sidePanelTab);
}

void loadState().then(renderAll);
onStateChanged(() => {
  void loadState().then(renderAll);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "KEEPMARK_STATE_UPDATED") {
    void loadState().then(renderAll);
  }
});

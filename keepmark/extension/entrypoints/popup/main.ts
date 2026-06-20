import { loadState, onStateChanged, saveState } from "../../shared/storage";
import uiStyles from "../../assets/styles/ui.css?inline";

const style = document.createElement("style");
style.textContent = uiStyles;
document.head.appendChild(style);

const app = document.getElementById("app")!;
app.innerHTML = `
  <div class="km-popup">
    <h1>KeepMark · 留标</h1>
    <p class="km-popup-sub">演示版 · 本地 mock 数据</p>
    <div class="km-stats">
      <div>
        <div id="statNew" class="km-stat-num">0</div>
        <div class="km-stat-label">今日新增留标</div>
      </div>
      <div>
        <div id="statReview" class="km-stat-num">0</div>
        <div class="km-stat-label">已留标条目</div>
      </div>
    </div>
    <button type="button" id="btnOpenPanel" class="km-btn km-btn-primary km-btn-wide">打开 Side Panel</button>
    <div class="km-toggle-row">
      <span>选中即翻译</span>
      <button type="button" id="toggleAuto" class="km-toggle on" aria-label="选中即翻译"></button>
    </div>
    <p style="font-size:11px;color:var(--km-text-tertiary);margin:12px 0 0;line-height:1.5">
      在英文网页拖选文字 → 自动弹出释义。试试选中 <strong>notwithstanding</strong>。
    </p>
  </div>`;

const statNew = document.getElementById("statNew")!;
const statReview = document.getElementById("statReview")!;
const toggleAuto = document.getElementById("toggleAuto")!;

function render() {
  void loadState().then((state) => {
    statNew.textContent = String(state.stats.new);
    statReview.textContent = String(state.savedKeys.length);
    toggleAuto.classList.toggle("on", state.autoTranslate);
  });
}

toggleAuto.addEventListener("click", () => {
  void loadState().then(async (state) => {
    const next = { ...state, autoTranslate: !state.autoTranslate };
    await saveState(next);
    toggleAuto.classList.toggle("on", next.autoTranslate);
    chrome.runtime.sendMessage({ type: "KEEPMARK_TOGGLE_AUTO" }).catch(() => {});
  });
});

document.getElementById("btnOpenPanel")!.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  }
  window.close();
});

render();
onStateChanged(render);

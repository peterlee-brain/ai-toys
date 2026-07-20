import { loadState, onStateChanged, saveState } from "../../shared/storage";
import { DEFAULT_API_BASE, getApiBase, setApiBase } from "../../shared/config";
import { healthCheck } from "../../shared/api-extension";
import uiStyles from "../../assets/styles/ui.css?inline";

const style = document.createElement("style");
style.textContent =
  uiStyles +
  `
  .km-api-label {
    display: block;
    margin: 14px 0 6px;
    font-size: 12px;
    color: var(--km-text-secondary);
    font-weight: 600;
  }
  .km-api-input {
    width: 100%;
    height: 32px;
    border: 1px solid var(--km-border);
    border-radius: var(--km-radius-sm);
    padding: 0 10px;
    font-size: 12px;
    font-family: inherit;
    color: var(--km-text);
    background: var(--km-bg);
  }
  .km-api-row {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .km-api-row .km-btn {
    flex: 1;
    height: 32px;
  }
  .km-api-hint {
    margin: 8px 0 0;
    font-size: 11px;
    color: var(--km-text-tertiary);
    line-height: 1.5;
  }
  .km-api-status {
    margin: 6px 0 0;
    font-size: 11px;
    line-height: 1.4;
  }
  .km-api-status.ok { color: var(--km-success); }
  .km-api-status.err { color: var(--km-error); }
`;
document.head.appendChild(style);

const app = document.getElementById("app")!;
app.innerHTML = `
  <div class="km-popup">
    <h1>KeepMark · 留标</h1>
    <p class="km-popup-sub">HTTP 接口 · 后台代理请求</p>
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
    <label class="km-api-label" for="apiBase">API 地址（HTTP）</label>
    <input id="apiBase" class="km-api-input" type="text" spellcheck="false"
      placeholder="${DEFAULT_API_BASE}" />
    <div class="km-api-row">
      <button type="button" id="btnSaveApi" class="km-btn km-btn-outline">保存</button>
      <button type="button" id="btnTestApi" class="km-btn km-btn-outline">测试连接</button>
    </div>
    <p id="apiStatus" class="km-api-status"></p>
    <p class="km-api-hint">
      默认 <code>${DEFAULT_API_BASE}</code>。请求由扩展后台发出，HTTPS 页面也可调 HTTP 接口。
      本地可填 <code>http://127.0.0.1:8080</code>。
    </p>
  </div>`;

const statNew = document.getElementById("statNew")!;
const statReview = document.getElementById("statReview")!;
const toggleAuto = document.getElementById("toggleAuto")!;
const apiBaseInput = document.getElementById("apiBase") as HTMLInputElement;
const apiStatus = document.getElementById("apiStatus")!;

function setStatus(text: string, ok?: boolean) {
  apiStatus.textContent = text;
  apiStatus.classList.toggle("ok", ok === true);
  apiStatus.classList.toggle("err", ok === false);
}

function render() {
  void loadState().then((state) => {
    statNew.textContent = String(state.stats.new);
    statReview.textContent = String(state.savedKeys.length);
    toggleAuto.classList.toggle("on", state.autoTranslate);
  });
}

void getApiBase().then((base) => {
  apiBaseInput.value = base;
});

toggleAuto.addEventListener("click", () => {
  void loadState().then(async (state) => {
    const next = { ...state, autoTranslate: !state.autoTranslate };
    await saveState(next);
    toggleAuto.classList.toggle("on", next.autoTranslate);
    chrome.runtime.sendMessage({ type: "KEEPMARK_TOGGLE_AUTO" }).catch(() => {});
  });
});

document.getElementById("btnSaveApi")!.addEventListener("click", () => {
  void setApiBase(apiBaseInput.value).then((saved) => {
    apiBaseInput.value = saved;
    setStatus(`已保存：${saved}`, true);
  });
});

document.getElementById("btnTestApi")!.addEventListener("click", () => {
  void (async () => {
    const saved = await setApiBase(apiBaseInput.value);
    apiBaseInput.value = saved;
    setStatus("测试中…");
    try {
      const data = await healthCheck();
      setStatus(`连接成功：${data.status}`, true);
    } catch (err) {
      setStatus(`连接失败：${String(err)}`, false);
    }
  })();
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

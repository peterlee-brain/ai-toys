'use strict';

(function exposeContent(global) {
  function snapshotFromCell(cell) {
    return {
      text: String(cell?.innerText ?? ''),
      links: Array.from(cell?.querySelectorAll?.('a[href]') || [], (link) => link.getAttribute('href'))
        .filter(Boolean),
      imageUrl: cell?.querySelector?.('img[src*="profile_images"]')?.src || ''
    };
  }

  function resolveOwnFollowingContext(url, profileHref, coreApi) {
    const pageHandle = coreApi?.getFollowingHandle(url);
    const loggedInHandle = coreApi?.getHandleFromProfileHref(profileHref);
    if (!pageHandle || !loggedInHandle || pageHandle !== loggedInHandle) return null;
    return { ownerHandle: pageHandle };
  }

  const publicApi = { snapshotFromCell, resolveOwnFollowingContext };
  global.XNonFollowbackContent = publicApi;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = publicApi;
  }

  if (!global.document || !global.location || !global.chrome?.storage?.local) return;

  const core = global.XNonFollowbackCore;
  const panelApi = global.XNonFollowbackPanel;
  if (!core || !panelApi) return;

  const document = global.document;
  const storage = global.chrome.storage.local;
  const STORAGE_PREFIX = 'x-non-followback:';
  const WRITE_DELAY_MS = 250;
  const SCAN_DELAY_MS = 120;
  const INVALID_CELL_LIMIT = 5;

  let runtime = null;
  let runtimeGeneration = 0;
  let reconcileScheduled = false;

  function storageKey(ownerHandle) {
    return `${STORAGE_PREFIX}${ownerHandle}`;
  }

  function readStorage(key) {
    return new Promise((resolve) => {
      storage.get(key, (result) => {
        void global.chrome.runtime?.lastError;
        resolve(result?.[key]);
      });
    });
  }

  function writeStorage(key, value) {
    return new Promise((resolve) => {
      storage.set({ [key]: value }, () => {
        void global.chrome.runtime?.lastError;
        resolve();
      });
    });
  }

  function removeStorage(key) {
    return new Promise((resolve) => {
      storage.remove(key, () => {
        void global.chrome.runtime?.lastError;
        resolve();
      });
    });
  }

  function render(current) {
    if (!current || current !== runtime) return;
    const status = current.warning
      ? '扫描已停止'
      : current.enabled
        ? '正在扫描，请继续向下滚动'
        : '扫描已暂停';
    current.panel.render({
      ownerHandle: current.ownerHandle,
      enabled: current.enabled,
      status,
      state: current.state,
      warning: current.warning
    });
  }

  function persistNow(current) {
    if (!current || current.clearing) return Promise.resolve();
    return writeStorage(current.storageKey, current.state);
  }

  function schedulePersist(current) {
    if (current.persistTimer) global.clearTimeout(current.persistTimer);
    current.persistTimer = global.setTimeout(() => {
      current.persistTimer = null;
      void persistNow(current);
    }, WRITE_DELAY_MS);
  }

  function stopCellObserver(current) {
    current?.cellObserver?.disconnect();
    if (current) current.cellObserver = null;
    if (current?.scanTimer) global.clearTimeout(current.scanTimer);
    if (current) current.scanTimer = null;
  }

  function stopRuntime() {
    const current = runtime;
    if (!current) return;
    runtime = null;
    stopCellObserver(current);
    if (current.persistTimer) {
      global.clearTimeout(current.persistTimer);
      current.persistTimer = null;
      void persistNow(current);
    }
    current.panel.destroy();
  }

  function pauseForStructureChange(current) {
    current.enabled = false;
    current.warning = '页面结构可能已变化，已停止记录新结果。';
    stopCellObserver(current);
    render(current);
  }

  function scanVisibleCells(current) {
    if (!current || current !== runtime || !current.enabled) return;

    const cells = document.querySelectorAll('main [data-testid="UserCell"]');
    let changed = false;

    for (const cell of cells) {
      const snapshot = snapshotFromCell(cell);
      const signature = `${snapshot.text}\n${snapshot.links.join('|')}`;
      if (current.processedSignatures.get(cell) === signature) continue;
      current.processedSignatures.set(cell, signature);

      const account = core.parseUserSnapshot(snapshot);
      if (!account) {
        current.invalidCells += 1;
        if (current.invalidCells >= INVALID_CELL_LIMIT) {
          pauseForStructureChange(current);
          return;
        }
        continue;
      }

      current.invalidCells = 0;
      current.state = core.mergeAccount(current.state, account, Date.now());
      changed = true;
    }

    if (changed) {
      schedulePersist(current);
      render(current);
    }
  }

  function scheduleScan(current) {
    if (!current || current !== runtime || !current.enabled || current.scanTimer) return;
    current.scanTimer = global.setTimeout(() => {
      current.scanTimer = null;
      scanVisibleCells(current);
    }, SCAN_DELAY_MS);
  }

  function connectCellObserver(current) {
    if (!current || current !== runtime || !current.enabled || current.cellObserver) return;
    const main = document.querySelector('main');
    if (!main) {
      current.warning = '暂未找到 Following 列表，页面加载后会继续尝试。';
      render(current);
      return;
    }

    current.warning = '';
    current.cellObserver = new MutationObserver(() => scheduleScan(current));
    current.cellObserver.observe(main, { childList: true, subtree: true, characterData: true });
    scheduleScan(current);
    render(current);
  }

  function toggleEnabled(current, nextEnabled) {
    if (!current || current !== runtime) return;
    current.enabled = Boolean(nextEnabled);
    current.warning = '';
    if (current.enabled) connectCellObserver(current);
    else stopCellObserver(current);
    render(current);
  }

  async function clearCurrentOwner(current) {
    if (!current || current !== runtime) return;
    current.clearing = true;
    current.enabled = false;
    stopCellObserver(current);
    if (current.persistTimer) global.clearTimeout(current.persistTimer);
    current.persistTimer = null;
    await removeStorage(current.storageKey);
    if (current !== runtime) return;
    current.state = core.sanitizeCache(null, current.ownerHandle);
    current.processedSignatures = new WeakMap();
    current.clearing = false;
    render(current);
  }

  async function startRuntime(context) {
    const generation = ++runtimeGeneration;
    stopRuntime();

    const key = storageKey(context.ownerHandle);
    const cached = await readStorage(key);
    if (generation !== runtimeGeneration) return;

    const current = {
      generation,
      ownerHandle: context.ownerHandle,
      storageKey: key,
      state: core.sanitizeCache(cached, context.ownerHandle),
      enabled: true,
      warning: '',
      clearing: false,
      invalidCells: 0,
      processedSignatures: new WeakMap(),
      cellObserver: null,
      scanTimer: null,
      persistTimer: null,
      panel: null
    };

    current.panel = panelApi.mount({
      onToggleEnabled: (nextEnabled) => toggleEnabled(current, nextEnabled),
      onClearCurrentOwner: () => { void clearCurrentOwner(current); }
    });
    runtime = current;
    render(current);
    connectCellObserver(current);
  }

  function reconcileRoute() {
    reconcileScheduled = false;
    const profileHref = document
      .querySelector('a[data-testid="AppTabBar_Profile_Link"]')
      ?.getAttribute('href');
    const context = resolveOwnFollowingContext(global.location.href, profileHref, core);

    if (!context) {
      runtimeGeneration += 1;
      stopRuntime();
      return;
    }

    if (runtime?.ownerHandle === context.ownerHandle) {
      connectCellObserver(runtime);
      return;
    }
    void startRuntime(context);
  }

  function scheduleReconcile() {
    if (reconcileScheduled) return;
    reconcileScheduled = true;
    global.requestAnimationFrame?.(reconcileRoute) || global.setTimeout(reconcileRoute, 0);
  }

  const routeObserver = new MutationObserver(scheduleReconcile);
  routeObserver.observe(document.documentElement, { childList: true, subtree: true });
  global.addEventListener?.('popstate', scheduleReconcile);
  global.addEventListener?.('pagehide', () => {
    routeObserver.disconnect();
    stopRuntime();
  }, { once: true });
  scheduleReconcile();
})(globalThis);

'use strict';

(function exposeContent(global) {
  const STORAGE_PREFIX = 'x-non-followback:';
  const WRITE_DELAY_MS = 250;
  const SCAN_DELAY_MS = 120;
  const INVALID_CELL_LIMIT = 5;
  const INVALID_ROUND_LIMIT = 3;

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

  function createStartGate() {
    let pendingOwner = null;
    return {
      begin(ownerHandle) {
        if (pendingOwner === ownerHandle) return false;
        pendingOwner = ownerHandle;
        return true;
      },
      complete(ownerHandle) {
        if (pendingOwner === ownerHandle) pendingOwner = null;
      },
      cancel() {
        pendingOwner = null;
      }
    };
  }

  function nextStructureHealth(current, batch) {
    const failureRounds = Number(current?.failureRounds) || 0;
    if (Number(batch?.parsedCount) > 0) {
      return { failureRounds: 0, shouldPause: false };
    }
    if (Number(batch?.invalidCount) < INVALID_CELL_LIMIT) {
      return { failureRounds, shouldPause: false };
    }
    const nextFailureRounds = failureRounds + 1;
    return {
      failureRounds: nextFailureRounds,
      shouldPause: nextFailureRounds >= INVALID_ROUND_LIMIT
    };
  }

  function createStorageAdapter(storage, getLastError) {
    function errorFromRuntime() {
      const runtimeError = getLastError?.();
      return runtimeError ? new Error(runtimeError.message || String(runtimeError)) : null;
    }

    return {
      read(key) {
        return new Promise((resolve, reject) => {
          storage.get(key, (result) => {
            const error = errorFromRuntime();
            if (error) reject(error);
            else resolve(result?.[key]);
          });
        });
      },
      write(key, value) {
        return new Promise((resolve, reject) => {
          storage.set({ [key]: value }, () => {
            const error = errorFromRuntime();
            if (error) reject(error);
            else resolve();
          });
        });
      },
      remove(key) {
        return new Promise((resolve, reject) => {
          storage.remove(key, () => {
            const error = errorFromRuntime();
            if (error) reject(error);
            else resolve();
          });
        });
      }
    };
  }

  function createRuntimeController(dependencies) {
    const {
      coreApi: core,
      panelApi,
      document,
      location,
      storageAdapter,
      MutationObserverCtor,
      setTimeoutFn,
      clearTimeoutFn,
      nowFn,
      requestAnimationFrameFn,
      addEventListenerFn
    } = dependencies;

    let runtime = null;
    let runtimeGeneration = 0;
    let reconcileScheduled = false;
    let pendingStartPromise = null;
    let routeObserver = null;
    const startGate = createStartGate();

    function storageKey(ownerHandle) {
      return `${STORAGE_PREFIX}${ownerHandle}`;
    }

    function render(current) {
      if (!current || current !== runtime) return;
      const status = current.warning
        ? '扫描已停止'
        : current.loading
          ? '正在等待 Following 列表加载'
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

    function stopCellObserver(current) {
      current?.cellObserver?.disconnect();
      if (current) {
        current.cellObserver = null;
        current.observedMain = null;
      }
      if (current?.scanTimer) clearTimeoutFn(current.scanTimer);
      if (current) current.scanTimer = null;
    }

    function stopRuntime() {
      const current = runtime;
      if (!current) return;
      runtime = null;
      stopCellObserver(current);
      if (current.persistTimer) {
        clearTimeoutFn(current.persistTimer);
        current.persistTimer = null;
      }
      if (current.dirty && current.storageReady && !current.clearing) {
        void storageAdapter.write(current.storageKey, current.state).catch(() => {});
      }
      current.panel.destroy();
    }

    function storageFailureMessage(mode) {
      if (mode === 'read') {
        return '无法读取本地缓存，已停止扫描，避免覆盖已有结果；点击继续可重试。';
      }
      if (mode === 'remove') {
        return '无法清空本地结果，当前页面中的结果已保留；点击继续可重试。';
      }
      return '无法保存本地结果，结果仍保留在当前页面；点击继续可重试。';
    }

    function markStorageFailure(current, mode) {
      if (!current || current !== runtime) return;
      current.storageReady = false;
      current.storageFailureMode = mode;
      current.enabled = false;
      current.loading = false;
      current.warning = storageFailureMessage(mode);
      stopCellObserver(current);
      render(current);
    }

    async function persistNow(current) {
      if (!current || current.clearing || !current.storageReady) return false;
      try {
        await storageAdapter.write(current.storageKey, current.state);
        if (current === runtime) current.dirty = false;
        return true;
      } catch {
        markStorageFailure(current, 'write');
        return false;
      }
    }

    function schedulePersist(current) {
      current.dirty = true;
      if (current.persistTimer) clearTimeoutFn(current.persistTimer);
      current.persistTimer = setTimeoutFn(() => {
        current.persistTimer = null;
        void persistNow(current);
      }, WRITE_DELAY_MS);
    }

    function pauseForStructureChange(current) {
      current.enabled = false;
      current.loading = false;
      current.warning = '页面结构可能已变化，已停止记录新结果。';
      stopCellObserver(current);
      render(current);
    }

    function scanVisibleCells(current) {
      if (!current || current !== runtime || !current.enabled) return;

      const cells = document.querySelectorAll('main [data-testid="UserCell"]');
      let changed = false;
      let parsedCount = 0;
      let invalidCount = 0;

      for (const cell of cells) {
        const snapshot = snapshotFromCell(cell);
        const signature = `${snapshot.text}\n${snapshot.links.join('|')}`;
        const account = core.parseUserSnapshot(snapshot);
        if (!account) {
          invalidCount += 1;
          continue;
        }

        parsedCount += 1;
        if (current.processedSignatures.get(cell) === signature) continue;
        current.processedSignatures.set(cell, signature);
        current.state = core.mergeAccount(current.state, account, nowFn());
        changed = true;
      }

      if (changed) {
        schedulePersist(current);
        render(current);
      }

      current.structureHealth = nextStructureHealth(current.structureHealth, {
        parsedCount,
        invalidCount
      });
      if (current.structureHealth.shouldPause) pauseForStructureChange(current);
    }

    function scheduleScan(current) {
      if (!current || current !== runtime || !current.enabled || current.scanTimer) return;
      current.scanTimer = setTimeoutFn(() => {
        current.scanTimer = null;
        scanVisibleCells(current);
      }, SCAN_DELAY_MS);
    }

    function connectCellObserver(current) {
      if (!current || current !== runtime || !current.enabled) return;
      const main = document.querySelector('main');
      if (!main) {
        if (current.cellObserver) stopCellObserver(current);
        if (!current.loading) {
          current.loading = true;
          render(current);
        }
        return;
      }

      if (current.cellObserver && current.observedMain === main) {
        if (current.loading) {
          current.loading = false;
          render(current);
        }
        return;
      }

      stopCellObserver(current);
      current.loading = false;
      current.observedMain = main;
      current.cellObserver = new MutationObserverCtor(() => scheduleScan(current));
      current.cellObserver.observe(main, { childList: true, subtree: true, characterData: true });
      scheduleScan(current);
      render(current);
    }

    async function recoverStorage(current) {
      if (!current || current !== runtime) return;
      const mode = current.storageFailureMode;
      try {
        if (mode === 'read') {
          const cached = await storageAdapter.read(current.storageKey);
          if (current !== runtime) return;
          current.state = core.sanitizeCache(cached, current.ownerHandle);
          current.dirty = false;
        } else if (mode === 'remove') {
          await storageAdapter.remove(current.storageKey);
          if (current !== runtime) return;
          current.state = core.sanitizeCache(null, current.ownerHandle);
          current.processedSignatures = new WeakMap();
          current.dirty = false;
        } else {
          await storageAdapter.write(current.storageKey, current.state);
          if (current !== runtime) return;
          current.dirty = false;
        }
      } catch {
        markStorageFailure(current, mode || 'write');
        return;
      }

      current.storageReady = true;
      current.storageFailureMode = '';
      current.warning = '';
      current.enabled = true;
      current.structureHealth = { failureRounds: 0, shouldPause: false };
      current.processedSignatures = new WeakMap();
      connectCellObserver(current);
      render(current);
    }

    function toggleEnabled(current, nextEnabled) {
      if (!current || current !== runtime) return;
      if (nextEnabled && !current.storageReady) {
        void recoverStorage(current);
        return;
      }

      current.enabled = Boolean(nextEnabled);
      current.warning = '';
      current.loading = false;
      if (current.enabled) {
        current.structureHealth = { failureRounds: 0, shouldPause: false };
        current.processedSignatures = new WeakMap();
        connectCellObserver(current);
      } else {
        stopCellObserver(current);
      }
      render(current);
    }

    async function clearCurrentOwner(current) {
      if (!current || current !== runtime) return;
      current.clearing = true;
      current.enabled = false;
      current.loading = false;
      stopCellObserver(current);
      if (current.persistTimer) clearTimeoutFn(current.persistTimer);
      current.persistTimer = null;

      try {
        await storageAdapter.remove(current.storageKey);
      } catch {
        current.clearing = false;
        markStorageFailure(current, 'remove');
        return;
      }
      if (current !== runtime) return;

      current.state = core.sanitizeCache(null, current.ownerHandle);
      current.processedSignatures = new WeakMap();
      current.structureHealth = { failureRounds: 0, shouldPause: false };
      current.storageReady = true;
      current.storageFailureMode = '';
      current.warning = '';
      current.dirty = false;
      current.clearing = false;
      render(current);
    }

    function mountRuntime(context, generation, cached, restoreError) {
      if (generation !== runtimeGeneration) return;
      const current = {
        generation,
        ownerHandle: context.ownerHandle,
        storageKey: storageKey(context.ownerHandle),
        state: core.sanitizeCache(restoreError ? null : cached, context.ownerHandle),
        enabled: !restoreError,
        loading: false,
        warning: restoreError ? storageFailureMessage('read') : '',
        clearing: false,
        dirty: false,
        storageReady: !restoreError,
        storageFailureMode: restoreError ? 'read' : '',
        structureHealth: { failureRounds: 0, shouldPause: false },
        processedSignatures: new WeakMap(),
        observedMain: null,
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
      if (current.enabled) connectCellObserver(current);
    }

    async function startRuntime(context, generation) {
      const key = storageKey(context.ownerHandle);
      let cached;
      let restoreError = null;
      try {
        cached = await storageAdapter.read(key);
      } catch (error) {
        restoreError = error;
      }
      mountRuntime(context, generation, cached, restoreError);
    }

    function currentContext() {
      const profileHref = document
        .querySelector('a[data-testid="AppTabBar_Profile_Link"]')
        ?.getAttribute('href');
      return resolveOwnFollowingContext(location.href, profileHref, core);
    }

    function reconcileRoute() {
      reconcileScheduled = false;
      const context = currentContext();

      if (!context) {
        runtimeGeneration += 1;
        startGate.cancel();
        pendingStartPromise = null;
        stopRuntime();
        return Promise.resolve();
      }

      if (runtime?.ownerHandle === context.ownerHandle) {
        connectCellObserver(runtime);
        return Promise.resolve(runtime);
      }

      if (!startGate.begin(context.ownerHandle)) return pendingStartPromise;

      const generation = ++runtimeGeneration;
      stopRuntime();
      const ownerHandle = context.ownerHandle;
      const promise = startRuntime(context, generation).finally(() => {
        startGate.complete(ownerHandle);
        if (pendingStartPromise === promise) pendingStartPromise = null;
      });
      pendingStartPromise = promise;
      return promise;
    }

    function scheduleReconcile() {
      if (reconcileScheduled) return;
      reconcileScheduled = true;
      if (requestAnimationFrameFn) requestAnimationFrameFn(reconcileRoute);
      else setTimeoutFn(reconcileRoute, 0);
    }

    function start() {
      if (routeObserver) return;
      routeObserver = new MutationObserverCtor(scheduleReconcile);
      routeObserver.observe(document.documentElement, { childList: true, subtree: true });
      addEventListenerFn?.('popstate', scheduleReconcile);
      addEventListenerFn?.('pagehide', stop, { once: true });
      scheduleReconcile();
    }

    function stop() {
      routeObserver?.disconnect();
      routeObserver = null;
      runtimeGeneration += 1;
      startGate.cancel();
      pendingStartPromise = null;
      stopRuntime();
    }

    return { reconcileRoute, scheduleReconcile, start, stop };
  }

  const publicApi = {
    snapshotFromCell,
    resolveOwnFollowingContext,
    createStartGate,
    nextStructureHealth,
    createStorageAdapter,
    createRuntimeController
  };
  global.XNonFollowbackContent = publicApi;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = publicApi;
  }

  if (!global.document || !global.location || !global.chrome?.storage?.local) return;
  const core = global.XNonFollowbackCore;
  const panelApi = global.XNonFollowbackPanel;
  if (!core || !panelApi || !global.MutationObserver) return;

  const storageAdapter = createStorageAdapter(
    global.chrome.storage.local,
    () => global.chrome.runtime?.lastError || null
  );
  const controller = createRuntimeController({
    coreApi: core,
    panelApi,
    document: global.document,
    location: global.location,
    storageAdapter,
    MutationObserverCtor: global.MutationObserver,
    setTimeoutFn: global.setTimeout.bind(global),
    clearTimeoutFn: global.clearTimeout.bind(global),
    nowFn: () => Date.now(),
    requestAnimationFrameFn: global.requestAnimationFrame?.bind(global),
    addEventListenerFn: global.addEventListener?.bind(global)
  });
  controller.start();
})(globalThis);

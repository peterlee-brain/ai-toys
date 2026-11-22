'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core.js');
const content = require('../src/content.js');

function createClassList() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); }
  };
}

function createFollowingCell(controlTexts) {
  const markers = [];
  const ownerDocument = {
    createElement(tagName) {
      const node = {
        tagName,
        className: '',
        textContent: '',
        attributes: {},
        nodeType: 1,
        remove() {
          const index = markers.indexOf(node);
          if (index >= 0) markers.splice(index, 1);
          for (const control of controls) {
            const childIndex = control.childNodes.indexOf(node);
            if (childIndex >= 0) control.childNodes.splice(childIndex, 1);
          }
        },
        setAttribute(name, value) {
          this.attributes[name] = value;
        }
      };
      return node;
    }
  };
  const controls = controlTexts.map((innerText) => {
    const textNode = { nodeType: 3, textContent: innerText };
    const control = {
      innerText,
      textContent: innerText,
      classList: createClassList(),
      ownerDocument,
      parentNode: null,
      firstChild: textNode,
      childNodes: [textNode],
      insertBefore(node, reference) {
        const index = this.childNodes.indexOf(reference);
        if (index >= 0) this.childNodes.splice(index, 0, node);
        else this.childNodes.unshift(node);
        this.firstChild = this.childNodes[0] || null;
        node.parentNode = this;
        if (!markers.includes(node)) markers.unshift(node);
        return node;
      },
      querySelectorAll(selector) {
        if (selector === '.x-nfb-milestone') {
          return this.childNodes.filter((child) => child.className === 'x-nfb-milestone');
        }
        if (selector === '.x-nfb-milestone-host') {
          return this.classList.contains('x-nfb-milestone-host') ? [this] : [];
        }
        return [];
      }
    };
    return control;
  });

  const cell = {
    controls,
    markers,
    classList: createClassList(),
    ownerDocument,
    querySelectorAll(selector) {
      if (selector === 'button,[role="button"]') return controls;
      if (selector === '.x-nfb-following-highlight') {
        return controls.filter((control) => control.classList.contains('x-nfb-following-highlight'));
      }
      if (selector === '.x-nfb-milestone') return [...markers];
      if (selector === '.x-nfb-milestone-host') {
        return controls.filter((control) => control.classList.contains('x-nfb-milestone-host'));
      }
      return [];
    }
  };
  return cell;
}

function createRuntimeCell({ name, handle, followsYou = false, controlText = 'Following' }) {
  const base = createFollowingCell([controlText]);
  return {
    ...base,
    innerText: `${name}\n@${handle}\n${followsYou ? 'Follows you\n' : ''}${controlText}`,
    profileHref: `/${handle}`,
    querySelectorAll(selector) {
      if (selector === 'a[href]') return [{ getAttribute: () => this.profileHref }];
      return base.querySelectorAll(selector);
    },
    querySelector() { return null; }
  };
}

class FakeMutationObserver {
  static instances = [];

  constructor(callback) {
    this.callback = callback;
    this.disconnected = false;
    FakeMutationObserver.instances.push(this);
  }

  observe(target, options) {
    this.target = target;
    this.options = options;
  }

  disconnect() {
    this.disconnected = true;
  }
}

function createTimerHarness() {
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeoutFn(callback) {
      const id = nextId;
      nextId += 1;
      timers.set(id, callback);
      return id;
    },
    clearTimeoutFn(id) {
      timers.delete(id);
    },
    async runNextBatch() {
      const pending = [...timers.entries()];
      timers.clear();
      for (const [, callback] of pending) callback();
      await Promise.resolve();
    },
    async runAll() {
      while (timers.size > 0) {
        const pending = [...timers.entries()];
        timers.clear();
        for (const [, callback] of pending) callback();
        await Promise.resolve();
      }
    }
  };
}

function createRuntimeHarness(overrides = {}) {
  FakeMutationObserver.instances = [];
  const timers = createTimerHarness();
  const location = { href: 'https://x.com/owner/following' };
  const profileLink = { getAttribute: () => '/owner' };
  const document = {
    documentElement: {},
    main: { id: 'main-1' },
    cells: [],
    querySelector(selector) {
      if (selector === 'a[data-testid="AppTabBar_Profile_Link"]') return profileLink;
      if (selector === 'main') return this.main;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'main [data-testid="UserCell"]') return this.cells;
      if (selector === '.x-nfb-following-highlight') {
        return this.cells.flatMap((cell) => (
          typeof cell.querySelectorAll === 'function'
            ? cell.querySelectorAll(selector)
            : []
        ));
      }
      if (selector === '.x-nfb-milestone-host') {
        return this.cells.flatMap((cell) => {
          if (typeof cell.querySelectorAll === 'function') {
            const nested = cell.querySelectorAll(selector);
            if (nested.length) return [...nested];
          }
          return cell.classList?.contains?.('x-nfb-milestone-host') ? [cell] : [];
        });
      }
      if (selector === '.x-nfb-milestone') {
        return this.cells.flatMap((cell) => (
          typeof cell.querySelectorAll === 'function'
            ? cell.querySelectorAll(selector)
            : []
        ));
      }
      throw new Error(`unexpected selector: ${selector}`);
    }
  };
  const renders = [];
  let mountCount = 0;
  let panelActions = null;
  const panelApi = {
    mount(actions) {
      mountCount += 1;
      panelActions = actions;
      return {
        render(view) { renders.push(view); },
        destroy() {}
      };
    }
  };
  const storageAdapter = overrides.storageAdapter || {
    read: async () => null,
    write: async () => {},
    remove: async () => {}
  };
  const controller = content.createRuntimeController({
    coreApi: core,
    panelApi,
    document,
    location,
    storageAdapter,
    MutationObserverCtor: FakeMutationObserver,
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
    nowFn: () => 1000
  });

  return {
    controller,
    document,
    location,
    renders,
    timers,
    get panelActions() { return panelActions; },
    get mountCount() { return mountCount; }
  };
}

test('extracts the bounded snapshot consumed by the core parser', () => {
  const cell = {
    innerText: 'Ada\n@ada\nFollowing',
    querySelectorAll(selector) {
      assert.equal(selector, 'a[href]');
      return [
        { getAttribute: () => '/ada' },
        { getAttribute: () => '/ada/photo' }
      ];
    },
    querySelector(selector) {
      assert.equal(selector, 'img[src*="profile_images"]');
      return { src: 'https://pbs.twimg.com/profile_images/ada.jpg' };
    }
  };

  assert.deepEqual(content.snapshotFromCell(cell), {
    text: 'Ada\n@ada\nFollowing',
    links: ['/ada', '/ada/photo'],
    imageUrl: 'https://pbs.twimg.com/profile_images/ada.jpg'
  });
});

test('resolves context only when route and logged-in profile match', () => {
  assert.deepEqual(content.resolveOwnFollowingContext(
    'https://x.com/Owner/following',
    '/owner',
    core
  ), { ownerHandle: 'owner' });
  assert.equal(content.resolveOwnFollowingContext(
    'https://x.com/another/following',
    '/owner',
    core
  ), null);
  assert.equal(content.resolveOwnFollowingContext(
    'https://x.com/owner/followers',
    '/owner',
    core
  ), null);
});

test('finds exact English and Chinese following controls only', () => {
  for (const label of ['Following', '正在关注', '已关注', '正在跟隨', '跟隨中']) {
    const cell = createFollowingCell(['More', label]);
    assert.equal(content.findFollowingControl(cell, core), cell.controls[1]);
  }

  for (const label of ['Follow', '关注', '跟随', 'Following account details', '']) {
    assert.equal(content.findFollowingControl(createFollowingCell([label]), core), null);
  }
});

test('highlights only non-followback controls', () => {
  const cell = createFollowingCell(['Following']);
  const control = cell.controls[0];

  assert.equal(content.syncFollowingHighlight(cell, { followsBack: false }, core), control);
  assert.equal(control.classList.contains('x-nfb-following-highlight'), true);

  content.syncFollowingHighlight(cell, { followsBack: true }, core);
  assert.equal(control.classList.contains('x-nfb-following-highlight'), false);
});

test('removes stale highlight when a virtual card becomes invalid', () => {
  const cell = createFollowingCell(['Following']);
  const control = cell.controls[0];

  content.syncFollowingHighlight(cell, { followsBack: false }, core);
  content.syncFollowingHighlight(cell, null, core);

  assert.equal(control.classList.contains('x-nfb-following-highlight'), false);
});

test('places milestone markers to the left of the Following control', () => {
  const cell = createFollowingCell(['Following']);
  const control = cell.controls[0];

  const marker = content.syncMilestoneMarker(cell, 3, control);
  assert.equal(marker.textContent, '3');
  assert.equal(control.classList.contains('x-nfb-milestone-host'), true);
  assert.equal(control.childNodes[0], marker);
  assert.equal(content.followingControlText(control, core), 'following');

  content.syncMilestoneMarker(cell, null, control);
  assert.equal(control.classList.contains('x-nfb-milestone-host'), false);
  assert.equal(cell.markers.length, 0);
});

test('does not recreate an already correct milestone while scrolling', () => {
  const cell = createFollowingCell(['Following']);
  const control = cell.controls[0];
  const first = content.syncMilestoneMarker(cell, 2, control);
  const second = content.syncMilestoneMarker(cell, 2, control);

  assert.equal(second, first);
  assert.equal(cell.markers.length, 1);
});

test('assigns session indexes from 1 by handle and keeps them stable', () => {
  const current = { sessionIndex: new Map() };
  assert.equal(content.ensureSessionIndex(current, { handle: 'a', followsBack: false }), 1);
  assert.equal(content.ensureSessionIndex(current, { handle: 'b', followsBack: false }), 2);
  assert.equal(content.ensureSessionIndex(current, { handle: 'a', followsBack: false }), 1);
  assert.equal(content.ensureSessionIndex(current, { handle: 'c', followsBack: true }), null);
});

test('runtime numbers only Following non-followbacks so the first marker starts at 1', async () => {
  const harness = createRuntimeHarness();
  const suggested = createRuntimeCell({
    name: 'Suggest',
    handle: 'suggest',
    controlText: 'Follow'
  });
  const firstFollowing = createRuntimeCell({ name: 'Ada', handle: 'ada' });
  const secondFollowing = createRuntimeCell({ name: 'Bob', handle: 'bob' });
  harness.document.cells = [suggested, firstFollowing, secondFollowing];

  await harness.controller.reconcileRoute();
  await harness.timers.runNextBatch();

  assert.equal(content.readMilestoneMarker(suggested.controls[0]), null);
  assert.equal(content.readMilestoneMarker(firstFollowing.controls[0])?.textContent, '1');
  assert.equal(content.readMilestoneMarker(secondFollowing.controls[0])?.textContent, '2');
  assert.equal(harness.renders.at(-1).state.accounts.suggest.handle, 'suggest');
});

test('allocates discovery stamps after the newest cached seenAt', () => {
  const current = {
    nextDiscoveryStamp: 0,
    state: {
      accounts: {
        older: { handle: 'older', seenAt: 50 }
      }
    }
  };

  assert.equal(content.nextDiscoveryStamp(current, 10), 51);
  assert.equal(content.nextDiscoveryStamp(current, 10), 52);
});

test('suppresses repeated starts for an owner until the pending read completes', async () => {
  const gate = content.createStartGate();
  let releaseRead;
  const delayedRead = new Promise((resolve) => { releaseRead = resolve; });

  assert.equal(gate.begin('owner'), true);
  const pending = delayedRead.finally(() => gate.complete('owner'));
  assert.equal(gate.begin('owner'), false);

  releaseRead();
  await pending;
  assert.equal(gate.begin('owner'), true);
});

test('requires three consecutive invalid scan rounds before pausing', () => {
  let health = { failureRounds: 0, shouldPause: false };
  health = content.nextStructureHealth(health, { parsedCount: 0, invalidCount: 5 });
  assert.deepEqual(health, { failureRounds: 1, shouldPause: false });
  health = content.nextStructureHealth(health, { parsedCount: 0, invalidCount: 5 });
  assert.deepEqual(health, { failureRounds: 2, shouldPause: false });
  health = content.nextStructureHealth(health, { parsedCount: 1, invalidCount: 5 });
  assert.deepEqual(health, { failureRounds: 0, shouldPause: false });

  health = content.nextStructureHealth(health, { parsedCount: 0, invalidCount: 5 });
  health = content.nextStructureHealth(health, { parsedCount: 0, invalidCount: 5 });
  health = content.nextStructureHealth(health, { parsedCount: 0, invalidCount: 5 });
  assert.deepEqual(health, { failureRounds: 3, shouldPause: true });
});

test('does not count small or unchanged invalid batches as structure failure rounds', () => {
  const health = content.nextStructureHealth(
    { failureRounds: 2, shouldPause: false },
    { parsedCount: 0, invalidCount: 4 }
  );
  assert.deepEqual(health, { failureRounds: 2, shouldPause: false });
});

test('storage adapter rejects failed reads instead of returning an empty cache', async () => {
  const storage = {
    get(_key, callback) { callback({}); },
    set(_value, callback) { callback(); },
    remove(_key, callback) { callback(); }
  };
  const adapter = content.createStorageAdapter(storage, () => ({ message: 'storage unavailable' }));

  await assert.rejects(adapter.read('key'), /storage unavailable/);
  await assert.rejects(adapter.write('key', { value: true }), /storage unavailable/);
  await assert.rejects(adapter.remove('key'), /storage unavailable/);
});

test('storage adapter returns the keyed value on success', async () => {
  const storage = {
    get(key, callback) { callback({ [key]: { version: 1 } }); },
    set(_value, callback) { callback(); },
    remove(_key, callback) { callback(); }
  };
  const adapter = content.createStorageAdapter(storage, () => null);

  assert.deepEqual(await adapter.read('owner-key'), { version: 1 });
  await adapter.write('owner-key', { version: 1 });
  await adapter.remove('owner-key');
});

test('runtime reuses a delayed start and cancels it when owner context changes', async () => {
  let releaseRead;
  let readCalls = 0;
  const delayedRead = new Promise((resolve) => { releaseRead = resolve; });
  const harness = createRuntimeHarness({
    storageAdapter: {
      read() { readCalls += 1; return delayedRead; },
      write: async () => {},
      remove: async () => {}
    }
  });

  const firstStart = harness.controller.reconcileRoute();
  const repeatedStart = harness.controller.reconcileRoute();
  assert.equal(readCalls, 1);
  assert.equal(firstStart, repeatedStart);

  harness.location.href = 'https://x.com/another/following';
  await harness.controller.reconcileRoute();
  releaseRead(null);
  await firstStart;
  assert.equal(harness.mountCount, 0);
});

test('runtime rebinds its list observer when X replaces main', async () => {
  const harness = createRuntimeHarness();
  await harness.controller.reconcileRoute();
  assert.equal(FakeMutationObserver.instances.length, 1);
  const firstObserver = FakeMutationObserver.instances[0];
  assert.equal(firstObserver.target.id, 'main-1');

  harness.document.main = { id: 'main-2' };
  await harness.controller.reconcileRoute();

  assert.equal(firstObserver.disconnected, true);
  assert.equal(FakeMutationObserver.instances.length, 2);
  assert.equal(FakeMutationObserver.instances[1].target.id, 'main-2');
});

test('runtime highlights non-followbacks and clears reused mutual cells', async () => {
  const harness = createRuntimeHarness();
  const cell = createRuntimeCell({ name: 'Ada', handle: 'ada' });
  harness.document.cells = [cell];

  await harness.controller.reconcileRoute();
  await harness.timers.runNextBatch();
  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), true);

  cell.innerText = 'Grace\n@grace\nFollows you\nFollowing';
  cell.profileHref = '/grace';
  FakeMutationObserver.instances[0].callback();
  await harness.timers.runNextBatch();

  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), false);
});

test('runtime clears highlights on pause and route departure', async () => {
  const harness = createRuntimeHarness();
  const cell = createRuntimeCell({ name: 'Ada', handle: 'ada' });
  harness.document.cells = [cell];

  await harness.controller.reconcileRoute();
  await harness.timers.runNextBatch();
  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), true);

  harness.panelActions.onToggleEnabled(false);
  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), false);

  harness.panelActions.onToggleEnabled(true);
  await harness.timers.runNextBatch();
  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), true);

  harness.location.href = 'https://x.com/home';
  await harness.controller.reconcileRoute();
  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), false);
});

test('runtime surfaces restore failure and does not observe or overwrite', async () => {
  let writeCalls = 0;
  const harness = createRuntimeHarness({
    storageAdapter: {
      read: async () => { throw new Error('restore failed'); },
      write: async () => { writeCalls += 1; },
      remove: async () => {}
    }
  });

  await harness.controller.reconcileRoute();

  assert.equal(FakeMutationObserver.instances.length, 0);
  assert.equal(writeCalls, 0);
  assert.match(harness.renders.at(-1).warning, /无法读取本地缓存/);
  assert.equal(harness.renders.at(-1).enabled, false);
});

test('runtime pauses and surfaces a failed cache write while keeping dirty results', async () => {
  const cell = {
    innerText: 'Ada\n@ada\nFollowing',
    querySelectorAll: () => [{ getAttribute: () => '/ada' }],
    querySelector: () => null
  };
  const harness = createRuntimeHarness({
    storageAdapter: {
      read: async () => null,
      write: async () => { throw new Error('write failed'); },
      remove: async () => {}
    }
  });
  harness.document.cells = [cell];

  await harness.controller.reconcileRoute();
  await harness.timers.runAll();
  await Promise.resolve();

  const latest = harness.renders.at(-1);
  assert.match(latest.warning, /无法保存本地结果/);
  assert.equal(latest.enabled, false);
  assert.equal(latest.state.accounts.ada.handle, 'ada');
});

test('runtime persists a valid earlier batch before pausing on repeated invalid batches', async () => {
  const validCell = {
    innerText: 'Ada\n@ada\nFollowing',
    querySelectorAll: () => [{ getAttribute: () => '/ada' }],
    querySelector: () => null
  };
  const invalidCells = Array.from({ length: 5 }, () => ({
    innerText: '',
    querySelectorAll: () => [],
    querySelector: () => null
  }));
  const writes = [];
  const harness = createRuntimeHarness({
    storageAdapter: {
      read: async () => null,
      write: async (_key, state) => { writes.push(state); },
      remove: async () => {}
    }
  });
  harness.document.cells = [validCell, ...invalidCells];

  await harness.controller.reconcileRoute();
  await harness.timers.runAll();
  harness.document.cells = invalidCells;

  const observer = FakeMutationObserver.instances[0];
  for (let round = 0; round < 3; round += 1) {
    observer.callback();
    await harness.timers.runAll();
  }

  assert.equal(writes.at(0).accounts.ada.handle, 'ada');
  assert.match(harness.renders.at(-1).warning, /页面结构可能已变化/);
  assert.equal(harness.renders.at(-1).enabled, false);
});

test('runtime can retry a failed restore without overwriting the cache', async () => {
  let readCalls = 0;
  const harness = createRuntimeHarness({
    storageAdapter: {
      async read() {
        readCalls += 1;
        if (readCalls === 1) throw new Error('restore failed');
        return {
          version: 1,
          ownerHandle: 'owner',
          accounts: {},
          updatedAt: 0
        };
      },
      write: async () => {},
      remove: async () => {}
    }
  });

  await harness.controller.reconcileRoute();
  harness.panelActions.onToggleEnabled(true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(readCalls, 2);
  assert.equal(harness.renders.at(-1).warning, '');
  assert.equal(harness.renders.at(-1).enabled, true);
  assert.equal(FakeMutationObserver.instances.length, 1);
});

test('runtime treats a missing main as loading and connects when it appears', async () => {
  const harness = createRuntimeHarness();
  harness.document.main = null;

  await harness.controller.reconcileRoute();
  assert.equal(FakeMutationObserver.instances.length, 0);
  assert.equal(harness.renders.at(-1).warning, '');
  assert.match(harness.renders.at(-1).status, /等待/);

  harness.document.main = { id: 'main-late' };
  await harness.controller.reconcileRoute();
  assert.equal(FakeMutationObserver.instances.length, 1);
  assert.equal(FakeMutationObserver.instances[0].target.id, 'main-late');
  assert.equal(harness.renders.at(-1).warning, '');
});

test('runtime flushes the newest revision after an older write completes during route exit', async () => {
  let releaseFirstWrite;
  const firstWrite = new Promise((resolve) => { releaseFirstWrite = resolve; });
  const writes = [];
  let persistedState = null;
  const harness = createRuntimeHarness({
    storageAdapter: {
      read: async () => null,
      write: async (_key, state) => {
        writes.push(state);
        if (writes.length === 1) await firstWrite;
        persistedState = state;
      },
      remove: async () => {}
    }
  });
  const cell = {
    innerText: 'Ada\n@ada\nFollowing',
    querySelectorAll: () => [{ getAttribute: () => '/ada' }],
    querySelector: () => null
  };
  harness.document.cells = [cell];

  await harness.controller.reconcileRoute();
  await harness.timers.runNextBatch();
  await harness.timers.runNextBatch();
  assert.equal(writes.length, 1);

  cell.innerText = 'Bob\n@bob\nFollowing';
  cell.querySelectorAll = () => [{ getAttribute: () => '/bob' }];
  FakeMutationObserver.instances[0].callback();
  await harness.timers.runNextBatch();

  harness.location.href = 'https://x.com/home';
  await harness.controller.reconcileRoute();
  releaseFirstWrite();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(writes.length, 2);
  assert.equal(persistedState.accounts.ada.handle, 'ada');
  assert.equal(persistedState.accounts.bob.handle, 'bob');
});

test('runtime retries a failed write before resuming observation', async () => {
  let writeCalls = 0;
  const harness = createRuntimeHarness({
    storageAdapter: {
      read: async () => null,
      async write() {
        writeCalls += 1;
        if (writeCalls === 1) throw new Error('write failed');
      },
      remove: async () => {}
    }
  });
  harness.document.cells = [{
    innerText: 'Ada\n@ada\nFollowing',
    querySelectorAll: () => [{ getAttribute: () => '/ada' }],
    querySelector: () => null
  }];

  await harness.controller.reconcileRoute();
  await harness.timers.runAll();
  await Promise.resolve();
  assert.match(harness.renders.at(-1).warning, /无法保存本地结果/);

  harness.panelActions.onToggleEnabled(true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(writeCalls, 2);
  assert.equal(harness.renders.at(-1).warning, '');
  assert.equal(harness.renders.at(-1).enabled, true);
});

test('runtime preserves results when clear fails and retries removal on continue', async () => {
  let removeCalls = 0;
  const harness = createRuntimeHarness({
    storageAdapter: {
      read: async () => ({
        version: 1,
        ownerHandle: 'owner',
        accounts: {
          ada: {
            displayName: 'Ada',
            handle: 'ada',
            avatarUrl: '',
            profileUrl: 'https://x.com/ada',
            followsBack: false,
            seenAt: 1
          }
        },
        updatedAt: 1
      }),
      write: async () => {},
      async remove() {
        removeCalls += 1;
        if (removeCalls === 1) throw new Error('remove failed');
      }
    }
  });

  await harness.controller.reconcileRoute();
  harness.panelActions.onClearCurrentOwner();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(harness.renders.at(-1).state.accounts.ada.handle, 'ada');
  assert.match(harness.renders.at(-1).warning, /无法清空本地结果/);

  harness.panelActions.onToggleEnabled(true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(removeCalls, 2);
  assert.deepEqual(harness.renders.at(-1).state.accounts, {});
  assert.equal(harness.renders.at(-1).enabled, true);
});

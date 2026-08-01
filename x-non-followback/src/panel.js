'use strict';

(function exposePanel(global) {
  const core = global.XNonFollowbackCore
    || (typeof require === 'function' ? require('./core.js') : null);

  function createElement(document, tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatTimestamp(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return '尚未记录';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return '时间不可用';
    }
  }

  function mount(actions = {}, targetDocument = global.document) {
    if (!targetDocument) throw new Error('document is required');

    const existing = targetDocument.getElementById?.('x-non-followback-root');
    existing?.remove();

    const root = createElement(targetDocument, 'aside', 'x-nfb');
    root.id = 'x-non-followback-root';
    root.setAttribute?.('aria-label', 'X 未回关扫描器');

    const header = createElement(targetDocument, 'div', 'x-nfb__header');
    const headingGroup = createElement(targetDocument, 'div', 'x-nfb__heading-group');
    const title = createElement(targetDocument, 'strong', 'x-nfb__title', '未回关');
    const owner = createElement(targetDocument, 'span', 'x-nfb__owner');
    headingGroup.append(title, owner);
    const collapseButton = createElement(targetDocument, 'button', 'x-nfb__icon-button', '收起');
    collapseButton.type = 'button';
    collapseButton.title = '展开或收起未回关列表';
    header.append(headingGroup, collapseButton);

    const body = createElement(targetDocument, 'div', 'x-nfb__body');
    const metrics = createElement(targetDocument, 'div', 'x-nfb__metrics');
    const scannedMetric = createElement(targetDocument, 'span', 'x-nfb__metric');
    const nonFollowbackMetric = createElement(targetDocument, 'span', 'x-nfb__metric x-nfb__metric--accent');
    metrics.append(scannedMetric, nonFollowbackMetric);

    const status = createElement(targetDocument, 'p', 'x-nfb__status');
    const warning = createElement(targetDocument, 'p', 'x-nfb__warning');
    warning.hidden = true;
    const partialNotice = createElement(
      targetDocument,
      'p',
      'x-nfb__notice',
      '仅包含你已经滚动加载的账号，不代表完整 Following 列表。'
    );

    const controls = createElement(targetDocument, 'div', 'x-nfb__controls');
    const toggleButton = createElement(targetDocument, 'button', 'x-nfb__button');
    toggleButton.type = 'button';
    const clearButton = createElement(targetDocument, 'button', 'x-nfb__button x-nfb__button--quiet', '清空');
    clearButton.type = 'button';
    controls.append(toggleButton, clearButton);

    const list = createElement(targetDocument, 'div', 'x-nfb__list');
    list.setAttribute?.('role', 'list');
    const footer = createElement(targetDocument, 'p', 'x-nfb__footer');
    body.append(metrics, status, warning, partialNotice, controls, list, footer);
    root.append(header, body);
    (targetDocument.body || targetDocument.documentElement).append(root);

    let expanded = true;
    let lastView = null;
    let clearArmed = false;
    let clearTimer = null;

    function renderAccounts(accounts) {
      const rows = core.listNonFollowbacks(accounts).map((account) => {
        const row = createElement(targetDocument, 'div', 'x-nfb__account');
        row.setAttribute?.('role', 'listitem');
        const avatar = createElement(
          targetDocument,
          'span',
          'x-nfb__avatar',
          (account.displayName || account.handle).slice(0, 1).toUpperCase()
        );
        const identity = createElement(targetDocument, 'span', 'x-nfb__identity');
        const name = createElement(targetDocument, 'span', 'x-nfb__name', account.displayName || account.handle);
        const handle = createElement(targetDocument, 'span', 'x-nfb__handle', `@${account.handle}`);
        identity.append(name, handle);
        const link = createElement(targetDocument, 'a', 'x-nfb__profile-link', '打开');
        link.href = `https://x.com/${account.handle}`;
        link.target = '_blank';
        link.rel = 'noreferrer';
        row.append(avatar, identity, link);
        return row;
      });

      if (rows.length === 0) {
        rows.push(createElement(targetDocument, 'p', 'x-nfb__empty', '当前扫描结果中没有未回关账号。'));
      }
      list.replaceChildren(...rows);
    }

    function render(view) {
      lastView = view;
      const accounts = view?.state?.accounts || {};
      const scannedCount = Object.keys(accounts).length;
      const nonFollowbackCount = core.listNonFollowbacks(accounts).length;

      owner.textContent = view?.ownerHandle ? `@${view.ownerHandle}` : '';
      scannedMetric.textContent = `已扫描 ${scannedCount}`;
      nonFollowbackMetric.textContent = `未回关 ${nonFollowbackCount}`;
      status.textContent = view?.status || (view?.enabled ? '正在扫描' : '已暂停');
      warning.textContent = view?.warning || '';
      warning.hidden = !view?.warning;
      toggleButton.textContent = view?.enabled ? '暂停扫描' : '继续扫描';
      footer.textContent = `最近记录：${formatTimestamp(view?.state?.updatedAt)}`;
      body.hidden = !expanded;
      collapseButton.textContent = expanded ? '收起' : '展开';
      renderAccounts(accounts);
    }

    collapseButton.addEventListener('click', () => {
      expanded = !expanded;
      body.hidden = !expanded;
      collapseButton.textContent = expanded ? '收起' : '展开';
      actions.onToggleExpanded?.(expanded);
    });

    toggleButton.addEventListener('click', () => {
      actions.onToggleEnabled?.(!lastView?.enabled);
    });

    clearButton.addEventListener('click', () => {
      if (!clearArmed) {
        clearArmed = true;
        clearButton.textContent = '再次点击清空';
        clearTimer = global.setTimeout?.(() => {
          clearArmed = false;
          clearButton.textContent = '清空';
        }, 3000);
        return;
      }

      if (clearTimer) global.clearTimeout?.(clearTimer);
      clearArmed = false;
      clearButton.textContent = '清空';
      actions.onClearCurrentOwner?.();
    });

    function destroy() {
      if (clearTimer) global.clearTimeout?.(clearTimer);
      root.remove();
    }

    return { render, destroy };
  }

  const api = { mount };
  global.XNonFollowbackPanel = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(globalThis);

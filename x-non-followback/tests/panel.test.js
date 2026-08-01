'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const panel = require('../src/panel.js');

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = '';
    this.dataset = {};
    this.hidden = false;
    this.id = '';
    this.textContent = '';
    this.listeners = {};
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  click() {
    this.listeners.click?.({ preventDefault() {} });
  }

  remove() {
    this.removed = true;
  }
}

class FakeDocument {
  constructor() {
    this.body = new FakeElement('body');
    this.documentElement = this.body;
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  getElementById(id) {
    return flatten(this.body).find((element) => element.id === id) || null;
  }
}

function flatten(root) {
  return [root, ...root.children.flatMap(flatten)];
}

function textOf(root) {
  return flatten(root).map((element) => element.textContent).filter(Boolean).join(' ');
}

test('renders scan counts and only non-followback profile links', () => {
  const document = new FakeDocument();
  const controller = panel.mount({}, document);

  controller.render({
    ownerHandle: 'owner',
    enabled: true,
    status: '正在扫描',
    warning: '',
    state: {
      updatedAt: 1000,
      accounts: {
        mutual: { displayName: 'Mutual', handle: 'mutual', profileUrl: 'https://x.com/mutual', followsBack: true, seenAt: 1 },
        one_way: { displayName: 'One Way', handle: 'one_way', profileUrl: 'https://x.com/one_way', followsBack: false, seenAt: 2 }
      }
    }
  });

  const root = document.getElementById('x-non-followback-root');
  assert.match(textOf(root), /已扫描 2/);
  assert.match(textOf(root), /未回关 1/);
  const links = flatten(root).filter((element) => element.tagName === 'A');
  assert.deepEqual(links.map((link) => link.href), ['https://x.com/one_way']);
});

test('requires a second clear click before invoking destructive callback', () => {
  const document = new FakeDocument();
  let clearCalls = 0;
  const controller = panel.mount({ onClearCurrentOwner: () => { clearCalls += 1; } }, document);
  controller.render({ ownerHandle: 'owner', enabled: true, status: '', warning: '', state: { accounts: {}, updatedAt: 0 } });

  const clearButton = flatten(document.getElementById('x-non-followback-root'))
    .find((element) => element.tagName === 'BUTTON' && element.textContent === '清空');
  clearButton.click();
  assert.equal(clearCalls, 0);
  assert.equal(clearButton.textContent, '再次点击清空');
  clearButton.click();
  assert.equal(clearCalls, 1);
});

test('destroys only the mounted extension root', () => {
  const document = new FakeDocument();
  const controller = panel.mount({}, document);
  const root = document.getElementById('x-non-followback-root');

  controller.destroy();

  assert.equal(root.removed, true);
});

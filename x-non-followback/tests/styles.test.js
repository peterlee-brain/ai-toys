'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('following highlight is visible without changing hit area or interaction', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  const match = css.match(/\.x-nfb-following-highlight\s*\{([^}]+)\}/);
  assert.ok(match, 'highlight rule must exist');
  assert.match(match[1], /outline:/);
  assert.match(match[1], /box-shadow:/);
  assert.match(match[1], /background-color:/);
  assert.doesNotMatch(match[1], /pointer-events|position|transform|width|height/);
});

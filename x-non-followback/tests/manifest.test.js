'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('manifest exposes only the read-only X page and local storage surface', () => {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['https://x.com/*']);
  assert.equal(manifest.background, undefined);
  assert.deepEqual(manifest.content_scripts, [{
    matches: ['https://x.com/*'],
    js: ['src/core.js', 'src/panel.js', 'src/content.js'],
    css: ['src/styles.css'],
    run_at: 'document_idle'
  }]);
});

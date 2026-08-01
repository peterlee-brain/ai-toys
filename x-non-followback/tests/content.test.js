'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core.js');
const content = require('../src/content.js');

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

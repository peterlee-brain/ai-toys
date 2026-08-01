'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core.js');

test('normalizes whitespace and case for visible relationship text', () => {
  assert.equal(core.normalizeText('  Follows\n\tYOU  '), 'follows you');
  assert.equal(core.normalizeText(null), '');
});

test('recognizes only an exact X following route', () => {
  assert.equal(core.getFollowingHandle('https://x.com/0xpeterlee/following'), '0xpeterlee');
  assert.equal(core.getFollowingHandle('https://x.com/Some_User/following/'), 'some_user');
  assert.equal(core.getFollowingHandle('https://x.com/0xpeterlee/followers'), null);
  assert.equal(core.getFollowingHandle('https://example.com/0xpeterlee/following'), null);
  assert.equal(core.getFollowingHandle('not a url'), null);
});

test('accepts profile links and rejects navigation routes', () => {
  assert.equal(core.getHandleFromProfileHref('/Ada_Dev'), 'ada_dev');
  assert.equal(core.getHandleFromProfileHref('https://x.com/Ada_Dev'), 'ada_dev');
  assert.equal(core.getHandleFromProfileHref('/home'), null);
  assert.equal(core.getHandleFromProfileHref('/i/flow/login'), null);
  assert.equal(core.getHandleFromProfileHref('/name/status/123'), null);
});

test('recognizes supported English and Chinese followback labels', () => {
  assert.equal(core.hasFollowBackMarker('Follows you'), true);
  assert.equal(core.hasFollowBackMarker('关注了你'), true);
  assert.equal(core.hasFollowBackMarker('關注了你'), true);
  assert.equal(core.hasFollowBackMarker('跟隨你'), true);
  assert.equal(core.hasFollowBackMarker('Following'), false);
});

test('parses an account and classifies missing marker as non-followback', () => {
  assert.deepEqual(core.parseUserSnapshot({
    text: 'Ada Lovelace\n@Ada_Dev\nFollowing',
    links: ['/home', '/Ada_Dev', '/Ada_Dev/photo'],
    imageUrl: 'https://pbs.twimg.com/profile_images/ada.jpg'
  }), {
    displayName: 'Ada Lovelace',
    handle: 'ada_dev',
    avatarUrl: 'https://pbs.twimg.com/profile_images/ada.jpg',
    profileUrl: 'https://x.com/ada_dev',
    followsBack: false
  });
});

test('parses an account with a supported followback marker', () => {
  assert.equal(core.parseUserSnapshot({
    text: 'Grace\n@grace\n关注了你\n正在关注',
    links: ['/grace'],
    imageUrl: ''
  }).followsBack, true);
});

test('rejects snapshots without a profile handle', () => {
  assert.equal(core.parseUserSnapshot({
    text: 'Navigation',
    links: ['/home', '/settings/profile'],
    imageUrl: ''
  }), null);
});

test('merges accounts by lowercase handle without mutating prior state', () => {
  const previous = {
    version: 1,
    ownerHandle: 'owner',
    accounts: {},
    updatedAt: 0
  };
  const account = {
    displayName: 'Ada',
    handle: 'Ada_Dev',
    avatarUrl: '',
    profileUrl: 'https://x.com/Ada_Dev',
    followsBack: false
  };

  const merged = core.mergeAccount(previous, account, 1234);

  assert.deepEqual(previous.accounts, {});
  assert.equal(merged.accounts.ada_dev.handle, 'ada_dev');
  assert.equal(merged.accounts.ada_dev.seenAt, 1234);
  assert.equal(merged.updatedAt, 1234);
});

test('drops cache for another owner or schema version', () => {
  const foreign = {
    version: 1,
    ownerHandle: 'someone_else',
    accounts: {
      person: {
        displayName: 'Person',
        handle: 'person',
        avatarUrl: '',
        profileUrl: 'https://x.com/person',
        followsBack: false,
        seenAt: 50
      }
    },
    updatedAt: 50
  };

  assert.deepEqual(core.sanitizeCache(foreign, 'owner'), {
    version: 1,
    ownerHandle: 'owner',
    accounts: {},
    updatedAt: 0
  });
  assert.deepEqual(core.sanitizeCache({ ...foreign, version: 99, ownerHandle: 'owner' }, 'owner').accounts, {});
});

test('sanitizes cached account fields and rebuilds profile URLs', () => {
  const restored = core.sanitizeCache({
    version: 1,
    ownerHandle: 'owner',
    accounts: {
      ADA_DEV: {
        displayName: 'Ada',
        handle: 'ADA_DEV',
        avatarUrl: 'javascript:alert(1)',
        profileUrl: 'https://evil.example/ada',
        followsBack: false,
        seenAt: 42
      }
    },
    updatedAt: 42
  }, 'OWNER');

  assert.deepEqual(restored.accounts.ada_dev, {
    displayName: 'Ada',
    handle: 'ada_dev',
    avatarUrl: '',
    profileUrl: 'https://x.com/ada_dev',
    followsBack: false,
    seenAt: 42
  });
});

test('lists only non-followbacks newest-first without mutating input', () => {
  const accounts = [
    { handle: 'old', followsBack: false, seenAt: 1 },
    { handle: 'mutual', followsBack: true, seenAt: 3 },
    { handle: 'new', followsBack: false, seenAt: 2 }
  ];

  const result = core.listNonFollowbacks(accounts);

  assert.deepEqual(result.map((item) => item.handle), ['new', 'old']);
  assert.deepEqual(accounts.map((item) => item.handle), ['old', 'mutual', 'new']);
});

test('accepts a cached account record when listing non-followbacks', () => {
  const result = core.listNonFollowbacks({
    mutual: { handle: 'mutual', followsBack: true, seenAt: 3 },
    one_way: { handle: 'one_way', followsBack: false, seenAt: 4 }
  });

  assert.deepEqual(result.map((item) => item.handle), ['one_way']);
});

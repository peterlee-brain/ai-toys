'use strict';

(function exposeCore(global) {
  const CACHE_VERSION = 1;
  const HANDLE_PATTERN = /^[a-z0-9_]{1,15}$/i;
  const RESERVED_HANDLES = new Set([
    'compose',
    'explore',
    'home',
    'i',
    'intent',
    'login',
    'messages',
    'notifications',
    'search',
    'settings',
    'signup'
  ]);
  const FOLLOWBACK_MARKERS = [
    'follows you',
    '关注了你',
    '關注了你',
    '跟隨你'
  ];

  function normalizeText(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function normalizeHandle(value) {
    const normalized = String(value ?? '').replace(/^@/, '').trim().toLowerCase();
    if (!HANDLE_PATTERN.test(normalized) || RESERVED_HANDLES.has(normalized)) {
      return null;
    }
    return normalized;
  }

  function parseXUrl(value) {
    try {
      const url = new URL(String(value), 'https://x.com');
      if (url.hostname !== 'x.com' && url.hostname !== 'www.x.com') {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }

  function getFollowingHandle(value) {
    const url = parseXUrl(value);
    if (!url) return null;

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length !== 2 || segments[1].toLowerCase() !== 'following') {
      return null;
    }
    return normalizeHandle(segments[0]);
  }

  function getHandleFromProfileHref(value) {
    const url = parseXUrl(value);
    if (!url) return null;

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length !== 1) return null;
    return normalizeHandle(segments[0]);
  }

  function hasFollowBackMarker(text) {
    const normalized = normalizeText(text);
    return FOLLOWBACK_MARKERS.some((marker) => normalized.includes(marker));
  }

  function sanitizeAvatarUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(String(value));
      return url.protocol === 'https:' && url.hostname === 'pbs.twimg.com' ? url.href : '';
    } catch {
      return '';
    }
  }

  function extractDisplayName(text, handle) {
    const raw = String(text ?? '').replace(/\r/g, '');
    const token = `@${handle}`;
    const lower = raw.toLowerCase();
    const tokenIndex = lower.indexOf(token);

    if (tokenIndex >= 0) {
      const prefix = raw.slice(0, tokenIndex).trim();
      const prefixLines = prefix.split('\n').map((line) => line.trim()).filter(Boolean);
      const candidate = prefixLines.at(-1) || prefix;
      if (candidate) return candidate.slice(0, 100);
    }

    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
    const firstNonHandle = lines.find((line) => !line.startsWith('@'));
    return (firstNonHandle || handle).slice(0, 100);
  }

  function parseUserSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.links)) return null;

    const handle = snapshot.links.map(getHandleFromProfileHref).find(Boolean);
    if (!handle) return null;

    return {
      displayName: extractDisplayName(snapshot.text, handle),
      handle,
      avatarUrl: sanitizeAvatarUrl(snapshot.imageUrl),
      profileUrl: `https://x.com/${handle}`,
      followsBack: hasFollowBackMarker(snapshot.text)
    };
  }

  function emptyState(ownerHandle) {
    return {
      version: CACHE_VERSION,
      ownerHandle: normalizeHandle(ownerHandle) || '',
      accounts: {},
      updatedAt: 0
    };
  }

  function sanitizeCachedAccount(value) {
    if (!value || typeof value !== 'object') return null;
    const handle = normalizeHandle(value.handle);
    if (!handle || typeof value.followsBack !== 'boolean') return null;

    const seenAt = Number(value.seenAt);
    if (!Number.isFinite(seenAt) || seenAt < 0) return null;

    return {
      displayName: String(value.displayName ?? handle).trim().slice(0, 100) || handle,
      handle,
      avatarUrl: sanitizeAvatarUrl(value.avatarUrl),
      profileUrl: `https://x.com/${handle}`,
      followsBack: value.followsBack,
      seenAt
    };
  }

  function sanitizeCache(value, expectedHandle) {
    const ownerHandle = normalizeHandle(expectedHandle) || '';
    const empty = emptyState(ownerHandle);

    if (!value || typeof value !== 'object') return empty;
    if (value.version !== CACHE_VERSION) return empty;
    if (normalizeHandle(value.ownerHandle) !== ownerHandle) return empty;
    if (!value.accounts || typeof value.accounts !== 'object' || Array.isArray(value.accounts)) {
      return empty;
    }

    const accounts = {};
    for (const candidate of Object.values(value.accounts)) {
      const account = sanitizeCachedAccount(candidate);
      if (account) accounts[account.handle] = account;
    }

    const updatedAt = Number(value.updatedAt);
    return {
      version: CACHE_VERSION,
      ownerHandle,
      accounts,
      updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : 0
    };
  }

  function mergeAccount(state, account, now) {
    const ownerHandle = normalizeHandle(state?.ownerHandle) || '';
    const base = sanitizeCache(state, ownerHandle);
    const handle = normalizeHandle(account?.handle);
    const seenAt = Number(now);

    if (!handle || typeof account?.followsBack !== 'boolean' || !Number.isFinite(seenAt)) {
      return base;
    }

    const nextAccount = {
      displayName: String(account.displayName ?? handle).trim().slice(0, 100) || handle,
      handle,
      avatarUrl: sanitizeAvatarUrl(account.avatarUrl),
      profileUrl: `https://x.com/${handle}`,
      followsBack: account.followsBack,
      seenAt
    };

    return {
      version: CACHE_VERSION,
      ownerHandle,
      accounts: { ...base.accounts, [handle]: nextAccount },
      updatedAt: seenAt
    };
  }

  function listNonFollowbacks(accounts) {
    const values = Array.isArray(accounts)
      ? accounts
      : Object.values(accounts && typeof accounts === 'object' ? accounts : {});

    return values
      .filter((account) => account && account.followsBack === false)
      .slice()
      .sort((left, right) => {
        const timeDifference = Number(right.seenAt || 0) - Number(left.seenAt || 0);
        return timeDifference || String(left.handle).localeCompare(String(right.handle));
      });
  }

  const api = {
    CACHE_VERSION,
    normalizeText,
    getFollowingHandle,
    getHandleFromProfileHref,
    hasFollowBackMarker,
    parseUserSnapshot,
    mergeAccount,
    sanitizeCache,
    listNonFollowbacks
  };

  global.XNonFollowbackCore = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(globalThis);

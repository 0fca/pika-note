const NOTE_CACHE_PREFIX = 'pika-note:note-cache:';
const LEGACY_NOTE_CONTENT_KEY = 'content';
const LEGACY_SHEET_UNDO_KEY = 'pika-note-sheet-editor-undo-snapshots';
const CACHE_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

function getCacheTimestamp(record) {
  if (!record || typeof record.cachedAt !== 'string') {
    return null;
  }

  const timestamp = Date.parse(record.cachedAt);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isStaleCacheRecord(record, now = Date.now()) {
  const timestamp = getCacheTimestamp(record);
  return timestamp === null || now - timestamp >= CACHE_MAX_AGE_MS;
}

function parseCacheRecord(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function clearNoteCache(noteId) {
  if (noteId) {
    localStorage.removeItem(`${NOTE_CACHE_PREFIX}${noteId}`);
  }

  // These legacy entries are not associated with a note or a timestamp, so they
  // cannot safely be reused or retained.
  localStorage.removeItem(LEGACY_NOTE_CONTENT_KEY);
  localStorage.removeItem(LEGACY_SHEET_UNDO_KEY);
}

export function clearAllNoteCache() {
  const cacheKeys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(NOTE_CACHE_PREFIX)) {
      cacheKeys.push(key);
    }
  }

  cacheKeys.forEach(key => localStorage.removeItem(key));
  clearNoteCache();
}

export function clearStaleNoteCache(activeNoteId = '') {
  const now = Date.now();
  const cacheKeys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(NOTE_CACHE_PREFIX)) {
      cacheKeys.push(key);
    }
  }

  cacheKeys.forEach(key => {
    const noteId = key.slice(NOTE_CACHE_PREFIX.length);
    const record = parseCacheRecord(localStorage.getItem(key));
    if (noteId !== activeNoteId && isStaleCacheRecord(record, now)) {
      localStorage.removeItem(key);
    }
  });

  // Legacy note content has no UTC timestamp metadata and must never be used.
  clearNoteCache();
}

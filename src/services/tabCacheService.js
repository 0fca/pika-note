const TAB_CACHE_PREFIX = 'pika-note-tab-cache-';

export function getCachedTabNote(tabId) {
  if (!tabId) return null;
  try {
    const raw = localStorage.getItem(TAB_CACHE_PREFIX + tabId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedTabNote(tabId, noteData) {
  if (!tabId || !noteData) return;
  try {
    localStorage.setItem(TAB_CACHE_PREFIX + tabId, JSON.stringify(noteData));
  } catch {
    // Ignore quota errors
  }
}

export function removeCachedTabNote(tabId) {
  if (!tabId) return;
  try {
    localStorage.removeItem(TAB_CACHE_PREFIX + tabId);
  } catch {
    // Ignore
  }
}

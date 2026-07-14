import { resolveNoteType } from '@/services/noteContentService';

/**
 * URLBasedBootStrategy – used when the app is loaded with a note id in the URL (e.g. /editor/:id).
 * It fetches the note first, switches the bucket to match the note's bucket, then loads the notes list.
 */
export class URLBasedBootStrategy {
  constructor(noteId, { store, noteService, buckets, isTouchScreen }) {
    this.noteId = noteId;
    this.store = store;
    this.noteService = noteService;
    this.buckets = buckets;
    this.isTouchScreen = isTouchScreen;
  }

  onBucketsReady() {
    // Skip bucket sync – the bucket will be set from the note's data
  }

  execute({ loadNotes, scrollToNote, restorePinnedTabs }) {
    return this.noteService.getNote(this.noteId)
      .then(note => {
        this.store.commit({ type: 'setPrefetchedNote', note: { ...note, id: note.id || this.noteId } });

        if (note.bucketId && note.bucketId !== this.store.getters.bucketUuid) {
          const bucket = this.buckets.find(b => b.id === note.bucketId);
          if (bucket) {
            this.store.commit({ type: 'updateCurrentBucket', bucketName: bucket.text, bucketUuid: note.bucketId });
          }
        }

        this.store.commit({ type: 'updateId', id: this.noteId });
        this.store.commit({ type: 'updateNoteType', noteType: resolveNoteType(note) });
        this.store.commit({ type: 'updateName', name: note.humanName });
        const noteDate = note.timestamp || note.lastModifiedDate || note.dateModified || note.modifiedAt || note.updatedAt || note.date;
        if (noteDate) {
          this.store.commit({ type: 'updateLastSavedAt', lastSavedAt: noteDate });
        }

        if (!this.isTouchScreen) {
          this.store.commit({ type: 'addOrReplaceTab', id: this.noteId, title: note.humanName, pinned: false });
          if (restorePinnedTabs) {
            restorePinnedTabs(this.noteId);
          }
        }

        loadNotes();

        if (scrollToNote) {
          setTimeout(() => scrollToNote(this.noteId), 500);
        }
      })
      .catch(() => {
        this.store.commit({ type: 'clearPrefetchedNote' });
        this.store.commit({ type: 'updateId', id: this.noteId });
        this.store.commit({ type: 'updateNoteType', noteType: 'note' });
        loadNotes();
      });
  }
}

/**
 * CleanBootStrategy – used when the app is loaded without a note id in the URL.
 * It syncs the bucket from localStorage/store and falls back to the first available bucket when none is set.
 */
export class CleanBootStrategy {
  constructor({ store, buckets }) {
    this.store = store;
    this.buckets = buckets;
  }

  onBucketsReady({ syncCurrentBucketSelection }) {
    const currentBucketUuid = this.store.getters.bucketUuid;

    if (!currentBucketUuid && this.buckets.length > 0) {
      const firstBucket = this.buckets[0];
      this.store.commit({
        type: 'updateCurrentBucket',
        bucketName: firstBucket.text,
        bucketUuid: firstBucket.id
      });
      return;
    }

    syncCurrentBucketSelection();
  }

  execute({ loadNotes }) {
    loadNotes();
  }
}

/**
 * Factory function that picks the right boot strategy based on whether a route note id exists.
 */
export function createBootStrategy(routeNoteId, context) {
  if (routeNoteId) {
    return new URLBasedBootStrategy(routeNoteId, context);
  }
  return new CleanBootStrategy(context);
}

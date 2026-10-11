export interface SyncQueueItem {
  id: string;
  type: 'SCORE_UPDATE' | 'PROFILE_SAVE' | 'EVIDENCE_ADD';
  sessionId?: string;
  payload: any;
  createdAt: string;
}

const STORAGE_KEYS = {
  PROFILE_DRAFT: 'rpl_offline_profile_draft',
  CHECKLIST_PREFIX: 'rpl_offline_checklist_',
  SYNC_QUEUE: 'rpl_offline_sync_queue',
};

export const offlineStorage = {
  // Worker Profile Draft
  saveProfileDraft(draft: any): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE_DRAFT, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save profile draft locally', e);
    }
  },

  getProfileDraft(): any | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE_DRAFT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearProfileDraft(): void {
    localStorage.removeItem(STORAGE_KEYS.PROFILE_DRAFT);
  },

  // Checklist Draft per Assessment Session
  saveChecklistDraft(sessionId: string, scores: Record<string, { rubric_level: number; assessor_notes?: string }>): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.CHECKLIST_PREFIX}${sessionId}`, JSON.stringify(scores));
    } catch (e) {
      console.warn('Failed to save checklist draft locally', e);
    }
  },

  getChecklistDraft(sessionId: string): Record<string, { rubric_level: number; assessor_notes?: string }> | null {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.CHECKLIST_PREFIX}${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearChecklistDraft(sessionId: string): void {
    localStorage.removeItem(`${STORAGE_KEYS.CHECKLIST_PREFIX}${sessionId}`);
  },

  // Sync Queue for Offline Action Replay
  enqueue(item: Omit<SyncQueueItem, 'id' | 'createdAt'>): void {
    try {
      const queue: SyncQueueItem[] = this.getQueue();
      const newItem: SyncQueueItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      queue.push(newItem);
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to enqueue sync item', e);
    }
  },

  getQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  clearQueue(): void {
    localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
  },

  removeItem(id: string): void {
    try {
      const queue = this.getQueue().filter(i => i.id !== id);
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to remove item from sync queue', e);
    }
  },
};

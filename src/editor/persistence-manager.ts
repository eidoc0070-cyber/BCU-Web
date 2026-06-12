import { EditorSession } from './state-manager';

const STORAGE_KEY = 'bcu_editor_session';

export class PersistenceManager {
    private static saveTimeout: any = null;

    public static saveSession(session: EditorSession) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Debounce to avoid heavy LocalStorage writes during Gizmo drags
        this.saveTimeout = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
                console.log('[Persistence] Session saved');
            } catch (e) {
                console.error('[Persistence] Failed to save session:', e);
            }
        }, 500);
    }

    public static loadSession(): EditorSession | null {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.error('[Persistence] Failed to load session:', e);
            return null;
        }
    }

    public static clearSession() {
        localStorage.removeItem(STORAGE_KEY);
    }
}

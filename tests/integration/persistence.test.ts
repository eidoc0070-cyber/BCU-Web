import { expect, test, describe, beforeEach, afterEach, spyOn, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { PersistenceManager } from "../../src/editor/persistence-manager";
import { EditorSession } from "../../src/editor/state-manager";
import { AnimProp } from "../../src/editor/constants";

describe("PersistenceManager Unit Tests", () => {
    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch(e) {}
    });

    const mockSession: EditorSession = {
        animId: "walk",
        selectedPartIdxs: [5],
        selectedKeyframeIds: ["5:10:0"],
        currentFrame: 10,
        currentView: "animation",
        projectName: "Test Project",
        history: {
            undo: [{ type: 'UPDATE_PROPERTY', partIdxs: [0], field: AnimProp.PosX, newValue: 100 }],
            redo: []
        },
        lastModified: Date.now()
    };

    beforeEach(() => {
        localStorage.clear();
    });

    test("should save and load session with history correctly", (done) => {
        PersistenceManager.saveSession(mockSession);
        
        // Wait for debounce (500ms + buffer)
        setTimeout(() => {
            const loaded = PersistenceManager.loadSession();
            expect(loaded).not.toBeNull();
            expect(loaded?.animId).toBe("walk");
            expect(loaded?.history?.undo?.length).toBe(1);
            expect(loaded?.history?.undo[0].type).toBe('UPDATE_PROPERTY');
            expect(loaded?.selectedKeyframeIds).toEqual(["5:10:0"]);
            done();
        }, 600);
    });

    test("should return null for non-existent session", () => {
        const loaded = PersistenceManager.loadSession();
        expect(loaded).toBeNull();
    });

    test("should handle corrupted JSON gracefully", () => {
        localStorage.setItem('bcu_editor_session', '{ invalid json ]');
        const loaded = PersistenceManager.loadSession();
        expect(loaded).toBeNull();
    });

    test("should validate session data on load", () => {
        // Missing animId
        localStorage.setItem('bcu_editor_session', JSON.stringify({ currentFrame: 10 }));
        expect(PersistenceManager.loadSession()).toBeNull();

        // Invalid frame type
        localStorage.setItem('bcu_editor_session', JSON.stringify({ animId: 'test', currentFrame: '10' }));
        expect(PersistenceManager.loadSession()).toBeNull();
    });

    test("should debounce multiple save calls", async () => {
        PersistenceManager.saveSession({ ...mockSession, currentFrame: 1 });
        PersistenceManager.saveSession({ ...mockSession, currentFrame: 2 });
        PersistenceManager.saveSession({ ...mockSession, currentFrame: 3 });

        // Initially should be null or old value (because of 500ms debounce)
        expect(PersistenceManager.loadSession()).toBeNull();

        // Wait for debounce to finish
        await new Promise(resolve => setTimeout(resolve, 800));

        const loaded = PersistenceManager.loadSession();
        expect(loaded).not.toBeNull();
        expect(loaded?.currentFrame).toBe(3);
    });

    test("should clear session correctly", () => {
        localStorage.setItem('bcu_editor_session', JSON.stringify(mockSession));
        PersistenceManager.clearSession();
        expect(localStorage.getItem('bcu_editor_session')).toBeNull();
    });
});

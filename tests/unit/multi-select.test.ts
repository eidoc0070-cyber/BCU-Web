import { expect, test, describe, beforeAll, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { EditorStateManager } from "../../src/editor/state-manager";
import { AnimProp } from "../../src/editor/constants";

describe("Multi-Selection Logic Tests", () => {
    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch (e) {}
    });

    let state: EditorStateManager;

    beforeEach(() => {
        state = new EditorStateManager();
    });

    test("should handle multi-part selection", () => {
        state.setSelection([1, 2, 3]);
        expect(state.getSelection()).toEqual([1, 2, 3]);
        expect(state.isSelected(1)).toBe(true);
        expect(state.isSelected(4)).toBe(false);

        state.toggleSelection(2);
        expect(state.isSelected(2)).toBe(false);
        expect(state.getSelection()).toEqual([1, 3]);

        state.toggleSelection(4);
        expect(state.isSelected(4)).toBe(true);
        expect(state.getSelection()).toContain(4);
    });

    test("should handle multi-keyframe selection using string IDs", () => {
        const kf1 = "0:4:10"; // part 0, field 4 (PosX), frame 10
        const kf2 = `1:${AnimProp.Rotation}:50`; // part 1, field 11 (Rotation), frame 50
        
        state.setKFSelection([kf1, kf2]);
        expect(state.getKFSelection()).toEqual([kf1, kf2]);
        expect(state.isKFSelected(kf1)).toBe(true);
        
        state.toggleKFSelection(kf1);
        expect(state.isKFSelected(kf1)).toBe(false);
        expect(state.getKFSelection()).toEqual([kf2]);
        
        state.clearKFSelection();
        expect(state.getKFSelection().length).toBe(0);
    });

    test("should persist multi-selection in session", () => {
        state.setSelection([5, 10]);
        state.setKFSelection(["part:field:frame"]);
        
        const session = state.getSession(100, "MyProject");
        expect(session.selectedPartIdxs).toEqual([5, 10]);
        expect(session.selectedKeyframeIds).toEqual(["part:field:frame"]);
        expect(session.currentFrame).toBe(100);
        expect(session.projectName).toBe("MyProject");
    });
});

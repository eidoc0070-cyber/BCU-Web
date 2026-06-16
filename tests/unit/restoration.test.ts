import { expect, test, describe, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { EditorStateManager } from "../../src/editor/state-manager";
import { DeletePartCommand } from "../../src/editor/commands/hierarchy-commands";
import { EngineBridge } from "../../src/editor/engine-bridge";

describe("Hierarchy Restoration (Delete/Undo) Tests", () => {
    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch (e) {}
    });

    test("DeletePartCommand should capture state and restore correctly via Undo", () => {
        const stateManager = new EditorStateManager();
        
        // Mock State representing 3 parts
        let mockState = {
            animation: {
                parts: [
                    { index: 0, name: "Root", raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0] },
                    { index: 1, name: "To Delete", raw_args: [0, 0, 0, 0, 10, 20, 0, 0, 1000, 1000, 0, 1000, 0, 0] },
                    { index: 2, name: "Last", raw_args: [1, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0] } // Parent is 1
                ],
                anim: {
                    parts: [
                        { ints: [1, 10, 0, 0, 0], off: 0, moves: [[0, 45, 0, 0]] } // Keyframe for part 1
                    ]
                }
            }
        };

        let lastCommand: any = null;
        const bridge = {
            getState: () => mockState,
            deletePart: (idx: number) => {
                lastCommand = { op: 'DELETE', idx };
                // Simulate engine shift
                mockState.animation.parts.splice(idx, 1);
                mockState.animation.parts.forEach((p, i) => {
                    p.index = i;
                    if (p.raw_args[0] === idx) p.raw_args[0] = -1;
                    else if (p.raw_args[0] > idx) p.raw_args[0] -= 1;
                });
                mockState.animation.anim.parts = mockState.animation.anim.parts.filter(p => p.ints[0] !== idx);
                mockState.animation.anim.parts.forEach(p => {
                    if (p.ints[0] > idx) p.ints[0] -= 1;
                });
            },
            restorePart: (idx: number, data: any, name: string, kfs: any[]) => {
                lastCommand = { op: 'RESTORE', idx, data, name, kfs };
                // Simulate engine restore
                mockState.animation.parts.splice(idx, 0, { index: idx, name, raw_args: data });
                mockState.animation.parts.forEach((p, i) => {
                    if (i > idx) {
                        p.index = i;
                        if (p.raw_args[0] >= idx) p.raw_args[0] += 1;
                    }
                });
                kfs.forEach(kf => {
                    kf.ints[0] = idx;
                    mockState.animation.anim.parts.push(kf);
                });
            }
        } as unknown as EngineBridge;

        stateManager.setSelection([1, 2]); // Select part to delete and the one after it
        const cmd = new DeletePartCommand(bridge, stateManager, 1);

        // 1. Execute Delete
        cmd.execute();
        stateManager.remapPartIndices(1);

        expect(lastCommand.op).toBe('DELETE');
        expect(mockState.animation.parts.length).toBe(2);
        expect(mockState.animation.parts[1].name).toBe("Last");
        expect(mockState.animation.parts[1].raw_args[0]).toBe(-1); // Parent was 1, now root
        expect(stateManager.getSelection()).toEqual([1]); // Original 2 shifted to 1

        // 2. Undo Restoration
        cmd.undo();
        // remapPartIndicesReverse is called inside cmd.undo() but we need to verify stateManager
        
        expect(lastCommand.op).toBe('RESTORE');
        expect(lastCommand.name).toBe("To Delete");
        expect(lastCommand.kfs.length).toBe(1);
        expect(mockState.animation.parts.length).toBe(3);
        expect(mockState.animation.parts[1].name).toBe("To Delete");
        expect(mockState.animation.parts[2].name).toBe("Last");
        expect(stateManager.getSelection().sort()).toEqual([1, 2]); // Selection restored (sorted)
    });
});

import { expect, test, describe, beforeAll, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { ModifyKeyframeCommand, DeleteKeyframeCommand } from "../src/editor/commands/animation-commands";
import { EngineBridge } from "../src/editor/engine-bridge";

describe("Identity-based Keyframe Logic Tests", () => {
    let mockBridge: any;
    let mockState: any;

    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch (e) {}
    });

    beforeEach(() => {
        mockState = {
            animation: {
                anim: {
                    parts: [
                        {
                            ints: [0, 10, 0, 0, 0], // part 0, type 10 (Angle)
                            off: 0,
                            moves: [
                                [0, 0, 0, 0],
                                [10, 500, 0, 0],
                                [20, 1000, 0, 0]
                            ]
                        }
                    ]
                }
            }
        };

        mockBridge = {
            getState: () => mockState,
            updateAnimKeyframe: (partIdx: number, type: number, moveIdx: number, f: number, v: number, i: number, e: number) => {
                const part = mockState.animation.anim.parts.find((p: any) => p.ints[0] === partIdx && p.ints[1] === type);
                if (part && part.moves[moveIdx]) {
                    part.moves[moveIdx] = [f, v, i, e];
                }
            },
            deleteAnimKeyframe: (partIdx: number, type: number, moveIdx: number) => {
                const part = mockState.animation.anim.parts.find((p: any) => p.ints[0] === partIdx && p.ints[1] === type);
                if (part) {
                    part.moves.splice(moveIdx, 1);
                }
            },
            addAnimKeyframe: (partIdx: number, type: number, frame: number, value: number) => {
                const part = mockState.animation.anim.parts.find((p: any) => p.ints[0] === partIdx && p.ints[1] === type);
                if (part) {
                    part.moves.push([frame, value, 0, 0]);
                    part.moves.sort((a: any, b: any) => a[0] - b[0]);
                }
            }
        };
    });

    test("ModifyKeyframeCommand should find keyframe by frame ID, not index", () => {
        const oldData = { frame: 10, value: 500, interp: 0, easing: 0 };
        const newData = { frame: 15, value: 600, interp: 0, easing: 0 };
        
        const cmd = new ModifyKeyframeCommand(mockBridge as any, 0, 10, oldData, newData);
        
        // 1. Manually shift indices by inserting a new KF at the beginning
        mockState.animation.anim.parts[0].moves.unshift([-5, -100, 0, 0]);
        // Now KF at frame 10 is at index 2 instead of 1
        
        cmd.execute();
        
        const moves = mockState.animation.anim.parts[0].moves;
        expect(moves.some((m: any) => m[0] === 15 && m[1] === 600)).toBe(true);
        expect(moves.some((m: any) => m[0] === 10)).toBe(false);
        
        cmd.undo();
        expect(mockState.animation.anim.parts[0].moves.some((m: any) => m[0] === 10 && m[1] === 500)).toBe(true);
    });

    test("DeleteKeyframeCommand should find keyframe by frame ID", () => {
        const cmd = new DeleteKeyframeCommand(mockBridge as any, 0, 10, 10);
        
        // Shift indices
        mockState.animation.anim.parts[0].moves.unshift([-5, -100, 0, 0]);
        
        cmd.execute();
        expect(mockState.animation.anim.parts[0].moves.some((m: any) => m[0] === 10)).toBe(false);
        
        cmd.undo();
        expect(mockState.animation.anim.parts[0].moves.some((m: any) => m[0] === 10)).toBe(true);
    });
});

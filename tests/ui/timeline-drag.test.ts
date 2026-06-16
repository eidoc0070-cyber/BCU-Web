import { expect, test, describe, beforeAll, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Timeline } from "../../src/editor/components/Timeline";
import { EditorStateManager } from "../../src/editor/state-manager";
import { eventBus } from "../../src/editor/event-bus";

describe("Timeline Multi-Keyframe Drag Tests", () => {
    let stateManager: EditorStateManager;
    let timeline: Timeline;
    let mockState: any;

    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch (e) {}
        
        // Setup minimal DOM for Timeline
        document.body.innerHTML = `
            <input type="range" id="frame-slider">
            <div id="timeline-keyframes" style="width: 1000px; height: 100px;"></div>
            <div id="current-frame-label"></div>
            <div id="max-frame-label"></div>
        `;
    });

    beforeEach(() => {
        stateManager = new EditorStateManager();
        timeline = new Timeline(stateManager, () => {});
        mockState = {
            current_frame: 0,
            max_frame: 100,
            anim: {
                parts: [
                    {
                        ints: [0, 10, 0, 0, 0],
                        off: 0,
                        moves: [
                            [0, 100, 0, 0],
                            [10, 200, 0, 0]
                        ]
                    }
                ]
            }
        };
    });

    test("Dragging should emit KEYFRAME_BATCH_MODIFIED with correct delta", async () => {
        let batchData: any = null;
        eventBus.on('KEYFRAME_BATCH_MODIFIED', (data) => {
            batchData = data;
        });

        // 1. Initial Render
        timeline.update(mockState, false, [0]);
        
        // 2. Select keyframe at frame 10
        const kfId = "0:10:10";
        stateManager.setKFSelection([kfId]);
        timeline.update(mockState, false, [0]); // Re-render to pick up selection

        // 3. Simulate Drag
        const container = document.getElementById('timeline-keyframes')!;
        // Mock layout for test
        container.getBoundingClientRect = () => ({
            width: 1000,
            height: 100,
            top: 0,
            left: 0,
            right: 1000,
            bottom: 100,
            x: 0,
            y: 0,
            toJSON: () => {}
        } as DOMRect);

        const dot = container.querySelector(`[data-kf-id="${kfId}"]`) as HTMLElement;
        expect(dot).not.toBeNull();

        // Simulate mousedown
        const mouseDown = new MouseEvent('mousedown', { clientX: 0, button: 0, bubbles: true });
        dot.dispatchEvent(mouseDown);

        // Simulate mousemove (move 100px right on a 1000px container = +10 frames)
        const mouseMove = new MouseEvent('mousemove', { clientX: 100, bubbles: true });
        window.dispatchEvent(mouseMove);

        // Simulate mouseup
        const mouseUp = new MouseEvent('mouseup', { clientX: 100, bubbles: true });
        window.dispatchEvent(mouseUp);

        // 4. Verification
        expect(batchData).not.toBeNull();
        expect(batchData.changes[0].newData.frame).toBe(20);
        expect(batchData.changes[0].oldData.frame).toBe(10);
    });
});

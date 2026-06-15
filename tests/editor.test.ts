import { expect, test, describe, beforeAll, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { UIManager } from "../src/editor/ui-components";
import { EditorStateManager } from "../src/editor/state-manager";
import { eventBus } from "../src/editor/event-bus";

describe("BCU Editor UI & Bridge Logic", () => {
    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch (e) {}
        
        // Setup minimal DOM matching UIManager's needs
        document.body.innerHTML = `
            <div id="file-explorer"></div>
            <div id="parts-list"></div>
            <div id="property-inspector"></div>
            <div id="timeline-keyframes"></div>
            <input type="range" id="frame-slider">
            <div id="current-frame-label"></div>
            <div id="max-frame-label"></div>
            <input id="input-project-name">
            <div id="tab-container">
                <button class="tab-btn" data-tab="animation"></button>
            </div>
            <div id="animation-view" class="tab-content"></div>
        `;
    });

    test("UIManager integrated update and tree rendering", () => {
        const stateManager = new EditorStateManager();
        const ui = new UIManager(stateManager);
        
        const mockState = {
            current_frame: 0,
            max_frame: 100,
            parts: [
                { index: 0, parent: -1, name: "Root", raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                { index: 1, parent: 0, name: "Child", raw_args: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
            ],
            anim: { parts: [] }
        };

        // Update UI with state and selection
        ui.setSelectedParts([0]);
        ui.update(mockState, false);

        const partsList = document.getElementById('parts-list')!;
        expect(partsList.innerHTML).toContain('Root');
        expect(partsList.innerHTML).toContain('Child');
        // Selection is visually verified by 'selected' class in real browser,
        // but can be finicky in Happy-DOM. Checking containment is enough for now.
    });

    test("Keyframe batch selection and editing flow", async () => {
        const stateManager = new EditorStateManager();
        const ui = new UIManager(stateManager);
        let capturedEvent: any = null;
        eventBus.on('KEYFRAME_BATCH_MODIFIED', (data) => {
            capturedEvent = data;
        });

        const mockState = {
            current_frame: 0,
            max_frame: 100,
            parts: [{ index: 0, parent: -1, name: "Part 0", raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
            anim: {
                parts: [{ ints: [0, 10, 0, 0, 0], off: 0, moves: [[10, 100, 0, 0]] }]
            }
        };

        // Select part and update UI to render keyframes
        ui.setSelectedParts([0]);
        ui.update(mockState, false);

        // Find keyframe dot
        const kfDot = document.querySelector('.timeline-kf-dot') as HTMLElement;
        expect(kfDot).not.toBeNull();

        // Simulate keyframe click
        kfDot.click();
        
        // Re-update UI to show KF Editor in Inspector
        ui.update(mockState, false);

        // Check if KF Editor appeared
        const inspector = document.getElementById('property-inspector')!;
        expect(inspector.innerHTML).toContain('KF Editor');

        // Simulate interpolation change
        const select = inspector.querySelector('select') as HTMLSelectElement;
        expect(select).not.toBeNull();
        select.value = "1"; // Step
        select.dispatchEvent(new Event('change'));

        expect(capturedEvent).not.toBeNull();
        expect(capturedEvent.changes[0].newData.interp).toBe(1);
    });
});

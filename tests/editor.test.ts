import { expect, test, describe, beforeAll, spyOn } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { UIManager } from "../src/editor/ui-components";
import { EngineBridge } from "../src/editor/engine-bridge";
import { eventBus } from "../src/editor/event-bus";

describe("BCU Editor UI & Bridge Logic", () => {
    beforeAll(() => {
        try {
            GlobalRegistrator.register();
        } catch (e) {
            // Ignore if already registered
        }
        
        // Setup DOM
        document.body.innerHTML = `
            <div id="tab-model" class="tab-btn"></div>
            <div id="tab-imgcut" class="tab-btn"></div>
            <div id="tab-files" class="tab-btn"></div>
            <div id="view-model-anim"></div>
            <div id="view-imgcut"></div>
            <div id="view-files"></div>
            <div id="parts-list"></div>
            <div id="imgcut-list"></div>
            <div id="property-inspector"></div>
            <input type="range" id="frame-slider">
            <div id="timeline-keyframes"></div>
            <div id="current-frame-label"></div>
            <div id="max-frame-label"></div>
            <div id="file-explorer"></div>
            <input type="text" id="input-project-name">
            <div id="toast-container"></div>
            <canvas id="bcu-canvas"></canvas>
            <canvas id="gizmo-canvas"></canvas>
            <canvas id="imgcut-canvas"></canvas>
        `;
    });

    test("UIManager tab switching", () => {
        new UIManager();

        const tabModel = document.getElementById('tab-model')!;
        const tabImgCut = document.getElementById('tab-imgcut')!;
        const viewModel = document.getElementById('view-model-anim')!;
        const viewImgCut = document.getElementById('view-imgcut')!;

        // Default state check
        tabImgCut.click();
        expect(tabImgCut.classList.contains('active')).toBe(true);
        expect(viewImgCut.style.display).toBe('block');
        expect(viewModel.style.display).toBe('none');

        tabModel.click();
        expect(tabModel.classList.contains('active')).toBe(true);
        expect(viewModel.style.display).toBe('block');
        expect(viewImgCut.style.display).toBe('none');
    });

    test("EngineBridge command dispatching", () => {
        const mockEngine = {
            dispatch_editor_command: (_json: string) => {}
        } as any;
        const spy = spyOn(mockEngine, 'dispatch_editor_command');
        
        const bridge = new EngineBridge(mockEngine, 'walk');
        bridge.updateModelPart(10, 4, 150);

        expect(spy).toHaveBeenCalled();
        const callArg = JSON.parse(spy.mock.calls[0][0] as string);
        expect(callArg.op).toBe('UPDATE_MODEL_PART');
        expect(callArg.data.part_idx).toBe(10);
        expect(callArg.data.value).toBe(150);
    });

    test("UIManager hierarchical tree rendering", () => {
        const ui = new UIManager();
        
        const mockState = {
            current_frame: 0,
            max_frame: 100,
            parts: [
                { index: 0, name: "Root", parent: -1, z_order: 0, raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0] } as any,
                { index: 1, name: "Child", parent: 0, z_order: 0, raw_args: [0, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0] } as any
            ],
            anim: { n: 0, parts: [], max: 0, len: 0 }
        };

        const mockImgCut = { name: "", n: 0, cuts: [], strs: [] };

        ui.update(mockState as any, false, { name: "Test", files: new Map() }, mockImgCut as any);

        const partsList = document.getElementById('parts-list')!;
        const items = partsList.querySelectorAll('.part-item');
        expect(items.length).toBe(2);
    });

    test("Keyframe selection and editing flow", () => {
        let capturedEvent: any = null;
        eventBus.on('KEYFRAME_MODIFIED', (data) => {
            capturedEvent = data;
        });

        const ui = new UIManager();

        const mockState = {
            current_frame: 0,
            max_frame: 10,
            parts: [
                { index: 0, name: "Root", parent: -1, z_order: 0, raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0] } as any
            ],
            anim: {
                n: 1,
                parts: [
                    { ints: [0, 10, 1, 0, 0], off: 0, moves: [[0, 0, 0, 0], [10, 1000, 0, 0]] }
                ],
                max: 10
            }
        };

        ui.update(mockState, false);
        eventBus.emit('PART_SELECTED', { partIdx: 0 });
        ui.update(mockState, false);

        const timeline = document.getElementById('timeline-keyframes')!;
        const kfDot = timeline.querySelector('div') as HTMLElement;
        expect(kfDot).not.toBeNull();

        // Simulate keyframe click
        kfDot.click();
        ui.update(mockState, false);

        // Check if KF Editor appeared in Property Inspector
        const inspector = document.getElementById('property-inspector')!;
        expect(inspector.innerHTML).toContain('KF Editor');

        // Simulate interpolation change
        const select = inspector.querySelector('select') as HTMLSelectElement;
        expect(select).not.toBeNull();
        select.value = "1"; // Step
        select.dispatchEvent(new Event('change'));

        expect(capturedEvent).not.toBeNull();
        expect(capturedEvent.interp).toBe(1);
    });
});

import { expect, test, describe, beforeAll, spyOn } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { UIManager } from "../src/editor/ui-components";
import { EngineBridge } from "../src/editor/engine-bridge";

describe("BCU Editor UI & Bridge Logic", () => {
    beforeAll(() => {
        try {
            GlobalRegistrator.register();
        } catch (e) {
            // Ignore if already registered
        }
        
        // Setup DOM
        document.body.innerHTML = `
            <div id="tab-model"></div>
            <div id="tab-imgcut"></div>
            <div id="view-model-anim"></div>
            <div id="view-imgcut"></div>
            <div id="parts-list"></div>
            <div id="imgcut-list"></div>
            <div id="property-inspector"></div>
            <input type="range" id="frame-slider">
            <div id="timeline-keyframes"></div>
            <canvas id="bcu-canvas"></canvas>
            <canvas id="gizmo-canvas"></canvas>
            <canvas id="imgcut-canvas"></canvas>
        `;
    });

    test("UIManager tab switching", () => {
        new UIManager(
            () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}
        );

        const tabModel = document.getElementById('tab-model')!;
        const tabImgCut = document.getElementById('tab-imgcut')!;
        const viewModel = document.getElementById('view-model-anim')!;
        const viewImgCut = document.getElementById('view-imgcut')!;

        // Default state check (triggered by constructor click listeners)
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
        const ui = new UIManager(
            () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}
        );
        
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
        
        // Child should have more padding than root
        const rootItem = items[0] as HTMLElement;
        const childItem = items[1] as HTMLElement;
        
        const rootPad = parseInt(rootItem.style.paddingLeft);
        const childPad = parseInt(childItem.style.paddingLeft);
        expect(childPad).toBeGreaterThan(rootPad);
    });
});

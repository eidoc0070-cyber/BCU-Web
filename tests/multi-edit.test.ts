import { expect, test, describe, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { UpdatePropertyCommand } from "../src/editor/commands/property-commands";
import { EngineBridge } from "../src/editor/engine-bridge";
import { EditorStateManager } from "../src/editor/state-manager";
import { eventBus } from "../src/editor/event-bus";
import { PropertyInspector } from "../src/editor/components/PropertyInspector";

describe("Multi-Edit and Guard Rails Tests", () => {
    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch (e) {}
        
        // Setup minimal DOM for PropertyInspector
        document.body.innerHTML = `<div id="property-inspector"></div>`;
    });

    test("UpdatePropertyCommand should handle multiple parts and undo correctly", () => {
        const updatedParts: Map<number, number> = new Map();
        const bridge = {
            updateModelPart: (idx: number, field: number, value: number) => {
                updatedParts.set(idx, value);
            }
        } as unknown as EngineBridge;

        const partIdxs = [1, 2, 3];
        const field = 11; // Opacity
        const oldValues = new Map([[1, 1000], [2, 500], [3, 0]]);
        const newValue = 800;

        const cmd = new UpdatePropertyCommand(bridge, partIdxs, field, oldValues, newValue);

        // Execute
        cmd.execute();
        expect(updatedParts.get(1)).toBe(800);
        expect(updatedParts.get(2)).toBe(800);
        expect(updatedParts.get(3)).toBe(800);

        // Undo
        cmd.undo();
        expect(updatedParts.get(1)).toBe(1000);
        expect(updatedParts.get(2)).toBe(500);
        expect(updatedParts.get(3)).toBe(0);
    });

    test("PropertyInspector should apply guard rails for Scale and Opacity", () => {
        const stateManager = new EditorStateManager();
        const inspector = new PropertyInspector(stateManager);
        
        let lastEmitted: any = null;
        eventBus.on('PROPERTY_CHANGED', (data) => {
            lastEmitted = data;
        });

        const mockParts = [
            { index: 0, name: "Part 0", raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000] }
        ];

        // 1. Test Scale Guard (min 1)
        inspector.update(mockParts, null, 0, mockParts);
        const scaleInput = document.querySelector('input[data-field="8"]') as HTMLInputElement;
        scaleInput.value = "-50";
        scaleInput.dispatchEvent(new Event('change'));

        expect(lastEmitted.value).toBe(1); // Should be clamped to 1

        // 2. Test Opacity Guard (0-1000)
        const opacityInput = document.querySelector('input[data-field="11"]') as HTMLInputElement;
        opacityInput.value = "1500";
        opacityInput.dispatchEvent(new Event('change'));
        expect(lastEmitted.value).toBe(1000);

        opacityInput.value = "-200";
        opacityInput.dispatchEvent(new Event('change'));
        expect(lastEmitted.value).toBe(0);
    });

    test("PropertyInspector should revert to previous value on NaN input", () => {
        const stateManager = new EditorStateManager();
        const inspector = new PropertyInspector(stateManager);
        let notifyCalled = false;
        stateManager.subscribe(() => { notifyCalled = true; });

        const mockParts = [
            { index: 0, name: "Part 0", raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000] }
        ];

        inspector.update(mockParts, null, 0, mockParts);
        const input = document.querySelector('input[data-field="4"]') as HTMLInputElement;
        input.value = "abc"; // Invalid number
        notifyCalled = false;
        input.dispatchEvent(new Event('change'));

        expect(notifyCalled).toBe(true); // Should trigger re-render to revert UI
    });
});

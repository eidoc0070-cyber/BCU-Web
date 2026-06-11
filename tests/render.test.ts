import { expect, test, describe, beforeAll, spyOn } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { EngineBridge } from "../src/editor/engine-bridge";

describe("BCU Rendering Logic Verification", () => {
    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch(e) {}
    });

    test("EngineBridge should report valid state after animation load simulation", () => {
        const mockEngine = {
            get_animation_state: () => ({
                status: "ok",
                animation: {
                    current_frame: 10,
                    max_frame: 100,
                    parts: [
                        { index: 0, name: "Root", parent: -1, z_order: 0, raw_args: [ -1, 0, 0, 0, 100, 200, 0, 0, 1000, 1000, 0, 1000, 0, 0 ] }
                    ],
                    anim: { n: 0, parts: [], max: 0, len: 0 }
                },
                imgcut: { name: "", n: 0, cuts: [], strs: [] }
            }),
            update: () => {},
            render: () => {}
        } as any;

        const bridge = new EngineBridge(mockEngine, "walk");
        const state = bridge.getState();

        expect(state).not.toBeNull();
        expect(state!.animation.parts.length).toBe(1);
        expect(state!.animation.parts[0].raw_args[4]).toBe(100); // Pos X
        expect(state!.animation.parts[0].raw_args[5]).toBe(200); // Pos Y
    });

    test("EngineBridge render call should use correct screen coordinates", () => {
        const mockEngine = {
            render: (_id: string, _spr: string, _x: number, _y: number) => {}
        } as any;
        const spy = spyOn(mockEngine, 'render');
        
        const bridge = new EngineBridge(mockEngine, "walk");
        // Simulate render at 800x600 canvas
        const canvasWidth = 800;
        const canvasHeight = 600;
        bridge.render("unit_id", canvasWidth / 2, canvasHeight * 0.75);

        expect(spy).toHaveBeenCalled();
        // Expect X = 400, Y = 450
        expect(spy.mock.calls[0][2]).toBe(400);
        expect(spy.mock.calls[0][3]).toBe(450);
    });

    test("Part transform should map engine data to screen space", () => {
        const mockEngine = {
            get_part_transform: () => ({ x: 50, y: -50, angle: 900, scale_x: 1000, scale_y: 1000 })
        } as any;
        
        const bridge = new EngineBridge(mockEngine, "walk");
        const transform = bridge.getPartTransform(0);

        expect(transform).not.toBeNull();
        expect(transform!.x).toBe(50);
        expect(transform!.y).toBe(-50);
        expect(transform!.angle).toBe(900);
    });
});

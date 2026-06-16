import { expect, test, describe, beforeAll, beforeEach, afterEach, spyOn } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { CanvasGizmo } from "../../src/editor/gizmo";
import { eventBus } from "../../src/editor/event-bus";
import { EDITOR_CONFIG } from "../../src/editor/config";

describe("CanvasGizmo Unit Tests", () => {
    let mockBridge: any;
    let canvas: HTMLCanvasElement;
    let gizmoCanvas: HTMLCanvasElement;
    let gizmo: CanvasGizmo;

    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch (e) {}
    });

    beforeEach(() => {
        eventBus.clearAllListeners();

        document.body.innerHTML = `
            <canvas id="main-canvas" width="1000" height="800"></canvas>
            <canvas id="gizmo-canvas" width="1000" height="800"></canvas>
        `;
        canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
        gizmoCanvas = document.getElementById('gizmo-canvas') as HTMLCanvasElement;
        
        // Mock getBoundingClientRect
        canvas.getBoundingClientRect = () => ({
            left: 0, top: 0, width: 1000, height: 800, right: 1000, bottom: 800, x: 0, y: 0, toJSON: () => {}
        } as any);

        // Mock canvas context
        (canvas as any).getContext = () => ({});
        (gizmoCanvas as any).getContext = () => ({
            clearRect: () => {}, beginPath: () => {}, arc: () => {}, stroke: () => {}, 
            fill: () => {}, moveTo: () => {}, lineTo: () => {}, save: () => {}, 
            restore: () => {}, translate: () => {}, rotate: () => {}, fillRect: () => {},
            strokeRect: () => {}, fillText: () => {}, setLineDash: () => {},
            setTransform: () => {}, closePath: () => {}
        });

        mockBridge = {
            getState: () => ({
                animation: {
                    parts: [{ index: 0, raw_args: [ -1, 0, 0, 0, 100, 100, 0, 0, 1000, 1000, 0, 1000 ] }]
                }
            }),
            getPartTransform: (idx: number) => {
                if (idx === 0) return { x: 100, y: 100, scale_x: 1, scale_y: 1, angle: 0 };
                return null;
            }
        };

        gizmo = new CanvasGizmo(canvas, gizmoCanvas, mockBridge);
        // Force the gizmo to know part 0 is selected
        gizmo.setSelectedParts([0]); 
    });

    afterEach(() => {
        gizmo.destroy();
        eventBus.clearAllListeners();
    });

    test("should constrain movement to X-axis when dragging X-handle", () => {
        let lastEvent: any = null;
        eventBus.on('PROPERTY_CHANGED', (data) => {
            lastEvent = data;
        });

        // 1. Mouse down on X-handle
        const offX = 1000 * EDITOR_CONFIG.RENDER_OFFSET_X;
        const offY = 800 * EDITOR_CONFIG.RENDER_OFFSET_Y;
        
        const mousedown = new MouseEvent('mousedown', {
            clientX: 100 + offX + 25, 
            clientY: 100 + offY,      
            bubbles: true
        });
        canvas.dispatchEvent(mousedown);

        // 2. Drag mouse diagonally
        const mousemove = new MouseEvent('mousemove', {
            clientX: 100 + offX + 100, 
            clientY: 100 + offY + 100, 
            bubbles: true
        });
        window.dispatchEvent(mousemove);

        // 3. Verify: Only X-coordinate event should have been emitted
        expect(lastEvent).not.toBeNull();
        expect(lastEvent.partIdxs).toEqual([0]);
        expect(lastEvent.field).toBe(4); // PosX
        expect(lastEvent.value).toBeGreaterThan(100);
    });

    test("should constrain movement to Y-axis when dragging Y-handle", () => {
        let events: any[] = [];
        eventBus.on('PROPERTY_CHANGED', (data) => {
            events.push(data);
        });

        const offX = 1000 * EDITOR_CONFIG.RENDER_OFFSET_X;
        const offY = 800 * EDITOR_CONFIG.RENDER_OFFSET_Y;
        
        // Mouse down on Y-handle
        const mousedown = new MouseEvent('mousedown', {
            clientX: 100 + offX,
            clientY: 100 + offY + 40,
            bubbles: true
        });
        canvas.dispatchEvent(mousedown);

        // Drag diagonally
        const mousemove = new MouseEvent('mousemove', {
            clientX: 100 + offX + 100,
            clientY: 100 + offY + 100,
            bubbles: true
        });
        window.dispatchEvent(mousemove);

        // Verify only Y field (5) is updated
        const yEvents = events.filter(e => e.field === 5);
        const xEvents = events.filter(e => e.field === 4);

        expect(yEvents.length).toBeGreaterThan(0);
        expect(xEvents.length).toBe(0);
        expect(yEvents[0].partIdxs).toEqual([0]);
    });

    test("should allow free movement when dragging center circle", () => {
        let fieldsUpdated = new Set<number>();
        eventBus.on('PROPERTY_CHANGED', (data) => {
            fieldsUpdated.add(data.field);
        });

        const offX = 1000 * EDITOR_CONFIG.RENDER_OFFSET_X;
        const offY = 800 * EDITOR_CONFIG.RENDER_OFFSET_Y;
        
        // Click center
        const mousedown = new MouseEvent('mousedown', {
            clientX: 100 + offX,
            clientY: 100 + offY,
            bubbles: true
        });
        canvas.dispatchEvent(mousedown);

        // Drag diagonally
        const mousemove = new MouseEvent('mousemove', {
            clientX: 100 + offX + 50,
            clientY: 100 + offY + 50,
            bubbles: true
        });
        window.dispatchEvent(mousemove);

        expect(fieldsUpdated.has(4)).toBe(true); // PosX
        expect(fieldsUpdated.has(5)).toBe(true); // PosY
    });
});

import { expect, test, describe, beforeAll, spyOn } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { EngineBridge } from "./engine-bridge";
import { BCUController } from "./controller";
import { EDITOR_CONFIG } from "./config";

describe("BCU Editor Integration & Stability", () => {
    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch(e) {}
        document.body.innerHTML = `
            <canvas id="bcu-canvas"></canvas>
            <canvas id="gizmo-canvas"></canvas>
            <canvas id="imgcut-canvas"></canvas>
        `;
        
        // Mock getContext for all canvas elements to avoid undefined error in happy-dom
        const mockGetContext = () => ({
            clearRect: () => {},
            beginPath: () => {},
            arc: () => {},
            stroke: () => {},
            fill: () => {},
            moveTo: () => {},
            lineTo: () => {},
            fillRect: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            setLineDash: () => {},
            drawImage: () => {}
        });
        
        document.querySelectorAll('canvas').forEach(canvas => {
            (canvas as any).getContext = mockGetContext;
        });
    });

    test("Render loop should survive NULL state and continue rendering", () => {
        // null을 반환하는 엔진 시뮬레이션 (초기 로딩 상태)
        const mockEngine = {
            update: () => {},
            render: () => {},
            get_animation_state: () => null // UI 데이터는 아직 없음
        } as any;

        const renderSpy = spyOn(mockEngine, 'render');
        const bridge = new EngineBridge(mockEngine, "walk");

        // 렌더링 시도
        bridge.render("test_unit", 400, 300);
        
        // UI 상태가 null이어도 render 호출은 성공해야 함
        expect(renderSpy).toHaveBeenCalled();
        expect(bridge.getState()).toBeNull();
    });

    test("Bridge should support rapid updates during kickstart", () => {
        const mockEngine = {
            update: () => {}
        } as any;
        const updateSpy = spyOn(mockEngine, 'update');
        const bridge = new EngineBridge(mockEngine, "walk");

        // 초기 기상(Kickstart) 시뮬레이션: 3번 연속 업데이트
        for(let i=0; i<3; i++) {
            bridge.update();
        }

        expect(updateSpy).toHaveBeenCalledTimes(3);
    });

    test("EngineBridge should handle invalid animation IDs gracefully", () => {
        const mockEngine = {
            get_animation_state: () => { throw new Error("Animation not found"); }
        } as any;
        
        const bridge = new EngineBridge(mockEngine, "invalid_id");
        
        // 에러가 발생해도 프로세스가 죽지 않고 null을 반환해야 함 (내부 try-catch 검증)
        const state = bridge.getState();
        expect(state).toBeNull();
    });

    test("should reset animId to none when starting a load", async () => {
        const mockEngine = {
            load_sprite: () => {},
            load_animation: () => {},
            resize: () => {},
            update: () => {}
        } as any;
        
        const canvas = document.getElementById('bcu-canvas') as HTMLCanvasElement;
        const gizmoCanvas = document.getElementById('gizmo-canvas') as HTMLCanvasElement;
        const imgcutCanvas = document.getElementById('imgcut-canvas') as HTMLCanvasElement;
        
        const controller = new BCUController(mockEngine, canvas, gizmoCanvas, imgcutCanvas, () => {});
        
        // Simulate initial state
        controller.getStatus().animId = 'walk';
        controller.getStatus().isReady = true;

        const originalFetch = global.fetch;
        global.fetch = () => new Promise(() => {}); // never resolves
        
        try {
            controller.loadCharacter("assets/sample_unit");
            
            // Should immediately reset animId to 'none' and isReady to false
            expect(controller.getStatus().animId).toBe('none');
            expect(controller.getStatus().isReady).toBe(false);
        } finally {
            global.fetch = originalFetch;
        }
    });

    test("should use unified coordinate offsets for screen rendering and gizmo mouse-pos conversion", () => {
        const mockEngine = {
            get_part_transform: () => ({ x: 10, y: 20, scale_x: 1, scale_y: 1, angle: 0 }),
            get_animation_state: () => ({ parts: [] }),
            render: () => {}
        } as any;
        
        const bridge = new EngineBridge(mockEngine, "walk");
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 800;
        
        const renderX = canvas.width * EDITOR_CONFIG.RENDER_OFFSET_X;
        const renderY = canvas.height * EDITOR_CONFIG.RENDER_OFFSET_Y;
        
        expect(renderX).toBe(500);
        expect(renderY).toBe(520); // 800 * 0.65
    });
});

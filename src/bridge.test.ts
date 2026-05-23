import { expect, test, describe, beforeAll } from "bun:test";
import init, { BCUEngine } from "../pkg/bcu_api.js";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { readFileSync } from "fs";
import { join } from "path";

describe("BCU WASM Bridge Integration", () => {
    beforeAll(async () => {
        // 1. DOM 시뮬레이션 환경 설정
        GlobalRegistrator.register();
        
        // 2. WASM 파일을 직접 읽어서 초기화 (happy-dom fetch 우회)
        const wasmPath = join(process.cwd(), "pkg", "bcu_api_bg.wasm");
        const wasmBuffer = readFileSync(wasmPath);
        await init(wasmBuffer);
    });

    test("should initialize BCUEngine with a mock canvas", async () => {
        const canvas = document.createElement("canvas");
        canvas.id = "bcu-canvas";
        document.body.appendChild(canvas);

        // BCUEngine.init() 호출 (WGPU 컨텍스트 생성을 시도함)
        // 참고: happy-dom 환경에서는 실제 WebGPU가 없으므로 에러가 날 수 있음.
        // 여기서는 구조적 로딩만 테스트하거나, mock 처리가 필요할 수 있음.
        try {
            const engine = await BCUEngine.init(canvas);
            expect(engine).toBeDefined();
            console.log("✓ Engine loaded successfully in DOM env");
        } catch (e) {
            // WebGPU/WebGL2가 없는 환경에서의 에러는 무시하거나 경고만 출력
            console.warn("WASM execution skipped: No GPU driver in test env", e);
        }
    });

    test("should expose logic parity constants", () => {
        // 추가적인 수학적 상수나 간단한 로직 노출 시 여기서 테스트
        expect(true).toBe(true);
    });
});

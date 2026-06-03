import init, { BCUEngine } from '../pkg/bcu_api.js';
import { BCUController } from './editor/controller';
import { EDITOR_CONFIG } from './editor/config';


async function run() {
    const statusEl = document.getElementById('engine-status');
    const consoleEl = document.getElementById('logger-console');
    const canvas = document.getElementById('bcu-canvas') as HTMLCanvasElement;
    const gizmoCanvas = document.getElementById('gizmo-canvas') as HTMLCanvasElement;
    const imgcutCanvas = document.getElementById('imgcut-canvas') as HTMLCanvasElement;
    
    function logToConsole(message: string, type: 'info' | 'error' = 'info') {
        if (!consoleEl) return;
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
        console.log(`[Editor] ${message}`);
    }

    logToConsole("Initializing BCU Rust Engine...");
    await init();

    if (!canvas || !gizmoCanvas || !imgcutCanvas) {
        logToConsole("UI Error: Canvas elements missing", "error");
        return;
    }

    try {
        const engine = await BCUEngine.init(canvas);
        const controller = new BCUController(engine, canvas, gizmoCanvas, imgcutCanvas, logToConsole);

        if (statusEl) statusEl.innerText = 'Engine Ready';
        
        // Debug global access
        (window as any).debug = {
            controller,
            bridge: controller.bridge,
            getEngine: () => engine,
            listLoaded: () => {
                if (controller.bridge) {
                    return {
                        animations: controller.bridge.listAnimations(),
                        status: controller.getStatus(),
                        files: Array.from((controller as any).project.files.keys())
                    };
                }
                return null;
            },
            forceRender: () => {
                if (controller.bridge) {
                    const status = controller.getStatus();
                    if (status.animId === 'none') {
                        console.warn("[Debug] No active animation to render. Defaulting to 'walk' or first loaded.");
                        const list = controller.bridge.listAnimations();
                        if (list.length > 0) {
                            const defaultAnim = list.includes('walk') ? 'walk' : list[0];
                            controller.setAnimation(defaultAnim);
                        } else {
                            throw new Error("No animations loaded in engine.");
                        }
                    }
                    controller.bridge.render(
                        'test_unit', 
                        canvas.width * EDITOR_CONFIG.RENDER_OFFSET_X, 
                        canvas.height * EDITOR_CONFIG.RENDER_OFFSET_Y
                    );
                }
            },
            runDiagnostics: async () => {
                const { runDiagnostics, formatDiagnosticReport } = await import('./diagnostics');
                const result = await runDiagnostics();
                const report = formatDiagnosticReport(result);
                logToConsole(report);
                return result;
            }
        };

        const renderLoop = () => {
            controller.renderTick();
            requestAnimationFrame(renderLoop);
        };
        console.log("[Editor] Starting render loop...");
        requestAnimationFrame(renderLoop);

        // Wire up buttons programmatically
        document.getElementById('btn-load-sample')?.addEventListener('click', () => {
            controller.loadCharacter('assets/sample_unit');
        });
        document.getElementById('btn-run-diagnostics')?.addEventListener('click', async () => {
            if ((window as any).debug?.runDiagnostics) {
                await (window as any).debug.runDiagnostics();
            }
        });

        // Initial load
        (window as any).loadCharacter = (url: string) => controller.loadCharacter(url);
        controller.loadCharacter('assets/sample_unit');

    } catch (e) {
        logToConsole(`Initialization Error: ${e}`, 'error');
    }
}

run().catch(console.error);

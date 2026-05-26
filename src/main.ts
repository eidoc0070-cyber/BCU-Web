import init, { BCUEngine } from '../pkg/bcu_api.js';
import { runDiagnostics, formatDiagnosticReport } from './diagnostics';

async function run() {
    const statusEl = document.getElementById('status');
    const consoleEl = document.getElementById('logger-console');
    
    function logToConsole(message: string, type: 'info' | 'error' = 'info') {
        if (!consoleEl) return;
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    if (statusEl) statusEl.innerText = 'WASM 초기화 중...';

    // 진단 도구 노출
    (window as any).runDiagnosticsTool = async () => {
        logToConsole('진단 도구 실행 중...');
        const result = await runDiagnostics();
        const report = formatDiagnosticReport(result);
        
        console.log(report);
        
        // 클립보드 복사 시도
        try {
            await navigator.clipboard.writeText(report);
            logToConsole('진단 리포트가 클립보드에 복사되었습니다!', 'info');
        } catch (err) {
            logToConsole('클립보드 복사 실패. 아래 로그를 직접 복사해 주세요.', 'error');
        }

        // 로그 창에도 상세히 출력
        report.split('\n').forEach(line => logToConsole(line));
        
        alert(report + '\n\n(리포트가 클립보드에 복사되었습니다. 그대로 붙여넣기 하시면 됩니다.)');
    };

    // 1. WASM 모듈 초기화
    await init();

    // 2. Canvas 설정
    const canvas = document.getElementById('bcu-canvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // 5. 샘플 데이터 로드 함수 (외부에서 호출 가능하도록)
    // 엔진 초기화 전에 먼저 등록하여, 초기화 실패 시에도 ReferenceError가 발생하지 않도록 함
    (window as any).loadCharacter = async (baseUrl: string) => {
        if (!engine) {
            alert('엔진이 아직 초기화되지 않았거나 초기화에 실패했습니다. "시스템 진단"을 실행해 보세요.');
            return;
        }
        try {
            logToConsole(`${baseUrl} 데이터 로드 시작...`);
            if (statusEl) statusEl.innerText = `${baseUrl} 로드 중...`;

            const spriteRes = await fetch(`${baseUrl}/sprite.png`);
            const spriteBytes = new Uint8Array(await spriteRes.arrayBuffer());
            engine.load_sprite('test_unit', spriteBytes);

            const imgcutTxt = await (await fetch(`${baseUrl}/imgcut.txt`)).text();
            const mamodelTxt = await (await fetch(`${baseUrl}/mamodel.txt`)).text();
            const maanimTxt = await (await fetch(`${baseUrl}/maanim_walk.txt`)).text();
            engine.load_animation('walk', imgcutTxt, mamodelTxt, maanimTxt);

            if (statusEl) statusEl.innerText = '로드 완료! 재생 중...';
            logToConsole('캐릭터 로드 완료 및 렌더링 시작');
            startLoop();
        } catch (e) {
            console.error('Failed to load character:', e);
            logToConsole(`로드 실패: ${e}`, 'error');
            if (statusEl) statusEl.innerText = `로드 실패: ${e}`;
        }
    };

    // 3. BCU 엔진 초기화
    let engine: BCUEngine | null = null;
    try {
        logToConsole('WASM 엔진 초기화 중...');
        engine = await BCUEngine.init(canvas);
        if (statusEl) statusEl.innerText = '엔진 준비 완료. 데이터를 로드해주세요.';
        logToConsole('GPU 어댑터 획득 및 엔진 초기화 성공');
    } catch (e) {
        console.error('Engine initialization failed:', e);
        logToConsole(`엔진 초기화 실패: ${e}`, 'error');
        if (statusEl) {
            statusEl.innerText = '엔진 초기화 실패: GPU를 초기화할 수 없습니다. WebGL2/WebGPU 지원을 확인해주세요.';
            statusEl.style.color = 'red';
        }
    }

    // 4. 리사이즈 대응
    window.addEventListener('resize', () => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        if (engine) engine.resize(canvas.width, canvas.height);
    });

    // 6. 렌더링 루프
    let loopStarted = false;
    function startLoop() {
        if (!engine || loopStarted) return;
        loopStarted = true;
        
        function renderLoop() {
            if (!engine) return;
            engine.update('walk');
            try {
                // 캐릭터를 화면 중앙 하단(지면)에 배치
                const offX = canvas.width / 2;
                const offY = canvas.height * 0.75; // 화면 아래쪽 3/4 지점
                engine.render('walk', 'test_unit', offX, offY);
            } catch (e) {
                console.error('Render error:', e);
            }
            requestAnimationFrame(renderLoop);
        }
        renderLoop();
    }
}

run().catch(console.error);

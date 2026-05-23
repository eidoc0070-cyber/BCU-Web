import init, { BCUEngine } from '../pkg/bcu_api.js';

async function run() {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.innerText = 'WASM 초기화 중...';

    // 1. WASM 모듈 초기화
    await init();

    // 2. Canvas 설정
    const canvas = document.getElementById('bcu-canvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 3. BCU 엔진 초기화
    const engine = await BCUEngine.init(canvas);
    if (statusEl) statusEl.innerText = '엔진 준비 완료. 데이터를 로드해주세요.';

    // 4. 리사이즈 대응
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        engine.resize(canvas.width, canvas.height);
    });

    // 5. 샘플 데이터 로드 함수 (외부에서 호출 가능하도록)
    (window as any).loadCharacter = async (baseUrl: string) => {
        try {
            if (statusEl) statusEl.innerText = `${baseUrl} 로드 중...`;

            const spriteRes = await fetch(`${baseUrl}/sprite.png`);
            const spriteBytes = new Uint8Array(await spriteRes.arrayBuffer());
            engine.load_sprite('test_unit', spriteBytes);

            const imgcutTxt = await (await fetch(`${baseUrl}/imgcut.txt`)).text();
            const mamodelTxt = await (await fetch(`${baseUrl}/mamodel.txt`)).text();
            const maanimTxt = await (await fetch(`${baseUrl}/maanim_walk.txt`)).text();
            engine.load_animation('walk', imgcutTxt, mamodelTxt, maanimTxt);

            if (statusEl) statusEl.innerText = '로드 완료! 재생 중...';
            startLoop();
        } catch (e) {
            console.error('Failed to load character:', e);
            if (statusEl) statusEl.innerText = `로드 실패: ${e}`;
        }
    };

    // 6. 렌더링 루프
    let loopStarted = false;
    function startLoop() {
        if (loopStarted) return;
        loopStarted = true;
        
        function renderLoop() {
            engine.update('walk');
            try {
                engine.render('walk', 'test_unit');
            } catch (e) {
                console.error('Render error:', e);
            }
            requestAnimationFrame(renderLoop);
        }
        renderLoop();
    }
}

run().catch(console.error);

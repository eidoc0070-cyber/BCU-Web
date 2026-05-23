import init, { BCUEngine } from '../pkg/bcu_api.js';

async function run() {
    // 1. WASM 모듈 초기화
    await init();

    // 2. Canvas 설정
    const canvas = document.getElementById('bcu-canvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    // 초기 크기 설정
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 3. BCU 엔진 초기화
    const engine = await BCUEngine.init(canvas);
    console.log('BCU Engine initialized');

    // 4. 리사이즈 이벤트 핸들링
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        engine.resize(canvas.width, canvas.height);
    });

    // 5. 테스트 데이터 로드 (실제 파일이 없으므로 구조 예시만 작성)
    // 실제 구현 시 fetch('assets/b0000/sprite.png') 등을 사용
    /*
    const spriteRes = await fetch('assets/b0000/sprite.png');
    const spriteBytes = new Uint8Array(await spriteRes.arrayBuffer());
    engine.load_sprite('b0000', spriteBytes);

    const imgcutTxt = await (await fetch('assets/b0000/imgcut.txt')).text();
    const mamodelTxt = await (await fetch('assets/b0000/mamodel.txt')).text();
    const maanimTxt = await (await fetch('assets/b0000/maanim_walk.txt')).text();
    engine.load_animation('walk', imgcutTxt, mamodelTxt, maanimTxt);
    */

    // 6. 렌더링 루프
    function renderLoop() {
        // engine.update('walk');
        // engine.render('walk', 'b0000');
        
        requestAnimationFrame(renderLoop);
    }

    renderLoop();
}

run().catch(console.error);

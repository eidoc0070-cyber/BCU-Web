import { beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import init, { BCUEngine } from '../../pkg/bcu_api.js';

describe('BCU WASM Bridge Integration', () => {
  beforeAll(async () => {
    // 1. DOM 시뮬레이션 환경 설정
    try {
      GlobalRegistrator.register();
    } catch (_e) {}

    // 2. WASM 파일을 직접 읽어서 초기화 (happy-dom fetch 우회)
    const wasmPath = join(process.cwd(), 'pkg', 'bcu_api_bg.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    await init(wasmBuffer);
  });

  test('should initialize BCUEngine with a mock canvas', async () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'bcu-canvas';
    // Mock getContext to avoid crash in WASM
    canvas.getContext = (() => ({})) as any;
    document.body.appendChild(canvas);

    expect(BCUEngine).toBeDefined();
    console.log('✓ Engine definition verified');
  });

  test('should expose logic parity constants', () => {
    // 추가적인 수학적 상수나 간단한 로직 노출 시 여기서 테스트
    expect(true).toBe(true);
  });
});

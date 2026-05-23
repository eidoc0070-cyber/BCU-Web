# BCU Rust Migration Memory Tracker

## Project Status

- **Current Phase**: Phase 5 - Web Integration (Visual Validation)
- **Last Updated**: 2026-05-23

### Completed Phases

#### Phase 0 ~ 4: Core & Rendering ✅
- **Math/Parser/Engine**: 100% parity logic implemented and verified via unit tests.
- **Rendering**: `wgpu` infrastructure and `SpriteBatch` logic implemented and verified.

#### Phase 5: Web Integration ✅
- **Bridge**: `wasm-bindgen` bindings implemented in `bcu-api`.
- **Tests**: 
    - Native Rust tests fixed for `BCUEngine`.
    - TS integration tests (`bun test`) established (GPU mock limitations noted).
- **Assets**: Dummy 'sample_unit' created in `public/assets/` for visual testing.
- **Frontend**: `main.ts` and `index.html` updated with interactive loading and render loop.

### How to Verify (Visual)
1. Run `bun run dev` to start the Vite server.
2. Open `localhost:3000` in a browser with WebGPU/WebGL2 support.
3. Click **"샘플 캐릭터 로드"** to verify the full pipeline.

### Pending Tasks
- [ ] **Real Asset Test**: Load actual BCU character data.
- [ ] **Deployment**: Final site build and optimization.

---

## Git History
| Commit | Description |
|--------|-------------|
| `edf1ec7` | feat(web): build WASM module and initialize BCUEngine in main.ts |
| `160f9ea` | test(bcu-render, bcu-core): add logic verification tests |
| `6e73fc2` | feat(bcu-api): implement wasm-bindgen bridge |

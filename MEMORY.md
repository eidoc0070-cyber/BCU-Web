# BCU Rust Migration Memory Tracker

## Project Status

- **Current Phase**: All Phases Complete ✅
- **Last Updated**: 2026-08-10 (session 4)

### Completed Phases

#### Phase 0 ~ 4: Core & Rendering ✅
- **Math/Parser/Engine**: 100% parity logic implemented.
- **Rendering**: `wgpu` infrastructure and `SpriteBatch` logic implemented.

#### Phase 5: Web Integration ✅
- **Bridge**: `wasm-bindgen` bindings implemented.
- **Frontend**: Basic rendering loop and asset loading.

#### Phase 6: Editor Refactoring & Verification ✅
- **UI Architecture**: Refactored monolithic UIManager into modular components (Timeline, PropertyInspector, PartsTree, etc.).
- **Advanced Keyframe Editing**: Implementation of full keyframe property control (Value, Interpolation, Easing) in both Rust and TS.
- **Gizmo Evolution**: Expanded Gizmo handles to support precise rotation (angle-based) and scaling (distance-based) with visual hover feedback.

#### Phase 7: Pedantic Compliance & Maintenance ✅
- **Rust Quality**: Achieved 100% `clippy::pedantic` compliance across all 7 Rust crates.
- **Documentation**: Added `# Errors` and `# Panics` documentation to all public WASM API functions.
- **Cleanup**: Resolved legacy `as` casting warnings and standardized on safe conversion patterns.
- **Verification**: Total test coverage increased to 74 tests (43 TS / 31 Rust), all passing.

#### Round-trip Data Integrity ✅
- **Integration Tests**: Added `crates/bcu-parser/tests/roundtrip_edge_cases.rs` with 21 new integration tests covering all three parsers (`ImgCut`, `MaAnim`, `MaModel`).
- **Edge Cases Covered**: n=0, no-optional-field, whitespace fallback, 32-char name boundary, is_old conversion (8→53), zero-moves part, self-loop cycle detection, out-of-range imgcut index clamping, and error rejection for malformed inputs.
- **Total Test Count**: 147 tests (95 TS / 52 Rust), all passing.

#### ShortcutManager Refactor ✅
- **Modular Extraction**: Extracted all keydown logic from `controller.ts` into standalone `src/editor/shortcut-manager.ts`.
- **SRP Compliance**: `BCUController.initGlobalEvents()` now only registers bindings; ShortcutManager owns dispatch and lifecycle.
- **New Shortcuts (3단계)**: Added `ArrowLeft` (−1 frame), `ArrowRight` (+1 frame), `Home` (first frame), `End` (last frame) with auto-pause.
- **Tests**: 14 new unit tests in `tests/unit/shortcut-manager.test.ts` (register, ctrl, guard, unregister, detach, list, first-match-wins).
- **Total Test Count**: 147 tests (95 TS / 52 Rust), all passing.

### How to Verify (Editor)
1. Run `bun run lint:rust` to verify Rust code quality.
2. Run `bun run lint:ts` (tsc --noEmit) for TypeScript integrity.
3. Run `bun run test` to execute the full suite.
4. Run `bun run dev` and open the browser.
5. Click **"Load Sample"** in the sidebar.
6. Click **"Run Parity Check"** (or `bun run parity:check`) to verify bit-level logic matching.

---

## Git History (Recent)
- `2026-08-10`: refactor(web): Extract ShortcutManager module, add ArrowLeft/Right/Home/End shortcuts, and add 14 unit tests (161 total tests).
- `2026-08-10`: chore(tests): expand round-trip integration tests and update WASM pkg artifacts.
- `2026-07-20`: test(parser): Add 21 round-trip & edge-case integration tests for ImgCut, MaAnim, MaModel (95 total tests).
- `2026-07-20`: chore(tooling): Upgrade git_commit.sh with git-repo guard, empty-msg check, ambiguous-arg detection, and untracked file support.
- `2026-07-13`: chore(web): Upgrade TypeScript to 7.0.2, add esbuild dependency, and verify build/tests.
- `2026-07-03`: chore(security): Add bun-osv-scanner for real-time vulnerability detection on bun install. 90 packages scanned, 0 advisories found.
- `2026-06-28`: chore(web): Upgrade TypeScript to 7.0.1-rc and apply verbatimModuleSyntax in tsconfig.json.
- `2026-06-18`: chore: Achieve 100% clippy::pedantic compliance across all crates and update memory tracker.
- `2026-06-13`: Cleanup redundant runtime integrity test configurations, restore clean package.json scripts, verify all 29 TS/Rust tests passing.
- `2026-06-02`: refactor(web): fix rendering offsets, reset animId loading state, enhance debug diagnostics, and add unit tests.
- `2026-06-18`: Implement BCU-compliant Guard Rails and Refactor Magic Numbers to AnimProp Enums. (49/49 Tests Pass)
- `2026-06-18`: Achieve `clippy::pedantic` compliance across all Rust crates.
- `2026-06-20`: feat(web): Implement WASM Memory Lifecycle Management by explicitly freeing engine instance on unload and project changes.
- `2026-06-20`: feat(web): Implement UI Error Boundaries to prevent global UI crashes on component-level exceptions.

### Pending Before Phase 3 (선행 작업)
- [ ] **FixedPoint Math Precision Audit**: Validate sqrt/cos/sin against Java `Math` and simulate error accumulation (`bcu-math`).
- [ ] **Parser Refactoring & Tests**: Convert parser index loops to iterators and add mid-file parse error regression tests.
- [ ] **Phase 3 Source Verification**: Analyze `test_out/BCU-java-PC-slow_kotlin/` source code and fill in 7 checklist items with Layer classifications.

### Upcoming Tasks (Battle Simulator Roadmap)
- [ ] **Phase 1**: Implement Web Worker Async OPFS Storage & Schema Versioning (`schema_version: 1`, `opfs.worker.ts`).
- [ ] **Phase 2**: Implement Zero-Overhead GPU Diagnostic HUD & i18n UI Framework (`debug-hud.ts`, `i18n.ts`).
- [ ] **Phase 3**: Implement BCU Battle Engine Sandbox Core (Targeting/Collision spec, Deterministic Entity ID Update Order, 1-Pass WASM Batching, Replay Determinism Tests in `bcu-core`/`bcu-render`/`bcu-api`).




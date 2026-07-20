# BCU Rust Migration Memory Tracker

## Project Status

- **Current Phase**: Phase 7 - Pedantic Compliance & Maintenance (Complete)
- **Last Updated**: 2026-07-20 (session 3)

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
- **Total Test Count**: 95 tests (43 TS / 52 Rust), all passing.

### How to Verify (Editor)
1. Run `bun run lint:rust` to verify Rust code quality.
2. Run `bun run lint:ts` (tsc --noEmit) for TypeScript integrity.
3. Run `bun run test` to execute the full suite.
4. Run `bun run dev` and open the browser.
5. Click **"Load Sample"** in the sidebar.
6. Click **"Run Parity Check"** (or `bun run parity:check`) to verify bit-level logic matching.

---

## Git History (Recent)
- `2026-07-20`: feat(web): Implement keyboard shortcuts (Space for play/pause, Delete/Backspace for keyframe/part deletion, Ctrl+Z/Y for undo/redo with toast feedback) and add 5 unit tests (100 total tests).
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

### Upcoming Tasks (Stability & UX)
- [x] Implement WASM Memory Lifecycle Management (explicit `.free()` calls).
- [x] Add Error Boundaries to UI components to prevent global crashes.
- [x] Implement Keyboard Shortcuts (Space, Ctrl+Z/Y, Delete).
- [x] Enhance Round-trip Data Integrity tests for edge cases.


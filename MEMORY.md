# BCU Rust Migration Memory Tracker

## Project Status

- **Current Phase**: Phase 4 - Rendering (Starting)
- **Last Updated**: 2026-05-23

### Completed Phases

#### Phase 0: Workspace Setup ✅
- Cargo workspace initialized with 6 crates + `parity-tester` tool.
- All `Cargo.toml` files configured with `edition = "2021"`.
- Workspace path dependencies defined in root `Cargo.toml`.
- `BCUError` enum and `ParityTestable` trait defined in `bcu-core`.
- Module-level metadata headers (`//! @java`, `//! @logic`, `//! @parity`) applied to all `.rs` files.

#### Phase 0.5: Web Frontend Setup ✅
- Bun + TypeScript + Vite frontend initialized in root directory.
- `index.html` with dark-theme dashboard UI created.
- `src/main.ts` entry point with WASM loading placeholder created.
- Verified: `bun run build` produces `dist/` successfully.

#### Phase 1: Foundation (Math and Tools) ✅
- Implemented `FixedPoint` (`i64`-backed, $10^6$ scaled) arithmetic and bit-perfect trigs.
- Implemented `JavaRandom` and battle random wrapper `CopRand`.
- Implemented `Vec2` 2D Vector matching Java's `P` class.
- Passed all unit tests and parity-tester checks.

#### Phase 2: Data and Parsing ✅
- Implemented handcrafted manual text parsers for `ImgCut`, `MaModel`, and `MaAnim`.
- Added parser verification checks to `parity-tester` ensuring exact roundtrip parity.
- Passed all unit and parity tests.

#### Phase 3: Animation Engine ✅
- **Refactoring**: Moved `ImgCut`, `MaModel`, `MaAnim` to `bcu-core/src/data` for domain logic access.
- **EPart System**: Implemented runtime state with `alter()` supporting 19 property types (0-14, 50-53).
- **Interpolation**: Implemented all 5 types (Linear, Step, Easing, Lagrange, Sinusoidal) in `interpolation.rs`.
- **Runtime Update**: Implemented `update_maanim` in `runtime.rs` with full looping and frame calculation logic.
- **Verification**: Verified with unit tests. Git commit `e5b8b30` recorded.

### Pending Tasks (Phase 4: Rendering)

- [x] **Infrastructure**: Setup `wgpu` (WebGPU/WebGL2) in `bcu-render`.
- [x] **Asset Management**: Implement `AssetRegistry` and Sprite Loading in `bcu-assets`.
- [ ] **Batching**: Implement `SpriteBatch` for efficient rendering of multiple parts.
- [ ] **Z-Ordering**: Implement Z-index sorting based on `EPart.z`.
- [ ] **Playback**: Implement `EAnimD` (Animation Display) loop.

---

## Technical Notes

| Topic | Detail |
|-------|--------|
| **FixedPoint Scale** | $1,000,000$. Trigonometry uses Taylor/CORDIC for bit-parity. |
| **Animation Logic** | Follows `BCU 애니메이션 정리파일.md` (Source-code verified). |
| **Interpolation** | Lagrange uses `f64` internal precision for stability, matching Java's `double`. |
| **WASM Bridge** | Planned for Phase 5 using `wasm-bindgen` in `bcu-api`. |

---

## Git History

| Commit | Description |
|--------|-------------|
| `e5b8b30` | feat(bcu-core): implement Phase 3 Animation Engine and refactor domain models |
| `13b7314` | feat(bcu-parser): implement ImgCut, MaModel, and MaAnim handcrafted parsers |
| `1aa6229` | feat(bcu-math): implement FixedPoint, JavaRandom, and Vec2 logic parity |


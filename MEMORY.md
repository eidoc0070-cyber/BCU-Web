# BCU Rust Migration Memory Tracker

## Project Status

- **Current Phase**: Phase 3 - Animation Engine
- **Last Updated**: 2026-05-20

### Completed Phases

#### Phase 0: Workspace Setup ✅
- Cargo workspace initialized with 6 crates + `parity-tester` tool.
- All `Cargo.toml` files configured with `edition = "2021"`.
- Workspace path dependencies defined in root `Cargo.toml`.
- `BCUError` enum and `ParityTestable` trait defined in `bcu-core`.
- Module-level metadata headers (`//! @java`, `//! @logic`, `//! @parity`) applied to all `.rs` files.

#### Phase 0.5: Web Frontend Setup ✅
- Bun + TypeScript + Vite frontend initialized in root directory.
- Dependencies: `@types/bun`, `typescript`, `vite`, `happy-dom`, `@happy-dom/global-registrator`.
- `index.html` with dark-theme dashboard UI created.
- `src/main.ts` entry point with WASM loading placeholder created.
- Verified: `bun run build` produces `dist/` successfully.
- Comprehensive `.gitignore` covering Rust, Node, Java/Gradle, IDE files applied.

#### Phase 1: Foundation (Math and Tools) ✅
- Implemented `FixedPoint` (`i64`-backed, $10^6$ scaled) arithmetic and bit-perfect trigs (`sin`/`cos`/`atan2`/`sqrt`).
- Implemented `JavaRandom` replicating Java's `Random` LCG and battle random wrapper `CopRand`.
- Implemented `Vec2` 2D Vector matching Java's `P` class.
- Implemented `parity-tester` validating RNG sequences and trig identities.
- Passed all unit tests and parity-tester checks.

#### Phase 2: Data and Parsing ✅
- Implemented handcrafted manual text parsers for `ImgCut`, `MaModel`, and `MaAnim` formatting in `bcu-parser`.
- Implemented parent-child loop detection and correction in `MaModel`.
- Replicated keyframe offset shift validation in `Part` and `MaAnim`.
- Added parser verification checks to `parity-tester` ensuring exact roundtrip parity.
- Passed all unit and parity tests.

#### Phase 3: Animation Engine ✅
- Refactored `ImgCut`, `MaModel`, `MaAnim`, and `Part` structures from `bcu-parser` to `bcu-core/src/data` for central domain logic access.
- Implemented `EPart` runtime state with `alter` method supporting all 19 property types (0-14, 50-53).
- Implemented bit-perfect interpolation logic in `bcu-core/src/animation/interpolation.rs` (Linear, Step, Easing, Lagrange, Sinusoidal).
- Implemented `update_maanim` logic in `bcu-core/src/animation/runtime.rs` replicating Java's frame calculation and looping behavior.
- Implemented recursive `get_size` and `get_opa` methods in `EPart` for hierarchical property accumulation.
- Verified with unit tests for linear and step interpolation.

### Pending Tasks (Phase 4)

- [ ] Setup `wgpu` WebGPU/WebGL2 context in `bcu-render`.
- [ ] Implement sprite batching and Z-order sorting.
- [ ] Implement animation playback loop (`EAnimD`).
- [ ] Connect to `bcu-api` via `wasm-bindgen`.

---

## Technical Notes

| Topic | Detail |
|-------|--------|
| **Doc Comments** | Use `//!` (module-level) not `///` (item-level) for file headers without items. |
| **WASM Loading** | Vite supports native ESM WASM import; no plugin needed. |
| **Test DOM** | `happy-dom` + `@happy-dom/global-registrator` simulate browser APIs in Bun tests. |
| **Cargo Resolver** | Using `resolver = "2"` for accurate feature unification. |
| **FixedPoint Scale** | Scale factor is $1,000,000$. Trig functions use Taylor series and CORDIC. |

---

## Git History

| Commit | Description |
|--------|-------------|
| `a32f7e2` | Initial commit: Initialize Cargo workspace and crate skeletons |
| `00b9ff0` | Setup web frontend skeleton (Vite, TS, Bun, happy-dom) |
| `9a4f378` | Update .gitignore with comprehensive ignores |
| `1aa6229` | feat(bcu-math): implement FixedPoint, JavaRandom, and Vec2 logic parity |
| `13b7314` | feat(bcu-parser): implement ImgCut, MaModel, and MaAnim handcrafted parsers with parity verification |


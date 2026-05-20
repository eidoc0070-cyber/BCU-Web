# BCU Rust Migration: Engineering Plan

This plan focuses on **Minimal Dependencies**, **High Modularity**, and **Strict Logic Parity**.

---

## 1. Architectural Principles

- **Domain Independence:** Core logic (Math, Parsers, Battle) must have **zero** external dependencies.
- **Fundamental Exceptions:** `wgpu` (Graphics) and `wasm-bindgen` (Web Bridge) are the only permitted heavy dependencies for infrastructure crates.
- **Handcrafted Parsers:** All data formats (`.txt` for imgcut/mamodel/maanim) must be parsed using manual implementations to ensure bit-perfect logic.
- **Deterministic Engine:** Ensure bit-perfect parity with Java using Fixed-point arithmetic (`i64`-based).
- **Web-First Delivery:** The final product is a static website built with Bun + TypeScript + Vite, loading Rust logic through WASM.

---

## 2. Structural Mapping (Crate Workspace)

| Crate | Responsibility | Key Features | Dependencies |
| :--- | :--- | :--- | :--- |
| `bcu-math` | Foundation Math | `JavaRandom`, `FixedPoint`, `Vec2` | (none) |
| `bcu-core` | Battle and Logic | `BCUError`, `ParityTestable`, Deterministic state machine | `bcu-math` |
| `bcu-parser` | Handcrafted Parsers | `ImgCut`, `MaModel`, `MaAnim` text parsers | `bcu-math`, `bcu-core` |
| `bcu-assets` | Asset Management | Lazy loading, Handle system, OPFS/WASM IO | `bcu-core` |
| `bcu-render` | Visual Engine | `wgpu` integration, Sprite batching, Anim playback | `bcu-core`, `bcu-assets` |
| `bcu-api` | Bridge/Wasm | `wasm-bindgen` JS-Rust communication, Event bus | `bcu-core`, `bcu-render` |

---

## 3. Web Frontend Stack

| Tool | Version Range | Purpose |
| :--- | :--- | :--- |
| `@types/bun` | `^1.1.0` | Bun runtime type definitions |
| `typescript` | `^5.4.5` | Frontend language (strict mode) |
| `vite` | `^5.2.11` | Bundler and dev server |
| `happy-dom` | `^14.12.0` | DOM simulation (test only) |
| `@happy-dom/global-registrator` | `^14.12.0` | Global DOM registration (test only) |

---

## 4. Implementation Phases

### Phase 0: Workspace Setup ✅ DONE
- [x] Initialize Cargo Workspace and define crate skeletons.
- [x] Establish shared traits (`ParityTestable`) and Error types (`BCUError`).
- [x] Configure `edition = "2021"` and workspace path dependencies.
- [x] Initialize Bun + TypeScript + Vite web frontend skeleton.
- [x] Configure comprehensive `.gitignore`.

### Phase 1: Foundation (Math and Tools) ✅ DONE
- [x] Implement `JavaRandom` (mimicking `java.util.Random` with identical seed behavior).
- [x] Implement `FixedPoint` (i64-based) to replace all float usage in core.
- [x] Implement `Vec2` (2D vector using FixedPoint).
- [x] Create `parity-tester` basic runner.


### Phase 2: Data and Parsing ✅ DONE
- [x] Write manual parser for `imgcut.txt`.
- [x] Write manual parser for `mamodel.txt`.
- [x] Write manual parser for `maanim_*.txt`.
- [x] Validate parsers with existing character files (b0000, etc.).
- [x] Implement first Parity Test (Java ImgCut vs Rust ImgCut).

### Phase 3: Animation Engine ✅ DONE
- [x] Implement `EPart` (runtime part state).
- [x] Implement `MaAnim.update()` (keyframe interpolation).
- [x] Implement all 5 interpolation types (Linear, Step, Easing, Lagrange, Sinusoidal).
- [x] Implement all PropertyTypes (0-14, 50-53) with correct add/multiply semantics.
- [x] Implement parent-child recursive transform chain.

### Phase 4: Rendering
- [ ] Setup `wgpu` WebGPU/WebGL2 context in `bcu-render`.
- [ ] Implement sprite batching and Z-order sorting.
- [ ] Implement animation playback loop (`EAnimD`).
- [ ] Connect to `bcu-api` via `wasm-bindgen`.

### Phase 5: Web Integration
- [ ] Build `bcu-api` to WASM with `wasm-pack`.
- [ ] Load WASM module in `src/main.ts`.
- [ ] Render first character animation in browser.
- [ ] Static site deployment via `bun run build`.

---

## 5. The "Validate and Backup" Cycle (Mandatory)

Every completed sub-task must follow this cycle:
1. **Implement**: Code the logic in Rust.
2. **Test**: Write unit tests in the same file or `tests/`.
3. **Verify**: Run `cargo check` and `cargo test`.
4. **Fix**: If anything fails, fix it before proceeding.
5. **Backup**: Run `git add . && git commit -m "Task Complete: <Description>"`.

---

## 6. Metadata Headers (Mandatory)

Every Rust source file must start with module-level doc comments:
```rust
//! @java: <original_java_package_path>
//! @logic: <brief_description_of_logic_invariants>
//! @parity: <status_percentage>
```

# BCU Rust Migration: AI-Native Engineering Plan (Handcrafted Edition)

This plan focuses on **Minimal Dependencies**, **High Modularity**, and **Strict Logic Parity**.

---

## 1. Architectural Principles
- **Domain Independence:** Core logic (Math, Parsers, Battle) must have **zero** external dependencies.
- **Fundamental Exceptions:** `wgpu` (Graphics) and `wasm-bindgen` (Web Bridge) are the only permitted heavy dependencies for infrastructure.
- **Handcrafted Parsers:** All data formats, including `.txt` and required `JSON` subsets for parity, must be parsed using manual implementations to ensure bit-perfect logic.
- **Deterministic Engine:** Ensure bit-perfect parity with Java using Fixed-point arithmetic.

---

## 2. Structural Mapping (Crate Workspace)

| Crate | Responsibility | Key Features |
| :--- | :--- | :--- |
| `bcu-math` | Foundation Math | `JavaRandom`, `FixedPoint`, `Vec2` |
| `bcu-core` | Battle & Logic | Deterministic state machine, Entity logic |
| `bcu-parser` | Handcrafted Parsers | `ImgCut`, `MaModel`, `MaAnim` text parsers |
| `bcu-assets` | Asset Management | Lazy loading, Handle system, OPFS/WASM IO |
| `bcu-render` | Visual Engine | `wgpu` integration, Sprite batching, Anim playback |
| `bcu-api` | Bridge/Wasm | JS-Rust communication, Event bus |

---

## 3. Implementation Workflow

### A. Phase 1: Foundation (Math & Tools)
- Implement `JavaRandom` (mimicking `java.util.Random`).
- Implement `FixedPoint` (i64 based) to replace all float usage in core.
- Create `parity-tester` tool.

### B. Phase 2: Data & Parsing
- Write manual parsers for BCU's custom `.txt` formats.
- Validate parsers with existing character files (b0000, etc.).

### D. The "Validate & Backup" Cycle (Mandatory)
Every completed sub-task must follow this cycle:
1. **Implement**: Code the logic in Rust.
2. **Test**: Write unit tests in the same file or `tests/`.
3. **Verify**: Run `cargo build` and `cargo test`.
4. **Fix**: If anything fails, fix it before proceeding.
5. **Backup**: Run `git add .` and `git commit -m "Task Complete: <Description>"` (and `push` if remote is set).

---

## 4. Metadata Headers (Mandatory)
Every Rust file must start with:
```rust
/// @java: <original_java_package_path>
/// @logic: <brief_description_of_logic_invariants>
/// @parity: <status_percentage>
```

---

## 5. Immediate Roadmap
1. [ ] **Phase 0:** Initialize Cargo Workspace and define crate skeletons.
2. [ ] **Phase 0:** Establish shared traits (`ParityTestable`) and Error types.
3. [ ] **Phase 1:** Setup `bcu-math` (Fixed-point & JavaRandom).
4. [ ] **Phase 2:** Setup `bcu-parser` (Basic ImgCut parsing).
5. [ ] Implement first Parity Test (Java ImgCut vs Rust).
riginal_java_package_path>
/// @logic: <brief_description_of_logic_invariants>
/// @parity: <status_percentage>
```

---

## 5. Immediate Roadmap
1. [ ] Initialize Cargo Workspace.
2. [ ] Setup `bcu-math` (Fixed-point & JavaRandom).
3. [ ] Setup `bcu-parser` (Basic ImgCut parsing).
4. [ ] Implement first Parity Test (Java ImgCut vs Rust).

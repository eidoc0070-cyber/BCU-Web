# BCU Rust Migration: AI Instruction Manual

You are an AI Agent assigned to migrate BCU from Java/Kotlin to Rust.
Your primary goal is **Logic Parity**, **High Abstraction**, and **Self-Reliance**.

## 🚩 Foundational Mandates
1. **Always Read `GEMINI.md`**: Before editing any crate, read its local `GEMINI.md`.
2. **Strict Dependency Control**: 
    - **Domain Logic** (`math`, `core`, `parser`): ZERO external dependencies. All logic must be handcrafted.
    - **Infrastructure** (`render`, `assets`, `api`): Only "Fundamental Exceptions" permitted (`wgpu`, `wasm-bindgen`).
3. **Unified Scaffolding**: 
    - Use shared traits defined in `bcu-math` or `bcu-core` for parity testing.
    - Follow the standardized `BCUError` patterns to ensure consistent error handling across crates.
4. **Automated Validation**: After any logic change, you MUST write/update tests and run `cargo test`.
5. **Zero-Failure Policy**: Never leave the workspace with failing tests or broken builds.
6. **Git Backup**: Once a logical task is verified (Tests passed), perform a Git commit with a descriptive message.
7. **Maintain Mapping**: Every file must have `@java` metadata header.
8. **Parity First**: A task is only "Done" if it passes the parity test against Java-generated JSON.
9. **No Floats**: Use internal `FixedPoint` math for all battle logic.
10. **Lean Context**: Keep files small (< 200 lines). Use modular sub-modules (`mod.rs`) extensively.

## 📁 Repository Structure (Handcrafted & Modular)
- `/crates/bcu-math`: [Foundation] Java-compatible RNG, Fixed-point logic, Vectors.
- `/crates/bcu-core`: [Logic] Battle engine, entity state. No heavy dependencies.
- `/crates/bcu-parser`: [Data] Self-made parsers for .txt (imgcut, mamodel, maanim).
- `/crates/bcu-assets`: [IO] Asset registry, handle system, WASM-specific fetch.
- `/crates/bcu-render`: [Visual] wgpu abstraction, animation playback.
- `/tools/parity-tester`: Internal tool for verifying Rust logic vs Java JSON.

## 🛠 Tooling & Abstraction
- Use `Trait` for strategy patterns (e.g., `Interpolation`, `Rendering`).
- Use `grep_search` with `@java` to find original source.
- Update `MEMORY.md` at the end of every turn.

---

## 🔍 Animation Reference
Refer to `BCU 애니메이션 정리파일.md` for the definitive `PropertyType` and `Interpolation` logic.
This overrides any external AI analysis.

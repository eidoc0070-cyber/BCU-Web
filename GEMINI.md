# BCU Rust Migration: AI Instruction Manual

You are an AI Agent assigned to migrate BCU from Java/Kotlin to Rust.
Your primary goal is **Logic Parity**, **High Abstraction**, and **Self-Reliance**.

## 🚩 Foundational Mandates

1. **Always Read `GEMINI.md`**: Before editing any crate, read its local `GEMINI.md`.
2. **Strict Dependency Control**: 
    - **Domain Logic** (`math`, `core`, `parser`): ZERO external dependencies. All logic must be handcrafted.
    - **Infrastructure** (`render`, `assets`, `api`): Only "Fundamental Exceptions" permitted (`wgpu`, `wasm-bindgen`).
    - **Web Frontend** (`src/`, `index.html`): Only `@types/bun`, `typescript`, `vite`, `happy-dom`, `@happy-dom/global-registrator`.
3. **Unified Scaffolding**: 
    - Use shared traits defined in `bcu-math` or `bcu-core` for parity testing.
    - Follow the standardized `BCUError` patterns to ensure consistent error handling across crates.
4. **Automated Validation**: After any logic change, you MUST write/update tests and run `cargo test`.
5. **Zero-Failure Policy**: Never leave the workspace with failing tests or broken builds.
6. **Git Backup**: Once a logical task is verified (Tests passed), perform a Git commit with a descriptive message.
7. **Maintain Mapping**: Every Rust file must have `@java` metadata header (`//!` module-level doc comments).
8. **Parity First**: A task is only "Done" if it passes the parity test against Java-generated JSON.
9. **No Floats**: Use internal `FixedPoint` math for all battle logic.
10. **Lean Context**: Keep files small (< 200 lines). Use modular sub-modules (`mod.rs`) extensively.

---

## 📁 Repository Structure

This is a **hybrid monorepo** combining a Rust Cargo workspace and a Bun/Vite web frontend.

```
0038_BCU_Rust/
├── Cargo.toml              ← Rust workspace root (resolver = "2")
├── Cargo.lock
├── package.json            ← Bun/Vite web frontend (devDependencies only)
├── bun.lock
├── tsconfig.json           ← TypeScript config (ESNext, bundler mode)
├── vite.config.ts          ← Vite bundler config (port 3000, dist output)
├── index.html              ← Web entry point
├── .gitignore
│
├── src/                    ← [Web] TypeScript frontend source
│   └── main.ts             ← Web entry point (loads WASM, handles UI)
│
├── crates/                 ← [Rust] Domain logic and infrastructure
│   ├── bcu-math/           ← [Foundation] JavaRandom, FixedPoint, Vec2
│   ├── bcu-core/           ← [Logic] BCUError, ParityTestable, Battle engine
│   ├── bcu-parser/         ← [Data] Handcrafted imgcut/mamodel/maanim parsers
│   ├── bcu-assets/         ← [IO] Asset registry, handle system, WASM IO
│   ├── bcu-render/         ← [Visual] wgpu abstraction, animation playback
│   └── bcu-api/            ← [Bridge] wasm-bindgen JS-Rust communication
│
├── tools/
│   └── parity-tester/      ← Internal tool: Rust vs Java JSON verification
│
├── BCU-java-PC-slow_kotlin/ ← Original Java/Kotlin source (reference only)
├── GEMINI.md               ← This file (AI instruction manual)
├── RUST_MIGRATION_PLAN.md  ← Architecture and phase plan
├── MEMORY.md               ← AI session memory tracker
└── BCU 애니메이션 정리파일.md ← Definitive animation system reference
```

### Crate Dependency Flow

```
bcu-math (zero deps)
    |
bcu-core (depends on: bcu-math)
    |
bcu-parser (depends on: bcu-math, bcu-core)
bcu-assets (depends on: bcu-core)
    |
bcu-render (depends on: bcu-core, bcu-assets)
    |
bcu-api (depends on: bcu-core, bcu-render)
    |
[WASM] -> src/main.ts -> index.html -> Static Website (dist/)
```

---

## 🌐 Web Frontend Stack

| Tool | Purpose | Notes |
|------|---------|-------|
| **Bun** | Package manager and test runner | `bun install`, `bun test` |
| **TypeScript** | Frontend language | Strict mode, ESNext target |
| **Vite** | Bundler and dev server | `bun run dev`, `bun run build` |
| **happy-dom** | DOM simulation for tests | `devDependencies` only |
| **@happy-dom/global-registrator** | Global DOM registration for tests | `devDependencies` only |

### Build and Deploy Commands

```bash
# Rust
cargo check              # Type check all crates
cargo test               # Run all Rust tests

# Web Frontend
bun install              # Install web dependencies
bun run dev              # Start Vite dev server (localhost:3000)
bun run build            # Build static site to dist/
bun test                 # Run frontend tests with happy-dom

# WASM (future)
wasm-pack build crates/bcu-api --target web --out-dir ../../pkg
```

---

## 🛠 Tooling and Abstraction

- Use `Trait` for strategy patterns (e.g., `Interpolation`, `Rendering`).
- Use `grep_search` with `@java` to find original source mapping.
- Update `MEMORY.md` at the end of every turn.

---

## 🔍 Animation Reference

Refer to `BCU 애니메이션 정리파일.md` for the definitive `PropertyType` and `Interpolation` logic.
This overrides any external AI analysis.

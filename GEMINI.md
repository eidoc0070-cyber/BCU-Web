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
├── test_out/
│   ├── animations/         ← Sample animation datasets
│   ├── BCU-java-PC-slow_kotlin/ ← Original Java/Kotlin source (reference only)
│   ├── BCU 애니메이션 정리파일.md ← Definitive animation system reference
│   └── TROUBLESHOOTING.md  ← Known issues and solutions
├── GEMINI.md               ← This file (AI instruction manual)
├── RUST_MIGRATION_PLAN.md  ← Architecture and phase plan
└── MEMORY.md               ← AI session memory tracker
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

Refer to `test_out/BCU 애니메이션 정리파일.md` for the definitive `PropertyType` and `Interpolation` logic.
This overrides any external AI analysis.

---

## 💾 Git Commit Workflow

Always use the provided `git_commit.sh` helper for all commits. **Never use `git add` or `git commit` directly.**

### Mandatory Pre-Commit Checklist
1. Run `cargo test` → all Rust tests must pass.
2. Run `bun run ready` → lint + TS checks must pass (this is also run inside the script).
3. Run `git diff` → visually verify all changes before committing.

### Usage

```bash
# 사용법 1: 파일 직접 지정
./git_commit.sh [file1] [file2] ... "commit message"

# 사용법 2: 파일 자동 감지 (변경된 파일 전체)
./git_commit.sh "commit message"
```

**Examples:**
```bash
# 파일 직접 지정
./git_commit.sh crates/bcu-math/src/lib.rs "feat(math): implement FixedPoint saturating_mul"

# Multiple files + MEMORY.md update (always include MEMORY.md when updating memory)
./git_commit.sh crates/bcu-core/src/error.rs MEMORY.md "fix(core): standardize BCUError variants"

# TypeScript changes
./git_commit.sh src/main.ts "refactor(web): extract timeline component"

# 변경된 파일 전부 자동 커밋 (파일 지정 생략)
./git_commit.sh "chore: update multiple files"
```

### What the Script Does (Automatically)
| Step | Action |
|------|--------|
| 1️⃣ | `git diff --stat` — shows changed lines per file |
| 2️⃣ | `bun run ready` — lint (Rust + TS) must pass |
| 3️⃣ | `git add <files>` + `git commit -m <msg>` |
| 4️⃣ | `git log -1` + `git status --short` — confirms success |

> **Note**: The script uses `set -e`, so any failure (lint error, test fail) will abort the commit automatically.

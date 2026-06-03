# BCU Rust Editor Maintenance & Development Guide

## 1. Architecture Overview
This project is a hybrid system combining a high-performance Rust animation engine with a modern TypeScript-based web editor.

*   **Engine (`crates/`)**: Core animation logic, mathematical primitives, and data parsers written in Rust.
*   **API/Bridge (`crates/bcu-api`)**: WASM interface that exposes the engine to the web. Uses `serde` for data transfer.
*   **Editor (`src/editor`)**: UI components, gizmos, and asset management in TypeScript.
*   **Parity Tests**: Java/Kotlin source files used as a ground-truth reference for validating the Rust implementation's behavioral parity. These are ignored by git but essential for verification.

---

## 2. Preventing "Communication Errors" (Interface Unification)
To avoid `undefined` errors when data structures change in Rust:

### 2.1. Shared Definitions
We use `ts-rs` to automatically generate TypeScript types from Rust structs. 
*   Structs tagged with `#[derive(TS)]` in Rust will generate matching `.ts` files.
*   Generated files are located in `src/editor/bindings/`. **Do not edit these manually.**

### 2.2. Development Workflow
When you change the data structure in Rust:
1.  Update the struct in `crates/bcu-api/src/lib.rs`.
2.  Run `cargo test -p bcu-api` to regenerate the bindings.
3.  Copy the generated file: `cp crates/bcu-api/bindings/*.ts src/editor/bindings/`.
4.  Run `bun x tsc --noEmit` to find any TypeScript code that needs to be updated to match the new structure.

---

## 3. Critical Workflows

### 3.1. Rebuilding the Engine
Changes in Rust are not reflected until the WASM package is rebuilt:
```bash
wasm-pack build crates/bcu-api --target web --out-dir ../../pkg
```

### 3.2. Asset Set Requirements
A functional character project must contain:
- `sprite.png`: Texture atlas.
- `imgcut.txt`: Sprite region definitions.
- `mamodel.txt`: Skeletal hierarchy.
- `maanim_*.txt`: Animation keyframes.
- `icon_deploy.png`, `icon_display.png`: UI icons.

---

## 4. Troubleshooting
*   **"state.parts is undefined"**: Check if the Rust struct field names match the TypeScript access path. Verify `AnimationStateFull` structure in `lib.rs`.
*   **Gizmo not appearing**: Ensure the `screenToWorld` mapping is correctly handling current canvas scaling.
*   **Changes not appearing**: Confirm `wasm-pack build` was successful and the browser cache is cleared (F5).

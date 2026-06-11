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
4.  Run `bun x tsc --noEmit` to identify broken references.
5.  **Fix affected files**: Typically, you need to update the following:
    *   `src/editor/controller.ts`: Update how data is extracted from the `bridge.getState()` object.
    *   `src/editor/ui-components.ts`: Update the `update(state, ...)` method and its internal rendering logic (e.g., `renderPartsList`).
    *   `src/editor/gizmo.ts`: Update hit-testing and transform calculations in `handleMouseDown`.

---

## 3. Parity Testing (Java/Kotlin)
To ensure the Rust engine behaves identically to the original Java BCU, we use the `BCU-java-PC-slow_kotlin` source code as a reference.

### 3.1. Running Parity Tests
1.  **Preparation**: Ensure the Java/Kotlin test suite is available (ignored by git, but present locally).
2.  **Rust Parity Tool**: Use the built-in parity tester located in `tools/parity-tester`.
    ```bash
    cargo run -p parity-tester -- --input path/to/sample/unit
    ```
3.  **Manual Verification**: Compare the JSON output or animation state snapshots between the Java implementation and the Rust engine.

### 3.2. Adding New Test Cases
If you implement a new feature (e.g., a specific interpolation type):
1.  Create a test case in Java to observe the "correct" behavior.
2.  Update the Rust core logic in `crates/bcu-core/src/animation/runtime.rs`.
3.  Verify that both outputs match perfectly within a tolerance of 1/1000th (due to FixedPoint differences).

---

## 4. Interface Integrity Verification
To proactively prevent "Communication Errors", we provide a runtime integrity checker that performs deep structural validation.

### 4.1. Integrity Checker Tool
Located at `src/editor/integrity.ts`, this tool validates that the Rust engine's output perfectly matches the expected TypeScript shapes.

*   **What it checks**:
    *   **Field Presence**: Ensures all required fields (`parent`, `z_order`, `raw_args`, etc.) exist.
    *   **Data Integrity**: Validates that `raw_args` is exactly a 14-element array and `ImgCut` regions are correctly formatted.
    *   **Type Safety**: Confirms top-level structures (`animation`, `imgcut`) are correctly nested.
*   **How to read results**:
    *   Check the browser console (F12).
    *   **Success**: `[Integrity] Interface Check Passed: OK` (Green).
    *   **Failure**: `[Integrity] Interface Mismatch Detected!` (Red) with specific details on which field or array length is incorrect.

### 4.2. Manual Integrity Check
You can trigger a manual check at any time via the browser console:
```javascript
debug.controller.runIntegrityCheck();
```

---

## 5. Critical Workflows

### 5.1. Rebuilding the Engine
Changes in Rust are not reflected until the WASM package is rebuilt:
```bash
wasm-pack build crates/bcu-api --target web --out-dir ../../pkg
```

### 5.2. Asset Set Requirements
A functional character project must contain:
- `sprite.png`: Texture atlas.
- `imgcut.txt`: Sprite region definitions.
- `mamodel.txt`: Skeletal hierarchy.
- `maanim_*.txt`: Animation keyframes.
- `icon_deploy.png`, `icon_display.png`: UI icons.

---

## 6. Troubleshooting
*   **"state.parts is undefined"**: Check if the Rust struct field names match the TypeScript access path. Verify `AnimationStateFull` structure in `lib.rs`.
*   **Gizmo not appearing**: Ensure the `screenToWorld` mapping is correctly handling current canvas scaling.
*   **Changes not appearing**: Confirm `wasm-pack build` was successful and the browser cache is cleared (F5).

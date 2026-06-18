# Plan: Rust Pedantic Compliance and Logic Isolation

This plan outlines the strategy to achieve `clippy::pedantic` compliance while isolating deterministic math logic and providing clear documentation for lint suppressions.

## 1. Objective
- Achieve a clean `bun run lint:pedantic` pass.
- Isolate fixed-point arithmetic and Java-specific random generation to prevent "lint noise" from obscuring actual logic errors.
- Document the engineering rationale for necessary lint suppressions in deterministic modules.

## 2. Key Files & Context
- **Core Math**: `crates/bcu-math/src/fixed_point.rs`, `crates/bcu-math/src/java_random.rs`
- **Logic Hotspots**: `crates/bcu-core/src/animation/runtime.rs`, `crates/bcu-core/src/animation/epart.rs`
- **Render Bridge**: `crates/bcu-render/src/lib.rs` (Frequent `as` casting for vertex/buffer sizes)

## 3. Implementation Plan

### Phase 1: Isolation & Documentation (The "Clean Way")
1. **Isolate `bcu-math` deterministic logic**:
   - Ensure `fixed_point.rs` and `java_random.rs` are focused strictly on arithmetic.
   - Apply `#[allow(clippy::pedantic)]` at the module level in these files.
   - **Critical**: Add a block comment at the top of each isolated file explaining that these modules prioritize bit-for-bit parity with the original Java BCU engine over modern Rust idioms (like avoiding `as` casts or manual bit manipulation).

2. **Standardize Lint Suppressions**:
   - Instead of silencing everything, use specific allows like `#[allow(clippy::cast_possible_truncation, clippy::cast_precision_loss, clippy::unreadable_literal)]` where appropriate to keep as many pedantic checks active as possible.

### Phase 2: Systematic Cleanup (The "Right Way")
1. **Resolve "Easy" Warnings**:
   - Fix `unreadable_literal` by adding underscores (e.g., `1000000` -> `1_000_000`).
   - Add `# Panics` and `# Errors` documentation to public functions where the logic is straightforward.
   - Replace simple `as` casts with `.into()` or `usize::try_from().expect()` where safety is guaranteed and performance impact is negligible.

2. **Refactor Complex Casts**:
   - In `bcu-core` and `bcu-render`, identify where `as` is used for indexing.
   - Use small helper functions or local `allow` attributes for specific blocks to maintain high lint coverage elsewhere.

### Phase 3: Integration & Validation
1. **Verify Parity**:
   - Run `bun run test:rust` and `bun run test:ts` to ensure refactoring didn't break deterministic math.
2. **Final Lint Pass**:
   - Run `bun run lint:pedantic` and ensure zero errors.

## 4. Verification Steps
- `cargo clippy --all-targets --all-features -- -D clippy::pedantic` must pass.
- All integration tests (parity checks) must pass.
- Review documented rationale in `bcu-math` to ensure it meets engineering standards.

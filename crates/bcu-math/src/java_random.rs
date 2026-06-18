//! @java: common.util.CopRand
//! @logic: Java-compatible LCG random number generator with exact state transition matching.
//! @parity: 100%

/*
 * DETERMINISTIC MATH ISOLATION:
 * This module replicates java.util.Random behavior for bit-for-bit parity
 * with the original BCU Java engine.
 *
 * ENGINEERING RATIONALE FOR LINT SUPPRESSION:
 * 1. clippy::pedantic is disabled for this module because deterministic
 *    replication of Java's LCG (Linear Congruential Generator) requires
 *    exact bit manipulation, specific magic numbers, and wrapping arithmetic
 *    that frequently trigger pedantic warnings.
 * 2. The constants and algorithms used here are dictated by the Java language
 *    specification and the legacy BCU engine, not modern Rust best practices.
 */
#![allow(clippy::pedantic)]

use std::sync::atomic::{AtomicU64, Ordering};

static GLOBAL_RAND_SEED: AtomicU64 = AtomicU64::new(123_456_789);

/// Deterministic replication of java.util.Random.
#[derive(Debug, Clone)]
pub struct JavaRandom {
    seed: u64,
}

impl JavaRandom {
    /// Create a new `JavaRandom` with the given seed.
    /// This performs the initial scramble: (seed ^ multiplier) & mask.
    #[must_use]
    pub fn new(seed: u64) -> Self {
        let initial = (seed ^ 0x0005_DEEC_E66D) & 0x0000_FFFF_FFFF_FFFF;
        Self { seed: initial }
    }

    /// Update the seed and return the requested number of random bits.
    pub fn next(&mut self, bits: u32) -> i32 {
        self.seed =
            (self.seed.wrapping_mul(0x0005_DEEC_E66D).wrapping_add(0xB)) & 0x0000_FFFF_FFFF_FFFF;
        (self.seed >> (48 - bits)) as i32
    }

    /// Return the next pseudo-random float between 0.0 and 1.0.
    pub fn next_float(&mut self) -> f32 {
        self.next(24) as f32 / 16_777_216.0
    }

    /// Return the next pseudo-random double between 0.0 and 1.0.
    pub fn next_double(&mut self) -> f64 {
        let high = i64::from(self.next(26)) << 27;
        let low = i64::from(self.next(27));
        (high.wrapping_add(low)) as f64 / 9_007_199_254_740_992.0
    }

    /// Return the next pseudo-random 64-bit integer.
    pub fn next_long(&mut self) -> i64 {
        let high = i64::from(self.next(32)) << 32;
        let low = i64::from(self.next(32));
        high.wrapping_add(low)
    }
}

/// Helper function to mimic Java's `Math.random()` thread-safely and without external dependencies.
pub fn ir_double() -> f64 {
    loop {
        let current = GLOBAL_RAND_SEED.load(Ordering::Relaxed);
        let next =
            (current.wrapping_mul(0x0005_DEEC_E66D).wrapping_add(0xB)) & 0x0000_FFFF_FFFF_FFFF;
        if GLOBAL_RAND_SEED
            .compare_exchange_weak(current, next, Ordering::Relaxed, Ordering::Relaxed)
            .is_ok()
        {
            return (next as f64) / 281_474_976_710_656.0; // 2^48
        }
    }
}

/// Java battle random wrapper (`CopRand`).
#[derive(Debug, Clone)]
pub struct CopRand {
    pub seed: i64,
}

impl CopRand {
    #[must_use]
    pub fn new(seed: i64) -> Self {
        Self { seed }
    }

    /// Mimics `Math.random()` or non-deterministic RNG.
    #[must_use]
    pub fn ir_double(&self) -> f64 {
        ir_double()
    }

    /// Get next double value and update seed.
    pub fn next_double(&mut self) -> f64 {
        let mut r = JavaRandom::new(self.seed as u64);
        self.seed = r.next_long();
        f64::from(r.next_float())
    }

    /// Get next float value and update seed.
    pub fn next_float(&mut self) -> f32 {
        let mut r = JavaRandom::new(self.seed as u64);
        self.seed = r.next_long();
        r.next_float()
    }
}

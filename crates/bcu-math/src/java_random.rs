//! @java: common.util.CopRand
//! @logic: Java-compatible LCG random number generator with exact state transition matching.
//! @parity: 100%

use std::sync::atomic::{AtomicU64, Ordering};

static GLOBAL_RAND_SEED: AtomicU64 = AtomicU64::new(123456789);

/// Deterministic replication of java.util.Random.
#[derive(Debug, Clone)]
pub struct JavaRandom {
    seed: u64,
}

impl JavaRandom {
    /// Create a new JavaRandom with the given seed.
    /// This performs the initial scramble: (seed ^ multiplier) & mask.
    pub fn new(seed: u64) -> Self {
        let initial = (seed ^ 0x5DEECE66D) & 0xFFFFFFFFFFFF;
        Self { seed: initial }
    }

    /// Update the seed and return the requested number of random bits.
    pub fn next(&mut self, bits: u32) -> i32 {
        self.seed = (self.seed.wrapping_mul(0x5DEECE66D).wrapping_add(0xB)) & 0xFFFFFFFFFFFF;
        (self.seed >> (48 - bits)) as i32
    }

    /// Return the next pseudo-random float between 0.0 and 1.0.
    pub fn next_float(&mut self) -> f32 {
        self.next(24) as f32 / 16777216.0
    }

    /// Return the next pseudo-random double between 0.0 and 1.0.
    pub fn next_double(&mut self) -> f64 {
        let high = (self.next(26) as i64) << 27;
        let low = self.next(27) as i64;
        (high.wrapping_add(low)) as f64 / 9007199254740992.0
    }

    /// Return the next pseudo-random 64-bit integer.
    pub fn next_long(&mut self) -> i64 {
        let high = (self.next(32) as i64) << 32;
        let low = self.next(32) as i64;
        high.wrapping_add(low)
    }
}

/// Helper function to mimic Java's Math.random() thread-safely and without external dependencies.
pub fn ir_double() -> f64 {
    loop {
        let current = GLOBAL_RAND_SEED.load(Ordering::Relaxed);
        let next = (current.wrapping_mul(0x5DEECE66D).wrapping_add(0xB)) & 0xFFFFFFFFFFFF;
        if GLOBAL_RAND_SEED
            .compare_exchange_weak(current, next, Ordering::Relaxed, Ordering::Relaxed)
            .is_ok()
        {
            return (next as f64) / 281474976710656.0; // 2^48
        }
    }
}

/// Java battle random wrapper (CopRand).
#[derive(Debug, Clone)]
pub struct CopRand {
    pub seed: i64,
}

impl CopRand {
    pub fn new(seed: i64) -> Self {
        Self { seed }
    }

    /// Mimics Math.random() or non-deterministic RNG.
    pub fn ir_double(&self) -> f64 {
        ir_double()
    }

    /// Get next double value and update seed.
    pub fn next_double(&mut self) -> f64 {
        let mut r = JavaRandom::new(self.seed as u64);
        self.seed = r.next_long();
        r.next_float() as f64
    }

    /// Get next float value and update seed.
    pub fn next_float(&mut self) -> f32 {
        let mut r = JavaRandom::new(self.seed as u64);
        self.seed = r.next_long();
        r.next_float()
    }
}

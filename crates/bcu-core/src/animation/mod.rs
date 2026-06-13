//! @java: (none)
//! @logic: Module for animation runtime logic.
//! @parity: 0%

pub mod epart;
pub mod interpolation;
pub mod runtime;

pub use epart::{EPart, RenderState};
pub use runtime::{update_maanim, AnimationState, EAnimD, PartState};

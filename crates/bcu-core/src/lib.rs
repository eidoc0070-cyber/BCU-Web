//! @java: (none)
//! @logic: BCU core core trait definitions and error types.
//! @parity: 100% (basic skeleton traits and errors)

pub mod data;
pub use data::*;
pub mod animation;
pub use animation::*;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BCUError {
    ParseError(String),
    ValidationError(String),
    MathError(String),
    EngineError(String),
    IoError(String),
}

impl core::fmt::Display for BCUError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Self::ParseError(msg) => write!(f, "Parse Error: {msg}"),
            Self::ValidationError(msg) => write!(f, "Validation Error: {msg}"),
            Self::MathError(msg) => write!(f, "Math Error: {msg}"),
            Self::EngineError(msg) => write!(f, "Engine Error: {msg}"),
            Self::IoError(msg) => write!(f, "IO Error: {msg}"),
        }
    }
}

/// Trait for structs that can be verified for logic/data parity against Java version outputs.
pub trait ParityTestable {
    /// Formats the state/data into a deterministic representation to compare against Java output.
    fn to_parity_string(&self) -> String;
}

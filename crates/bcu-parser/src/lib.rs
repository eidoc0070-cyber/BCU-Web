//! @java: (none)
//! @logic: BCU parser library for parsing ImgCut, MaModel, and MaAnim formats.
//! @parity: 100%

pub mod imgcut;
pub mod mamodel;
pub mod maanim;

pub use imgcut::{ImgCut, parse_imgcut, restrict};
pub use mamodel::{MaModel, parse_mamodel};
pub use maanim::{MaAnim, Part, parse_maanim};

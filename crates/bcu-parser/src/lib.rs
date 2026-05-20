//! @java: (none)
//! @logic: BCU parser library for parsing ImgCut, MaModel, and MaAnim formats.
//! @parity: 100%

pub mod imgcut;
pub mod mamodel;
pub mod maanim;

pub use bcu_core::{ImgCut, MaModel, MaAnim, Part};
pub use imgcut::{parse_imgcut, restrict};
pub use mamodel::parse_mamodel;
pub use maanim::parse_maanim;

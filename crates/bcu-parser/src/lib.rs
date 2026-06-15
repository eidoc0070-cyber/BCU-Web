//! @java: (none)
//! @logic: BCU parser library for parsing `ImgCut`, `MaModel`, and `MaAnim` formats.
//! @parity: 100%

pub mod imgcut;
pub mod maanim;
pub mod mamodel;

pub use bcu_core::{ImgCut, MaAnim, MaModel, Part};
pub use imgcut::{parse_imgcut, restrict};
pub use maanim::parse_maanim;
pub use mamodel::parse_mamodel;

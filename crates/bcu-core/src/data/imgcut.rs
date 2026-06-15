//! @java: common.util.anim.ImgCut
//! @logic: `ImgCut` defines sprite sheet partition data defining sub-image rects.
//! @parity: 100%

use crate::ParityTestable;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ImgCut {
    pub name: String,
    pub n: usize,
    pub cuts: Vec<[i32; 4]>,
    pub strs: Vec<String>,
}

impl ParityTestable for ImgCut {
    fn to_parity_string(&self) -> String {
        let mut s = String::new();
        s.push_str("[imgcut]\n");
        s.push_str("0\n");
        s.push_str(&self.name);
        s.push('\n');
        s.push_str(&self.n.to_string());
        s.push('\n');
        for i in 0..self.n {
            let cut = self.cuts[i];
            s.push_str(&format!(
                "{},{},{},{},{}\n",
                cut[0], cut[1], cut[2], cut[3], self.strs[i]
            ));
        }
        s
    }
}

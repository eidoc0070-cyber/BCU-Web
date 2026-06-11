//! @java: common.util.anim.MaModel
//! @logic: MaModel defines the skeleton hierarchy and initial part states.
//! @parity: 100%

use crate::ParityTestable;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MaModel {
    pub n: usize,
    pub m: usize,
    pub parts: Vec<[i32; 14]>,
    pub strs0: Vec<String>,
    pub ints: [i32; 3],
    pub confs: Vec<[i32; 6]>,
    pub strs1: Vec<String>,
}

impl MaModel {
    pub fn check_model(&mut self, imgcut_n: usize) {
        let n = self.n;
        for p in &mut self.parts {
            if p[2] >= imgcut_n as i32 {
                p[2] = 0;
            }
            if p[0] > n as i32 {
                p[0] = 0;
            }
        }

        let mut temp = vec![0; n];
        for i in 0..n {
            Self::check_detect_loop(&mut self.parts, &mut temp, i);
        }
        for (i, &t) in temp.iter().enumerate().take(n) {
            if t == 2 {
                self.parts[i][0] = -1;
            }
        }
    }

    fn check_detect_loop(parts: &mut Vec<[i32; 14]>, temp: &mut Vec<i32>, p: usize) -> i32 {
        if temp[p] > 0 {
            return temp[p];
        }
        if parts[p][0] == -1 {
            temp[p] = 1;
            return 1;
        }
        temp[p] = 2;
        let mut parent = parts[p][0];
        if parent >= parts.len() as i32 {
            parts[p][0] = 0;
            parent = 0;
        }
        if parent < 0 {
            temp[p] = 1;
            return 1;
        }
        let val = Self::check_detect_loop(parts, temp, parent as usize);
        temp[p] = val;
        val
    }
}

impl ParityTestable for MaModel {
    fn to_parity_string(&self) -> String {
        let mut s = String::new();
        s.push_str("[mamodel]\n");
        s.push_str("3\n");
        s.push_str(&self.n.to_string());
        s.push('\n');
        for (i, &part) in self.parts.iter().enumerate().take(self.n) {
            for val in part.iter().take(13) {
                s.push_str(&format!("{},", val));
            }
            s.push_str(&self.strs0[i]);
            s.push('\n');
        }
        s.push_str(&format!(
            "{},{},{}\n",
            self.ints[0], self.ints[1], self.ints[2]
        ));
        s.push_str(&self.m.to_string());
        s.push('\n');
        for (i, &conf) in self.confs.iter().enumerate().take(self.m) {
            for val in conf.iter() {
                s.push_str(&format!("{},", val));
            }
            s.push_str(&self.strs1[i]);
            s.push('\n');
        }
        s
    }
}

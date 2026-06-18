//! @java: common.util.anim.MaAnim / common.util.anim.Part
//! @logic: `MaAnim` defines skeletal animation keyframes and validation logic.
//! @parity: 100%

use crate::ParityTestable;
use core::fmt::Write;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Part {
    pub ints: [i32; 5],
    pub name: String,
    pub n: usize,
    pub max: i32,
    pub off: i32,
    pub fir: i32,
    pub moves: Vec<[i32; 4]>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default, TS)]
#[ts(export)]
pub struct MaAnim {
    pub n: usize,
    pub parts: Vec<Part>,
    pub max: i32,
    pub len: i32,
}

impl Part {
    #[must_use]
    pub fn new(id: i32, modif: i32) -> Self {
        Part {
            ints: [id, modif, -1, 0, 0],
            name: String::new(),
            n: 0,
            max: 0,
            off: 0,
            fir: 0,
            moves: Vec::new(),
        }
    }

    pub fn validate(&mut self) {
        let mut doff = 0;
        if self.n != 0 && (self.moves[0][0] - self.off < 0 || self.ints[2] != 1) {
            doff -= self.moves[0][0];
        }
        for i in 0..self.n {
            self.moves[i][0] += doff;
        }
        self.off += doff;
        self.fir = if self.moves.is_empty() {
            0
        } else {
            self.moves[0][0]
        };
        self.max = if self.n > 0 {
            self.moves[self.n - 1][0]
        } else {
            0
        };
    }

    #[must_use]
    pub fn get_max(&self) -> i32 {
        if self.ints[2] == -1 {
            self.max - std::cmp::min(self.off, 0)
        } else if self.ints[2] > 1 {
            self.fir + (self.max - self.fir) * self.ints[2] - self.off
        } else {
            self.max - self.off
        }
    }
}

impl MaAnim {
    pub fn validate(&mut self) {
        for p in &mut self.parts {
            if p.ints[1] == 2 {
                for m in &mut p.moves {
                    if m[1] < 0 {
                        m[1] = 0;
                    }
                }
            }
        }

        self.max = 1;
        for i in 0..self.n {
            let p_max = self.parts[i].get_max();
            if p_max > self.max {
                self.max = p_max;
            }
        }

        self.len = 1;
        for i in 0..self.n {
            self.len = std::cmp::max(self.len, self.parts[i].get_max());
        }
    }
}

impl ParityTestable for MaAnim {
    fn to_parity_string(&self) -> String {
        let mut s = String::new();
        let _ = s.write_str("[maanim]\n");
        let _ = s.write_str("1\n");
        let _ = writeln!(s, "{}", self.parts.len());
        for p in &self.parts {
            for val in &p.ints {
                let _ = write!(s, "{val},");
            }
            let _ = s.write_str(&p.name);
            let _ = s.write_str("\n");
            let _ = writeln!(s, "{}", p.moves.len());
            for m in &p.moves {
                let _ = writeln!(s, "{},{},{},{},", m[0] - p.off, m[1], m[2], m[3]);
            }
        }
        s
    }
}

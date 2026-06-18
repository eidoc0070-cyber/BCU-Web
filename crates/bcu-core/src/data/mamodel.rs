//! @java: common.util.anim.MaModel
//! @logic: `MaModel` defines the skeleton hierarchy and initial part states.
//! @parity: 100%

use crate::ParityTestable;
use core::fmt::Write;
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
        let imgcut_n_i32 = i32::try_from(imgcut_n).unwrap_or(i32::MAX);
        let n_i32 = i32::try_from(n).unwrap_or(i32::MAX);

        for p in &mut self.parts {
            if p[2] >= imgcut_n_i32 {
                p[2] = 0;
            }
            if p[0] > n_i32 {
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
        if parent >= i32::try_from(parts.len()).unwrap_or(i32::MAX) {
            parts[p][0] = 0;
            parent = 0;
        }
        if parent < 0 {
            temp[p] = 1;
            return 1;
        }

        // Safety: parent >= 0 and within bounds
        let val = Self::check_detect_loop(parts, temp, usize::try_from(parent).unwrap_or(0));
        temp[p] = val;
        val
    }

    /// Checks if setting `parent_candidate` as the parent of `part_idx` would create a cycle.
    ///
    /// Returns true if `part_idx` is an ancestor of `parent_candidate`.
    ///
    /// # Panics
    /// Panics if `current` index is out of bounds for `self.parts`.
    #[must_use]
    pub fn is_ancestor(&self, part_idx: usize, parent_candidate: usize) -> bool {
        if part_idx == parent_candidate {
            return true;
        }

        let mut current = parent_candidate;
        let mut visited = 0;
        let max_visit = self.n;

        while visited < max_visit {
            let parent = self.parts[current][0];
            if parent == -1 {
                return false;
            }
            if usize::try_from(parent).unwrap_or(usize::MAX) == part_idx {
                return true;
            }
            current = usize::try_from(parent).unwrap_or(0);
            visited += 1;
        }
        true // Cycle detected during traversal
    }
}

impl ParityTestable for MaModel {
    fn to_parity_string(&self) -> String {
        let mut s = String::new();
        let _ = s.write_str("[mamodel]\n");
        let _ = s.write_str("3\n");
        let _ = writeln!(s, "{}", self.n);
        for (i, &part) in self.parts.iter().enumerate().take(self.n) {
            for val in part.iter().take(13) {
                let _ = write!(s, "{val},");
            }
            let _ = s.write_str(&self.strs0[i]);
            let _ = s.write_str("\n");
        }
        let _ = writeln!(s, "{},{},{}", self.ints[0], self.ints[1], self.ints[2]);
        let _ = writeln!(s, "{}", self.m);
        for (i, &conf) in self.confs.iter().enumerate().take(self.m) {
            for val in &conf {
                let _ = write!(s, "{val},");
            }
            let _ = s.write_str(&self.strs1[i]);
            let _ = s.write_str("\n");
        }
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hierarchy_cycle_detection() {
        let model = MaModel {
            n: 3,
            m: 0,
            parts: vec![
                [-1, -1, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0], // Part 0 (Root)
                [0, -1, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0],  // Part 1 -> Part 0
                [1, -1, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0],  // Part 2 -> Part 1
            ],
            strs0: vec!["P0".into(), "P1".into(), "P2".into()],
            ints: [1000, 3600, 1000],
            confs: vec![],
            strs1: vec![],
        };

        // 0 is ancestor of 2? Yes (0 -> 1 -> 2)
        assert!(model.is_ancestor(0, 2));
        // 1 is ancestor of 2? Yes (1 -> 2)
        assert!(model.is_ancestor(1, 2));
        // 2 is ancestor of 0? No
        assert!(!model.is_ancestor(2, 0));
        // Self check
        assert!(model.is_ancestor(0, 0));
    }
}

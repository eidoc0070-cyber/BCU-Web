//! @java: common.util.anim.MaModel
//! @logic: MaModel defines the skeleton hierarchy and initial part states.
//! @parity: 100%

use bcu_core::{BCUError, ParityTestable};
use crate::imgcut::restrict;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MaModel {
    pub n: usize,
    pub m: usize,
    pub parts: Vec<[i32; 14]>,
    pub strs0: Vec<String>,
    pub ints: [i32; 3],
    pub confs: Vec<[i32; 6]>,
    pub strs1: Vec<String>,
}

pub fn parse_mamodel(content: &str) -> Result<MaModel, BCUError> {
    let mut lines = content.lines().map(|line| line.trim_end());

    // Java: qs.poll(); qs.poll(); (skips [mamodel] and version 3)
    lines.next();
    lines.next();

    let n_str = lines.next().ok_or_else(|| {
        BCUError::ParseError("Missing part count (n)".to_string())
    })?;
    let n = n_str.trim().parse::<usize>().map_err(|e| {
        BCUError::ParseError(format!("Invalid part count: {}", e))
    })?;

    let mut parts = Vec::with_capacity(n);
    let mut strs0 = Vec::with_capacity(n);

    for i in 0..n {
        let line = lines.next().ok_or_else(|| {
            BCUError::ParseError(format!("Missing part line at index {}", i))
        })?;
        let ss: Vec<&str> = line.trim().split(',').collect();

        if ss.len() < 13 {
            return Err(BCUError::ParseError(format!(
                "Part line {} has less than 13 elements: {}",
                i, line
            )));
        }

        let mut part = [0; 14];
        for j in 0..13 {
            part[j] = ss[j].trim().parse::<i32>().map_err(|e| {
                BCUError::ParseError(format!(
                    "Invalid integer at part {}, index {}: {}",
                    i, j, e
                ))
            })?;
        }
        // part[13] remains 0 as initialized

        let s_val = if ss.len() == 14 {
            restrict(ss[13])
        } else {
            "".to_string()
        };

        parts.push(part);
        strs0.push(s_val);
    }

    let ints_line = lines.next().ok_or_else(|| {
        BCUError::ParseError("Missing ints config line".to_string())
    })?;
    let ints_parts: Vec<&str> = ints_line.trim().split(',').collect();
    if ints_parts.len() < 3 {
        return Err(BCUError::ParseError(format!(
            "Ints config line has less than 3 values: {}",
            ints_line
        )));
    }
    let mut ints = [0; 3];
    for i in 0..3 {
        ints[i] = ints_parts[i].trim().parse::<i32>().map_err(|e| {
            BCUError::ParseError(format!("Invalid integer in ints config index {}: {}", i, e))
        })?;
    }

    let m_str = lines.next().ok_or_else(|| {
        BCUError::ParseError("Missing collision box count (m)".to_string())
    })?;
    let m = m_str.trim().parse::<usize>().map_err(|e| {
        BCUError::ParseError(format!("Invalid collision box count: {}", e))
    })?;

    let mut confs = Vec::with_capacity(m);
    let mut strs1 = Vec::with_capacity(m);

    for i in 0..m {
        let line = lines.next().ok_or_else(|| {
            BCUError::ParseError(format!("Missing collision line at index {}", i))
        })?;
        let ss: Vec<&str> = line.trim().split(',').collect();

        if ss.len() < 6 {
            return Err(BCUError::ParseError(format!(
                "Collision line {} has less than 6 elements: {}",
                i, line
            )));
        }

        let mut conf = [0; 6];
        for j in 0..6 {
            conf[j] = ss[j].trim().parse::<i32>().map_err(|e| {
                BCUError::ParseError(format!(
                    "Invalid integer at collision {}, index {}: {}",
                    i, j, e
                ))
            })?;
        }

        let s_val = if ss.len() == 7 {
            restrict(ss[6])
        } else {
            "".to_string()
        };

        confs.push(conf);
        strs1.push(s_val);
    }

    Ok(MaModel {
        n,
        m,
        parts,
        strs0,
        ints,
        confs,
        strs1,
    })
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
        for i in 0..n {
            if temp[i] == 2 {
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
        s.push_str("\n");
        for i in 0..self.n {
            let part = self.parts[i];
            for j in 0..13 {
                s.push_str(&format!("{},", part[j]));
            }
            s.push_str(&self.strs0[i]);
            s.push_str("\n");
        }
        s.push_str(&format!("{},{},{}\n", self.ints[0], self.ints[1], self.ints[2]));
        s.push_str(&self.m.to_string());
        s.push_str("\n");
        for i in 0..self.m {
            let conf = self.confs[i];
            for j in 0..6 {
                s.push_str(&format!("{},", conf[j]));
            }
            s.push_str(&self.strs1[i]);
            s.push_str("\n");
        }
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mamodel_parsing() {
        let sample = "\
[mamodel]
3
3
-1,-1,0,0,0,0,-50,-56,1790,1790,0,1000,0,Parent_Part
0,0,0,1,0,0,0,0,1000,1000,0,1000,0,
1,0,8,0,0,53,0,0,1000,1000,0,1000,0,
1000,3600,1000
1
0,0,0,0,25,0,Collision_Box
";
        let mut parsed = parse_mamodel(sample).unwrap();
        assert_eq!(parsed.n, 3);
        assert_eq!(parsed.m, 1);
        assert_eq!(parsed.parts[0][0], -1); // Parent
        assert_eq!(parsed.parts[0][1], -1); // UnitID
        assert_eq!(parsed.parts[0][2], 0);  // ImgcutID
        assert_eq!(parsed.strs0[0], "Parent_Part");
        assert_eq!(parsed.strs0[1], "");
        assert_eq!(parsed.ints, [1000, 3600, 1000]);
        assert_eq!(parsed.confs[0], [0, 0, 0, 0, 25, 0]);
        assert_eq!(parsed.strs1[0], "Collision_Box");

        // Validate cycle detection check
        // Let's create a cycle: part 1 has parent 2, part 2 has parent 1
        parsed.parts[1][0] = 2;
        parsed.parts[2][0] = 1;
        parsed.check_model(10);
        // Cycle should be broken, making them roots (-1)
        assert_eq!(parsed.parts[1][0], -1);
        assert_eq!(parsed.parts[2][0], -1);

        // Test roundtrip parity
        let parity_out = parsed.to_parity_string();
        let parsed_again = parse_mamodel(&parity_out).unwrap();
        assert_eq!(parsed, parsed_again);
    }
}

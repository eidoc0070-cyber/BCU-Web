//! @java: common.util.anim.MaAnim / common.util.anim.Part
//! @logic: MaAnim parses skeletal animation keyframes, handling frame offset translations and validation.
//! @parity: 100%

use bcu_core::{BCUError, ParityTestable};
use crate::imgcut::restrict;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Part {
    pub ints: [i32; 5],
    pub name: String,
    pub n: usize,
    pub max: i32,
    pub off: i32,
    pub fir: i32,
    pub moves: Vec<[i32; 4]>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MaAnim {
    pub n: usize,
    pub parts: Vec<Part>,
    pub max: i32,
    pub len: i32,
}

impl Part {
    pub fn new(id: i32, modif: i32) -> Self {
        Part {
            ints: [id, modif, -1, 0, 0],
            name: "".to_string(),
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
        self.fir = if self.moves.is_empty() { 0 } else { self.moves[0][0] };
        self.max = if self.n > 0 { self.moves[self.n - 1][0] } else { 0 };
    }

    pub fn get_max(&self) -> i32 {
        if self.ints[2] != -1 {
            if self.ints[2] > 1 {
                self.fir + (self.max - self.fir) * self.ints[2] - self.off
            } else {
                self.max - self.off
            }
        } else {
            self.max - std::cmp::min(self.off, 0)
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

pub fn parse_maanim(content: &str, is_old: bool) -> Result<MaAnim, BCUError> {
    let mut lines = content.lines().map(|line| line.trim_end());

    // Java: qs.poll(); qs.poll(); (skips [maanim] and version 1)
    lines.next();
    lines.next();

    let n_str = lines.next().ok_or_else(|| {
        BCUError::ParseError("Missing animation part count (n)".to_string())
    })?;
    let n = n_str.trim().parse::<usize>().map_err(|e| {
        BCUError::ParseError(format!("Invalid animation part count: {}", e))
    })?;

    let mut parts = Vec::with_capacity(n);

    for i in 0..n {
        let header_line = lines.next().ok_or_else(|| {
            BCUError::ParseError(format!("Missing animation part header at index {}", i))
        })?;
        let ss: Vec<&str> = header_line.trim().split(',').collect();

        if ss.len() < 5 {
            return Err(BCUError::ParseError(format!(
                "Animation part header {} has less than 5 elements: {}",
                i, header_line
            )));
        }

        let mut ints = [0; 5];
        for j in 0..5 {
            let v = ss[j].trim().parse::<i32>().map_err(|e| {
                BCUError::ParseError(format!(
                    "Invalid integer at part header {}, index {}: {}",
                    i, j, e
                ))
            })?;
            // Java: ints[i] = (isOld && i == 1 && v == 8) ? 53 : v;
            ints[j] = if is_old && j == 1 && v == 8 { 53 } else { v };
        }

        let name = if ss.len() == 6 {
            restrict(ss[5])
        } else {
            "".to_string()
        };

        let move_count_str = lines.next().ok_or_else(|| {
            BCUError::ParseError(format!("Missing keyframe count at animation part {}", i))
        })?;
        let move_count = move_count_str.trim().parse::<usize>().map_err(|e| {
            BCUError::ParseError(format!("Invalid keyframe count at animation part {}: {}", i, e))
        })?;

        let mut moves = Vec::with_capacity(move_count);

        for k in 0..move_count {
            let move_line = lines.next().ok_or_else(|| {
                BCUError::ParseError(format!(
                    "Missing keyframe line at part {}, index {}",
                    i, k
                ))
            })?;
            let ss_move: Vec<&str> = move_line.trim().split(',').collect();

            if ss_move.len() < 4 {
                return Err(BCUError::ParseError(format!(
                    "Keyframe line at part {}, index {} has less than 4 elements: {}",
                    i, k, move_line
                )));
            }

            let mut mv = [0; 4];
            for j in 0..4 {
                mv[j] = ss_move[j].trim().parse::<i32>().map_err(|e| {
                    BCUError::ParseError(format!(
                        "Invalid integer at keyframe line at part {}, index {}, component {}: {}",
                        i, k, j, e
                    ))
                })?;
            }
            moves.push(mv);
        }

        let mut part = Part {
            ints,
            name,
            n: move_count,
            max: 0,
            off: 0,
            fir: 0,
            moves,
        };
        part.validate();
        parts.push(part);
    }

    let mut anim = MaAnim {
        n,
        parts,
        max: 1,
        len: 1,
    };
    anim.validate();
    Ok(anim)
}

impl ParityTestable for MaAnim {
    fn to_parity_string(&self) -> String {
        let mut s = String::new();
        s.push_str("[maanim]\n");
        s.push_str("1\n");
        s.push_str(&self.parts.len().to_string());
        s.push_str("\n");
        for p in &self.parts {
            for val in &p.ints {
                s.push_str(&format!("{},", val));
            }
            s.push_str(&p.name);
            s.push_str("\n");
            s.push_str(&p.moves.len().to_string());
            s.push_str("\n");
            for m in &p.moves {
                s.push_str(&format!("{},{},{},{},\n", m[0] - p.off, m[1], m[2], m[3]));
            }
        }
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_maanim_parsing() {
        let sample = "\
[maanim]
1
1
1,2,-1,-1000,1000,Walk_Anim
4
0,0,1,0,
5,3,1,0,
10,1,1,0,
15,3,1,0,
";
        let parsed = parse_maanim(sample, false).unwrap();
        assert_eq!(parsed.n, 1);
        assert_eq!(parsed.parts[0].ints, [1, 2, -1, -1000, 1000]);
        assert_eq!(parsed.parts[0].name, "Walk_Anim");
        assert_eq!(parsed.parts[0].n, 4);
        // Under validation:
        // first move frame = 0, off = 0 (since ints[2] is -1, which is not 1, doff = 0)
        // Let's verify moves:
        assert_eq!(parsed.parts[0].moves[0], [0, 0, 1, 0]);
        assert_eq!(parsed.parts[0].moves[1], [5, 3, 1, 0]);
        assert_eq!(parsed.max, 15);
        assert_eq!(parsed.len, 15);

        // Test roundtrip parity
        let parity_out = parsed.to_parity_string();
        let parsed_again = parse_maanim(&parity_out, false).unwrap();
        assert_eq!(parsed, parsed_again);
    }
}

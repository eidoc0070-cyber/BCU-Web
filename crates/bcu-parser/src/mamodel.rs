//! @java: common.util.anim.MaModel
//! @logic: MaModel defines the skeleton hierarchy and initial part states.
//! @parity: 100%

use crate::imgcut::restrict;
use bcu_core::{BCUError, MaModel};

pub fn parse_mamodel(content: &str) -> Result<MaModel, BCUError> {
    let mut lines = content.lines().map(|line| line.trim_end());

    // Java: qs.poll(); qs.poll(); (skips [mamodel] and version 3)
    lines.next();
    lines.next();

    let n_str = lines
        .next()
        .ok_or_else(|| BCUError::ParseError("Missing part count (n)".to_string()))?;
    let n = n_str
        .trim()
        .parse::<usize>()
        .map_err(|e| BCUError::ParseError(format!("Invalid part count: {}", e)))?;

    let mut parts = Vec::with_capacity(n);
    let mut strs0 = Vec::with_capacity(n);

    for i in 0..n {
        let line = lines
            .next()
            .ok_or_else(|| BCUError::ParseError(format!("Missing part line at index {}", i)))?;
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
                BCUError::ParseError(format!("Invalid integer at part {}, index {}: {}", i, j, e))
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

    let ints_line = lines
        .next()
        .ok_or_else(|| BCUError::ParseError("Missing ints config line".to_string()))?;
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

    let m_str = lines
        .next()
        .ok_or_else(|| BCUError::ParseError("Missing collision box count (m)".to_string()))?;
    let m = m_str
        .trim()
        .parse::<usize>()
        .map_err(|e| BCUError::ParseError(format!("Invalid collision box count: {}", e)))?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use bcu_core::ParityTestable;

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
        assert_eq!(parsed.parts[0][2], 0); // ImgcutID
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

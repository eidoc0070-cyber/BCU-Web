//! @java: common.util.anim.ImgCut
//! @logic: `ImgCut` parses sprite sheet partition data defining sub-image rects.
//! @parity: 100%

use bcu_core::{BCUError, ImgCut};

#[must_use]
pub fn restrict(s: &str) -> String {
    s.chars().take(32).collect()
}

pub fn parse_imgcut(content: &str) -> Result<ImgCut, BCUError> {
    let mut lines = content.lines().map(str::trim_end);

    // Java code: qs.poll(); qs.poll(); (skips header [imgcut] and version 0)
    lines.next();
    lines.next();

    let name = match lines.next() {
        Some(l) => restrict(l),
        None => String::new(),
    };

    let n_str = lines
        .next()
        .ok_or_else(|| BCUError::ParseError("Missing cut count (n)".to_string()))?;
    let n = n_str
        .trim()
        .parse::<usize>()
        .map_err(|e| BCUError::ParseError(format!("Invalid cut count: {e}")))?;

    let mut cuts = Vec::with_capacity(n);
    let mut strs = Vec::with_capacity(n);

    for i in 0..n {
        let line = lines
            .next()
            .ok_or_else(|| BCUError::ParseError(format!("Missing cut line at index {i}")))?;

        // Java: String[] ss = (line == null ? "0, 0, 1, 1" : line).trim().split(",");
        let trimmed = line.trim();
        let ss: Vec<&str> = if trimmed.is_empty() {
            vec!["0", "0", "1", "1"]
        } else {
            trimmed.split(',').collect()
        };

        if ss.len() < 4 {
            return Err(BCUError::ParseError(format!(
                "Cut line {i} has less than 4 components: {line}"
            )));
        }

        let mut cut = [0; 4];
        for j in 0..4 {
            cut[j] = ss[j].trim().parse::<i32>().map_err(|e| {
                BCUError::ParseError(format!("Invalid integer at cut {i}, index {j}: {e}"))
            })?;
        }

        let s_val = if ss.len() == 5 {
            restrict(ss[4])
        } else {
            String::new()
        };

        cuts.push(cut);
        strs.push(s_val);
    }

    Ok(ImgCut {
        name,
        n,
        cuts,
        strs,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use bcu_core::ParityTestable;

    #[test]
    fn test_imgcut_parsing() {
        let sample = "\
[imgcut]
0
i000_e.png
3
1,2,3,4,first
10,20,30,40,
100,200,300,400,third_with_very_long_name_that_should_be_restricted
";
        let parsed = parse_imgcut(sample).unwrap();
        assert_eq!(parsed.name, "i000_e.png");
        assert_eq!(parsed.n, 3);
        assert_eq!(parsed.cuts[0], [1, 2, 3, 4]);
        assert_eq!(parsed.strs[0], "first");
        assert_eq!(parsed.cuts[1], [10, 20, 30, 40]);
        assert_eq!(parsed.strs[1], "");
        assert_eq!(parsed.strs[2], "third_with_very_long_name_that_s"); // 32 chars
        assert_eq!(parsed.strs[2].len(), 32);

        // Test roundtrip parity
        let parity_out = parsed.to_parity_string();
        let parsed_again = parse_imgcut(&parity_out).unwrap();
        assert_eq!(parsed, parsed_again);
    }
}

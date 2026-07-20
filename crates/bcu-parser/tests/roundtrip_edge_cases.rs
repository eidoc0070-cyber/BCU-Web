//! @java: (none)
//! @logic: Round-trip integrity and edge-case tests for bcu-parser.
//!
//! Validates: parse → to_parity_string → re-parse produces identical structs,
//! and that malformed input is properly rejected with `BCUError::ParseError`.

use bcu_core::ParityTestable;
use bcu_parser::{parse_imgcut, parse_maanim, parse_mamodel};

// ── ImgCut ───────────────────────────────────────────────────────────────────

/// n=0 with empty name: minimal file must survive round-trip losslessly.
#[test]
fn imgcut_zero_cuts_roundtrip() {
    let input = "[imgcut]\n0\n\n0\n";
    let p = parse_imgcut(input).unwrap();
    assert_eq!(p.n, 0);
    assert!(p.cuts.is_empty());
    assert_eq!(parse_imgcut(&p.to_parity_string()).unwrap(), p);
}

/// 4-field cut line (no optional name column) → strs entry is "".
#[test]
fn imgcut_no_optional_str_roundtrip() {
    let input = "[imgcut]\n0\nsheet.png\n2\n0,0,32,32\n32,0,64,32\n";
    let p = parse_imgcut(input).unwrap();
    assert!(p.strs.iter().all(String::is_empty));
    assert_eq!(parse_imgcut(&p.to_parity_string()).unwrap(), p);
}

/// Whitespace-only cut line falls back to [0, 0, 1, 1] with empty str.
#[test]
fn imgcut_whitespace_line_fallback_roundtrip() {
    let input = "[imgcut]\n0\nsheet.png\n1\n   \n";
    let p = parse_imgcut(input).unwrap();
    assert_eq!(p.cuts[0], [0, 0, 1, 1]);
    assert_eq!(p.strs[0], "");
    assert_eq!(parse_imgcut(&p.to_parity_string()).unwrap(), p);
}

/// Name exactly 32 chars: no truncation occurs, roundtrip is lossless.
#[test]
fn imgcut_name_exactly_32_chars_roundtrip() {
    let name32 = "x".repeat(32);
    let input = format!("[imgcut]\n0\n{name32}\n0\n");
    let p = parse_imgcut(&input).unwrap();
    assert_eq!(p.name.len(), 32);
    assert_eq!(parse_imgcut(&p.to_parity_string()).unwrap(), p);
}

/// Name longer than 32 chars is silently truncated to 32 on parse.
#[test]
fn imgcut_name_over_32_chars_truncated() {
    let input = format!("[imgcut]\n0\n{}\n0\n", "z".repeat(40));
    let p = parse_imgcut(&input).unwrap();
    assert_eq!(p.name, "z".repeat(32));
}

/// Error: non-integer token in a cut field.
#[test]
fn imgcut_err_invalid_integer() {
    assert!(parse_imgcut("[imgcut]\n0\ns.png\n1\n0,0,abc,32\n").is_err());
}

/// Error: cut line with fewer than 4 comma-separated fields.
#[test]
fn imgcut_err_too_few_components() {
    assert!(parse_imgcut("[imgcut]\n0\ns.png\n1\n0,0,32\n").is_err());
}

// ── MaAnim ───────────────────────────────────────────────────────────────────

/// n=0 parts: empty animation must survive round-trip losslessly.
#[test]
fn maanim_zero_parts_roundtrip() {
    let input = "[maanim]\n1\n0\n";
    let p = parse_maanim(input, false).unwrap();
    assert_eq!(p.n, 0);
    assert!(p.parts.is_empty());
    assert_eq!(parse_maanim(&p.to_parity_string(), false).unwrap(), p);
}

/// Part with 0 keyframes: validate() must not panic, round-trip is lossless.
#[test]
fn maanim_zero_moves_roundtrip() {
    let input = "[maanim]\n1\n1\n0,2,-1,0,0,EmptyPart\n0\n";
    let p = parse_maanim(input, false).unwrap();
    assert_eq!(p.parts[0].n, 0);
    assert_eq!(p.parts[0].max, 0);
    assert_eq!(parse_maanim(&p.to_parity_string(), false).unwrap(), p);
}

/// is_old=true converts ints[1]==8 to 53; round-trip with is_old=false preserves 53.
#[test]
fn maanim_is_old_converts_eight_to_53() {
    let input = "[maanim]\n1\n1\n0,8,-1,0,0,OldPart\n0\n";
    let p = parse_maanim(input, true).unwrap();
    assert_eq!(p.parts[0].ints[1], 53, "Expected is_old to remap 8 → 53");
    assert_eq!(parse_maanim(&p.to_parity_string(), false).unwrap(), p);
}

/// is_old=true leaves values other than 8 at index 1 unchanged.
#[test]
fn maanim_is_old_leaves_non_eight_unchanged() {
    let input = "[maanim]\n1\n1\n0,7,-1,0,0,\n0\n";
    assert_eq!(parse_maanim(input, true).unwrap().parts[0].ints[1], 7);
}

/// 5-field part header (no name column) → name is "" and roundtrip preserves it.
#[test]
fn maanim_no_name_roundtrip() {
    let input = "[maanim]\n1\n1\n1,2,-1,-100,100\n1\n0,10,1,0,\n";
    let p = parse_maanim(input, false).unwrap();
    assert_eq!(p.parts[0].name, "");
    assert_eq!(parse_maanim(&p.to_parity_string(), false).unwrap(), p);
}

/// Error: part header with fewer than 5 comma-separated fields.
#[test]
fn maanim_err_part_header_too_short() {
    assert!(parse_maanim("[maanim]\n1\n1\n0,2,-1,0\n0\n", false).is_err());
}

/// Error: keyframe line with fewer than 4 comma-separated fields.
#[test]
fn maanim_err_keyframe_too_short() {
    assert!(parse_maanim("[maanim]\n1\n1\n0,2,-1,0,0\n1\n0,10,1\n", false).is_err());
}

// ── MaModel ──────────────────────────────────────────────────────────────────

/// n=0, m=0: bare-minimum model (only ints config) must survive round-trip.
#[test]
fn mamodel_empty_model_roundtrip() {
    let input = "[mamodel]\n3\n0\n1000,3600,1000\n0\n";
    let p = parse_mamodel(input).unwrap();
    assert_eq!(p.n, 0);
    assert_eq!(p.m, 0);
    assert_eq!(parse_mamodel(&p.to_parity_string()).unwrap(), p);
}

/// 13-field part line (no optional 14th name field) → strs0 entry is "".
#[test]
fn mamodel_part_no_optional_str_roundtrip() {
    let input = "[mamodel]\n3\n1\n-1,-1,0,0,0,0,0,0,1000,1000,0,1000,0\n1000,3600,1000\n0\n";
    let p = parse_mamodel(input).unwrap();
    assert_eq!(p.strs0[0], "");
    assert_eq!(parse_mamodel(&p.to_parity_string()).unwrap(), p);
}

/// 6-field collision line (no optional 7th name field) → strs1 entry is "".
#[test]
fn mamodel_collision_no_optional_str_roundtrip() {
    let input = "[mamodel]\n3\n0\n1000,3600,1000\n1\n0,0,0,0,25,0\n";
    let p = parse_mamodel(input).unwrap();
    assert_eq!(p.strs1[0], "");
    assert_eq!(parse_mamodel(&p.to_parity_string()).unwrap(), p);
}

/// check_model clamps imgcut index out of range (999) down to 0.
#[test]
fn mamodel_check_model_clamps_imgcut_idx() {
    let input = "[mamodel]\n3\n1\n-1,-1,999,0,0,0,0,0,1000,1000,0,1000,0\n1000,3600,1000\n0\n";
    let mut p = parse_mamodel(input).unwrap();
    p.check_model(3); // only 3 imgcut entries → index 999 is OOB → clamp to 0
    assert_eq!(p.parts[0][2], 0);
}

/// check_model detects and breaks self-referential parent loops (part[i][0] == i).
#[test]
fn mamodel_check_model_breaks_self_loop() {
    // Part 0 parent=0 (self), Part 1 parent=1 (self)
    let input =
        "[mamodel]\n3\n2\n0,-1,0,0,0,0,0,0,1000,1000,0,1000,0\n1,-1,0,0,0,0,0,0,1000,1000,0,1000,0\n1000,3600,1000\n0\n";
    let mut p = parse_mamodel(input).unwrap();
    p.check_model(10);
    assert_eq!(
        p.parts[0][0], -1,
        "Part 0 self-loop should be broken to root"
    );
    assert_eq!(
        p.parts[1][0], -1,
        "Part 1 self-loop should be broken to root"
    );
}

/// Error: ints config line with fewer than 3 comma-separated values.
#[test]
fn mamodel_err_ints_config_too_short() {
    assert!(parse_mamodel("[mamodel]\n3\n0\n1000,3600\n0\n").is_err());
}

/// Error: part line with fewer than 13 integer fields.
#[test]
fn mamodel_err_part_line_too_short() {
    let input = "[mamodel]\n3\n1\n-1,-1,0,0,0,0,0,0,1000,1000,0\n1000,3600,1000\n0\n";
    assert!(parse_mamodel(input).is_err());
}

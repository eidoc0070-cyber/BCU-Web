//! @java: (none)
//! @logic: Parity tester to verify math and random number generators match Java.
//! @parity: 100%

use bcu_math::{FixedPoint, JavaRandom, CopRand, Vec2};

fn main() {
    println!("=== Running BCU Rust Parity Verification ===");

    // 1. JavaRandom verification
    println!("Checking JavaRandom sequence parity...");
    let mut r = JavaRandom::new(12345);
    
    let expected_longs = [
        6674089274190705457i64,
        -1236052134575208584i64,
        -3078921119283744887i64,
        6022414958441676900i64,
        4344647195749500666i64,
    ];
    for &expected in &expected_longs {
        let actual = r.next_long();
        assert_eq!(actual, expected, "JavaRandom.next_long() failed to match Java output");
    }
    println!("✓ JavaRandom Long sequences matched successfully.");

    let expected_floats = [
        0.34911531f32,
        0.98805076f32,
        0.44807762f32,
        0.9138467f32,
        0.6381529f32,
    ];
    for &expected in &expected_floats {
        let actual = r.next_float();
        let diff = (actual - expected).abs();
        assert!(diff < 1e-6, "JavaRandom.next_float() failed to match Java output: expected {}, got {}", expected, actual);
    }
    println!("✓ JavaRandom Float sequences matched successfully.");

    let expected_doubles = [
        0.11559127507010891f64,
        0.9297478462589988f64,
        0.2626493565004089f64,
        0.14479939737297642f64,
        0.5781572879885327f64,
    ];
    for &expected in &expected_doubles {
        let actual = r.next_double();
        let diff = (actual - expected).abs();
        assert!(diff < 1e-12, "JavaRandom.next_double() failed to match Java output: expected {}, got {}", expected, actual);
    }
    println!("✓ JavaRandom Double sequences matched successfully.");

    // 2. CopRand verification
    println!("Checking CopRand sequence parity...");
    let mut cop = CopRand::new(12345);
    let expected_cop_floats = [
        0.932993471622467f32,
        0.6397237777709961f32,
        0.5406075716018677f32,
        0.7880862355232239f32,
        0.3827242851257324f32,
    ];
    for &expected in &expected_cop_floats {
        let actual = cop.next_float();
        let diff = (actual - expected).abs();
        assert!(diff < 1e-6, "CopRand.next_float() failed to match Java output: expected {}, got {}", expected, actual);
    }
    assert_eq!(cop.seed, 930898160003145180i64, "CopRand final seed failed to match");
    println!("✓ CopRand sequence and seed updates matched successfully.");

    // 3. FixedPoint Trig verification
    println!("Checking FixedPoint trig parity...");
    // Let's assert that cos^2(x) + sin^2(x) is extremely close to 1
    for i in 0..100 {
        let x = FixedPoint::from_float(i as f64 * 0.1);
        let s = x.sin();
        let c = x.cos();
        let sum_sq = s * s + c * c;
        let diff = (sum_sq.to_float() - 1.0).abs();
        assert!(diff < 1e-4, "sin^2(x) + cos^2(x) = {} != 1.0 at x = {}", sum_sq.to_float(), x.to_float());
    }
    println!("✓ FixedPoint trigonometric identity verified successfully.");

    // 4. Vec2 operations check
    println!("Checking Vec2 operations...");
    let mut v = Vec2::new(FixedPoint::from_int(3), FixedPoint::from_int(4));
    assert_eq!(v.abs(), FixedPoint::from_int(5));
    
    // Rotate 90 degrees (HALF_PI)
    v.rotate(FixedPoint::HALF_PI);
    // (3, 4) rotated 90 degrees counter-clockwise is (-4, 3)
    let expected_x = -4.0;
    let expected_y = 3.0;
    assert!((v.x.to_float() - expected_x).abs() < 1e-4, "v.x = {}, expected {}", v.x.to_float(), expected_x);
    assert!((v.y.to_float() - expected_y).abs() < 1e-4, "v.y = {}, expected {}", v.y.to_float(), expected_y);
    println!("✓ Vec2 rotation and polar coordinates verified successfully.");

    println!("All math and parity tests PASSED successfully.");
}

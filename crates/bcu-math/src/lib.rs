//! @java: (none)
//! @logic: Expose foundation mathematical modules: `FixedPoint`, `JavaRandom`, and Vec2.
//! @parity: 100%

pub mod fixed_point;
pub mod java_random;
pub mod vec2;

pub use fixed_point::FixedPoint;
pub use java_random::{ir_double, CopRand, JavaRandom};
pub use vec2::Vec2;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fixed_point_basic() {
        let a = FixedPoint::from_float(1.5);
        let b = FixedPoint::from_float(2.0);
        let c = a + b;
        assert_eq!(c.to_float(), 3.5);

        let d = a * b;
        assert_eq!(d.to_float(), 3.0);

        let e = b / a;
        let diff = (e.to_float() - 4.0 / 3.0).abs();
        assert!(diff < 1e-5);
    }

    #[test]
    fn test_fixed_point_sqrt() {
        let a = FixedPoint::from_float(2.0);
        let s = a.sqrt();
        // sqrt(2) is ~ 1.41421356...
        let diff = (s.to_float() - std::f64::consts::SQRT_2).abs();
        assert!(diff < 1e-5);
    }

    #[test]
    fn test_fixed_point_trig() {
        // sin(0) = 0
        assert_eq!(FixedPoint::ZERO.sin(), FixedPoint::ZERO);
        // cos(0) = 1 (approximate)
        let cos_zero = FixedPoint::ZERO.cos().to_float();
        assert!((cos_zero - 1.0).abs() < 1e-5);

        // sin(PI/6) = 0.5
        let pi_6 = FixedPoint::PI / FixedPoint::from_int(6);
        let diff_sin = (pi_6.sin().to_float() - 0.5).abs();
        assert!(diff_sin < 1e-4);

        // cos(PI/3) = 0.5
        let pi_3 = FixedPoint::PI / FixedPoint::from_int(3);
        let diff_cos = (pi_3.cos().to_float() - 0.5).abs();
        assert!(diff_cos < 1e-4);
    }

    #[test]
    fn test_java_random_lcg() {
        // Test with seed 0 to see if it generates consistent values
        let mut r = JavaRandom::new(12345);
        let first_long = r.next_long();
        let second_long = r.next_long();
        assert_ne!(first_long, second_long);

        let mut cop = CopRand::new(12345);
        let first_f = cop.next_float();
        let second_f = cop.next_float();
        assert_ne!(first_f, second_f);
    }

    #[test]
    fn test_vec2_basic() {
        let v1 = Vec2::new(FixedPoint::from_float(3.0), FixedPoint::from_float(4.0));
        assert_eq!(v1.abs().to_float(), 5.0);

        let v2 = Vec2::new(FixedPoint::from_float(1.0), FixedPoint::from_float(1.0));
        let dist = v1.distance(v2);
        // dist between (3,4) and (1,1) is sqrt(2^2 + 3^2) = sqrt(13) = 3.60555...
        let diff = (dist.to_float() - 3.60555).abs();
        assert!(diff < 1e-4);
    }
}

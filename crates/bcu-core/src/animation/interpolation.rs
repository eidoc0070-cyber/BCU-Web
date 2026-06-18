//! @java: (none)
//! @logic: Animation keyframe interpolation logic (Linear, Step, Easing, Sinusoidal).
//! @parity: 0%

use bcu_math::FixedPoint;

/// Calculates interpolated time factor `ti` based on interpolation type and parameters.
#[must_use]
pub fn get_ti(ti: FixedPoint, itype: i32, param: i32) -> FixedPoint {
    match itype {
        1 => FixedPoint::ZERO, // Step
        2 => {
            // Easing
            if param >= 0 {
                FixedPoint::ONE - (FixedPoint::ONE - ti.pow_i32(param)).sqrt()
            } else {
                (FixedPoint::ONE - (FixedPoint::ONE - ti).pow_i32(-param)).sqrt()
            }
        }
        4 => {
            // Sinusoidal
            use core::cmp::Ordering;
            match param.cmp(&0) {
                Ordering::Greater => FixedPoint::ONE - (ti * FixedPoint::HALF_PI).cos(),
                Ordering::Less => (ti * FixedPoint::HALF_PI).sin(),
                Ordering::Equal => {
                    (FixedPoint::ONE - (ti * FixedPoint::PI).cos()) / FixedPoint::from_int(2)
                }
            }
        }
        _ => ti, // Linear or fallback
    }
}

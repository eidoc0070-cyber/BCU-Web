//! @java: (none)
//! @logic: Animation keyframe interpolation logic (Linear, Step, Easing, Sinusoidal).
//! @parity: 0%

use bcu_math::FixedPoint;

pub fn get_ti(ti: FixedPoint, itype: i32, param: i32) -> FixedPoint {
    match itype {
        0 => ti, // Linear
        1 => FixedPoint::ZERO, // Step (Wait, Java code says ti=0, but that means it uses v0)
        2 => { // Easing
            if param >= 0 {
                FixedPoint::ONE - (FixedPoint::ONE - ti.pow_i32(param)).sqrt()
            } else {
                (FixedPoint::ONE - (FixedPoint::ONE - ti).pow_i32(-param)).sqrt()
            }
        }
        4 => { // Sinusoidal
            if param > 0 {
                FixedPoint::ONE - (ti * FixedPoint::HALF_PI).cos()
            } else if param < 0 {
                (ti * FixedPoint::HALF_PI).sin()
            } else {
                (FixedPoint::ONE - (ti * FixedPoint::PI).cos()) / FixedPoint::from_int(2)
            }
        }
        _ => ti, // Default to linear (Lagrange handled separately)
    }
}

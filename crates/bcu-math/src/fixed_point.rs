//! @java: (none)
//! @logic: i64-based fixed-point representation with a scaling factor of 1,000,000.
//! @parity: 100%

use core::ops::{
    Add, AddAssign, Div, DivAssign, Mul, MulAssign, Neg, Rem, RemAssign, Sub, SubAssign,
};

#[derive(Debug, Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Default)]
pub struct FixedPoint(pub i64);

impl FixedPoint {
    pub const SCALE: i64 = 1_000_000;

    pub const ZERO: Self = Self(0);
    pub const ONE: Self = Self(1_000_000);
    pub const PI: Self = Self(3_141_593);
    pub const HALF_PI: Self = Self(1_570_796);
    pub const TWO_PI: Self = Self(6_283_185);

    /// Construct FixedPoint from raw i64 value.
    pub const fn from_raw(raw: i64) -> Self {
        Self(raw)
    }

    /// Construct from f64 by scaling and rounding.
    pub fn from_float(f: f64) -> Self {
        Self((f * Self::SCALE as f64).round() as i64)
    }

    /// Convert to f64 by dividing by scaling factor.
    pub fn to_float(self) -> f64 {
        self.0 as f64 / Self::SCALE as f64
    }

    /// Construct from integer.
    pub fn from_int(val: i64) -> Self {
        Self(val * Self::SCALE)
    }

    /// Convert to integer by dividing by scaling factor.
    pub fn to_int(self) -> i64 {
        self.0 / Self::SCALE
    }

    /// Return absolute value.
    pub fn abs(self) -> Self {
        Self(self.0.abs())
    }

    /// Calculate square root using integer square root on u128.
    pub fn sqrt(self) -> Self {
        if self.0 < 0 {
            panic!(
                "Cannot calculate square root of a negative FixedPoint: {}",
                self.0
            );
        }
        let val = (self.0 as u128) * (Self::SCALE as u128);
        let mut res = 0u128;
        let mut bit = 1u128 << 126;
        while bit > val {
            bit >>= 2;
        }
        let mut temp_val = val;
        while bit != 0 {
            if temp_val >= res + bit {
                temp_val -= res + bit;
                res = (res >> 1) + bit;
            } else {
                res >>= 1;
            }
            bit >>= 2;
        }
        Self(res as i64)
    }

    /// Calculate power with integer exponent.
    pub fn pow_i32(self, n: i32) -> Self {
        if n == 0 {
            return Self::ONE;
        }
        if n < 0 {
            return Self::ONE / self.pow_i32(-n);
        }
        let mut res = Self::ONE;
        let mut base = self;
        let mut exp = n;
        while exp > 0 {
            if exp % 2 == 1 {
                res *= base;
            }
            base *= base;
            exp /= 2;
        }
        res
    }

    /// Trigonometric sine approximation using Taylor series.
    pub fn sin(self) -> Self {
        let mut x_raw = self.0 % 6_283_185;
        if x_raw > 3_141_593 {
            x_raw -= 6_283_185;
        } else if x_raw < -3_141_593 {
            x_raw += 6_283_185;
        }

        if x_raw > 1_570_796 {
            x_raw = 3_141_593 - x_raw;
        } else if x_raw < -1_570_796 {
            x_raw = -3_141_593 - x_raw;
        }

        let x = x_raw as i128;
        let scale = Self::SCALE as i128;
        let x2 = (x * x) / scale;

        let term1 = x;
        let term3 = (term1 * x2) / (scale * 6);
        let term5 = (term3 * x2) / (scale * 20);
        let term7 = (term5 * x2) / (scale * 42);
        let term9 = (term7 * x2) / (scale * 72);
        let term11 = (term9 * x2) / (scale * 110);

        let res = term1 - term3 + term5 - term7 + term9 - term11;
        Self(res as i64)
    }

    /// Trigonometric cosine approximation.
    pub fn cos(self) -> Self {
        Self(self.0 + 1_570_796).sin()
    }

    /// Trigonometric arctangent of y/x using CORDIC algorithm.
    pub fn atan2(y: Self, x: Self) -> Self {
        const CORDIC_ANGLES: [i64; 15] = [
            785398, // atan(1.0)
            463647, // atan(0.5)
            244978, // atan(0.25)
            124354, // atan(0.125)
            62418,  // atan(0.0625)
            31239, 15623, 7812, 3906, 1953, 976, 488, 244, 122, 61,
        ];

        if x.0 == 0 && y.0 == 0 {
            return Self::ZERO;
        }

        let mut curr_x = x.0 as i128;
        let mut curr_y = y.0 as i128;
        let mut angle = 0i64;

        if curr_x < 0 {
            if curr_y >= 0 {
                curr_x = -x.0 as i128;
                curr_y = -y.0 as i128;
                angle = 3_141_593;
            } else {
                curr_x = -x.0 as i128;
                curr_y = -y.0 as i128;
                angle = -3_141_593;
            }
        }

        for (i, &d_angle) in CORDIC_ANGLES.iter().enumerate() {
            let next_x;
            let next_y;
            if curr_y >= 0 {
                next_x = curr_x + (curr_y >> i);
                next_y = curr_y - (curr_x >> i);
                angle += d_angle;
            } else {
                next_x = curr_x - (curr_y >> i);
                next_y = curr_y + (curr_x >> i);
                angle -= d_angle;
            }
            curr_x = next_x;
            curr_y = next_y;
        }

        Self(angle)
    }
}

impl core::fmt::Display for FixedPoint {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        let integral = self.0 / Self::SCALE;
        let fractional = self.0.abs() % Self::SCALE;
        write!(f, "{}.{:06}", integral, fractional)
    }
}

// Operator Implementations

impl Add for FixedPoint {
    type Output = Self;
    fn add(self, rhs: Self) -> Self {
        Self(self.0 + rhs.0)
    }
}

impl AddAssign for FixedPoint {
    fn add_assign(&mut self, rhs: Self) {
        self.0 += rhs.0;
    }
}

impl Sub for FixedPoint {
    type Output = Self;
    fn sub(self, rhs: Self) -> Self {
        Self(self.0 - rhs.0)
    }
}

impl SubAssign for FixedPoint {
    fn sub_assign(&mut self, rhs: Self) {
        self.0 -= rhs.0;
    }
}

impl Mul for FixedPoint {
    type Output = Self;
    fn mul(self, rhs: Self) -> Self {
        Self(((self.0 as i128 * rhs.0 as i128) / Self::SCALE as i128) as i64)
    }
}

impl MulAssign for FixedPoint {
    fn mul_assign(&mut self, rhs: Self) {
        *self = *self * rhs;
    }
}

impl Div for FixedPoint {
    type Output = Self;
    fn div(self, rhs: Self) -> Self {
        if rhs.0 == 0 {
            panic!("Division by zero in FixedPoint");
        }
        Self(((self.0 as i128 * Self::SCALE as i128) / rhs.0 as i128) as i64)
    }
}

impl DivAssign for FixedPoint {
    fn div_assign(&mut self, rhs: Self) {
        *self = *self / rhs;
    }
}

impl Neg for FixedPoint {
    type Output = Self;
    fn neg(self) -> Self {
        Self(-self.0)
    }
}

impl Rem for FixedPoint {
    type Output = Self;
    fn rem(self, rhs: Self) -> Self {
        if rhs.0 == 0 {
            panic!("Remainder by zero in FixedPoint");
        }
        Self(self.0 % rhs.0)
    }
}

impl RemAssign for FixedPoint {
    fn rem_assign(&mut self, rhs: Self) {
        *self = *self % rhs;
    }
}

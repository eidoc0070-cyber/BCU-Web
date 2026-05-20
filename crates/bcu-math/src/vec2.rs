//! @java: common.system.P
//! @logic: 2D Vector/Point using FixedPoint math.
//! @parity: 100%

use crate::FixedPoint;
use core::ops::{Add, AddAssign, Div, DivAssign, Mul, MulAssign, Sub, SubAssign};

#[derive(Debug, Copy, Clone, PartialEq, Eq, Default)]
pub struct Vec2 {
    pub x: FixedPoint,
    pub y: FixedPoint,
}

impl Vec2 {
    pub const ZERO: Self = Self {
        x: FixedPoint::ZERO,
        y: FixedPoint::ZERO,
    };

    pub const fn new(x: FixedPoint, y: FixedPoint) -> Self {
        Self { x, y }
    }

    pub fn polar(r: FixedPoint, t: FixedPoint) -> Self {
        Self {
            x: r * t.cos(),
            y: r * t.sin(),
        }
    }

    pub fn reg(cx: FixedPoint) -> FixedPoint {
        if cx < FixedPoint::ZERO {
            FixedPoint::ZERO
        } else if cx > FixedPoint::ONE {
            FixedPoint::ONE
        } else {
            cx
        }
    }

    pub fn abs(self) -> FixedPoint {
        self.distance(Self::ZERO)
    }

    pub fn atan2(self) -> FixedPoint {
        FixedPoint::atan2(self.y, self.x)
    }

    pub fn atan2_to(self, p: Vec2) -> FixedPoint {
        self.sub_from(p).atan2()
    }

    pub fn cross_product(self, p: Vec2) -> FixedPoint {
        self.x * p.y - self.y * p.x
    }

    pub fn distance(self, p: Vec2) -> FixedPoint {
        let dx = p.x - self.x;
        let dy = p.y - self.y;
        (dx * dx + dy * dy).sqrt()
    }

    pub fn divide(&mut self, p: Vec2) -> &mut Self {
        self.x /= p.x;
        self.y /= p.y;
        self
    }

    pub fn dot_product(self, p: Vec2) -> FixedPoint {
        self.x * p.x + self.y * p.y
    }

    pub fn limit(&mut self, b2: Vec2) -> bool {
        self.limit_range(Self::ZERO, b2)
    }

    pub fn limit_range(&mut self, b1: Vec2, b2: Vec2) -> bool {
        let ans = self.out_range(b1, b2, FixedPoint::ZERO);
        if self.x < b1.x {
            self.x = b1.x;
        }
        if self.x > b2.x {
            self.x = b2.x;
        }
        if self.y < b1.y {
            self.y = b1.y;
        }
        if self.y > b2.y {
            self.y = b2.y;
        }
        ans
    }

    pub fn middle(self, p: Vec2, per: FixedPoint) -> Self {
        self + self.sub_from(p) * per
    }

    pub fn middle_c(self, p: Vec2, per: FixedPoint) -> Self {
        let half = FixedPoint::from_raw(500_000); // 0.5
        let factor = (FixedPoint::ONE - (per * FixedPoint::PI).cos()) * half;
        self + self.sub_from(p) * factor
    }

    pub fn move_out(self, v: Vec2, b2: Vec2, r: FixedPoint) -> bool {
        self.move_out_range(v, Self::ZERO, b2, r)
    }

    pub fn move_out_range(self, v: Vec2, b1: Vec2, b2: Vec2, r: FixedPoint) -> bool {
        (self.x + r < b1.x && v.x <= FixedPoint::ZERO)
            || (self.y + r < b1.y && v.y <= FixedPoint::ZERO)
            || (self.x - r > b2.x && v.x >= FixedPoint::ZERO)
            || (self.y - r > b2.y && v.y >= FixedPoint::ZERO)
    }

    pub fn out(self, b2: Vec2, r: FixedPoint) -> bool {
        self.out_range(Self::ZERO, b2, r)
    }

    pub fn out_range(self, b1: Vec2, b2: Vec2, r: FixedPoint) -> bool {
        self.x + r < b1.x || self.y + r < b1.y || self.x - r > b2.x || self.y - r > b2.y
    }

    pub fn plus(&mut self, px: FixedPoint, py: FixedPoint) -> &mut Self {
        self.x += px;
        self.y += py;
        self
    }

    pub fn add_vec(&mut self, p: Vec2) -> &mut Self {
        self.x += p.x;
        self.y += p.y;
        self
    }

    pub fn add_scaled(&mut self, p: Vec2, n: FixedPoint) -> &mut Self {
        self.x += p.x * n;
        self.y += p.y * n;
        self
    }

    pub fn positivize(&mut self) -> &mut Self {
        if self.x < FixedPoint::ZERO {
            self.x = -self.x;
        }
        if self.y < FixedPoint::ZERO {
            self.y = -self.y;
        }
        self
    }

    pub fn rotate(&mut self, t: FixedPoint) -> &mut Self {
        let cos_t = t.cos();
        let sin_t = t.sin();
        let tx = self.x * cos_t - self.y * sin_t;
        let ty = self.y * cos_t + self.x * sin_t;
        self.x = tx;
        self.y = ty;
        self
    }

    pub fn set_to(&mut self, tx: FixedPoint, ty: FixedPoint) -> &mut Self {
        self.x = tx;
        self.y = ty;
        self
    }

    pub fn set_to_vec(&mut self, p: Vec2) -> &mut Self {
        self.x = p.x;
        self.y = p.y;
        self
    }

    pub fn sub_from(self, p: Vec2) -> Self {
        Self {
            x: p.x - self.x,
            y: p.y - self.y,
        }
    }

    pub fn times(&mut self, d: FixedPoint) -> &mut Self {
        self.x *= d;
        self.y *= d;
        self
    }

    pub fn times_scale(&mut self, hf: FixedPoint, vf: FixedPoint) -> &mut Self {
        self.x *= hf;
        self.y *= vf;
        self
    }

    pub fn times_vec(&mut self, p: Vec2) -> &mut Self {
        self.x *= p.x;
        self.y *= p.y;
        self
    }
}

impl core::fmt::Display for Vec2 {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "{},{}", self.x, self.y)
    }
}

// Operators

impl Add for Vec2 {
    type Output = Self;
    fn add(self, rhs: Self) -> Self {
        Self {
            x: self.x + rhs.x,
            y: self.y + rhs.y,
        }
    }
}

impl AddAssign for Vec2 {
    fn add_assign(&mut self, rhs: Self) {
        self.x += rhs.x;
        self.y += rhs.y;
    }
}

impl Sub for Vec2 {
    type Output = Self;
    fn sub(self, rhs: Self) -> Self {
        Self {
            x: self.x - rhs.x,
            y: self.y - rhs.y,
        }
    }
}

impl SubAssign for Vec2 {
    fn sub_assign(&mut self, rhs: Self) {
        self.x -= rhs.x;
        self.y -= rhs.y;
    }
}

impl Mul for Vec2 {
    type Output = Self;
    fn mul(self, rhs: Self) -> Self {
        Self {
            x: self.x * rhs.x,
            y: self.y * rhs.y,
        }
    }
}

impl MulAssign for Vec2 {
    fn mul_assign(&mut self, rhs: Self) {
        self.x *= rhs.x;
        self.y *= rhs.y;
    }
}

impl Mul<FixedPoint> for Vec2 {
    type Output = Self;
    fn mul(self, rhs: FixedPoint) -> Self {
        Self {
            x: self.x * rhs,
            y: self.y * rhs,
        }
    }
}

impl MulAssign<FixedPoint> for Vec2 {
    fn mul_assign(&mut self, rhs: FixedPoint) {
        self.x *= rhs;
        self.y *= rhs;
    }
}

impl Div<FixedPoint> for Vec2 {
    type Output = Self;
    fn div(self, rhs: FixedPoint) -> Self {
        Self {
            x: self.x / rhs,
            y: self.y / rhs,
        }
    }
}

impl DivAssign<FixedPoint> for Vec2 {
    fn div_assign(&mut self, rhs: FixedPoint) {
        self.x /= rhs;
        self.y /= rhs;
    }
}

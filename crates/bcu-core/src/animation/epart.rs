//! @java: common.util.anim.EPart
//! @logic: Runtime animation part state, handling transforms and property modifications.
//! @parity: 0% (Definition only)

use crate::data::MaModel;
use bcu_math::{FixedPoint, Vec2};
use serde::Serialize;
use ts_rs::TS;

#[derive(Clone, Copy, Debug, Serialize, TS)]
#[ts(export)]
pub struct RenderState {
    pub pos: Vec2,
    pub sca: Vec2,
    pub angle: FixedPoint,
    pub opacity: FixedPoint,
    pub img: i32,
    pub z: i32,
}

impl RenderState {
    pub fn lerp(&self, other: &Self, alpha: f32) -> Self {
        let a = FixedPoint::from_float(alpha as f64);
        let inv_a = FixedPoint::ONE - a;

        Self {
            pos: self.pos * inv_a + other.pos * a,
            sca: self.sca * inv_a + other.sca * a,
            angle: self.angle * inv_a + other.angle * a,
            opacity: self.opacity * inv_a + other.opacity * a,
            img: if alpha > 0.5 { other.img } else { self.img },
            z: if alpha > 0.5 { other.z } else { self.z },
        }
    }
}

impl Default for RenderState {
    fn default() -> Self {
        Self {
            pos: Vec2::ZERO,
            sca: Vec2::new(FixedPoint::ONE, FixedPoint::ONE),
            angle: FixedPoint::ZERO,
            opacity: FixedPoint::ONE,
            img: -1,
            z: 0,
        }
    }
}

pub struct EPart {
    pub name: String,
    pub ind: usize,

    // Snapshots for interpolation
    pub prev_state: RenderState,
    pub curr_state: RenderState,

    // Pointers (indices)
    pub parent_idx: Option<usize>,

    // Properties
    pub id: i32,
    pub img: i32,
    pub z: i32,
    pub pos: Vec2,
    pub piv: Vec2,
    pub sca: Vec2,
    pub gsca: FixedPoint,
    pub angle: FixedPoint,
    pub opacity: FixedPoint,
    pub hf: i32,
    pub vf: i32,

    pub glow: i32,
    pub ext_type: i32,
    pub extend_x: FixedPoint,
    pub extend_y: FixedPoint,

    // Initial values (from MaModel)
    pub args: [i32; 14],
}

impl EPart {
    pub fn new(ind: usize, name: String, args: [i32; 14], model: &MaModel) -> Self {
        EPart {
            name,
            ind,
            parent_idx: if args[0] < 0 {
                None
            } else {
                Some(args[0] as usize)
            },
            prev_state: RenderState::default(),
            curr_state: RenderState::default(),
            id: args[1],
            img: args[2],
            z: args[3] * (model.n as i32) + (ind as i32),
            pos: Vec2::new(
                FixedPoint::from_int(args[4] as i64),
                FixedPoint::from_int(args[5] as i64),
            ),
            piv: Vec2::new(
                FixedPoint::from_int(args[6] as i64),
                FixedPoint::from_int(args[7] as i64),
            ),
            sca: Vec2::new(
                FixedPoint::from_int(args[8] as i64),
                FixedPoint::from_int(args[9] as i64),
            ),
            gsca: FixedPoint::from_int(model.ints[0] as i64),
            angle: FixedPoint::from_int(args[10] as i64),
            opacity: FixedPoint::from_int(args[11] as i64),
            hf: 1,
            vf: 1,
            glow: args[12],
            ext_type: 0,
            extend_x: FixedPoint::ZERO,
            extend_y: FixedPoint::ZERO,
            args,
        }
    }

    /// Update snapshots: Move current to previous, and capture new hierarchical state.
    /// Should be called after logic updates.
    pub fn update_snapshots(&mut self, entities: &[EPart], model: &MaModel) {
        self.prev_state = self.curr_state;
        let (pos, sca, angle) = self.get_transform(entities, model);
        self.curr_state = RenderState {
            pos,
            sca,
            angle,
            opacity: self.get_opa(entities, model),
            img: self.img,
            z: self.z,
        };
    }

    pub fn alter(&mut self, m: i32, v: FixedPoint, n_parts: usize, model: &MaModel) {
        let mi = FixedPoint::from_int(model.ints[0] as i64);
        let oi = FixedPoint::from_int(model.ints[2] as i64);

        match m {
            0 => {
                let v_i = v.to_int() as usize;
                if v_i < n_parts && v_i != self.ind {
                    self.parent_idx = Some(v_i);
                } else {
                    self.parent_idx = Some(0);
                }
                // TODO: Loop detection? Java has isParentValid check here.
            }
            1 => self.id = v.to_int() as i32,
            2 => self.img = v.to_int() as i32,
            3 => self.z = v.to_int() as i32 * (n_parts as i32) + (self.ind as i32),
            4 => self.pos.x = FixedPoint::from_int(self.args[4] as i64) + v,
            5 => self.pos.y = FixedPoint::from_int(self.args[5] as i64) + v,
            6 => self.piv.x = FixedPoint::from_int(self.args[6] as i64) + v,
            7 => self.piv.y = FixedPoint::from_int(self.args[7] as i64) + v,
            8 => {
                let factor = v / mi;
                self.sca.x = FixedPoint::from_int(self.args[8] as i64) * factor;
                self.sca.y = FixedPoint::from_int(self.args[9] as i64) * factor;
            }
            9 => self.sca.x = FixedPoint::from_int(self.args[8] as i64) * v / mi,
            10 => self.sca.y = FixedPoint::from_int(self.args[9] as i64) * v / mi,
            11 => self.angle = FixedPoint::from_int(self.args[10] as i64) + v,
            12 => self.opacity = v * FixedPoint::from_int(self.args[11] as i64) / oi,
            13 => self.hf = if v == FixedPoint::ZERO { 1 } else { -1 },
            14 => self.vf = if v == FixedPoint::ZERO { 1 } else { -1 },
            50 => {
                self.extend_x = v;
                self.ext_type = 0;
            }
            51 => {
                self.extend_x = v;
                self.ext_type = 1;
            }
            52 => {
                self.extend_y = v;
                self.ext_type = 0;
            }
            53 => self.gsca = v,
            _ => {
                // Ignore unhandled modifications for now or log error if we had logging
            }
        }
    }

    pub fn get_transform(&self, entities: &[EPart], model: &MaModel) -> (Vec2, Vec2, FixedPoint) {
        let mi = FixedPoint::from_int(model.ints[0] as i64);
        let ri = FixedPoint::from_int(model.ints[1] as i64);

        let mut p_pos = Vec2::ZERO;
        let mut p_sca = Vec2::new(FixedPoint::ONE, FixedPoint::ONE);
        let mut p_angle = FixedPoint::ZERO;

        if let Some(p_idx) = self.parent_idx {
            let (pp, ps, pa) = entities[p_idx].get_transform(entities, model);
            p_pos = pp;
            p_sca = ps;
            p_angle = pa;
        }

        // 현재 파트의 좌표를 부모의 스케일(반전 포함)에 맞춰 변환
        let mut current_pos = self.pos * p_sca;

        if p_angle != FixedPoint::ZERO {
            current_pos.rotate(p_angle * FixedPoint::TWO_PI / ri);
        }

        let final_pos = p_pos + current_pos;

        // 최종 스케일 계산 (부모 스케일 * 내 스케일 * 내 반전)
        let mut final_sca = p_sca * self.sca / mi;
        final_sca.x *= FixedPoint::from_int(self.hf as i64);
        final_sca.y *= FixedPoint::from_int(self.vf as i64);

        let final_angle = p_angle + self.angle;

        (final_pos, final_sca, final_angle)
    }

    pub fn get_size(&self, entities: &[EPart], model: &MaModel) -> Vec2 {
        let mi = FixedPoint::from_int(model.ints[0] as i64);
        // mi * mi might overflow if we are not careful with SCALE.
        // In FixedPoint multiplication, it's (a * b) / SCALE.
        // So (mi * mi) / SCALE.
        // gsca * mi_inv * mi_inv in Java is gsca / (model.ints[0] * model.ints[0]).

        let scale_factor = (self.gsca / mi) / mi;

        if let Some(p_idx) = self.parent_idx {
            entities[p_idx].get_size(entities, model) * self.sca * scale_factor
        } else {
            self.sca * scale_factor
        }
    }

    pub fn get_opa(&self, entities: &[EPart], model: &MaModel) -> FixedPoint {
        let oi = FixedPoint::from_int(model.ints[2] as i64);
        if self.opacity == FixedPoint::ZERO {
            return FixedPoint::ZERO;
        }
        if let Some(p_idx) = self.parent_idx {
            entities[p_idx].get_opa(entities, model) * (self.opacity / oi)
        } else {
            self.opacity / oi
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::data::MaModel;

    #[test]
    fn test_hierarchical_flip_propagation() {
        let model = MaModel {
            n: 2,
            m: 0,
            parts: vec![
                [-1, -1, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0], // Part 0 (Parent)
                [0, -1, 0, 0, 100, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0], // Part 1 (Child at x=100)
            ],
            strs0: vec!["Parent".to_string(), "Child".to_string()],
            ints: [1000, 3600, 1000],
            confs: vec![],
            strs1: vec![],
        };

        let _p = EPart::new(0, "Parent".to_string(), model.parts[0], &model);
        let c = EPart::new(1, "Child".to_string(), model.parts[1], &model);

        // 1. No flip: Child should be at x=100
        let entities = vec![
            EPart::new(0, "Parent".to_string(), model.parts[0], &model),
            EPart::new(1, "Child".to_string(), model.parts[1], &model),
        ];
        let (pos, _, _) = entities[1].get_transform(&entities, &model);
        assert_eq!(pos.x.to_int(), 100);

        // 2. Parent flipped (HF = -1): Child should be at x=-100
        let mut p_flipped = EPart::new(0, "Parent".to_string(), model.parts[0], &model);
        p_flipped.hf = -1;

        let entities_flipped = vec![p_flipped, c];
        let (pos_flipped, _, _) = entities_flipped[1].get_transform(&entities_flipped, &model);

        // Parent HF=-1 mirrors the child's relative X position
        assert_eq!(pos_flipped.x.to_int(), -100);
        println!(
            "✓ Hierarchical flip propagation verified: Child mirrored to {}",
            pos_flipped.x.to_int()
        );
    }
}

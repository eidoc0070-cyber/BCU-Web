//! @java: common.util.anim.MaAnim / common.util.anim.Part
//! @logic: Runtime animation update logic, applying keyframes to EPart states.
//! @parity: 0%

use crate::animation::epart::EPart;
use crate::animation::interpolation::get_ti;
use crate::data::{MaAnim, MaModel, Part};
use bcu_math::FixedPoint;
use serde::Serialize;
use ts_rs::TS;

#[derive(Serialize, TS)]
#[ts(export)]
pub struct AnimationState {
    pub current_frame: f32,
    pub max_frame: i32,
    pub parts: Vec<PartState>,
    pub anim: MaAnim,
}

#[derive(Serialize, TS)]
#[ts(export)]
pub struct PartState {
    pub index: usize,
    pub name: String,
    pub parent: i32,
    pub z_order: i32,
    pub raw_args: [i32; 14],
}

pub struct EAnimD {
    pub model: MaModel,
    pub anim: MaAnim,
    pub entities: Vec<EPart>,
    pub order: Vec<usize>,
    pub frame: FixedPoint,
}

impl EAnimD {
    pub fn new(model: MaModel, anim: MaAnim) -> Self {
        let mut entities = Vec::with_capacity(model.n);
        let mut order = Vec::with_capacity(model.n);
        for i in 0..model.n {
            entities.push(EPart::new(
                i,
                model.strs0[i].clone(),
                model.parts[i],
                &model,
            ));
            order.push(i);
        }
        Self {
            model,
            anim,
            entities,
            order,
            frame: FixedPoint::ZERO,
        }
    }

    pub fn get_state(&self) -> AnimationState {
        let parts = self
            .entities
            .iter()
            .map(|e| PartState {
                index: e.ind,
                name: e.name.clone(),
                parent: e.args[0],
                z_order: e.z,
                raw_args: e.args,
            })
            .collect();

        AnimationState {
            current_frame: self.frame.to_float() as f32,
            max_frame: self.anim.max,
            parts,
            anim: self.anim.clone(),
        }
    }

    pub fn set_frame(&mut self, frame: f32) {
        self.frame = FixedPoint::from_float(frame as f64);
        update_maanim(
            &self.anim,
            self.frame,
            &mut self.entities,
            &self.model,
            false,
        );
        self.sort();
    }

    pub fn update_model_part(&mut self, idx: usize, field: usize, value: i32) {
        if idx >= self.model.n || field >= 14 {
            return;
        }

        // 1. Update the original model data
        self.model.parts[idx][field] = value;

        // 2. Refresh the runtime entity state
        // In BCU, initial MaModel values are used as base for MaAnim offsets.
        // Re-initializing the EPart with new model data.
        self.entities[idx] = EPart::new(
            idx,
            self.model.strs0[idx].clone(),
            self.model.parts[idx],
            &self.model,
        );

        // 3. Re-apply current animation frame to ensure the new base is correctly offset
        update_maanim(
            &self.anim,
            self.frame,
            &mut self.entities,
            &self.model,
            false,
        );
        self.sort();
    }

    pub fn update_anim_keyframe(
        &mut self,
        part_idx: usize,
        modif_type: i32,
        move_idx: usize,
        new_frame: i32,
    ) {
        // Find the animation part that matches the model part index and modification type
        if let Some(p) = self
            .anim
            .parts
            .iter_mut()
            .find(|p| p.ints[0] == part_idx as i32 && p.ints[1] == modif_type)
        {
            if move_idx < p.moves.len() {
                p.moves[move_idx][0] = new_frame + p.off;
                p.validate();
                self.anim.validate();

                // Refresh animation state
                update_maanim(
                    &self.anim,
                    self.frame,
                    &mut self.entities,
                    &self.model,
                    false,
                );
                self.sort();
            }
        }
    }

    pub fn add_anim_keyframe(&mut self, part_idx: usize, modif_type: i32, frame: i32, value: i32) {
        // Find or create the animation part
        let p_idx = match self
            .anim
            .parts
            .iter()
            .position(|p| p.ints[0] == part_idx as i32 && p.ints[1] == modif_type)
        {
            Some(idx) => idx,
            None => {
                let mut new_p = Part::new(part_idx as i32, modif_type);
                new_p.ints[2] = 1; // Default to single play
                self.anim.parts.push(new_p);
                self.anim.n += 1;
                self.anim.parts.len() - 1
            }
        };

        let p = &mut self.anim.parts[p_idx];
        let actual_frame = frame + p.off;

        // Find insert position to keep moves sorted by frame
        let insert_at = match p.moves.iter().position(|m| m[0] >= actual_frame) {
            Some(idx) => {
                if p.moves[idx][0] == actual_frame {
                    // Overwrite existing keyframe at same frame
                    p.moves[idx][1] = value;
                    None
                } else {
                    Some(idx)
                }
            }
            None => Some(p.moves.len()),
        };

        if let Some(idx) = insert_at {
            p.moves.insert(idx, [actual_frame, value, 0, 0]); // Default to linear
            p.n += 1;
        }

        p.validate();
        self.anim.validate();
        update_maanim(
            &self.anim,
            self.frame,
            &mut self.entities,
            &self.model,
            false,
        );
        self.sort();
    }

    pub fn delete_anim_keyframe(&mut self, part_idx: usize, modif_type: i32, move_idx: usize) {
        if let Some(p) = self
            .anim
            .parts
            .iter_mut()
            .find(|p| p.ints[0] == part_idx as i32 && p.ints[1] == modif_type)
        {
            if move_idx < p.moves.len() {
                p.moves.remove(move_idx);
                p.n -= 1;
                p.validate();
                self.anim.validate();
                update_maanim(
                    &self.anim,
                    self.frame,
                    &mut self.entities,
                    &self.model,
                    false,
                );
                self.sort();
            }
        }
    }

    pub fn update(&mut self, rotate: bool) {
        update_maanim(
            &self.anim,
            self.frame,
            &mut self.entities,
            &self.model,
            rotate,
        );
        self.frame += FixedPoint::ONE;
        if self.frame > FixedPoint::from_int(self.anim.max as i64) {
            if rotate {
                self.frame = FixedPoint::ZERO;
            } else {
                self.frame = FixedPoint::from_int(self.anim.max as i64);
            }
        }
        self.sort();
    }

    pub fn sort(&mut self) {
        let entities = &self.entities;
        self.order.sort_by(|&a, &b| {
            let za = entities[a].z;
            let zb = entities[b].z;
            if za != zb {
                za.cmp(&zb)
            } else {
                a.cmp(&b)
            }
        });
    }

    pub fn add_part(&mut self, parent: i32) {
        let new_idx = self.model.n;
        self.model.n += 1;

        let mut new_part_data = [-1; 14];
        new_part_data[0] = parent; // parent
        new_part_data[1] = -1; // z-order
        new_part_data[2] = 0; // img
        new_part_data[3] = 0; // glow
        new_part_data[4] = 0; // x
        new_part_data[5] = 0; // y
        new_part_data[6] = 0; // pivot x
        new_part_data[7] = 0; // pivot y
        new_part_data[8] = 1000; // sx
        new_part_data[9] = 1000; // sy
        new_part_data[10] = 0; // angle
        new_part_data[11] = 1000; // opacity
        new_part_data[12] = 0; // flip-h
        new_part_data[13] = 0; // flip-v

        self.model.parts.push(new_part_data);
        let name = format!("Part {}", new_idx);
        self.model.strs0.push(name.clone());

        self.entities
            .push(EPart::new(new_idx, name, new_part_data, &self.model));
        self.order.push(new_idx);
        self.sort();
    }

    pub fn delete_part(&mut self, idx: usize) {
        if idx >= self.model.n {
            return;
        }

        // 1. Remove from model and entities
        self.model.parts.remove(idx);
        self.model.strs0.remove(idx);
        self.model.n -= 1;
        self.entities.remove(idx);

        // 2. Adjust indices and parents
        for i in 0..self.model.n {
            self.entities[i].ind = i;
            if self.model.parts[i][0] == idx as i32 {
                self.model.parts[i][0] = -1;
            } else if self.model.parts[i][0] > idx as i32 {
                self.model.parts[i][0] -= 1;
            }
            self.entities[i].args[0] = self.model.parts[i][0];
        }

        // 3. Adjust animation references
        self.anim.parts.retain(|p| p.ints[0] != idx as i32);
        for p in self.anim.parts.iter_mut() {
            if p.ints[0] > idx as i32 {
                p.ints[0] -= 1;
            }
        }
        self.anim.n = self.anim.parts.len();
        self.anim.validate();

        // 4. Update order
        self.order = (0..self.model.n).collect();
        self.sort();
    }
}

pub fn update_maanim(
    anim: &MaAnim,
    f: FixedPoint,
    entities: &mut [EPart],
    model: &MaModel,
    rotate: bool,
) {
    let mut f = f;
    let max_fp = FixedPoint::from_int(anim.max as i64);
    if rotate {
        f %= max_fp + FixedPoint::ONE;
    }

    if f == FixedPoint::ZERO {
        for e in entities.iter_mut() {
            // setValue() logic
            *e = EPart::new(e.ind, e.name.clone(), e.args, model);
        }
    }

    for i in 0..anim.n {
        let part = &anim.parts[i];
        let loop_flag = part.ints[2];
        let smax = part.max;
        let fir = part.fir;
        let lmax = smax - fir;

        let prot = rotate || loop_flag == -1;

        let mut frame: FixedPoint;

        if prot {
            let mf = if loop_flag == -1 { smax } else { anim.max + 1 };
            if mf == 0 {
                frame = FixedPoint::ZERO;
            } else {
                let mf_fp = FixedPoint::from_int(mf as i64);
                frame = (f + FixedPoint::from_int(part.off as i64)) % mf_fp;
            }
        } else {
            frame = f + FixedPoint::from_int(part.off as i64);
        }

        if loop_flag > 0 && lmax != 0 {
            let loop_end = FixedPoint::from_int((fir + loop_flag * lmax) as i64);
            if frame > loop_end {
                ensure_last(part, entities, model);
                continue;
            }
            if frame <= FixedPoint::from_int(fir as i64) {
                // frame stays as is
            } else if frame < loop_end {
                let lmax_fp = FixedPoint::from_int(lmax as i64);
                let fir_fp = FixedPoint::from_int(fir as i64);
                frame = fir_fp + (frame - fir_fp) % lmax_fp;
            } else {
                frame = FixedPoint::from_int(smax as i64);
            }
        }

        update_part(part, frame, entities, model);
    }

    // Z-order sorting is usually done in the renderer (EAnimD),
    // but the engine needs it for some logic too.
}

fn ensure_last(part: &Part, entities: &mut [EPart], model: &MaModel) {
    if part.n == 0 {
        return;
    }
    let last_move = &part.moves[part.n - 1];
    let val = FixedPoint::from_int(last_move[1] as i64);
    entities[part.ints[0] as usize].alter(part.ints[1], val, entities.len(), model);
}

fn update_part(part: &Part, frame: FixedPoint, entities: &mut [EPart], model: &MaModel) {
    if part.n == 0 {
        return;
    }

    for i in 0..part.n {
        let m0 = &part.moves[i];
        let f0_i = m0[0];
        let f0 = FixedPoint::from_int(f0_i as i64);

        if frame == f0 {
            let val = FixedPoint::from_int(m0[1] as i64);
            entities[part.ints[0] as usize].alter(part.ints[1], val, entities.len(), model);
            return;
        } else if i < part.n - 1 {
            let m1 = &part.moves[i + 1];
            let f1_i = m1[0];
            let f1 = FixedPoint::from_int(f1_i as i64);

            if frame > f0 && frame < f1 {
                if part.ints[1] > 1 {
                    let v0 = m0[1];
                    let v1 = m1[1];

                    let mut real_frame = frame;
                    if f1_i - f0_i == 1 {
                        real_frame = FixedPoint::from_int(frame.to_int() as i32 as i64);
                    }

                    let diff_f = FixedPoint::from_int((f1_i - f0_i) as i64);
                    let mut ti = (real_frame - f0) / diff_f;

                    if m0[2] == 1 || part.ints[1] == 13 || part.ints[1] == 14 {
                        ti = FixedPoint::ZERO;
                    } else if m0[2] == 0 {
                        // Linear, ti = ti
                    } else if m0[2] == 3 {
                        // Lagrange
                        let val = ease3(part, i, real_frame);
                        entities[part.ints[0] as usize].alter(
                            part.ints[1],
                            FixedPoint::from_int(val as i64),
                            entities.len(),
                            model,
                        );
                        return;
                    } else {
                        ti = get_ti(ti, m0[2], m0[3]);
                    }

                    let v0_fp = FixedPoint::from_int(v0 as i64);
                    let vd: FixedPoint;

                    if part.ints[1] == 2 {
                        // Sprite ID interpolation: if decreasing, use ceil?
                        // Java: if (v1 - v0 < 0) vd = (int) Math.ceil((v1 - v0) * ti + v0); else vd = (int) ((v1 - v0) * ti + v0);
                        let diff_v = FixedPoint::from_int((v1 - v0) as i64);
                        let multiplied = diff_v * ti;
                        if v1 - v0 < 0 {
                            // Ceiling of a negative number: -0.1 -> 0
                            // In FixedPoint: multiplied.0 / SCALE might truncate towards zero.
                            // -100_000 / 1_000_000 = 0. Correct.
                            // -1_100_000 / 1_000_000 = -1. Correct.
                            // Wait, Java Math.ceil(-0.1) is 0.0.
                            // Our FixedPoint to_i32() truncates towards zero.
                            // -0.1 (FixedPoint(-100,000)) -> to_i32() is 0.
                            // -1.1 (FixedPoint(-1,100,000)) -> to_i32() is -1.
                            // This matches Math.ceil for negative numbers? No, ceil(-1.1) is -1.0.
                            // Truncate(-1.1) is -1. Correct.
                            // Truncate(-0.1) is 0. Correct.
                            // So to_i32() is fine for Sprite ID.
                            vd = FixedPoint::from_int((multiplied + v0_fp).to_int() as i32 as i64);
                        } else {
                            vd = FixedPoint::from_int((multiplied + v0_fp).to_int() as i32 as i64);
                        }
                    } else {
                        let diff_v = FixedPoint::from_int((v1 - v0) as i64);
                        vd = diff_v * ti + v0_fp;
                    }

                    entities[part.ints[0] as usize].alter(part.ints[1], vd, entities.len(), model);
                    return;
                } else if part.ints[1] == 0 {
                    // Parent index: no interpolation
                    let val = FixedPoint::from_int(m0[1] as i64);
                    entities[part.ints[0] as usize].alter(part.ints[1], val, entities.len(), model);
                    return;
                }
            }
        }
    }

    if frame > FixedPoint::from_int(part.moves[part.n - 1][0] as i64) {
        ensure_last(part, entities, model);
    }
}

fn ease3(part: &Part, i: usize, frame: FixedPoint) -> i32 {
    let mut low = i;
    let mut high = i;

    for j in (0..i).rev() {
        if part.moves[j][2] == 3 {
            low = j;
        } else {
            break;
        }
    }
    for j in (i + 1)..part.n {
        high = j;
        if part.moves[j][2] != 3 {
            break;
        }
    }

    let mut sum = 0.0f64; // Using f64 for lagrange to avoid complex FixedPoint overflow handling for now
                          // Java uses double too.
    let f = frame.to_float();
    for j in low..=high {
        let mut val = part.moves[j][1] as f64 * 4096.0;
        for k in low..=high {
            if j != k {
                val *= (f - part.moves[k][0] as f64)
                    / (part.moves[j][0] as f64 - part.moves[k][0] as f64);
            }
        }
        sum += val;
    }
    (sum / 4096.0) as i32
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::{MaAnim, MaModel, Part};
    use bcu_math::FixedPoint;

    #[test]
    fn test_animation_update_linear() {
        let model = MaModel {
            n: 1,
            m: 0,
            parts: vec![[-1, -1, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0]],
            strs0: vec!["Root".to_string()],
            ints: [1000, 3600, 1000],
            confs: vec![],
            strs1: vec![],
        };

        let mut part = Part::new(0, 11); // Part 0, Rotation
        part.ints[2] = 1; // Single play
        part.moves = vec![
            [0, 0, 0, 0],    // Frame 0, Value 0, Linear
            [10, 100, 0, 0], // Frame 10, Value 100
        ];
        part.n = 2;
        part.validate();

        let anim = MaAnim {
            n: 1,
            parts: vec![part],
            max: 10,
            len: 10,
        };

        let mut entities = vec![EPart::new(0, "Root".to_string(), model.parts[0], &model)];

        // Update at frame 5 (halfway)
        update_maanim(&anim, FixedPoint::from_int(5), &mut entities, &model, false);

        // Expected value: 0 + 50 = 50
        assert_eq!(entities[0].angle.to_int(), 50);

        // Update at frame 10
        update_maanim(
            &anim,
            FixedPoint::from_int(10),
            &mut entities,
            &model,
            false,
        );
        assert_eq!(entities[0].angle.to_int(), 100);
    }

    #[test]
    fn test_animation_update_step() {
        let model = MaModel {
            n: 1,
            m: 0,
            parts: vec![[-1, -1, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0]],
            strs0: vec!["Root".to_string()],
            ints: [1000, 3600, 1000],
            confs: vec![],
            strs1: vec![],
        };

        let mut part = Part::new(0, 2); // Part 0, Sprite
        part.ints[2] = 1; // Single play
        part.moves = vec![
            [0, 0, 1, 0],  // Frame 0, Value 0, Step
            [10, 5, 1, 0], // Frame 10, Value 5
        ];
        part.n = 2;
        part.validate();

        let anim = MaAnim {
            n: 1,
            parts: vec![part],
            max: 10,
            len: 10,
        };

        let mut entities = vec![EPart::new(0, "Root".to_string(), model.parts[0], &model)];

        // Update at frame 5
        update_maanim(&anim, FixedPoint::from_int(5), &mut entities, &model, false);
        // Step interpolation should keep it at 0
        assert_eq!(entities[0].img, 0);

        // Update at frame 10
        update_maanim(
            &anim,
            FixedPoint::from_int(10),
            &mut entities,
            &model,
            false,
        );
        assert_eq!(entities[0].img, 5);
    }
    #[test]
    fn test_get_part_transform_hierarchical() {
        let model = MaModel {
            n: 2,
            m: 0,
            parts: vec![
                [-1, -1, 0, 0, 10, 20, 0, 0, 1000, 1000, 0, 1000, 0, 0], // Part 0 at (10, 20)
                [0, -1, 0, 0, 100, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0],  // Part 1 at rel (100, 0)
            ],
            strs0: vec!["Parent".to_string(), "Child".to_string()],
            ints: [1000, 3600, 1000],
            confs: vec![],
            strs1: vec![],
        };
        let anim = MaAnim {
            n: 0,
            parts: vec![],
            max: 0,
            len: 0,
        };
        let display = EAnimD::new(model, anim);

        let (pos, _, _) = display.entities[1].get_transform(&display.entities, &display.model);
        // Parent(10) + ChildRel(100) = 110
        assert_eq!(pos.x.to_int(), 110);
        assert_eq!(pos.y.to_int(), 20);
    }

    #[test]
    fn test_update_anim_keyframe_logic() {
        let model = MaModel {
            n: 1,
            m: 0,
            parts: vec![[-1, -1, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0]],
            strs0: vec!["Root".to_string()],
            ints: [1000, 3600, 1000],
            confs: vec![],
            strs1: vec![],
        };

        let mut part = Part::new(0, 11); // Part 0, Rotation
        part.off = 0;
        part.moves = vec![[0, 0, 0, 0], [10, 100, 0, 0]];
        part.n = 2;
        part.validate();

        let anim = MaAnim {
            n: 1,
            parts: vec![part],
            max: 10,
            len: 10,
        };

        let mut display = EAnimD::new(model, anim);

        // 1. Initial state at frame 5: angle should be 50
        display.set_frame(5.0);
        assert_eq!(display.entities[0].angle.to_int(), 50);

        // 2. Move keyframe at frame 10 to frame 20
        display.update_anim_keyframe(0, 11, 1, 20);

        // 3. New interpolation: frame 5 is now 1/4 of the way between 0 and 20
        // Value at frame 5: 0 + (100 - 0) * (5 / 20) = 25
        display.set_frame(5.0);
        assert_eq!(display.entities[0].angle.to_int(), 25);
    }
}

#[cfg(test)]
mod tests_eanimd {
    use super::*;
    use crate::data::{MaAnim, MaModel};

    #[test]
    fn test_eanimd_sorting() {
        let model = MaModel {
            n: 2,
            m: 0,
            parts: vec![
                [-1, -1, 0, 10, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0], // Z = 10 * 2 + 0 = 20
                [-1, -1, 0, 5, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0],  // Z = 5 * 2 + 1 = 11
            ],
            strs0: vec!["Part1".to_string(), "Part2".to_string()],
            ints: [1000, 3600, 1000],
            confs: vec![],
            strs1: vec![],
        };
        let anim = MaAnim {
            n: 0,
            parts: vec![],
            max: 10,
            len: 10,
        };

        let mut display = EAnimD::new(model, anim);
        display.sort();

        // Part2 (Z=11) should come before Part1 (Z=20)
        assert_eq!(display.order[0], 1);
        assert_eq!(display.order[1], 0);
    }
}

//! @java: common.util.anim.MaAnim / common.util.anim.Part
//! @logic: Runtime animation update logic, applying keyframes to EPart states.
//! @parity: 0%

use bcu_math::FixedPoint;
use crate::data::{MaAnim, Part, MaModel};
use crate::animation::epart::EPart;
use crate::animation::interpolation::get_ti;

pub fn update_maanim(anim: &MaAnim, f: FixedPoint, entities: &mut [EPart], model: &MaModel, rotate: bool) {
    let mut f = f;
    let max_fp = FixedPoint::from_int(anim.max as i64);
    if rotate {
        f = f % (max_fp + FixedPoint::ONE);
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
                        entities[part.ints[0] as usize].alter(part.ints[1], FixedPoint::from_int(val as i64), entities.len(), model);
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
                val *= (f - part.moves[k][0] as f64) / (part.moves[j][0] as f64 - part.moves[k][0] as f64);
            }
        }
        sum += val;
    }
    (sum / 4096.0) as i32
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::{MaAnim, Part, MaModel};
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
            [0, 0, 0, 0],   // Frame 0, Value 0, Linear
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
        update_maanim(&anim, FixedPoint::from_int(10), &mut entities, &model, false);
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
            [0, 0, 1, 0],   // Frame 0, Value 0, Step
            [10, 5, 1, 0],  // Frame 10, Value 5
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
        update_maanim(&anim, FixedPoint::from_int(10), &mut entities, &model, false);
        assert_eq!(entities[0].img, 5);
    }
}

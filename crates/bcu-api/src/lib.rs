//! @java: (none)
//! @logic: JS/WASM bridge for BCU, exposing rendering and animation functions to the web frontend.
//! @parity: 0%

use bcu_assets::AssetRegistry;
use bcu_core::animation::EAnimD;
use bcu_core::data::ImgCut;
use bcu_render::{RenderState, SpriteBatch};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[derive(Deserialize)]
#[serde(tag = "op", content = "data")]
enum EditorCommand {
    #[serde(rename = "SET_FRAME")]
    SetFrame { id: String, frame: f32 },
    #[serde(rename = "UPDATE_MODEL_PART")]
    UpdateModelPart {
        id: String,
        part_idx: usize,
        field: usize,
        value: i32,
    },
    #[serde(rename = "UPDATE_MODEL_STRUCT")]
    UpdateModelStruct {
        id: String,
        part_idx: usize,
        name: String,
    },
    #[serde(rename = "UPDATE_IMGCUT")]
    UpdateImgCut {
        id: String,
        cut_idx: usize,
        field: usize,
        value: i32,
    },
    #[serde(rename = "UPDATE_ANIM_KEYFRAME")]
    UpdateAnimKeyframe {
        id: String,
        part_idx: usize,
        modif_type: i32,
        move_idx: usize,
        new_frame: i32,
        new_value: i32,
        interpolation: i32,
        easing: i32,
    },
    #[serde(rename = "ADD_ANIM_KEYFRAME")]
    AddAnimKeyframe {
        id: String,
        part_idx: usize,
        modif_type: i32,
        frame: i32,
        value: i32,
    },
    #[serde(rename = "DELETE_ANIM_KEYFRAME")]
    DeleteAnimKeyframe {
        id: String,
        part_idx: usize,
        modif_type: i32,
        move_idx: usize,
    },
    #[serde(rename = "ADD_PART")]
    AddPart { id: String, parent: i32 },
    #[serde(rename = "DELETE_PART")]
    DeletePart { id: String, part_idx: usize },
    #[serde(rename = "ADD_ANIMATION")]
    AddAnimation { id: String },
    #[serde(rename = "REMOVE_ANIMATION")]
    RemoveAnimation { id: String },
    #[serde(rename = "RENAME_ANIMATION")]
    RenameAnimation { old_id: String, new_id: String },
}

#[derive(Serialize, TS)]
#[ts(export, export_to = "PartTransform.ts")]
pub struct PartTransform {
    pub x: f32,
    pub y: f32,
    pub scale_x: f32,
    pub scale_y: f32,
    pub angle: f32,
}

use ts_rs::TS;

#[derive(Serialize, TS)]
#[ts(export, export_to = "AnimationStateFull.ts")]
pub struct AnimationStateFull {
    pub status: String,
    pub version: u64,
    pub animation: bcu_core::animation::AnimationState,
    pub imgcut: bcu_core::data::ImgCut,
}

#[wasm_bindgen]
pub struct BCUEngine {
    render_state: RenderState,
    assets: AssetRegistry,
    batch: SpriteBatch,
    animations: HashMap<String, EAnimD>,
    textures: HashMap<String, wgpu::BindGroup>,
    imgcuts: HashMap<String, ImgCut>,
    version_counter: u64,
}

#[wasm_bindgen]
impl BCUEngine {
    #[cfg(target_arch = "wasm32")]
    pub async fn init(canvas: web_sys::HtmlCanvasElement) -> BCUEngine {
        console_error_panic_hook::set_once();
        let render_state = RenderState::new_web(canvas).await;

        BCUEngine {
            render_state,
            assets: AssetRegistry::new(),
            batch: SpriteBatch::new(),
            animations: HashMap::new(),
            textures: HashMap::new(),
            imgcuts: HashMap::new(),
            version_counter: 0,
        }
    }

    pub fn load_sprite(&mut self, id: &str, bytes: &[u8]) -> Result<(), JsValue> {
        self.assets
            .load_sprite_from_bytes(id, bytes)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        let sprite = self.assets.get_sprite(id).unwrap();
        let texture = self
            .render_state
            .create_texture_from_sprite(sprite, Some(id));
        self.textures.insert(id.to_string(), texture);

        Ok(())
    }

    pub fn load_animation(
        &mut self,
        id: &str,
        imgcut_txt: &str,
        mamodel_txt: &str,
        maanim_txt: &str,
    ) -> Result<(), JsValue> {
        let imgcut =
            bcu_parser::parse_imgcut(imgcut_txt).map_err(|e| JsValue::from_str(&e.to_string()))?;
        let mamodel = bcu_parser::parse_mamodel(mamodel_txt)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        let maanim = bcu_parser::parse_maanim(maanim_txt, false)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        let anim_display = EAnimD::new(mamodel, maanim);
        self.animations.insert(id.to_string(), anim_display);
        self.imgcuts.insert(id.to_string(), imgcut);

        Ok(())
    }

    pub fn update(&mut self, id: &str) {
        if let Some(anim) = self.animations.get_mut(id) {
            anim.update(true);
            self.version_counter += 1;
        }
    }

    pub fn set_frame(&mut self, id: &str, frame: f32) {
        if let Some(anim) = self.animations.get_mut(id) {
            anim.set_frame(frame);
            self.version_counter += 1;
        }
    }

    pub fn dispatch_editor_command(&mut self, json_str: &str) -> Result<(), JsValue> {
        self.version_counter += 1;
        let cmd: EditorCommand = serde_json::from_str(json_str)
            .map_err(|e| JsValue::from_str(&format!("Invalid JSON command: {}", e)))?;

        match cmd {
            EditorCommand::SetFrame { id, frame } => {
                self.set_frame(&id, frame);
            }
            EditorCommand::UpdateModelPart {
                id,
                part_idx,
                field,
                value,
            } => {
                if let Some(anim) = self.animations.get_mut(&id) {
                    anim.update_model_part(part_idx, field, value);
                }
            }
            EditorCommand::UpdateModelStruct { id, part_idx, name } => {
                if let Some(anim) = self.animations.get_mut(&id) {
                    if part_idx < anim.model.n {
                        anim.model.strs0[part_idx] = name.clone();
                        anim.entities[part_idx].name = name;
                    }
                }
            }
            EditorCommand::UpdateImgCut {
                id,
                cut_idx,
                field,
                value,
            } => {
                if let Some(imgcut) = self.imgcuts.get_mut(&id) {
                    if cut_idx < imgcut.n && field < 4 {
                        imgcut.cuts[cut_idx][field] = value;
                    }
                }
            }
            EditorCommand::UpdateAnimKeyframe {
                id,
                part_idx,
                modif_type,
                move_idx,
                new_frame,
                new_value,
                interpolation,
                easing,
            } => {
                if let Some(anim) = self.animations.get_mut(&id) {
                    anim.update_anim_keyframe(
                        part_idx,
                        modif_type,
                        move_idx,
                        new_frame,
                        new_value,
                        interpolation,
                        easing,
                    );
                }
            }
            EditorCommand::AddAnimKeyframe {
                id,
                part_idx,
                modif_type,
                frame,
                value,
            } => {
                if let Some(anim) = self.animations.get_mut(&id) {
                    anim.add_anim_keyframe(part_idx, modif_type, frame, value);
                }
            }
            EditorCommand::DeleteAnimKeyframe {
                id,
                part_idx,
                modif_type,
                move_idx,
            } => {
                if let Some(anim) = self.animations.get_mut(&id) {
                    anim.delete_anim_keyframe(part_idx, modif_type, move_idx);
                }
            }
            EditorCommand::AddPart { id, parent } => {
                if let Some(anim) = self.animations.get_mut(&id) {
                    anim.add_part(parent);
                }
            }
            EditorCommand::DeletePart { id, part_idx } => {
                if let Some(anim) = self.animations.get_mut(&id) {
                    anim.delete_part(part_idx);
                }
            }
            EditorCommand::AddAnimation { id } => {
                if let Some(first_anim) = self.animations.values().next() {
                    let model = first_anim.model.clone();
                    let anim = bcu_core::data::MaAnim::default();
                    self.animations.insert(id, EAnimD::new(model, anim));
                }
            }
            EditorCommand::RemoveAnimation { id } => {
                self.animations.remove(&id);
            }
            EditorCommand::RenameAnimation { old_id, new_id } => {
                if let Some(anim) = self.animations.remove(&old_id) {
                    self.animations.insert(new_id, anim);
                }
            }
        }

        Ok(())
    }

    pub fn list_animations(&self) -> JsValue {
        let keys: Vec<String> = self.animations.keys().cloned().collect();
        serde_wasm_bindgen::to_value(&keys).unwrap()
    }

    pub fn get_animation_state(&self, id: &str) -> Result<JsValue, JsValue> {
        let anim = self
            .animations
            .get(id)
            .ok_or_else(|| JsValue::from_str("Animation not found"))?;
        let imgcut = self
            .imgcuts
            .get(id)
            .ok_or_else(|| JsValue::from_str("ImgCut not found"))?;

        let state = anim.get_state();
        let full_state = AnimationStateFull {
            status: "ok".to_string(),
            version: self.version_counter,
            animation: state,
            imgcut: imgcut.clone(),
        };

        serde_wasm_bindgen::to_value(&full_state).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn get_part_transform(&self, id: &str, part_idx: usize) -> Result<JsValue, JsValue> {
        let anim = self
            .animations
            .get(id)
            .ok_or_else(|| JsValue::from_str("Animation not found"))?;
        if part_idx >= anim.entities.len() {
            return Err(JsValue::from_str("Invalid part index"));
        }

        let (pos, sca, angle) = anim.entities[part_idx].get_transform(&anim.entities, &anim.model);

        let transform = PartTransform {
            x: pos.x.to_float() as f32,
            y: pos.y.to_float() as f32,
            scale_x: sca.x.to_float() as f32,
            scale_y: sca.y.to_float() as f32,
            angle: angle.to_float() as f32,
        };

        serde_wasm_bindgen::to_value(&transform).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn export_imgcut(&self, id: &str) -> Result<String, JsValue> {
        use bcu_core::ParityTestable;
        let imgcut = self
            .imgcuts
            .get(id)
            .ok_or_else(|| JsValue::from_str("ImgCut not found"))?;
        Ok(imgcut.to_parity_string())
    }

    pub fn export_mamodel(&self, id: &str) -> Result<String, JsValue> {
        use bcu_core::ParityTestable;
        let anim = self
            .animations
            .get(id)
            .ok_or_else(|| JsValue::from_str("Animation not found"))?;
        Ok(anim.model.to_parity_string())
    }

    pub fn export_maanim(&self, id: &str) -> Result<String, JsValue> {
        use bcu_core::ParityTestable;
        let anim = self
            .animations
            .get(id)
            .ok_or_else(|| JsValue::from_str("Animation not found"))?;
        Ok(anim.anim.to_parity_string())
    }

    pub fn render(
        &mut self,
        id: &str,
        sprite_id: &str,
        off_x: f32,
        off_y: f32,
    ) -> Result<(), JsValue> {
        let anim = self
            .animations
            .get(id)
            .ok_or_else(|| JsValue::from_str("Animation not found"))?;
        let imgcut = self
            .imgcuts
            .get(id)
            .ok_or_else(|| JsValue::from_str("ImgCut not found"))?;
        let texture = self
            .textures
            .get(sprite_id)
            .ok_or_else(|| JsValue::from_str("Texture not found"))?;
        let sprite = self
            .assets
            .get_sprite(sprite_id)
            .ok_or_else(|| JsValue::from_str("Sprite not found"))?;

        self.render_state
            .draw_animation(
                anim,
                imgcut,
                sprite.width as f32,
                sprite.height as f32,
                off_x,
                off_y,
                texture,
                &mut self.batch,
            )
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(())
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        self.render_state.resize((width, height));
    }
}

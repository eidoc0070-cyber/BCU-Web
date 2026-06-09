//! @java: (none)
//! @logic: Asset management for BCU, handling sprite loading and registry.
//! @parity: 0%

use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AssetError {
    #[error("Failed to decode image: {0}")]
    ImageError(#[from] image::ImageError),
    #[error("Asset not found: {0}")]
    NotFound(String),
}

pub struct Sprite {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

impl Sprite {
    pub fn new(width: u32, height: u32, rgba: Vec<u8>) -> Self {
        Self {
            width,
            height,
            rgba,
        }
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Self, AssetError> {
        let img = image::load_from_memory(bytes)?;
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        Ok(Self {
            width,
            height,
            rgba: rgba.into_raw(),
        })
    }
}

#[derive(Default)]
pub struct AssetRegistry {
    sprites: HashMap<String, Sprite>,
}

impl AssetRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register_sprite(&mut self, id: &str, sprite: Sprite) {
        self.sprites.insert(id.to_string(), sprite);
    }

    pub fn get_sprite(&self, id: &str) -> Option<&Sprite> {
        self.sprites.get(id)
    }

    pub fn load_sprite_from_bytes(&mut self, id: &str, bytes: &[u8]) -> Result<(), AssetError> {
        let sprite = Sprite::from_bytes(bytes)?;
        self.register_sprite(id, sprite);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_asset_registry() {
        let mut registry = AssetRegistry::new();
        let sprite = Sprite::new(1, 1, vec![255, 0, 0, 255]);
        registry.register_sprite("test_red", sprite);

        let retrieved = registry.get_sprite("test_red").unwrap();
        assert_eq!(retrieved.width, 1);
        assert_eq!(retrieved.rgba, vec![255, 0, 0, 255]);
    }
}

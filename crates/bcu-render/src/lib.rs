//! @java: (none)
//! @logic: BCU render engine using wgpu. Handles sprite batching and animation playback.
//! @parity: 0%

use wgpu::util::DeviceExt;
// use bcu_math::{FixedPoint, Vec2};
use bcu_core::animation::{EAnimD, EPart};
use bcu_core::data::{ImgCut, MaModel};

#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct Vertex {
    pub position: [f32; 2],
    pub tex_coords: [f32; 2],
    pub color: [f32; 4],
}

impl Vertex {
    #[must_use]
    pub fn desc() -> wgpu::VertexBufferLayout<'static> {
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Vertex>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 0,
                    format: wgpu::VertexFormat::Float32x2,
                },
                wgpu::VertexAttribute {
                    offset: std::mem::size_of::<[f32; 2]>() as wgpu::BufferAddress,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x2,
                },
                wgpu::VertexAttribute {
                    offset: std::mem::size_of::<[f32; 4]>() as wgpu::BufferAddress,
                    shader_location: 2,
                    format: wgpu::VertexFormat::Float32x4,
                },
            ],
        }
    }
}

pub struct SpriteBatch {
    pub vertices: Vec<Vertex>,
    pub indices: Vec<u16>,
    pub next_index: u16,
}

impl Default for SpriteBatch {
    fn default() -> Self {
        Self::new()
    }
}

impl SpriteBatch {
    #[must_use]
    pub fn new() -> Self {
        Self {
            vertices: Vec::with_capacity(4096),
            indices: Vec::with_capacity(6144),
            next_index: 0,
        }
    }

    pub fn clear(&mut self) {
        self.vertices.clear();
        self.indices.clear();
        self.next_index = 0;
    }

    #[allow(
        clippy::too_many_arguments,
        clippy::cast_precision_loss,
        clippy::cast_possible_truncation
    )]
    pub fn add_part(
        &mut self,
        part: &EPart,
        _entities: &[EPart],
        model: &MaModel,
        imgcut: &ImgCut,
        tex_w: f32,
        tex_h: f32,
        off_x: f32,
        off_y: f32,
        alpha: f32,
    ) {
        let state = part.prev_state.lerp(&part.curr_state, alpha);

        if state.img < 0 || usize::try_from(state.img).unwrap_or(usize::MAX) >= imgcut.n {
            return;
        }

        let cut = imgcut.cuts[usize::try_from(state.img).unwrap_or(0)];
        let opa = state.opacity.to_float() as f32;

        if opa <= 0.0 {
            return;
        }

        // 4 corners of the sprite, adjusted by Pivot point
        let part_w = cut[2] as f32;
        let part_h = cut[3] as f32;
        let pivot_x = part.piv.x.to_float() as f32;
        let pivot_y = part.piv.y.to_float() as f32;

        let corners = [
            [-pivot_x, -pivot_y],
            [part_w - pivot_x, -pivot_y],
            [part_w - pivot_x, part_h - pivot_y],
            [-pivot_x, part_h - pivot_y],
        ];

        let ri = model.ints[1] as f32;
        let rad = state.angle.to_float() as f32 * 2.0 * std::f32::consts::PI / ri;
        let cos_a = rad.cos();
        let sin_a = rad.sin();

        let sx = state.sca.x.to_float() as f32;
        let sy = state.sca.y.to_float() as f32;
        let final_x = state.pos.x.to_float() as f32 + off_x;
        let final_y = state.pos.y.to_float() as f32 + off_y;

        let base_idx = self.next_index;

        // UVs with Flip support
        let mut u0 = cut[0] as f32 / tex_w;
        let mut v0 = cut[1] as f32 / tex_h;
        let mut u1 = (cut[0] + cut[2]) as f32 / tex_w;
        let mut v1 = (cut[1] + cut[3]) as f32 / tex_h;

        if part.hf == -1 {
            std::mem::swap(&mut u0, &mut u1);
        }
        if part.vf == -1 {
            std::mem::swap(&mut v0, &mut v1);
        }

        let uv_coords = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

        for i in 0..4 {
            let cx = corners[i][0] * sx;
            let cy = corners[i][1] * sy;

            // Rotate and translate
            let rx = cx * cos_a - cy * sin_a + final_x;
            let ry = cy * cos_a + cx * sin_a + final_y;

            self.vertices.push(Vertex {
                position: [rx, ry],
                tex_coords: uv_coords[i],
                color: [1.0, 1.0, 1.0, opa],
            });
        }

        self.indices.push(base_idx);
        self.indices.push(base_idx + 1);
        self.indices.push(base_idx + 2);
        self.indices.push(base_idx);
        self.indices.push(base_idx + 2);
        self.indices.push(base_idx + 3);

        self.next_index += 4;
    }
}

pub struct RenderState {
    pub surface: wgpu::Surface<'static>,
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub config: wgpu::SurfaceConfiguration,
    pub size: (u32, u32),
    pub render_pipeline: wgpu::RenderPipeline,
    pub vertex_buffer: wgpu::Buffer,
    pub index_buffer: wgpu::Buffer,
    pub uniform_buffer: wgpu::Buffer,
    pub uniform_bind_group: wgpu::BindGroup,
    pub texture_bind_group_layout: wgpu::BindGroupLayout,
}

impl RenderState {
    #[cfg(target_arch = "wasm32")]
    pub async fn new_web(canvas: web_sys::HtmlCanvasElement) -> Self {
        let size = (canvas.width(), canvas.height());
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });
        let surface = instance
            .create_surface(wgpu::SurfaceTarget::Canvas(canvas))
            .expect("Failed to create surface from canvas");
        Self::new_common(instance, surface, size).await
    }

    /// Initializes the render state with the given instance, surface and size.
    ///
    /// # Panics
    /// Panics if no suitable adapter or device can be found.
    #[allow(clippy::too_many_lines)]
    pub async fn new_common(
        instance: wgpu::Instance,
        surface: wgpu::Surface<'static>,
        size: (u32, u32),
    ) -> Self {
        let adapter = Self::request_adapter(&instance, &surface).await;

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: None,
                    required_features: wgpu::Features::empty(),
                    required_limits: wgpu::Limits::downlevel_webgl2_defaults(),
                },
                None,
            )
            .await
            .expect("BCU Engine Error: 장치(Device) 생성에 실패했습니다. 그래픽 카드의 사양이 너무 낮거나 드라이버 호환성 문제입니다.");

        let surface_caps = surface.get_capabilities(&adapter);
        let surface_format = surface_caps
            .formats
            .iter()
            .copied()
            .find(wgpu::TextureFormat::is_srgb)
            .unwrap_or(surface_caps.formats[0]);
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width: size.0,
            height: size.1,
            present_mode: surface_caps.present_modes[0],
            alpha_mode: surface_caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &config);

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
        });

        let texture_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                entries: &[
                    wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Texture {
                            multisampled: false,
                            view_dimension: wgpu::TextureViewDimension::D2,
                            sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        },
                        count: None,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 1,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                        count: None,
                    },
                ],
                label: Some("texture_bind_group_layout"),
            });

        let uniform_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                entries: &[wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::VERTEX,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                }],
                label: Some("uniform_bind_group_layout"),
            });

        #[allow(clippy::cast_precision_loss)]
        let projection_matrix = [
            [2.0 / size.0 as f32, 0.0, 0.0, 0.0],
            [0.0, -2.0 / size.1 as f32, 0.0, 0.0],
            [0.0, 0.0, 1.0, 0.0],
            [-1.0, 1.0, 0.0, 1.0],
        ];

        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Uniform Buffer"),
            contents: bytemuck::cast_slice(&projection_matrix),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let uniform_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &uniform_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: uniform_buffer.as_entire_binding(),
            }],
            label: Some("uniform_bind_group"),
        });

        let render_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("Render Pipeline Layout"),
                bind_group_layouts: &[&texture_bind_group_layout, &uniform_bind_group_layout],
                push_constant_ranges: &[],
            });

        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Render Pipeline"),
            layout: Some(&render_pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[Vertex::desc()],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: config.format,
                    blend: Some(wgpu::BlendState::ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None,
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState {
                count: 1,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
            multiview: None,
        });

        // Pre-allocate buffers for batching
        let vertex_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Vertex Buffer"),
            size: u64::try_from(std::mem::size_of::<Vertex>() * 4096).unwrap_or(0),
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let index_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Index Buffer"),
            size: u64::try_from(std::mem::size_of::<u16>() * 6144).unwrap_or(0),
            usage: wgpu::BufferUsages::INDEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        Self {
            surface,
            device,
            queue,
            config,
            size,
            render_pipeline,
            vertex_buffer,
            index_buffer,
            uniform_buffer,
            uniform_bind_group,
            texture_bind_group_layout,
        }
    }

    async fn request_adapter(
        instance: &wgpu::Instance,
        surface: &wgpu::Surface<'static>,
    ) -> wgpu::Adapter {
        let mut adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::None,
                compatible_surface: Some(surface),
                force_fallback_adapter: false,
            })
            .await;

        if adapter.is_none() {
            adapter = instance
                .request_adapter(&wgpu::RequestAdapterOptions {
                    power_preference: wgpu::PowerPreference::LowPower,
                    compatible_surface: None,
                    force_fallback_adapter: false,
                })
                .await;
        }

        if adapter.is_none() {
            adapter = instance
                .request_adapter(&wgpu::RequestAdapterOptions {
                    power_preference: wgpu::PowerPreference::LowPower,
                    compatible_surface: None,
                    force_fallback_adapter: true,
                })
                .await;
        }

        adapter.expect("BCU Engine Error: 모든 그래픽 어댑터 확보에 실패했습니다. 브라우저의 가속 기능이 WASM에 의해 차단되었을 수 있습니다.")
    }

    pub fn create_texture_from_sprite(
        &self,
        sprite: &bcu_assets::Sprite,
        label: Option<&str>,
    ) -> wgpu::BindGroup {
        let size = wgpu::Extent3d {
            width: sprite.width,
            height: sprite.height,
            depth_or_array_layers: 1,
        };
        let texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label,
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8UnormSrgb,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });

        self.queue.write_texture(
            wgpu::ImageCopyTexture {
                aspect: wgpu::TextureAspect::All,
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
            },
            &sprite.rgba,
            wgpu::ImageDataLayout {
                offset: 0,
                bytes_per_row: Some(4 * sprite.width),
                rows_per_image: Some(sprite.height),
            },
            size,
        );

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        let sampler = self.device.create_sampler(&wgpu::SamplerDescriptor {
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Nearest,
            mipmap_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });

        self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &self.texture_bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&sampler),
                },
            ],
            label: Some("diffuse_bind_group"),
        })
    }

    pub fn resize(&mut self, new_size: (u32, u32)) {
        if new_size.0 > 0 && new_size.1 > 0 {
            self.size = new_size;
            self.config.width = new_size.0;
            self.config.height = new_size.1;
            self.surface.configure(&self.device, &self.config);

            // Update projection matrix
            #[allow(clippy::cast_precision_loss)]
            let projection_matrix = [
                [2.0 / new_size.0 as f32, 0.0, 0.0, 0.0],
                [0.0, -2.0 / new_size.1 as f32, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [-1.0, 1.0, 0.0, 1.0],
            ];
            self.queue.write_buffer(
                &self.uniform_buffer,
                0,
                bytemuck::cast_slice(&projection_matrix),
            );
        }
    }

    /// Draws the animation state using the current renderer.
    ///
    /// # Errors
    /// Returns `wgpu::SurfaceError` if the surface is lost or outdated.
    #[allow(clippy::too_many_arguments)]
    pub fn draw_animation(
        &mut self,
        anim: &EAnimD,
        imgcut: &ImgCut,
        tex_w: f32,
        tex_h: f32,
        off_x: f32,
        off_y: f32,
        texture_bind_group: &wgpu::BindGroup,
        batch: &mut SpriteBatch,
        alpha: f32,
    ) -> Result<(), wgpu::SurfaceError> {
        batch.clear();
        for &idx in &anim.order {
            let part = &anim.entities[idx];
            batch.add_part(
                part,
                &anim.entities,
                &anim.model,
                imgcut,
                tex_w,
                tex_h,
                off_x,
                off_y,
                alpha,
            );
        }

        self.render(&batch.vertices, &batch.indices, texture_bind_group)
    }

    /// Renders the vertex batch to the surface.
    ///
    /// # Errors
    /// Returns `wgpu::SurfaceError` if the surface is lost or outdated.
    pub fn render(
        &mut self,
        vertices: &[Vertex],
        indices: &[u16],
        texture_bind_group: &wgpu::BindGroup,
    ) -> Result<(), wgpu::SurfaceError> {
        if vertices.is_empty() || indices.is_empty() {
            return Ok(());
        }

        let output = self.surface.get_current_texture()?;
        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());
        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Render Encoder"),
            });

        // Update buffers - handle potential overflow/resize if needed,
        // but for now we rely on the pre-allocated 4096 vertices.
        let v_size = u64::try_from(std::mem::size_of_val(vertices)).unwrap_or(0);
        let i_size = u64::try_from(std::mem::size_of_val(indices)).unwrap_or(0);

        self.queue
            .write_buffer(&self.vertex_buffer, 0, bytemuck::cast_slice(vertices));
        self.queue
            .write_buffer(&self.index_buffer, 0, bytemuck::cast_slice(indices));

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.0, // Black background for BCU feel
                            g: 0.0,
                            b: 0.0,
                            a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                occlusion_query_set: None,
                timestamp_writes: None,
            });

            render_pass.set_pipeline(&self.render_pipeline);
            render_pass.set_bind_group(0, texture_bind_group, &[]);
            render_pass.set_bind_group(1, &self.uniform_bind_group, &[]);
            render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..v_size));
            render_pass
                .set_index_buffer(self.index_buffer.slice(..i_size), wgpu::IndexFormat::Uint16);
            let indices_len = u32::try_from(indices.len()).unwrap_or(0);
            render_pass.draw_indexed(0..indices_len, 0, 0..1);
        }

        self.queue.submit(std::iter::once(encoder.finish()));
        output.present();

        Ok(())
    }
}

#[cfg(test)]
#[allow(clippy::float_cmp)]
mod tests {
    use super::*;

    #[test]
    fn test_vertex_size() {
        assert_eq!(std::mem::size_of::<Vertex>(), 32);
    }

    #[test]
    fn test_vertex_desc() {
        let desc = Vertex::desc();
        assert_eq!(desc.array_stride, 32);
        assert_eq!(desc.attributes.len(), 3);
    }

    #[test]
    fn test_sprite_batch_logic() {
        let mut batch = SpriteBatch::new();
        let model = MaModel {
            n: 1,
            m: 0,
            parts: vec![[-1, -1, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0]],
            strs0: vec!["Root".to_string()],
            ints: [1000, 3600, 1000],
            confs: vec![],
            strs1: vec![],
        };
        let imgcut = ImgCut {
            name: "test".to_string(),
            n: 1,
            cuts: vec![[0, 0, 100, 100]],
            strs: vec!["part".to_string()],
        };

        let mut part = EPart::new(0, "Root".to_string(), model.parts[0], &model);

        // Sync states manually for test (since we are not using EAnimD::new)
        let (pos, sca, angle) = part.get_transform(&[], &model);
        let opacity = part.get_opa(&[], &model);
        let state = bcu_core::animation::RenderState {
            pos,
            sca,
            angle,
            opacity,
            img: part.img,
            z: part.z,
        };
        part.curr_state = state;
        part.prev_state = state;

        let entities = vec![part];

        // Texture 100x100, Sprite 100x100 at 0,0 with 0,0 offset
        batch.add_part(
            &entities[0],
            &entities,
            &model,
            &imgcut,
            100.0,
            100.0,
            0.0,
            0.0,
            1.0, // alpha
        );

        assert_eq!(batch.vertices.len(), 4);
        assert_eq!(batch.indices.len(), 6);
        assert_eq!(batch.next_index, 4);

        // Check first vertex (top-left)
        assert_eq!(batch.vertices[0].position, [0.0, 0.0]);
        assert_eq!(batch.vertices[0].tex_coords, [0.0, 0.0]);

        // Check second vertex (bottom-right of 100x100 sprite)
        // Note: corners are [0,0], [W,0], [W,H], [0,H]
        assert_eq!(batch.vertices[2].position, [100.0, 100.0]);
        assert_eq!(batch.vertices[2].tex_coords, [1.0, 1.0]);
    }
}

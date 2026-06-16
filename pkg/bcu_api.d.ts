/* tslint:disable */
/* eslint-disable */

export class BCUEngine {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    dispatch_editor_command(json_str: string): void;
    export_imgcut(id: string): string;
    export_maanim(id: string): string;
    export_mamodel(id: string): string;
    get_animation_state(id: string): any;
    get_part_transform(id: string, part_idx: number): any;
    static init(canvas: HTMLCanvasElement): Promise<BCUEngine>;
    is_ancestor(id: string, part_idx: number, parent_candidate: number): boolean;
    list_animations(): any;
    load_animation(id: string, imgcut_txt: string, mamodel_txt: string, maanim_txt: string): void;
    load_sprite(id: string, bytes: Uint8Array): void;
    render(id: string, sprite_id: string, off_x: number, off_y: number, alpha: number): void;
    resize(width: number, height: number): void;
    set_frame(id: string, frame: number): void;
    tick(id: string): void;
    update(id: string): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_bcuengine_free: (a: number, b: number) => void;
    readonly bcuengine_dispatch_editor_command: (a: number, b: number, c: number) => [number, number];
    readonly bcuengine_export_imgcut: (a: number, b: number, c: number) => [number, number, number, number];
    readonly bcuengine_export_maanim: (a: number, b: number, c: number) => [number, number, number, number];
    readonly bcuengine_export_mamodel: (a: number, b: number, c: number) => [number, number, number, number];
    readonly bcuengine_get_animation_state: (a: number, b: number, c: number) => [number, number, number];
    readonly bcuengine_get_part_transform: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly bcuengine_init: (a: any) => any;
    readonly bcuengine_is_ancestor: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly bcuengine_list_animations: (a: number) => any;
    readonly bcuengine_load_animation: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
    readonly bcuengine_load_sprite: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly bcuengine_render: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly bcuengine_resize: (a: number, b: number, c: number) => void;
    readonly bcuengine_set_frame: (a: number, b: number, c: number, d: number) => void;
    readonly bcuengine_tick: (a: number, b: number, c: number) => void;
    readonly bcuengine_update: (a: number, b: number, c: number) => void;
    readonly wgpu_render_pass_draw: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wgpu_render_pass_draw_indexed: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly wgpu_render_pass_set_pipeline: (a: number, b: bigint) => void;
    readonly wgpu_render_pass_set_viewport: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly wgpu_compute_pass_set_pipeline: (a: number, b: bigint) => void;
    readonly wgpu_render_pass_draw_indirect: (a: number, b: bigint, c: bigint) => void;
    readonly wgpu_render_bundle_draw: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wgpu_render_pass_set_bind_group: (a: number, b: number, c: bigint, d: number, e: number) => void;
    readonly wgpu_compute_pass_set_bind_group: (a: number, b: number, c: bigint, d: number, e: number) => void;
    readonly wgpu_render_pass_execute_bundles: (a: number, b: number, c: number) => void;
    readonly wgpu_render_pass_pop_debug_group: (a: number) => void;
    readonly wgpu_render_pass_write_timestamp: (a: number, b: bigint, c: number) => void;
    readonly wgpu_compute_pass_pop_debug_group: (a: number) => void;
    readonly wgpu_compute_pass_write_timestamp: (a: number, b: bigint, c: number) => void;
    readonly wgpu_render_pass_push_debug_group: (a: number, b: number, c: number) => void;
    readonly wgpu_render_pass_set_scissor_rect: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wgpu_compute_pass_push_debug_group: (a: number, b: number, c: number) => void;
    readonly wgpu_render_pass_set_vertex_buffer: (a: number, b: number, c: bigint, d: bigint, e: bigint) => void;
    readonly wgpu_render_pass_set_blend_constant: (a: number, b: number) => void;
    readonly wgpu_render_pass_set_push_constants: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wgpu_compute_pass_set_push_constant: (a: number, b: number, c: number, d: number) => void;
    readonly wgpu_render_pass_end_occlusion_query: (a: number) => void;
    readonly wgpu_render_pass_insert_debug_marker: (a: number, b: number, c: number) => void;
    readonly wgpu_render_pass_multi_draw_indirect: (a: number, b: bigint, c: bigint, d: number) => void;
    readonly wgpu_compute_pass_dispatch_workgroups: (a: number, b: number, c: number, d: number) => void;
    readonly wgpu_compute_pass_insert_debug_marker: (a: number, b: number, c: number) => void;
    readonly wgpu_render_pass_begin_occlusion_query: (a: number, b: number) => void;
    readonly wgpu_render_pass_draw_indexed_indirect: (a: number, b: bigint, c: bigint) => void;
    readonly wgpu_render_pass_set_stencil_reference: (a: number, b: number) => void;
    readonly wgpu_render_bundle_draw_indexed: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly wgpu_render_bundle_set_pipeline: (a: number, b: bigint) => void;
    readonly wgpu_render_bundle_draw_indirect: (a: number, b: bigint, c: bigint) => void;
    readonly wgpu_render_bundle_set_bind_group: (a: number, b: number, c: bigint, d: number, e: number) => void;
    readonly wgpu_render_pass_multi_draw_indirect_count: (a: number, b: bigint, c: bigint, d: bigint, e: bigint, f: number) => void;
    readonly wgpu_render_bundle_set_vertex_buffer: (a: number, b: number, c: bigint, d: bigint, e: bigint) => void;
    readonly wgpu_render_pass_multi_draw_indexed_indirect: (a: number, b: bigint, c: bigint, d: number) => void;
    readonly wgpu_render_bundle_set_push_constants: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wgpu_compute_pass_dispatch_workgroups_indirect: (a: number, b: bigint, c: bigint) => void;
    readonly wgpu_render_pass_end_pipeline_statistics_query: (a: number) => void;
    readonly wgpu_compute_pass_end_pipeline_statistics_query: (a: number) => void;
    readonly wgpu_render_bundle_draw_indexed_indirect: (a: number, b: bigint, c: bigint) => void;
    readonly wgpu_render_pass_begin_pipeline_statistics_query: (a: number, b: bigint, c: number) => void;
    readonly wgpu_compute_pass_begin_pipeline_statistics_query: (a: number, b: bigint, c: number) => void;
    readonly wgpu_render_pass_multi_draw_indexed_indirect_count: (a: number, b: bigint, c: bigint, d: bigint, e: bigint, f: number) => void;
    readonly wgpu_render_pass_set_index_buffer: (a: number, b: bigint, c: number, d: bigint, e: bigint) => void;
    readonly wgpu_render_bundle_insert_debug_marker: (a: number, b: number) => void;
    readonly wgpu_render_bundle_pop_debug_group: (a: number) => void;
    readonly wgpu_render_bundle_set_index_buffer: (a: number, b: bigint, c: number, d: bigint, e: bigint) => void;
    readonly wgpu_render_bundle_push_debug_group: (a: number, b: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h925e8d6377294b5d: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__h8456b4c012fe84a1: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h3ec785861e2ee719: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h3ec785861e2ee719_2: (a: number, b: number, c: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

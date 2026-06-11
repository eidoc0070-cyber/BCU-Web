import { BCUEngine } from '../../pkg/bcu_api.js';
import type { AnimationStateFull } from './bindings/AnimationStateFull';
import type { PartTransform } from './bindings/PartTransform';

export class EngineBridge {
    constructor(private engine: BCUEngine, private animId: string) {}

    setAnimId(id: string) {
        this.animId = id;
    }

    setFrame(frame: number) {
        this.engine.dispatch_editor_command(JSON.stringify({
            op: 'SET_FRAME',
            data: { id: this.animId, frame }
        }));
    }

    updateModelPart(partIdx: number, field: number, value: number) {
        this.engine.dispatch_editor_command(JSON.stringify({
            op: 'UPDATE_MODEL_PART',
            data: { id: this.animId, part_idx: partIdx, field, value }
        }));
    }

    updateModelStruct(partIdx: number, name: string) {
        this.engine.dispatch_editor_command(JSON.stringify({
            op: 'UPDATE_MODEL_STRUCT',
            data: { id: this.animId, part_idx: partIdx, name }
        }));
    }

    updateImgCut(cutIdx: number, field: number, value: number) {
        this.engine.dispatch_editor_command(JSON.stringify({
            op: 'UPDATE_IMGCUT',
            data: { id: this.animId, cut_idx: cutIdx, field, value }
        }));
    }

    updateAnimKeyframe(partIdx: number, modifType: number, moveIdx: number, newFrame: number) {
        this.engine.dispatch_editor_command(JSON.stringify({
            op: 'UPDATE_ANIM_KEYFRAME',
            data: { id: this.animId, part_idx: partIdx, modif_type: modifType, move_idx: moveIdx, new_frame: newFrame }
        }));
    }

    addAnimKeyframe(partIdx: number, modifType: number, frame: number, value: number) {
        this.engine.dispatch_editor_command(JSON.stringify({
            op: 'ADD_ANIM_KEYFRAME',
            data: { id: this.animId, part_idx: partIdx, modif_type: modifType, frame, value }
        }));
    }

    deleteAnimKeyframe(partIdx: number, modifType: number, moveIdx: number) {
        this.engine.dispatch_editor_command(JSON.stringify({
            op: 'DELETE_ANIM_KEYFRAME',
            data: { id: this.animId, part_idx: partIdx, mod_type: modifType, move_idx: moveIdx }
        }));
    }

    addPart(parent: number) {
        this.engine.dispatch_editor_command(JSON.stringify({
            op: 'ADD_PART',
            data: { id: this.animId, parent }
        }));
    }

    deletePart(partIdx: number) {
        this.engine.dispatch_editor_command(JSON.stringify({
            op: 'DELETE_PART',
            data: { id: this.animId, part_idx: partIdx }
        }));
    }

    exportImgCut() {
        return this.engine.export_imgcut(this.animId);
    }

    exportModel() {
        return this.engine.export_mamodel(this.animId);
    }

    exportAnim() {
        return this.engine.export_maanim(this.animId);
    }

    exportAnimById(id: string) {
        return this.engine.export_maanim(id);
    }

    listAnimations(): string[] {
        return this.engine.list_animations();
    }

    getState(): AnimationStateFull | null {
        try {
            return this.engine.get_animation_state(this.animId);
        } catch (e) {
            return null;
        }
    }

    getPartTransform(partIdx: number): PartTransform | null {
        try {
            return this.engine.get_part_transform(this.animId, partIdx);
        } catch (e) {
            console.error('Error getting part transform:', e);
            return null;
        }
    }

    update() {
        this.engine.update(this.animId);
    }

    render(spriteId: string, offX: number, offY: number) {
        this.engine.render(this.animId, spriteId, offX, offY);
    }
}

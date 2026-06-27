import type { Command } from './base';
import { EngineBridge } from '../engine-bridge';
import { AnimProp } from '../constants';

export class AddKeyframeCommand implements Command {
    readonly type = 'ADD_KEYFRAME';

    constructor(
        private bridge: EngineBridge,
        private partIdx: number,
        private modifType: AnimProp,
        private frame: number,
        private value: number
    ) {}

    execute(): void {
        this.bridge.addAnimKeyframe(this.partIdx, this.modifType, this.frame, this.value);
    }

    undo(): void {
        const state = this.bridge.getState();
        if (state && state.animation && state.animation.anim) {
            // Keyframes are in anim.parts
            const part = state.animation.anim.parts.find((p: any) => p.ints[0] === this.partIdx && p.ints[1] === this.modifType);
            if (part) {
                const moveIdx = part.moves.findIndex((m: any) => m[0] === this.frame && m[1] === this.value);
                if (moveIdx !== -1) {
                    this.bridge.deleteAnimKeyframe(this.partIdx, this.modifType, moveIdx);
                }
            }
        }
    }

    serialize(): any {
        return { type: this.type, partIdx: this.partIdx, modifType: this.modifType, frame: this.frame, value: this.value };
    }
}

export class ModifyKeyframeCommand implements Command {
    readonly type = 'MODIFY_KEYFRAME';

    constructor(
        private bridge: EngineBridge,
        private partIdx: number,
        private modifType: AnimProp,
        private oldData: { frame: number, value: number, interp: number, easing: number },
        private newData: { frame: number, value: number, interp: number, easing: number }
    ) {}

    private findMoveIdx(frame: number): number {
        const state = this.bridge.getState();
        if (state && state.animation && state.animation.anim) {
            const part = state.animation.anim.parts.find((p: any) => p.ints[0] === this.partIdx && p.ints[1] === this.modifType);
            if (part) {
                return part.moves.findIndex((m: any) => m[0] === frame);
            }
        }
        return -1;
    }

    execute(): void {
        const moveIdx = this.findMoveIdx(this.oldData.frame);
        if (moveIdx !== -1) {
            this.bridge.updateAnimKeyframe(
                this.partIdx, this.modifType, moveIdx, 
                this.newData.frame, this.newData.value, this.newData.interp, this.newData.easing
            );
        }
    }

    undo(): void {
        const moveIdx = this.findMoveIdx(this.newData.frame);
        if (moveIdx !== -1) {
            this.bridge.updateAnimKeyframe(
                this.partIdx, this.modifType, moveIdx, 
                this.oldData.frame, this.oldData.value, this.oldData.interp, this.oldData.easing
            );
        }
    }

    serialize(): any {
        return { type: this.type, partIdx: this.partIdx, modifType: this.modifType, oldData: this.oldData, newData: this.newData };
    }
}

export class DeleteKeyframeCommand implements Command {
    readonly type = 'DELETE_KEYFRAME';
    private deletedData: any = null;

    constructor(
        private bridge: EngineBridge,
        private partIdx: number,
        private modifType: AnimProp,
        private frame: number
    ) {}

    execute(): void {
        const state = this.bridge.getState();
        if (state && state.animation && state.animation.anim) {
            const part = state.animation.anim.parts.find((p: any) => p.ints[0] === this.partIdx && p.ints[1] === this.modifType);
            if (part) {
                const moveIdx = part.moves.findIndex((m: any) => m[0] === this.frame);
                if (moveIdx !== -1) {
                    this.deletedData = JSON.parse(JSON.stringify(part.moves[moveIdx]));
                    this.bridge.deleteAnimKeyframe(this.partIdx, this.modifType, moveIdx);
                }
            }
        }
    }

    undo(): void {
        if (this.deletedData) {
            this.bridge.addAnimKeyframe(this.partIdx, this.modifType, this.deletedData[0], this.deletedData[1]);
        }
    }

    serialize(): any {
        return { type: this.type, partIdx: this.partIdx, modifType: this.modifType, frame: this.frame };
    }
}

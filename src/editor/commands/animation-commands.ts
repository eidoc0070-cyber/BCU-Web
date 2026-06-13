import { Command } from './base';
import { EngineBridge } from '../engine-bridge';

export class AddKeyframeCommand implements Command {
    readonly type = 'ADD_KEYFRAME';

    constructor(
        private bridge: EngineBridge,
        private partIdx: number,
        private modifType: number,
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
        private modifType: number,
        private moveIdx: number,
        private oldData: { frame: number, value: number, interp: number, easing: number },
        private newData: { frame: number, value: number, interp: number, easing: number }
    ) {}

    execute(): void {
        this.bridge.updateAnimKeyframe(
            this.partIdx, this.modifType, this.moveIdx, 
            this.newData.frame, this.newData.value, this.newData.interp, this.newData.easing
        );
    }

    undo(): void {
        this.bridge.updateAnimKeyframe(
            this.partIdx, this.modifType, this.moveIdx, 
            this.oldData.frame, this.oldData.value, this.oldData.interp, this.oldData.easing
        );
    }

    serialize(): any {
        return { type: this.type, partIdx: this.partIdx, modifType: this.modifType, moveIdx: this.moveIdx, oldData: this.oldData, newData: this.newData };
    }
}

export class DeleteKeyframeCommand implements Command {
    readonly type = 'DELETE_KEYFRAME';
    private deletedData: any = null;

    constructor(
        private bridge: EngineBridge,
        private partIdx: number,
        private modifType: number,
        private moveIdx: number
    ) {}

    execute(): void {
        const state = this.bridge.getState();
        if (state && state.animation && state.animation.anim) {
            const part = state.animation.anim.parts.find((p: any) => p.ints[0] === this.partIdx && p.ints[1] === this.modifType);
            if (part) {
                this.deletedData = JSON.parse(JSON.stringify(part.moves[this.moveIdx]));
            }
        }
        this.bridge.deleteAnimKeyframe(this.partIdx, this.modifType, this.moveIdx);
    }

    undo(): void {
        if (this.deletedData) {
            this.bridge.addAnimKeyframe(this.partIdx, this.modifType, this.deletedData[0], this.deletedData[1]);
        }
    }

    serialize(): any {
        return { type: this.type, partIdx: this.partIdx, modifType: this.modifType, moveIdx: this.moveIdx };
    }
}

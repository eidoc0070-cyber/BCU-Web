import type { Command } from './base';
import { EngineBridge } from '../engine-bridge';
import { EditorStateManager } from '../state-manager';

export class AddPartCommand implements Command {
    readonly type = 'ADD_PART';
    private addedPartIdx: number | null = null;

    constructor(
        private bridge: EngineBridge,
        private parentIdx: number
    ) {}

    execute(): void {
        this.bridge.addPart(this.parentIdx);
        const state = this.bridge.getState();
        if (state && state.animation) {
            this.addedPartIdx = state.animation.parts.length - 1;
        }
    }

    undo(): void {
        if (this.addedPartIdx !== null) {
            this.bridge.deletePart(this.addedPartIdx);
        }
    }

    serialize(): any {
        return { type: this.type, parentIdx: this.parentIdx };
    }
}

export class DeletePartCommand implements Command {
    readonly type = 'DELETE_PART';
    private capturedData: {
        modelData: number[],
        name: string,
        keyframes: any[],
        selectedKFIds: string[]
    } | null = null;

    constructor(
        private bridge: EngineBridge,
        private stateManager: EditorStateManager,
        private partIdx: number
    ) {}

    execute(): void {
        // 1. Capture state before deletion
        const state = this.bridge.getState();
        if (state && state.animation) {
            const part = state.animation.parts[this.partIdx];
            if (part) {
                // Capture which keyframes of this part were selected
                const currentKFSelection = this.stateManager.getKFSelection();
                const selectedKFIds = currentKFSelection.filter(id => id.startsWith(`${this.partIdx}:`));

                this.capturedData = {
                    modelData: [...part.raw_args],
                    name: part.name,
                    keyframes: state.animation.anim.parts
                        .filter((p: any) => p.ints[0] === this.partIdx)
                        .map((p: any) => ({ ...p })), // Shallow copy of the anim part
                    selectedKFIds
                };
            }
        }

        // 2. Perform deletion
        this.bridge.deletePart(this.partIdx);
        
        // 3. UI Sync (handled by controller usually, but command needs to be self-contained for undo/redo)
        // Controller will call remapPartIndices
    }

    undo(): void {
        if (this.capturedData) {
            this.bridge.restorePart(
                this.partIdx, 
                this.capturedData.modelData, 
                this.capturedData.name, 
                this.capturedData.keyframes
            );
            this.stateManager.remapPartIndicesReverse(this.partIdx, this.capturedData.selectedKFIds);
        }
    }

    serialize(): any {
        return { type: this.type, partIdx: this.partIdx };
    }
}

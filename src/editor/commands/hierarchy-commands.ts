import { Command } from './base';
import { EngineBridge } from '../engine-bridge';

export class AddPartCommand implements Command {
    readonly type = 'ADD_PART';
    private addedPartIdx: number | null = null;

    constructor(
        private bridge: EngineBridge,
        private parentIdx: number
    ) {}

    execute(): void {
        this.bridge.addPart(this.parentIdx);
        // In a real scenario, we might need to capture the index of the added part 
        // if the engine returns it, or rely on the fact that it's the last one.
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

    constructor(
        private bridge: EngineBridge,
        private partIdx: number
    ) {}

    execute(): void {
        this.bridge.deletePart(this.partIdx);
    }

    undo(): void {
        // This is complex because we need to restore not just the part but its place in hierarchy 
        // and its keyframes. For now, we'll need a bridge method to "restore" or "insert" a part.
        // Assuming bridge.addPart followed by property updates for now as a simplified version.
        console.warn("Undo for DeletePart is partially implemented - requires engine support for raw insertion");
    }

    serialize(): any {
        return { type: this.type, partIdx: this.partIdx };
    }
}

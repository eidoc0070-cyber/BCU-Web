import { Command } from './base';
import { EngineBridge } from '../engine-bridge';

export class UpdatePropertyCommand implements Command {
    readonly type = 'UPDATE_PROPERTY';

    constructor(
        private bridge: EngineBridge,
        private partIdx: number,
        private field: number,
        private oldValue: number,
        private newValue: number
    ) {}

    execute(): void {
        this.bridge.updateModelPart(this.partIdx, this.field, this.newValue);
    }

    undo(): void {
        this.bridge.updateModelPart(this.partIdx, this.field, this.oldValue);
    }

    serialize(): any {
        return {
            type: this.type,
            partIdx: this.partIdx,
            field: this.field,
            oldValue: this.oldValue,
            newValue: this.newValue
        };
    }
}

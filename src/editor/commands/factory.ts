import { Command } from './base';
import { EngineBridge } from '../engine-bridge';
import { EditorStateManager } from '../state-manager';
import { UpdatePropertyCommand } from './property-commands';
import { BatchCommand } from './batch-commands';
import { AddPartCommand, DeletePartCommand } from './hierarchy-commands';
import { AddKeyframeCommand, ModifyKeyframeCommand, DeleteKeyframeCommand } from './animation-commands';

export class CommandFactory {
    public static deserialize(data: any, bridge: EngineBridge, stateManager: EditorStateManager): Command | null {
        try {
            switch (data.type) {
                case 'UPDATE_PROPERTY':
                    // Convert partIdxs and oldValues Map back from array/object if needed
                    const oldValues = new Map<number, number>();
                    if (data.oldValues && typeof data.oldValues === 'object') {
                        Object.entries(data.oldValues).forEach(([k, v]) => oldValues.set(Number(k), Number(v)));
                    }
                    return new UpdatePropertyCommand(bridge, data.partIdxs, data.field, oldValues, data.newValue);

                case 'ADD_PART':
                    return new AddPartCommand(bridge, data.parentIdx);

                case 'DELETE_PART':
                    return new DeletePartCommand(bridge, stateManager, data.partIdx);

                case 'ADD_KEYFRAME':
                    return new AddKeyframeCommand(bridge, data.partIdx, data.modifType, data.frame, data.value);

                case 'MODIFY_KEYFRAME':
                    return new ModifyKeyframeCommand(bridge, data.partIdx, data.modifType, data.oldData, data.newData);

                case 'DELETE_KEYFRAME':
                    return new DeleteKeyframeCommand(bridge, data.partIdx, data.modifType, data.frame);

                case 'BATCH':
                    const subCommands = data.commands
                        .map((c: any) => this.deserialize(c, bridge, stateManager))
                        .filter((c: any) => c !== null);
                    return new BatchCommand(subCommands);

                default:
                    console.warn(`Unknown command type for deserialization: ${data.type}`);
                    return null;
            }
        } catch (e) {
            console.error(`Failed to deserialize command:`, data, e);
            return null;
        }
    }
}

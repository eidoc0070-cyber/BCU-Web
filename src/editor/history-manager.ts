import type { Command } from './commands/base';
import { CommandFactory } from './commands/factory';
import { EngineBridge } from './engine-bridge';
import { EditorStateManager } from './state-manager';

export class HistoryManager {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private maxHistory = 100;

    constructor() {}

    public serialize(): any {
        return {
            undo: this.undoStack.map(cmd => cmd.serialize()),
            redo: this.redoStack.map(cmd => cmd.serialize())
        };
    }

    public deserialize(data: any, bridge: EngineBridge, stateManager: EditorStateManager) {
        if (!data) return;
        this.undoStack = (data.undo || [])
            .map((c: any) => CommandFactory.deserialize(c, bridge, stateManager))
            .filter((c: any) => c !== null);
        this.redoStack = (data.redo || [])
            .map((c: any) => CommandFactory.deserialize(c, bridge, stateManager))
            .filter((c: any) => c !== null);
    }

    execute(command: Command) {
        if (!command.metadata) {
            command.metadata = {
                source: 'user',
                timestamp: Date.now()
            };
        }
        command.execute();
        this.push(command);
    }

    push(command: Command) {
        if (!command.metadata) {
            command.metadata = {
                source: 'user',
                timestamp: Date.now()
            };
        }
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack on new action
        
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
    }

    undo(): Command | undefined {
        const command = this.undoStack.pop();
        if (!command) return undefined;

        command.undo();
        this.redoStack.push(command);
        return command;
    }

    redo(): Command | undefined {
        const command = this.redoStack.pop();
        if (!command) return undefined;

        command.execute();
        this.undoStack.push(command);
        return command;
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }
}

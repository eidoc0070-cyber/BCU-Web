import { Command } from './commands/base';

export class HistoryManager {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private maxHistory = 100;

    constructor() {}

    execute(command: Command) {
        command.execute();
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

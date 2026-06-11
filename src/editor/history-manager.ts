export interface CommandRecord {
    op: string;
    partIdx: number;
    field: number;
    oldValue: number;
    newValue: number;
}

export class HistoryManager {
    private undoStack: CommandRecord[] = [];
    private redoStack: CommandRecord[] = [];
    private maxHistory = 100;

    constructor(
        private onApply: (partIdx: number, field: number, value: number) => void
    ) {}

    push(record: CommandRecord) {
        // If the value hasn't actually changed, don't push
        if (record.oldValue === record.newValue) return;

        this.undoStack.push(record);
        this.redoStack = []; // Clear redo stack on new action
        
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
    }

    undo(): CommandRecord | undefined {
        const record = this.undoStack.pop();
        if (!record) return undefined;

        this.onApply(record.partIdx, record.field, record.oldValue);
        this.redoStack.push(record);
        return record;
    }

    redo(): CommandRecord | undefined {
        const record = this.redoStack.pop();
        if (!record) return undefined;

        this.onApply(record.partIdx, record.field, record.newValue);
        this.undoStack.push(record);
        return record;
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }
}

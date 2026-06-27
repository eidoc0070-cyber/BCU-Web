import type { Command } from './base';

export class BatchCommand implements Command {
    readonly type = 'BATCH';

    constructor(
        private commands: Command[]
    ) {}

    execute(): void {
        this.commands.forEach(cmd => cmd.execute());
    }

    undo(): void {
        // Undo in reverse order
        [...this.commands].reverse().forEach(cmd => cmd.undo());
    }

    serialize(): any {
        return {
            type: this.type,
            commands: this.commands.map(cmd => cmd.serialize())
        };
    }
}

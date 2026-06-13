export interface Command {
    readonly type: string;
    execute(): void;
    undo(): void;
    serialize(): any;
}

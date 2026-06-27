export interface CommandMetadata {
  source: 'user' | 'agent';
  timestamp: number;
  description?: string;
}

export interface Command {
  readonly type: string;
  metadata?: CommandMetadata;
  execute(): void;
  undo(): void;
  serialize(): any;
}

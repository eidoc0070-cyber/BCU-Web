import type { AnimProp } from '../constants';
import type { EngineBridge } from '../engine-bridge';
import type { Command } from './base';

export class UpdatePropertyCommand implements Command {
  readonly type = 'UPDATE_PROPERTY';
  private oldValues: Map<number, number> = new Map();

  constructor(
    private bridge: EngineBridge,
    private partIdxs: number[],
    private field: AnimProp,
    oldValueOrValues: number | Map<number, number>,
    private newValue: number,
  ) {
    if (typeof oldValueOrValues === 'number') {
      partIdxs.forEach((idx) => this.oldValues.set(idx, oldValueOrValues));
    } else {
      this.oldValues = oldValueOrValues;
    }
  }

  execute(): void {
    this.partIdxs.forEach((idx) => {
      this.bridge.updateModelPart(idx, this.field, this.newValue);
    });
  }

  undo(): void {
    this.partIdxs.forEach((idx) => {
      const oldVal = this.oldValues.get(idx);
      if (oldVal !== undefined) {
        this.bridge.updateModelPart(idx, this.field, oldVal);
      }
    });
  }

  serialize(): any {
    const oldValuesObj: Record<number, number> = {};
    this.oldValues.forEach((v, k) => (oldValuesObj[k] = v));
    return {
      type: this.type,
      partIdxs: this.partIdxs,
      field: this.field,
      oldValues: oldValuesObj,
      newValue: this.newValue,
    };
  }
}

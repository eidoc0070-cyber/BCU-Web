import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { ModifyKeyframeCommand } from '../../src/editor/commands/animation-commands';
import { BatchCommand } from '../../src/editor/commands/batch-commands';

describe('Batch Command Logic Tests', () => {
  let mockBridge: any;
  let mockState: any;

  beforeAll(() => {
    try {
      GlobalRegistrator.register();
    } catch (_e) {}
  });

  beforeEach(() => {
    mockState = {
      animation: {
        anim: {
          parts: [
            {
              ints: [0, 10, 0, 0, 0],
              off: 0,
              moves: [
                [0, 100, 0, 0],
                [10, 200, 0, 0],
              ],
            },
            {
              ints: [1, 10, 0, 0, 0],
              off: 0,
              moves: [
                [0, 300, 0, 0],
                [10, 400, 0, 0],
              ],
            },
          ],
        },
      },
    };

    mockBridge = {
      getState: () => mockState,
      updateAnimKeyframe: (
        partIdx: number,
        type: number,
        moveIdx: number,
        f: number,
        v: number,
        i: number,
        e: number,
      ) => {
        const part = mockState.animation.anim.parts.find(
          (p: any) => p.ints[0] === partIdx && p.ints[1] === type,
        );
        if (part && part.moves[moveIdx]) {
          part.moves[moveIdx] = [f, v, i, e];
        }
      },
    };
  });

  test('BatchCommand should execute multiple keyframe modifications at once', () => {
    const cmd1 = new ModifyKeyframeCommand(
      mockBridge,
      0,
      10,
      { frame: 10, value: 200, interp: 0, easing: 0 },
      { frame: 15, value: 250, interp: 0, easing: 0 },
    );
    const cmd2 = new ModifyKeyframeCommand(
      mockBridge,
      1,
      10,
      { frame: 10, value: 400, interp: 0, easing: 0 },
      { frame: 15, value: 450, interp: 0, easing: 0 },
    );

    const batch = new BatchCommand([cmd1, cmd2]);
    batch.execute();

    expect(
      mockState.animation.anim.parts[0].moves.some(
        (m: any) => m[0] === 15 && m[1] === 250,
      ),
    ).toBe(true);
    expect(
      mockState.animation.anim.parts[1].moves.some(
        (m: any) => m[0] === 15 && m[1] === 450,
      ),
    ).toBe(true);

    batch.undo();
    expect(
      mockState.animation.anim.parts[0].moves.some(
        (m: any) => m[0] === 10 && m[1] === 200,
      ),
    ).toBe(true);
    expect(
      mockState.animation.anim.parts[1].moves.some(
        (m: any) => m[0] === 10 && m[1] === 400,
      ),
    ).toBe(true);
  });
});

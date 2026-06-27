import { beforeAll, describe, expect, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { UpdatePropertyCommand } from '../../src/editor/commands/property-commands';
import { PropertyInspector } from '../../src/editor/components/PropertyInspector';
import { AnimProp, InterpolationType } from '../../src/editor/constants';
import type { EngineBridge } from '../../src/editor/engine-bridge';
import { eventBus } from '../../src/editor/event-bus';
import { EditorStateManager } from '../../src/editor/state-manager';

describe('Multi-Edit and Guard Rails Tests', () => {
  beforeAll(() => {
    try {
      GlobalRegistrator.register();
    } catch (_e) {}

    // Setup minimal DOM for PropertyInspector
    document.body.innerHTML = `<div id="property-inspector"></div>`;
  });

  test('UpdatePropertyCommand should handle multiple parts and undo correctly', () => {
    const updatedParts: Map<number, number> = new Map();
    const bridge = {
      updateModelPart: (idx: number, _field: number, value: number) => {
        updatedParts.set(idx, value);
      },
    } as unknown as EngineBridge;

    const partIdxs = [1, 2, 3];
    const field = AnimProp.Opacity;
    const oldValues = new Map([
      [1, 1000],
      [2, 500],
      [3, 0],
    ]);
    const newValue = 800;

    const cmd = new UpdatePropertyCommand(
      bridge,
      partIdxs,
      field,
      oldValues,
      newValue,
    );

    // Execute
    cmd.execute();
    expect(updatedParts.get(1)).toBe(800);
    expect(updatedParts.get(2)).toBe(800);
    expect(updatedParts.get(3)).toBe(800);

    // Undo
    cmd.undo();
    expect(updatedParts.get(1)).toBe(1000);
    expect(updatedParts.get(2)).toBe(500);
    expect(updatedParts.get(3)).toBe(0);
  });

  test('PropertyInspector should apply guard rails for Scale and Opacity', () => {
    const stateManager = new EditorStateManager();
    const inspector = new PropertyInspector(stateManager);

    let lastEmitted: any = null;
    eventBus.on('PROPERTY_CHANGED', (data) => {
      lastEmitted = data;
    });

    const mockParts = [
      {
        index: 0,
        name: 'Part 0',
        raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000],
      },
    ];

    // 1. Test Scale Guard (min 1)
    inspector.update(mockParts, null, 0, mockParts);
    const scaleInput = document.querySelector(
      `input[data-field="${AnimProp.ScaleX}"]`,
    ) as HTMLInputElement;
    scaleInput.value = '-50';
    scaleInput.dispatchEvent(new Event('change'));

    expect(lastEmitted.value).toBe(1); // Should be clamped to 1

    // 2. Test Opacity Guard (0-1000)
    const opacityInput = document.querySelector(
      `input[data-field="${AnimProp.Opacity}"]`,
    ) as HTMLInputElement;
    opacityInput.value = '1500';
    opacityInput.dispatchEvent(new Event('change'));
    expect(lastEmitted.value).toBe(1000);

    opacityInput.value = '-200';
    opacityInput.dispatchEvent(new Event('change'));
    expect(lastEmitted.value).toBe(0);
  });

  test('PropertyInspector should revert to previous value on NaN input', () => {
    const stateManager = new EditorStateManager();
    const inspector = new PropertyInspector(stateManager);
    let notifyCalled = false;
    stateManager.subscribe(() => {
      notifyCalled = true;
    });

    const mockParts = [
      {
        index: 0,
        name: 'Part 0',
        raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000],
      },
    ];

    inspector.update(mockParts, null, 0, mockParts);
    const input = document.querySelector(
      `input[data-field="${AnimProp.PosX}"]`,
    ) as HTMLInputElement;
    input.value = 'abc'; // Invalid number
    notifyCalled = false;
    input.dispatchEvent(new Event('change'));

    expect(notifyCalled).toBe(true); // Should trigger re-render to revert UI
  });

  test('PropertyInspector should handle interpolation type changes and Easing guards', () => {
    const stateManager = new EditorStateManager();
    const inspector = new PropertyInspector(stateManager);

    let lastEmitted: any = null;
    eventBus.on('KEYFRAME_BATCH_MODIFIED', (data) => {
      lastEmitted = data;
    });

    const mockAnim = {
      parts: [
        {
          ints: [0, AnimProp.PosX, 0, 0, 0], // Part 0, PosX, Linear
          off: 0,
          moves: [[0, 100, InterpolationType.Linear, 0]], // Frame 0, Value 100, Linear, Easing 0
        },
      ],
    };

    const mockParts = [
      {
        index: 0,
        name: 'Part 0',
        raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000],
      },
    ];

    // 1. Select Keyframe and set to Easing
    stateManager.setKFSelection([`0:${AnimProp.PosX}:0`]);
    inspector.update(mockParts, mockAnim, 0, mockParts);

    const interpSelect = document.querySelector(
      'select[data-type="interp"]',
    ) as HTMLSelectElement;
    expect(interpSelect).not.toBeNull();
    interpSelect.value = InterpolationType.Easing.toString();
    interpSelect.dispatchEvent(new Event('change'));

    expect(lastEmitted.changes[0].newData.interp).toBe(
      InterpolationType.Easing,
    );

    // 2. Re-render UI and test Easing Guard (min 0, max 1000)
    mockAnim.parts[0].moves[0][2] = InterpolationType.Easing; // Simulate state update
    inspector.update(mockParts, mockAnim, 0, mockParts);

    const easingInput = document.querySelector(
      'input[data-type="easing"]',
    ) as HTMLInputElement;
    expect(easingInput).not.toBeNull();

    easingInput.value = '1500';
    easingInput.dispatchEvent(new Event('change'));
    expect(lastEmitted.changes[0].newData.easing).toBe(1000);

    easingInput.value = '-500';
    easingInput.dispatchEvent(new Event('change'));
    expect(lastEmitted.changes[0].newData.easing).toBe(0);
  });
});

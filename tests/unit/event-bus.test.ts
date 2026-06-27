import { describe, expect, test } from 'bun:test';
import { EventBus } from '../../src/editor/event-bus';

describe('EventBus Unit Tests', () => {
  test('should correctly emit and receive events', () => {
    const bus = new EventBus();
    let capturedIdx: number | null = -1;

    bus.on('PART_SELECTED', (data) => {
      capturedIdx = data.partIdx;
    });

    bus.emit('PART_SELECTED', { partIdx: 42 });
    expect(capturedIdx).toBe(42);

    bus.emit('PART_SELECTED', { partIdx: null });
    expect(capturedIdx).toBe(null);
  });

  test('should handle multiple listeners for the same event', () => {
    const bus = new EventBus();
    let callCount = 0;

    bus.on('FRAME_SEEK', () => {
      callCount++;
    });
    bus.on('FRAME_SEEK', () => {
      callCount++;
    });

    bus.emit('FRAME_SEEK', { frame: 10 });
    expect(callCount).toBe(2);
  });

  test('should successfully remove listeners with off()', () => {
    const bus = new EventBus();
    let callCount = 0;
    const callback = () => {
      callCount++;
    };

    bus.on('ANIMATION_SWITCHED', callback);
    bus.emit('ANIMATION_SWITCHED', { animId: 'walk' });
    expect(callCount).toBe(1);

    bus.off('ANIMATION_SWITCHED', callback);
    bus.emit('ANIMATION_SWITCHED', { animId: 'idle' });
    expect(callCount).toBe(1); // Should still be 1
  });

  test('should maintain type safety for event data', () => {
    const bus = new EventBus();
    let capturedValue = 0;

    bus.on('PROPERTY_CHANGED', (data) => {
      capturedValue = data.value;
    });

    bus.emit('PROPERTY_CHANGED', { partIdx: 0, field: 4, value: 1234 });
    expect(capturedValue).toBe(1234);
  });
});

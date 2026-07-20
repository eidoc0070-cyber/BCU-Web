//! @java: (none)
//! @logic: Unit tests for keyboard shortcuts in the BCU Editor.
//!
//! Verifies:
//! 1. Space toggles playback.
//! 2. Delete/Backspace deletes selected keyframes if present, or selected parts.
//! 3. Ctrl+Z and Ctrl+Y execute undo and redo commands.
//! 4. Shortcuts are ignored when focus is on HTML input, select, or textarea elements.

import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { BCUController } from '../../src/editor/controller';
import { eventBus } from '../../src/editor/event-bus';

describe('Keyboard Shortcuts Unit Tests', () => {
  beforeAll(() => {
    try {
      GlobalRegistrator.register();
    } catch (_e) {}
  });

  let controller: BCUController;
  let mockEngine: any;
  let canvas: HTMLCanvasElement;
  let gizmoCanvas: HTMLCanvasElement;
  let imgcutCanvas: HTMLCanvasElement;
  let logMessages: string[] = [];

  beforeEach(() => {
    logMessages = [];

    // Create DOM mocks with mocked 2D contexts
    const mockCtx2d = {
      clearRect: mock(() => {}),
      fillRect: mock(() => {}),
      fillText: mock(() => {}),
      beginPath: mock(() => {}),
      arc: mock(() => {}),
      stroke: mock(() => {}),
      fill: mock(() => {}),
      drawImage: mock(() => {}),
      setLineDash: mock(() => {}),
      measureText: mock(() => ({ width: 10 })),
    };

    canvas = document.createElement('canvas');
    canvas.getContext = mock((type: string) => {
      if (type === '2d') return mockCtx2d as any;
      return null;
    });

    gizmoCanvas = document.createElement('canvas');
    gizmoCanvas.getContext = mock((type: string) => {
      if (type === '2d') return mockCtx2d as any;
      return null;
    });

    imgcutCanvas = document.createElement('canvas');
    imgcutCanvas.getContext = mock((type: string) => {
      if (type === '2d') return mockCtx2d as any;
      return null;
    });

    // Create essential layout elements referenced by controller or components
    const dropZone = document.createElement('div');
    dropZone.id = 'drop-zone';
    document.body.appendChild(dropZone);

    const frameSlider = document.createElement('input');
    frameSlider.id = 'frame-slider';
    frameSlider.type = 'range';
    document.body.appendChild(frameSlider);

    // Mock BCUEngine to prevent real WebGL initialization in tests
    mockEngine = {
      resize: mock(() => {}),
      free: mock(() => {}),
    };

    // Instantiate Controller
    controller = new BCUController(
      mockEngine as any,
      canvas,
      gizmoCanvas,
      imgcutCanvas,
      (msg) => logMessages.push(msg),
    );

    // Mock EngineBridge to prevent real WASM execution
    controller.bridge = {
      getState: mock(() => ({
        animation: {
          parts: [],
          anim: { parts: [] },
        },
      })),
      deletePart: mock(() => {}),
      restorePart: mock(() => {}),
      updateModelPart: mock(() => {}),
      updateImgCut: mock(() => {}),
      setFrame: mock(() => {}),
      setAnimId: mock(() => {}),
      tick: mock(() => {}),
      render: mock(() => {}),
    } as any;

    // Mark as ready to allow status updates
    controller.state.setReady(true);
  });

  test('Space key should toggle playback state and show toast', () => {
    // Initial state is playing: true
    expect(controller.getStatus().isPlaying).toBe(true);

    let toastMessage = '';
    const onToast = (data: any) => {
      toastMessage = data.message;
    };
    eventBus.on('SHOW_TOAST', onToast);

    // Press Space
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(controller.getStatus().isPlaying).toBe(false);
    expect(toastMessage).toBe('Playback paused');

    // Press Space again
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(controller.getStatus().isPlaying).toBe(true);
    expect(toastMessage).toBe('Playback started');

    eventBus.off('SHOW_TOAST', onToast);
  });

  test('Space key should be ignored when focus is on an input element', () => {
    expect(controller.getStatus().isPlaying).toBe(true);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Trigger keydown on input
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    );

    // Playback state should remain unchanged (true)
    expect(controller.getStatus().isPlaying).toBe(true);
    document.body.removeChild(input);
  });

  test('Delete/Backspace key should delete selected keyframes if present', () => {
    // Select a keyframe
    const kfId = '0:4:10'; // Part 0, field PosX, frame 10
    controller.state.setKFSelection([kfId]);
    expect(controller.state.getKFSelection()).toEqual([kfId]);

    let deletedKF: any = null;
    const onKFDeleted = (data: any) => {
      deletedKF = data;
    };
    eventBus.on('KEYFRAME_DELETED', onKFDeleted);

    // Press Delete
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));

    expect(deletedKF).not.toBeNull();
    expect(deletedKF.partIdx).toBe(0);
    expect(deletedKF.modifType).toBe(4);
    expect(deletedKF.frame).toBe(10);

    // Keyframe selection should be cleared after deletion
    expect(controller.state.getKFSelection().length).toBe(0);

    eventBus.off('KEYFRAME_DELETED', onKFDeleted);
  });

  test('Delete/Backspace key should delete selected parts if no keyframe is selected', () => {
    // Select parts but no keyframes
    controller.state.setSelection([2, 5]);
    controller.state.clearKFSelection();

    const deletedParts: number[] = [];
    const onPartDeleted = (data: any) => {
      deletedParts.push(data.partIdx);
    };
    eventBus.on('PART_DELETED', onPartDeleted);

    // Mock confirm dialog to auto-approve deletion
    const originalConfirm = window.confirm;
    window.confirm = () => true;

    // Press Backspace
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

    expect(deletedParts).toContain(2);
    expect(deletedParts).toContain(5);

    window.confirm = originalConfirm;
    eventBus.off('PART_DELETED', onPartDeleted);
  });

  test('Ctrl+Z / Ctrl+Y should trigger undo / redo via HistoryManager', () => {
    let undoCalled = false;
    let redoCalled = false;

    // Spy on history manager methods
    controller.history.undo = () => {
      undoCalled = true;
      return {} as any; // Return mock command
    };
    controller.history.redo = () => {
      redoCalled = true;
      return {} as any;
    };

    // Press Ctrl+Z
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }),
    );
    expect(undoCalled).toBe(true);

    // Press Ctrl+Y
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }),
    );
    expect(redoCalled).toBe(true);
  });
});

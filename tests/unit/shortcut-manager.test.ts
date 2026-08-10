import { beforeAll, describe, expect, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { ShortcutManager } from '../../src/editor/shortcut-manager';

// ─────────────────────────────────────────────────────────────────────────────
// DOM environment setup (happy-dom)
// ─────────────────────────────────────────────────────────────────────────────
beforeAll(() => {
  if (typeof window === 'undefined') {
    GlobalRegistrator.register();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Create a minimal KeyboardEvent with optional modifier flags. */
function makeKey(
  key: string,
  opts: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  } = {},
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
    bubbles: true,
  });
}

/** Create a KeyboardEvent whose `target` is the given element. */
function makeKeyWithTarget(key: string, target: HTMLElement): KeyboardEvent {
  const e = makeKey(key);
  Object.defineProperty(e, 'target', { value: target, writable: false });
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ShortcutManager', () => {
  // ── register ───────────────────────────────────────────────────────────────
  test('register: handler fires when matching key is dispatched', () => {
    const sm = new ShortcutManager();
    let called = false;
    sm.register({
      key: 'a',
      description: 'A key',
      handler: () => {
        called = true;
      },
    });

    sm.dispatch(makeKey('a'));
    expect(called).toBe(true);
  });

  test('register: handler does NOT fire on a different key', () => {
    const sm = new ShortcutManager();
    let called = false;
    sm.register({
      key: 'a',
      description: 'A key',
      handler: () => {
        called = true;
      },
    });

    sm.dispatch(makeKey('b'));
    expect(called).toBe(false);
  });

  // ── ctrl combination ───────────────────────────────────────────────────────
  test('ctrl: handler fires only when Ctrl modifier matches', () => {
    const sm = new ShortcutManager();
    let called = false;
    sm.register({
      key: 'z',
      ctrl: true,
      description: 'Ctrl+Z',
      handler: () => {
        called = true;
      },
    });

    sm.dispatch(makeKey('z')); // no ctrl → no fire
    expect(called).toBe(false);

    sm.dispatch(makeKey('z', { ctrlKey: true })); // ctrl → fires
    expect(called).toBe(true);
  });

  test('ctrl: Cmd (metaKey) is treated identically to Ctrl', () => {
    const sm = new ShortcutManager();
    let called = false;
    sm.register({
      key: 'z',
      ctrl: true,
      description: 'Cmd+Z',
      handler: () => {
        called = true;
      },
    });

    sm.dispatch(makeKey('z', { metaKey: true }));
    expect(called).toBe(true);
  });

  // ── shift combination ──────────────────────────────────────────────────────
  test('shift: Ctrl+Shift+Z (key "Z") fires redo binding', () => {
    const sm = new ShortcutManager();
    let called = false;
    sm.register({
      key: 'Z',
      ctrl: true,
      shift: true,
      description: 'Ctrl+Shift+Z',
      handler: () => {
        called = true;
      },
    });

    sm.dispatch(makeKey('Z', { ctrlKey: true, shiftKey: true }));
    expect(called).toBe(true);
  });

  test('shift: Ctrl+Z (no shift) does NOT match Ctrl+Shift+Z binding', () => {
    const sm = new ShortcutManager();
    let called = false;
    sm.register({
      key: 'Z',
      ctrl: true,
      shift: true,
      description: 'Ctrl+Shift+Z',
      handler: () => {
        called = true;
      },
    });

    sm.dispatch(makeKey('z', { ctrlKey: true })); // lowercase 'z', no shift
    expect(called).toBe(false);
  });

  // ── input element guard ────────────────────────────────────────────────────
  test('input guard: handler is suppressed when target is HTMLInputElement', () => {
    const sm = new ShortcutManager();
    let called = false;
    sm.register({
      key: ' ',
      description: 'Space',
      handler: () => {
        called = true;
      },
    });

    const input = document.createElement('input');
    sm.dispatch(makeKeyWithTarget(' ', input));
    expect(called).toBe(false);
  });

  test('input guard: handler is suppressed when target is HTMLTextAreaElement', () => {
    const sm = new ShortcutManager();
    let called = false;
    sm.register({
      key: ' ',
      description: 'Space',
      handler: () => {
        called = true;
      },
    });

    const textarea = document.createElement('textarea');
    sm.dispatch(makeKeyWithTarget(' ', textarea));
    expect(called).toBe(false);
  });

  test('input guard: handler is suppressed when target is HTMLSelectElement', () => {
    const sm = new ShortcutManager();
    let called = false;
    sm.register({
      key: ' ',
      description: 'Space',
      handler: () => {
        called = true;
      },
    });

    const select = document.createElement('select');
    sm.dispatch(makeKeyWithTarget(' ', select));
    expect(called).toBe(false);
  });

  // ── unregister ─────────────────────────────────────────────────────────────
  test('unregister: handler no longer fires after removal', () => {
    const sm = new ShortcutManager();
    let count = 0;
    sm.register({
      key: 'x',
      description: 'X',
      handler: () => {
        count++;
      },
    });

    sm.dispatch(makeKey('x'));
    expect(count).toBe(1);

    sm.unregister('x');
    sm.dispatch(makeKey('x'));
    expect(count).toBe(1); // unchanged
  });

  // ── attach / detach ────────────────────────────────────────────────────────
  test('detach: no handlers fire after detach from window', () => {
    const sm = new ShortcutManager();
    let called = false;
    sm.register({
      key: 'q',
      description: 'Q',
      handler: () => {
        called = true;
      },
    });

    sm.attach(window);
    sm.detach(window);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'q', bubbles: true }),
    );
    expect(called).toBe(false);
  });

  // ── list ───────────────────────────────────────────────────────────────────
  test('list: returns all registered bindings in insertion order', () => {
    const sm = new ShortcutManager();
    sm.register({ key: 'a', description: 'A', handler: () => {} });
    sm.register({
      key: 'b',
      ctrl: true,
      description: 'Ctrl+B',
      handler: () => {},
    });

    const list = sm.list();
    expect(list).toHaveLength(2);
    expect(list[0]?.key).toBe('a');
    expect(list[1]?.key).toBe('b');
    expect(list[1]?.ctrl).toBe(true);
  });

  test('list: returns a copy (mutating list does not affect manager)', () => {
    const sm = new ShortcutManager();
    sm.register({ key: 'a', description: 'A', handler: () => {} });

    const list = sm.list();
    list.push({ key: 'z', description: 'Z', handler: () => {} }); // mutate copy

    expect(sm.list()).toHaveLength(1); // original unchanged
  });

  // ── first-match-wins ───────────────────────────────────────────────────────
  test('first-match-wins: only the first matching binding fires', () => {
    const sm = new ShortcutManager();
    const order: number[] = [];
    sm.register({
      key: 'k',
      description: 'First',
      handler: () => {
        order.push(1);
      },
    });
    sm.register({
      key: 'k',
      description: 'Second',
      handler: () => {
        order.push(2);
      },
    });

    sm.dispatch(makeKey('k'));
    expect(order).toEqual([1]); // second never fires
  });
});

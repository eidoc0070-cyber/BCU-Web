//! @java: N/A (new module, no Java counterpart)
//! @logic: Keyboard shortcut registry with input-element guard, ordered dispatch, and attach/detach lifecycle.
//! @parity: N/A

/**
 * A single keyboard shortcut binding.
 * When `ctrl` is `true`, the handler fires on Ctrl (or Cmd on macOS) + key.
 */
export interface ShortcutBinding {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly description: string;
  readonly handler: (e: KeyboardEvent) => void;
}

/**
 * Manages keyboard shortcut registrations and dispatches them on `keydown` events.
 * Attach to a `Window` with {@link attach} and remove with {@link detach} to prevent memory leaks.
 */
export class ShortcutManager {
  private bindings: ShortcutBinding[] = [];

  /**
   * Stable reference so the same function pointer is used for add/remove listener.
   */
  private readonly boundDispatch: (e: KeyboardEvent) => void;

  constructor() {
    this.boundDispatch = (e: KeyboardEvent): void => {
      this.dispatch(e);
    };
  }

  /** Register a new keyboard shortcut. Later registrations do NOT override earlier ones. */
  public register(binding: ShortcutBinding): void {
    this.bindings.push(binding);
  }

  /** Remove all bindings whose {@link ShortcutBinding.key} matches `key`. */
  public unregister(key: string): void {
    this.bindings = this.bindings.filter((b) => b.key !== key);
  }

  /** Attach the keydown listener to `target`. Call before any shortcut can fire. */
  public attach(target: Window): void {
    target.addEventListener('keydown', this.boundDispatch);
  }

  /** Detach the keydown listener from `target`. Prevents memory leaks on teardown. */
  public detach(target: Window): void {
    target.removeEventListener('keydown', this.boundDispatch);
  }

  /** Returns a shallow copy of all registered bindings (safe to iterate). */
  public list(): ShortcutBinding[] {
    return [...this.bindings];
  }

  /**
   * Match and dispatch a `KeyboardEvent` against registered bindings.
   * Guards against form-element focus, then fires the first matching binding.
   *
   * @remarks `ctrl` in a binding matches both `Ctrl` (Windows/Linux) and `Cmd` (macOS).
   */
  public dispatch(e: KeyboardEvent): void {
    // Guard: never fire shortcuts when a form control has focus
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;

    for (const binding of this.bindings) {
      const ctrlMatch = ctrl === (binding.ctrl === true);
      const shiftMatch = e.shiftKey === (binding.shift === true);
      const altMatch = e.altKey === (binding.alt === true);

      if (e.key === binding.key && ctrlMatch && shiftMatch && altMatch) {
        binding.handler(e);
        return; // first match wins — prevents double-firing
      }
    }
  }
}

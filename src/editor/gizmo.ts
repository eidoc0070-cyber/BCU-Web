import { EDITOR_CONFIG } from './config';
import { AnimProp } from './constants';
import type { EngineBridge } from './engine-bridge';
import { eventBus } from './event-bus';
import { PropertyValidator } from './integrity';

export class CanvasGizmo {
  private isDragging = false;
  private dragMode:
    | 'translate'
    | 'rotate'
    | 'scale'
    | 'translate-x'
    | 'translate-y'
    | null = null;
  private startWorldX = 0;
  private startWorldY = 0;

  // Store initial values for all selected parts during drag
  private selectionStartStates: Map<number, { val: number; val2?: number }> =
    new Map();
  private startAngleBase = 0;
  private startDistBase = 0;

  private selectedPartIdxs: number[] = [];
  private primarySelectedIdx: number | null = null;
  private hoverMode:
    | 'translate'
    | 'rotate'
    | 'scale'
    | 'translate-x'
    | 'translate-y'
    | null = null;
  private ctx: CanvasRenderingContext2D;
  private dragFields: AnimProp[] = [];

  private _boundMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
  private _boundMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
  private _boundMouseUp = () => this.handleMouseUp();

  constructor(
    private canvas: HTMLCanvasElement,
    private gizmoCanvas: HTMLCanvasElement,
    private bridge: EngineBridge,
  ) {
    this.ctx = gizmoCanvas.getContext('2d')!;
    this.initEvents();
    this.startLoop();

    eventBus.on('PART_SELECTED', (data) => {
      this.selectedPartIdxs = data.partIdxs;
      this.primarySelectedIdx =
        data.partIdxs.length > 0 ? (data.partIdxs[0] ?? null) : null;
    });
  }

  public setSelectedParts(idxs: number[]) {
    this.selectedPartIdxs = idxs;
    this.primarySelectedIdx = idxs.length > 0 ? (idxs[0] ?? null) : null;
  }

  private initEvents() {
    this.canvas.addEventListener('mousedown', this._boundMouseDown);
    window.addEventListener('mousemove', this._boundMouseMove);
    window.addEventListener('mouseup', this._boundMouseUp);
  }

  private getMousePos(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    return {
      rawX,
      rawY,
      worldX: rawX - this.canvas.width * EDITOR_CONFIG.RENDER_OFFSET_X,
      worldY: rawY - this.canvas.height * EDITOR_CONFIG.RENDER_OFFSET_Y,
    };
  }

  private handleMouseDown(e: MouseEvent) {
    if (this.canvas.style.display === 'none') return;

    const mouse = this.getMousePos(e);
    const state = this.bridge.getState();
    if (!state || !state.animation) return;

    // 1. Check Gizmo Handles first (relative to Primary selection)
    if (this.primarySelectedIdx !== null) {
      const transform = this.bridge.getPartTransform(this.primarySelectedIdx);
      if (transform) {
        const angleRad = (transform.angle * Math.PI) / 1800;

        // Rotation Handle
        const rotX = transform.x + Math.sin(angleRad) * 45;
        const rotY = transform.y - Math.cos(angleRad) * 45;
        if (
          Math.sqrt((mouse.worldX - rotX) ** 2 + (mouse.worldY - rotY) ** 2) <
          15
        ) {
          this.startDrag(e, 'rotate', AnimProp.Rotation);
          this.startAngleBase = Math.atan2(
            mouse.worldY - transform.y,
            mouse.worldX - transform.x,
          );
          return;
        }

        // Scale Handle
        const scX = transform.x + Math.cos(angleRad) * 45;
        const scY = transform.y + Math.sin(angleRad) * 45;
        if (
          Math.sqrt((mouse.worldX - scX) ** 2 + (mouse.worldY - scY) ** 2) < 15
        ) {
          this.startDrag(e, 'scale', AnimProp.ScaleX, AnimProp.ScaleY);
          this.startDistBase = Math.sqrt(
            (mouse.worldX - transform.x) ** 2 +
              (mouse.worldY - transform.y) ** 2,
          );
          return;
        }

        // Translate X Handle
        if (
          Math.abs(mouse.worldY - transform.y) < 10 &&
          mouse.worldX > transform.x + 20 &&
          mouse.worldX < transform.x + 65
        ) {
          this.startDrag(e, 'translate-x', AnimProp.PosX);
          return;
        }

        // Translate Y Handle
        if (
          Math.abs(mouse.worldX - transform.x) < 10 &&
          mouse.worldY > transform.y + 20 &&
          mouse.worldY < transform.y + 65
        ) {
          this.startDrag(e, 'translate-y', AnimProp.PosY);
          return;
        }

        // Translate Handle (Center)
        if (
          Math.sqrt(
            (mouse.worldX - transform.x) ** 2 +
              (mouse.worldY - transform.y) ** 2,
          ) < 20
        ) {
          this.startDrag(e, 'translate', AnimProp.PosX, AnimProp.PosY);
          return;
        }
      }
    }

    // 2. Hit-testing parts
    let bestIdx: number | null = null;
    let minDist = 30;

    for (let i = 0; i < state.animation.parts.length; i++) {
      const transform = this.bridge.getPartTransform(i);
      if (!transform) continue;

      const dist = Math.sqrt(
        (mouse.worldX - transform.x) ** 2 + (mouse.worldY - transform.y) ** 2,
      );
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }

    eventBus.emit('PART_SELECTED', {
      partIdxs: bestIdx !== null ? [bestIdx] : [],
    });
  }

  private startDrag(
    e: MouseEvent,
    mode: 'translate' | 'rotate' | 'scale' | 'translate-x' | 'translate-y',
    field: AnimProp,
    field2?: AnimProp,
  ) {
    const mouse = this.getMousePos(e);
    const state = this.bridge.getState();
    if (!state || !state.animation) return;

    this.isDragging = true;
    this.dragMode = mode;
    this.startWorldX = mouse.worldX;
    this.startWorldY = mouse.worldY;
    this.dragFields = field2 !== undefined ? [field, field2] : [field];

    // Capture start states for all selected parts
    this.selectionStartStates.clear();
    this.selectedPartIdxs.forEach((idx) => {
      const part = state.animation.parts.find((p: any) => p.index === idx);
      if (part) {
        this.selectionStartStates.set(idx, {
          val: (part.raw_args as any)[field] ?? 0,
          val2:
            field2 !== undefined
              ? ((part.raw_args as any)[field2] ?? 0)
              : undefined,
        });
      }
    });
  }

  private handleMouseMove(e: MouseEvent) {
    const mouse = this.getMousePos(e);

    // Update hover state for visual feedback
    if (!this.isDragging && this.primarySelectedIdx !== null) {
      this.updateHoverState(mouse);
    }

    if (
      !this.isDragging ||
      this.primarySelectedIdx === null ||
      this.selectionStartStates.size === 0
    )
      return;

    const transform = this.bridge.getPartTransform(this.primarySelectedIdx);
    if (!transform) return;

    if (this.dragMode === 'translate') {
      const dx = Math.round(mouse.worldX - this.startWorldX);
      const dy = Math.round(mouse.worldY - this.startWorldY);

      this.selectedPartIdxs.forEach((idx) => {
        const start = this.selectionStartStates.get(idx);
        if (start) {
          const xVal = PropertyValidator.clamp(
            AnimProp.PosX,
            start.val + dx,
          ).value;
          const yVal = PropertyValidator.clamp(
            AnimProp.PosY,
            start.val2! + dy,
          ).value;
          eventBus.emit('PROPERTY_CHANGED', {
            partIdxs: [idx],
            field: AnimProp.PosX,
            value: xVal,
            source: 'Gizmo',
          });
          eventBus.emit('PROPERTY_CHANGED', {
            partIdxs: [idx],
            field: AnimProp.PosY,
            value: yVal,
            source: 'Gizmo',
          });
        }
      });
    } else if (this.dragMode === 'translate-x') {
      const dx = Math.round(mouse.worldX - this.startWorldX);
      this.selectedPartIdxs.forEach((idx) => {
        const start = this.selectionStartStates.get(idx);
        if (start) {
          const xVal = PropertyValidator.clamp(
            AnimProp.PosX,
            start.val + dx,
          ).value;
          eventBus.emit('PROPERTY_CHANGED', {
            partIdxs: [idx],
            field: AnimProp.PosX,
            value: xVal,
            source: 'Gizmo',
          });
        }
      });
    } else if (this.dragMode === 'translate-y') {
      const dy = Math.round(mouse.worldY - this.startWorldY);
      this.selectedPartIdxs.forEach((idx) => {
        const start = this.selectionStartStates.get(idx);
        if (start) {
          const yVal = PropertyValidator.clamp(
            AnimProp.PosY,
            start.val + dy,
          ).value;
          eventBus.emit('PROPERTY_CHANGED', {
            partIdxs: [idx],
            field: AnimProp.PosY,
            value: yVal,
            source: 'Gizmo',
          });
        }
      });
    } else if (this.dragMode === 'rotate') {
      const currentAngle = Math.atan2(
        mouse.worldY - transform.y,
        mouse.worldX - transform.x,
      );
      const deltaAngle = Math.round(
        ((currentAngle - this.startAngleBase) * 1800) / Math.PI,
      );

      this.selectedPartIdxs.forEach((idx) => {
        const start = this.selectionStartStates.get(idx);
        if (start) {
          const rotVal = PropertyValidator.clamp(
            AnimProp.Rotation,
            (start.val + deltaAngle) % 3600,
          ).value;
          eventBus.emit('PROPERTY_CHANGED', {
            partIdxs: [idx],
            field: AnimProp.Rotation,
            value: rotVal,
            source: 'Gizmo',
          });
        }
      });
    } else if (this.dragMode === 'scale') {
      const currentDist = Math.sqrt(
        (mouse.worldX - transform.x) ** 2 + (mouse.worldY - transform.y) ** 2,
      );
      const ratio = currentDist / Math.max(1, this.startDistBase);

      this.selectedPartIdxs.forEach((idx) => {
        const start = this.selectionStartStates.get(idx);
        if (start) {
          const sxVal = PropertyValidator.clamp(
            AnimProp.ScaleX,
            Math.round(start.val * ratio),
          ).value;
          const syVal = PropertyValidator.clamp(
            AnimProp.ScaleY,
            Math.round(start.val2! * ratio),
          ).value;
          eventBus.emit('PROPERTY_CHANGED', {
            partIdxs: [idx],
            field: AnimProp.ScaleX,
            value: sxVal,
            source: 'Gizmo',
          });
          eventBus.emit('PROPERTY_CHANGED', {
            partIdxs: [idx],
            field: AnimProp.ScaleY,
            value: syVal,
            source: 'Gizmo',
          });
        }
      });
    }
  }

  private updateHoverState(mouse: { worldX: number; worldY: number }) {
    const transform = this.bridge.getPartTransform(this.primarySelectedIdx!);
    if (!transform) return;

    const angleRad = (transform.angle * Math.PI) / 1800;
    this.hoverMode = null;

    // Same hitboxes as handleMouseDown
    const rotX = transform.x + Math.sin(angleRad) * 45;
    const rotY = transform.y - Math.cos(angleRad) * 45;
    if (
      Math.sqrt((mouse.worldX - rotX) ** 2 + (mouse.worldY - rotY) ** 2) < 15
    ) {
      this.hoverMode = 'rotate';
    } else {
      const scX = transform.x + Math.cos(angleRad) * 45;
      const scY = transform.y + Math.sin(angleRad) * 45;
      if (
        Math.sqrt((mouse.worldX - scX) ** 2 + (mouse.worldY - scY) ** 2) < 15
      ) {
        this.hoverMode = 'scale';
      } else if (
        Math.abs(mouse.worldY - transform.y) < 10 &&
        mouse.worldX > transform.x + 20 &&
        mouse.worldX < transform.x + 65
      ) {
        this.hoverMode = 'translate-x';
      } else if (
        Math.abs(mouse.worldX - transform.x) < 10 &&
        mouse.worldY > transform.y + 20 &&
        mouse.worldY < transform.y + 65
      ) {
        this.hoverMode = 'translate-y';
      } else if (
        Math.sqrt(
          (mouse.worldX - transform.x) ** 2 + (mouse.worldY - transform.y) ** 2,
        ) < 20
      ) {
        this.hoverMode = 'translate';
      }
    }

    this.canvas.style.cursor = this.hoverMode ? 'pointer' : 'default';
  }

  private handleMouseUp() {
    if (this.isDragging && this.selectionStartStates.size > 0) {
      const state = this.bridge.getState();
      if (state && state.animation) {
        const targets: {
          partIdx: number;
          field: AnimProp;
          oldValue: number;
          newValue: number;
        }[] = [];

        this.selectionStartStates.forEach((start, idx) => {
          const part = state.animation.parts[idx];
          if (part) {
            this.dragFields.forEach((field, fIdx) => {
              const newValue = (part.raw_args as any)[field];
              const oldValue = fIdx === 0 ? start.val : (start.val2 ?? 0);
              if (newValue !== undefined && newValue !== oldValue) {
                targets.push({ partIdx: idx, field, oldValue, newValue });
              }
            });
          }
        });

        if (targets.length > 0) {
          eventBus.emit('TRANSFORM_COMMITTED', { targets });
        }
      }
    }

    this.isDragging = false;
    this.dragMode = null;
    this.dragFields = [];
  }

  private loopActive = true;
  public destroy() {
    this.loopActive = false;
    this.canvas.removeEventListener('mousedown', this._boundMouseDown);
    window.removeEventListener('mousemove', this._boundMouseMove);
    window.removeEventListener('mouseup', this._boundMouseUp);
  }

  private startLoop() {
    const tick = () => {
      if (!this.loopActive) return;
      if (this.canvas.style.display !== 'none') {
        this.draw();
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.gizmoCanvas.width, this.gizmoCanvas.height);
    if (
      this.primarySelectedIdx === null ||
      this.canvas.style.display === 'none'
    )
      return;

    const transform = this.bridge.getPartTransform(this.primarySelectedIdx);
    if (!transform) return;

    const screenX =
      transform.x + this.canvas.width * EDITOR_CONFIG.RENDER_OFFSET_X;
    const screenY =
      transform.y + this.canvas.height * EDITOR_CONFIG.RENDER_OFFSET_Y;
    const angleRad = (transform.angle * Math.PI) / 1800;

    this.ctx.save();
    this.ctx.translate(screenX, screenY);

    // 1. Translation Axes (Screen-aligned)
    // X-Axis (Red)
    const xHover =
      this.hoverMode === 'translate-x' || this.dragMode === 'translate-x';
    this.ctx.beginPath();
    this.ctx.moveTo(20, 0);
    this.ctx.lineTo(60, 0);
    this.ctx.strokeStyle = xHover ? '#ff6b6b' : '#ef4444';
    this.ctx.lineWidth = xHover ? 3 : 2;
    this.ctx.stroke();
    // Arrowhead X
    this.ctx.fillStyle = xHover ? '#ff6b6b' : '#ef4444';
    this.ctx.beginPath();
    this.ctx.moveTo(65, 0);
    this.ctx.lineTo(55, -5);
    this.ctx.lineTo(55, 5);
    this.ctx.fill();

    // Y-Axis (Green)
    const yHover =
      this.hoverMode === 'translate-y' || this.dragMode === 'translate-y';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 20);
    this.ctx.lineTo(0, 60);
    this.ctx.strokeStyle = yHover ? '#34d399' : '#10b981';
    this.ctx.lineWidth = yHover ? 3 : 2;
    this.ctx.stroke();
    // Arrowhead Y
    this.ctx.fillStyle = yHover ? '#34d399' : '#10b981';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 65);
    this.ctx.lineTo(-5, 55);
    this.ctx.lineTo(5, 55);
    this.ctx.fill();

    // 2. Free Translation Circle (Purple)
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
    this.ctx.strokeStyle =
      this.hoverMode === 'translate' || this.dragMode === 'translate'
        ? 'rgba(139, 92, 246, 0.8)'
        : 'rgba(139, 92, 246, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 3]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 3. Local Rotation & Scale Handles
    this.ctx.rotate(angleRad);

    // Rotation Handle (Yellow, Local Top)
    const rotHover = this.hoverMode === 'rotate' || this.dragMode === 'rotate';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(0, -45);
    this.ctx.strokeStyle = rotHover ? '#fbbf24' : '#f59e0b';
    this.ctx.stroke();
    this.ctx.fillStyle = rotHover ? '#fbbf24' : '#f59e0b';
    this.ctx.beginPath();
    this.ctx.arc(0, -45, rotHover ? 8 : 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    if (rotHover) this.ctx.stroke();

    // Scale Handle (Blue, Local Right)
    const scHover = this.hoverMode === 'scale' || this.dragMode === 'scale';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(45, 0);
    this.ctx.strokeStyle = scHover ? '#60a5fa' : '#3b82f6';
    this.ctx.stroke();
    this.ctx.fillStyle = scHover ? '#60a5fa' : '#3b82f6';
    const rectSize = scHover ? 14 : 10;
    this.ctx.fillRect(45 - rectSize / 2, -rectSize / 2, rectSize, rectSize);
    this.ctx.strokeStyle = '#fff';
    if (scHover)
      this.ctx.strokeRect(45 - rectSize / 2, -rectSize / 2, rectSize, rectSize);

    // Center Point
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();

    // Label
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 10px Outfit';
    this.ctx.textAlign = 'center';
    const labelText =
      this.selectedPartIdxs.length > 1
        ? `Selected: ${this.selectedPartIdxs.length} parts`
        : `Part ${this.primarySelectedIdx}`;
    this.ctx.fillText(labelText, screenX, screenY + 80);
  }
}

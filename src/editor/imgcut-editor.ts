import type { EngineBridge } from './engine-bridge';
import { eventBus } from './event-bus';

export class ImgCutEditor {
  private ctx: CanvasRenderingContext2D;
  private spriteImage: HTMLImageElement | null = null;
  private selectedCutIdx: number | null = null;
  private isDragging = false;
  private dragMode: 'move' | 'resize' | null = null;
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private bridge: EngineBridge,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.initEvents();
    this.startLoop();

    eventBus.on('PART_SELECTED', () => {
      this.selectedCutIdx = null;
    });
  }

  public setSprite(img: HTMLImageElement) {
    this.spriteImage = img;
  }

  public setSelectedCut(idx: number | null) {
    this.selectedCutIdx = idx;
  }

  private initEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', () => this.handleMouseUp());
  }

  private getMousePos(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handleMouseDown(e: MouseEvent) {
    if (this.canvas.style.display === 'none') return;

    const mouse = this.getMousePos(e);
    const state = this.bridge.getState();
    if (!state || !state.imgcut) return;

    // 1. Check Resize Handle of Selected Cut
    if (this.selectedCutIdx !== null) {
      const cut = state.imgcut.cuts[this.selectedCutIdx];
      const [x, y, w, h] = cut;

      // Handle at bottom-right corner
      if (
        Math.abs(mouse.x - (x + w)) < 12 &&
        Math.abs(mouse.y - (y + h)) < 12
      ) {
        this.isDragging = true;
        this.dragMode = 'resize';
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        return;
      }

      // Check if clicking inside to Move
      if (
        mouse.x >= x &&
        mouse.x <= x + w &&
        mouse.y >= y &&
        mouse.y <= y + h
      ) {
        this.isDragging = true;
        this.dragMode = 'move';
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        return;
      }
    }

    // 2. Click to Select a Cut
    for (let i = 0; i < state.imgcut.cuts.length; i++) {
      const [x, y, w, h] = state.imgcut.cuts[i];
      if (
        mouse.x >= x &&
        mouse.x <= x + w &&
        mouse.y >= y &&
        mouse.y <= y + h
      ) {
        this.selectedCutIdx = i;
        // Don't start dragging immediately on selection to avoid accidental moves
        return;
      }
    }

    this.selectedCutIdx = null;
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDragging || this.selectedCutIdx === null) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    const state = this.bridge.getState();
    if (!state) return;

    const cut = state.imgcut.cuts[this.selectedCutIdx];
    if (this.dragMode === 'move') {
      eventBus.emit('IMGCUT_CHANGED', {
        cutIdx: this.selectedCutIdx,
        field: 0,
        value: cut[0] + Math.round(dx),
      });
      eventBus.emit('IMGCUT_CHANGED', {
        cutIdx: this.selectedCutIdx,
        field: 1,
        value: cut[1] + Math.round(dy),
      });
    } else if (this.dragMode === 'resize') {
      eventBus.emit('IMGCUT_CHANGED', {
        cutIdx: this.selectedCutIdx,
        field: 2,
        value: Math.max(1, cut[2] + Math.round(dx)),
      });
      eventBus.emit('IMGCUT_CHANGED', {
        cutIdx: this.selectedCutIdx,
        field: 3,
        value: Math.max(1, cut[3] + Math.round(dy)),
      });
    }
  }

  private handleMouseUp() {
    this.isDragging = false;
    this.dragMode = null;
  }

  private startLoop() {
    const tick = () => {
      if (this.canvas.style.display !== 'none') {
        this.draw();
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Sprite Sheet Background
    if (this.spriteImage) {
      this.ctx.drawImage(this.spriteImage, 0, 0);
    }

    const state = this.bridge.getState();
    if (!state || !state.imgcut) return;

    // Draw all cuts with faint outlines
    state.imgcut.cuts.forEach((cut: number[], idx: number) => {
      const isSelected = idx === this.selectedCutIdx;
      const [x, y, w, h] = cut;

      if (isSelected) {
        // Highlight Selected
        this.ctx.strokeStyle = 'var(--accent)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);

        this.ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
        this.ctx.fillRect(x, y, w, h);

        // Resize Handle
        this.ctx.fillStyle = 'var(--accent)';
        this.ctx.fillRect(x + w - 5, y + h - 5, 10, 10);
      } else {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, w, h);
      }
    });
  }
}

import { EngineBridge } from './engine-bridge';
import { EDITOR_CONFIG } from './config';


export class CanvasGizmo {
    private isDragging = false;
    private dragMode: 'translate' | 'rotate' | 'scale' | null = null;
    private lastMouseX = 0;
    private lastMouseY = 0;
    private selectedPartIndex: number | null = null;
    private ctx: CanvasRenderingContext2D;

    constructor(
        private canvas: HTMLCanvasElement,
        private gizmoCanvas: HTMLCanvasElement,
        private bridge: EngineBridge,
        private onPropertyChange: (partIdx: number, field: number, value: number) => void,
        private onSelect: (partIdx: number | null) => void
    ) {
        this.ctx = gizmoCanvas.getContext('2d')!;
        this.initEvents();
        this.startLoop();
    }

    public setSelectedPart(index: number | null) {
        this.selectedPartIndex = index;
    }

    private initEvents() {
        // Events are attached to the main canvas which is interactive
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
    }

    private getMousePos(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        // Calculate position relative to the center of the canvas where the engine renders
        return {
            rawX: e.clientX - rect.left,
            rawY: e.clientY - rect.top,
            worldX: (e.clientX - rect.left) - this.canvas.width * EDITOR_CONFIG.RENDER_OFFSET_X,
            worldY: (e.clientY - rect.top) - this.canvas.height * EDITOR_CONFIG.RENDER_OFFSET_Y
        };
    }

    private handleMouseDown(e: MouseEvent) {
        if (this.canvas.style.display === 'none') return;

        const mouse = this.getMousePos(e);
        const state = this.bridge.getState();
        if (!state || !state.animation) return;

        // 1. Check Gizmo Handles first if a part is selected
        if (this.selectedPartIndex !== null) {
            const transform = this.bridge.getPartTransform(this.selectedPartIndex);
            if (transform) {
                const angleRad = transform.angle * Math.PI / 1800;
                
                // Rotation Handle (40px up from center in local space)
                const rotX = transform.x + Math.sin(angleRad) * 40;
                const rotY = transform.y - Math.cos(angleRad) * 40;
                if (Math.sqrt((mouse.worldX - rotX) ** 2 + (mouse.worldY - rotY) ** 2) < 15) {
                    this.isDragging = true;
                    this.dragMode = 'rotate';
                    this.lastMouseX = e.clientX;
                    this.lastMouseY = e.clientY;
                    return;
                }

                // Scale Handle (40px right from center in local space)
                const scX = transform.x + Math.cos(angleRad) * 40;
                const scY = transform.y + Math.sin(angleRad) * 40;
                if (Math.sqrt((mouse.worldX - scX) ** 2 + (mouse.worldY - scY) ** 2) < 15) {
                    this.isDragging = true;
                    this.dragMode = 'scale';
                    this.lastMouseX = e.clientX;
                    this.lastMouseY = e.clientY;
                    return;
                }

                // Translate Handle (Center)
                if (Math.sqrt((mouse.worldX - transform.x) ** 2 + (mouse.worldY - transform.y) ** 2) < 20) {
                    this.isDragging = true;
                    this.dragMode = 'translate';
                    this.lastMouseX = e.clientX;
                    this.lastMouseY = e.clientY;
                    return;
                }
            }
        }

        // 2. Hit-testing parts (Search from top-most z-order)
        let bestIdx: number | null = null;
        let minDist = 40;

        const parts = state.animation.parts;
        for (let i = 0; i < parts.length; i++) {
            const transform = this.bridge.getPartTransform(i);
            if (!transform) continue;

            const dist = Math.sqrt((mouse.worldX - transform.x) ** 2 + (mouse.worldY - transform.y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                bestIdx = i;
            }
        }

        if (bestIdx !== null) {
            this.selectedPartIndex = bestIdx;
            this.onSelect(bestIdx);
        } else {
            // Only deselect if we clicked far away from everything
            this.selectedPartIndex = null;
            this.onSelect(null);
        }
    }

    private handleMouseMove(e: MouseEvent) {
        if (!this.isDragging || this.selectedPartIndex === null) return;

        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        const state = this.bridge.getState();
        if (!state || !state.animation) return;

        const part = state.animation.parts[this.selectedPartIndex];
        const args = part.raw_args;

        if (this.dragMode === 'translate') {
            this.onPropertyChange(this.selectedPartIndex, 4, args[4] + Math.round(dx));
            this.onPropertyChange(this.selectedPartIndex, 5, args[5] + Math.round(dy));
        } else if (this.dragMode === 'rotate') {
            // Use horizontal drag for rotation sensitivity
            this.onPropertyChange(this.selectedPartIndex, 10, args[10] + Math.round(dx * 10));
        } else if (this.dragMode === 'scale') {
            this.onPropertyChange(this.selectedPartIndex, 8, args[8] + Math.round(dx * 5));
            this.onPropertyChange(this.selectedPartIndex, 9, args[9] + Math.round(dy * -5));
        }
    }

    private handleMouseUp() {
        this.isDragging = false;
        this.dragMode = null;
    }

    private startLoop() {
        const tick = () => {
            this.draw();
            requestAnimationFrame(tick);
        };
        tick();
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.gizmoCanvas.width, this.gizmoCanvas.height);
        if (this.selectedPartIndex === null || this.canvas.style.display === 'none') return;

        const transform = this.bridge.getPartTransform(this.selectedPartIndex);
        if (!transform) return;

        const screenX = transform.x + this.canvas.width * EDITOR_CONFIG.RENDER_OFFSET_X;
        const screenY = transform.y + this.canvas.height * EDITOR_CONFIG.RENDER_OFFSET_Y;
        const angleRad = transform.angle * Math.PI / 1800;

        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        
        // Target highlight
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
        this.ctx.setLineDash([5, 3]);
        this.ctx.stroke();

        this.ctx.rotate(angleRad);

        // Center Axis
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Rotation Handle (Green)
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, -40);
        this.ctx.strokeStyle = '#10b981';
        this.ctx.setLineDash([]);
        this.ctx.stroke();
        this.ctx.fillStyle = '#10b981';
        this.ctx.beginPath();
        this.ctx.arc(0, -40, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Scale Handle (Blue)
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(40, 0);
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.stroke();
        this.ctx.fillStyle = '#3b82f6';
        this.ctx.fillRect(34, -6, 12, 12);

        this.ctx.restore();
    }
}

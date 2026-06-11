import { EngineBridge } from './engine-bridge';
import { EDITOR_CONFIG } from './config';

export class CanvasGizmo {
    private isDragging = false;
    private dragMode: 'translate' | 'rotate' | 'scale' | null = null;
    private startWorldX = 0;
    private startWorldY = 0;
    private startPropValue = 0;
    private startPropValueSecondary = 0;
    private startAngle = 0;
    private startDist = 0;
    
    private selectedPartIndex: number | null = null;
    private hoverMode: 'translate' | 'rotate' | 'scale' | null = null;
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
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
    }

    private getMousePos(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        return {
            rawX,
            rawY,
            worldX: rawX - this.canvas.width * EDITOR_CONFIG.RENDER_OFFSET_X,
            worldY: rawY - this.canvas.height * EDITOR_CONFIG.RENDER_OFFSET_Y
        };
    }

    private handleMouseDown(e: MouseEvent) {
        if (this.canvas.style.display === 'none') return;

        const mouse = this.getMousePos(e);
        const state = this.bridge.getState();
        if (!state || !state.animation) return;

        // 1. Check Gizmo Handles first
        if (this.selectedPartIndex !== null) {
            const transform = this.bridge.getPartTransform(this.selectedPartIndex);
            if (transform) {
                const angleRad = transform.angle * Math.PI / 1800;
                const part = state.animation.parts[this.selectedPartIndex];
                
                // Rotation Handle (Top)
                const rotX = transform.x + Math.sin(angleRad) * 45;
                const rotY = transform.y - Math.cos(angleRad) * 45;
                if (Math.sqrt((mouse.worldX - rotX) ** 2 + (mouse.worldY - rotY) ** 2) < 15) {
                    this.startDrag(e, 'rotate', part.raw_args[10]);
                    this.startAngle = Math.atan2(mouse.worldY - transform.y, mouse.worldX - transform.x);
                    return;
                }

                // Scale Handle (Right)
                const scX = transform.x + Math.cos(angleRad) * 45;
                const scY = transform.y + Math.sin(angleRad) * 45;
                if (Math.sqrt((mouse.worldX - scX) ** 2 + (mouse.worldY - scY) ** 2) < 15) {
                    this.startDrag(e, 'scale', part.raw_args[8], part.raw_args[9]);
                    this.startDist = Math.sqrt((mouse.worldX - transform.x) ** 2 + (mouse.worldY - transform.y) ** 2);
                    return;
                }

                // Translate Handle (Center)
                if (Math.sqrt((mouse.worldX - transform.x) ** 2 + (mouse.worldY - transform.y) ** 2) < 20) {
                    this.startDrag(e, 'translate', part.raw_args[4], part.raw_args[5]);
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
            this.selectedPartIndex = null;
            this.onSelect(null);
        }
    }

    private startDrag(e: MouseEvent, mode: 'translate' | 'rotate' | 'scale', val: number, val2: number = 0) {
        const mouse = this.getMousePos(e);
        this.isDragging = true;
        this.dragMode = mode;
        this.startWorldX = mouse.worldX;
        this.startWorldY = mouse.worldY;
        this.startPropValue = val;
        this.startPropValueSecondary = val2;
    }

    private handleMouseMove(e: MouseEvent) {
        const mouse = this.getMousePos(e);
        
        // Update hover state for visual feedback
        if (!this.isDragging && this.selectedPartIndex !== null) {
            this.updateHoverState(mouse);
        }

        if (!this.isDragging || this.selectedPartIndex === null) return;

        const transform = this.bridge.getPartTransform(this.selectedPartIndex);
        if (!transform) return;

        if (this.dragMode === 'translate') {
            const dx = mouse.worldX - this.startWorldX;
            const dy = mouse.worldY - this.startWorldY;
            this.onPropertyChange(this.selectedPartIndex, 4, this.startPropValue + Math.round(dx));
            this.onPropertyChange(this.selectedPartIndex, 5, this.startPropValueSecondary + Math.round(dy));
        } else if (this.dragMode === 'rotate') {
            const currentAngle = Math.atan2(mouse.worldY - transform.y, mouse.worldX - transform.x);
            const deltaAngle = (currentAngle - this.startAngle) * 1800 / Math.PI;
            this.onPropertyChange(this.selectedPartIndex, 10, (this.startPropValue + Math.round(deltaAngle)) % 3600);
        } else if (this.dragMode === 'scale') {
            const currentDist = Math.sqrt((mouse.worldX - transform.x) ** 2 + (mouse.worldY - transform.y) ** 2);
            const ratio = currentDist / Math.max(1, this.startDist);
            this.onPropertyChange(this.selectedPartIndex, 8, Math.round(this.startPropValue * ratio));
            this.onPropertyChange(this.selectedPartIndex, 9, Math.round(this.startPropValueSecondary * ratio));
        }
    }

    private updateHoverState(mouse: { worldX: number, worldY: number }) {
        const transform = this.bridge.getPartTransform(this.selectedPartIndex!);
        if (!transform) return;

        const angleRad = transform.angle * Math.PI / 1800;
        this.hoverMode = null;

        // Same hitboxes as handleMouseDown
        const rotX = transform.x + Math.sin(angleRad) * 45;
        const rotY = transform.y - Math.cos(angleRad) * 45;
        if (Math.sqrt((mouse.worldX - rotX) ** 2 + (mouse.worldY - rotY) ** 2) < 15) {
            this.hoverMode = 'rotate';
        } else {
            const scX = transform.x + Math.cos(angleRad) * 45;
            const scY = transform.y + Math.sin(angleRad) * 45;
            if (Math.sqrt((mouse.worldX - scX) ** 2 + (mouse.worldY - scY) ** 2) < 15) {
                this.hoverMode = 'scale';
            } else if (Math.sqrt((mouse.worldX - transform.x) ** 2 + (mouse.worldY - transform.y) ** 2) < 20) {
                this.hoverMode = 'translate';
            }
        }
        
        this.canvas.style.cursor = this.hoverMode ? 'pointer' : 'default';
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
        
        // Highlight Circle
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.hoverMode === 'translate' || this.dragMode === 'translate' ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.stroke();

        this.ctx.rotate(angleRad);

        // Rotation Handle (Green)
        const rotHover = this.hoverMode === 'rotate' || this.dragMode === 'rotate';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, -45);
        this.ctx.strokeStyle = rotHover ? '#34d399' : '#10b981';
        this.ctx.setLineDash([]);
        this.ctx.stroke();
        this.ctx.fillStyle = rotHover ? '#34d399' : '#10b981';
        this.ctx.beginPath();
        this.ctx.arc(0, -45, rotHover ? 8 : 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        if (rotHover) this.ctx.stroke();

        // Scale Handle (Blue)
        const scHover = this.hoverMode === 'scale' || this.dragMode === 'scale';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(45, 0);
        this.ctx.strokeStyle = scHover ? '#60a5fa' : '#3b82f6';
        this.ctx.stroke();
        this.ctx.fillStyle = scHover ? '#60a5fa' : '#3b82f6';
        const rectSize = scHover ? 14 : 10;
        this.ctx.fillRect(45 - rectSize/2, -rectSize/2, rectSize, rectSize);
        this.ctx.strokeStyle = '#fff';
        if (scHover) this.ctx.strokeRect(45 - rectSize/2, -rectSize/2, rectSize, rectSize);

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
        this.ctx.fillText(`Part ${this.selectedPartIndex}`, screenX, screenY + 40);
    }
}

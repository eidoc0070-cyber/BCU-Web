import { eventBus } from '../event-bus';

export class PropertyInspector {
    private container = document.getElementById('property-inspector');
    private selectedKeyframe: { partIdx: number, modifType: number, moveIdx: number } | null = null;

    constructor() {
        eventBus.on('PART_SELECTED', () => {
            this.selectedKeyframe = null; // Reset KF when changing part
        });
    }

    public setSelectedKeyframe(kf: { partIdx: number, modifType: number, moveIdx: number } | null) {
        this.selectedKeyframe = kf;
    }

    public update(part: any, anim: any, currentFrame: number) {
        if (!this.container || !part) return;
        if (this.container.contains(document.activeElement)) return;

        const args = part.raw_args;
        
        let html = `
            <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--accent);">Part #${part.index} Props</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.7rem; align-items: center; margin-bottom: 1rem;">
                ${this.renderPropRow("Parent", 0, args[0], false)}
                ${this.renderPropRow("Z-Order", 1, args[1], true, part.index, currentFrame)}
                ${this.renderPropRow("Pos X", 4, args[4], true, part.index, currentFrame)}
                ${this.renderPropRow("Pos Y", 5, args[5], true, part.index, currentFrame)}
                ${this.renderPropRow("Pivot X", 6, args[6], true, part.index, currentFrame)}
                ${this.renderPropRow("Pivot Y", 7, args[7], true, part.index, currentFrame)}
                ${this.renderPropRow("Scale X", 8, args[8], true, part.index, currentFrame)}
                ${this.renderPropRow("Scale Y", 9, args[9], true, part.index, currentFrame)}
                ${this.renderPropRow("Angle", 10, args[10], true, part.index, currentFrame)}
                ${this.renderPropRow("Opacity", 11, args[11], true, part.index, currentFrame)}
            </div>
        `;

        // Keyframe Editor Section
        if (this.selectedKeyframe && this.selectedKeyframe.partIdx === part.index) {
            const kfPart = anim.parts.find((p: any) => p.ints[0] === this.selectedKeyframe!.partIdx && p.ints[1] === this.selectedKeyframe!.modifType);
            if (kfPart && kfPart.moves[this.selectedKeyframe.moveIdx]) {
                const move = kfPart.moves[this.selectedKeyframe.moveIdx];
                const modifName = ["Parent", "Z", "Img", "Glow", "PosX", "PosY", "PivX", "PivY", "ScaleX", "ScaleY", "Angle", "Opacity"][this.selectedKeyframe.modifType] || "Misc";
                
                html += `
                    <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
                        <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.5rem; color: #10b981;">KF Editor: ${modifName}</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                            <div class="prop-group">
                                <span>Frame</span>
                                <input type="number" class="kf-input" data-type="frame" value="${move[0] - kfPart.off}">
                            </div>
                            <div class="prop-group">
                                <span>Value</span>
                                <input type="number" class="kf-input" data-type="value" value="${move[1]}">
                            </div>
                            <div class="prop-group" style="grid-column: span 2;">
                                <span>Interpolation</span>
                                <select class="kf-input" data-type="interp" style="width: 100%; background: rgba(0,0,0,0.3); color: white; border: 1px solid var(--border-color); padding: 4px; border-radius: 4px; font-size: 0.7rem;">
                                    <option value="0" ${move[2] === 0 ? 'selected' : ''}>Linear</option>
                                    <option value="1" ${move[2] === 1 ? 'selected' : ''}>Step</option>
                                    <option value="2" ${move[2] === 2 ? 'selected' : ''}>Easing</option>
                                    <option value="3" ${move[2] === 3 ? 'selected' : ''}>Lagrange</option>
                                    <option value="4" ${move[2] === 4 ? 'selected' : ''}>Sinusoidal</option>
                                </select>
                            </div>
                            <div class="prop-group" style="grid-column: span 2;">
                                <span>Easing Param</span>
                                <input type="number" class="kf-input" data-type="easing" value="${move[3]}">
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        html += `
            <style>
                .prop-group { display: flex; flex-direction: column; gap: 2px; }
                .prop-group span { font-size: 0.6rem; color: var(--text-secondary); }
                .prop-input-container { display: flex; align-items: center; gap: 4px; }
                .prop-input, .kf-input { background: rgba(0,0,0,0.3); color: white; border: 1px solid var(--border-color); padding: 4px; border-radius: 4px; font-size: 0.75rem; width: 100%; }
                .btn-add-kf { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer; border-radius: 4px; padding: 2px 4px; font-size: 0.6rem; }
                .btn-add-kf:hover { border-color: var(--accent); color: var(--accent); }
            </style>
        `;

        this.container.innerHTML = html;

        this.container.querySelectorAll('.prop-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const el = e.target as HTMLInputElement;
                const field = parseInt(el.getAttribute('data-field')!);
                const value = parseInt(el.value);
                eventBus.emit('PROPERTY_CHANGED', { partIdx: part.index, field, value, source: 'Inspector' });
            });
        });

        this.container.querySelectorAll('.btn-add-kf').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const el = e.target as HTMLButtonElement;
                const field = parseInt(el.getAttribute('data-field')!);
                const value = parseInt((this.container!.querySelector(`input[data-field="${field}"]`) as HTMLInputElement).value);
                eventBus.emit('KEYFRAME_ADDED', { partIdx: part.index, modifType: field, frame: currentFrame, value });
            });
        });

        this.container.querySelectorAll('.kf-input').forEach(input => {
            input.addEventListener('change', () => {
                if (!this.selectedKeyframe) return;
                const frame = parseInt((this.container!.querySelector('.kf-input[data-type="frame"]') as HTMLInputElement).value);
                const value = parseInt((this.container!.querySelector('.kf-input[data-type="value"]') as HTMLInputElement).value);
                const interp = parseInt((this.container!.querySelector('.kf-input[data-type="interp"]') as HTMLSelectElement).value);
                const easing = parseInt((this.container!.querySelector('.kf-input[data-type="easing"]') as HTMLInputElement).value);
                
                eventBus.emit('KEYFRAME_MODIFIED', {
                    partIdx: this.selectedKeyframe!.partIdx,
                    modifType: this.selectedKeyframe!.modifType,
                    moveIdx: this.selectedKeyframe!.moveIdx,
                    frame, value, interp, easing
                });
            });
        });
    }

    private renderPropRow(label: string, field: number, value: number, animatable: boolean, _partIdx?: number, frame?: number) {
        return `
            <div class="prop-group">
                <span>${label}</span>
                <div class="prop-input-container">
                    <input type="number" data-field="${field}" value="${value}" class="prop-input">
                    ${animatable ? `<button class="btn-add-kf" data-field="${field}" title="Add Keyframe at Frame ${frame}">+</button>` : ''}
                </div>
            </div>
        `;
    }

    public flash(field: number) {
        const input = this.container?.querySelector(`input[data-field="${field}"]`) as HTMLElement;
        if (input) {
            input.style.transition = 'none';
            input.style.backgroundColor = 'rgba(139, 92, 246, 0.4)';
            setTimeout(() => {
                input.style.transition = 'background-color 0.5s ease';
                input.style.backgroundColor = '';
            }, 50);
        }
    }
}

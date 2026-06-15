import { eventBus } from '../event-bus';
import { EditorStateManager } from '../state-manager';

export class PropertyInspector {
    private container = document.getElementById('property-inspector');
    private currentPartIdxs: number[] = [];

    constructor(private stateManager: EditorStateManager) {
        eventBus.on('PART_SELECTED', () => {
            // Optional: could trigger a clear if needed, but update() handles it
        });
    }

    public update(selectedParts: any[], anim: any, currentFrame: number, allParts: any[]) {
        if (!this.container) return;
        
        this.currentPartIdxs = selectedParts.map(p => p.index);

        const kfSelection = this.stateManager.getKFSelection();

        if (selectedParts.length === 0 && kfSelection.length === 0) {
            this.container.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.7rem; text-align: center; margin-top: 2rem;">No selection</div>';
            return;
        }
        if (this.container.contains(document.activeElement)) return;

        const primaryPart = selectedParts[0];
        const isMultiPart = selectedParts.length > 1;

        const getMixedValue = (field: number) => {
            if (selectedParts.length === 0) return { value: 0, isMixed: false };
            const firstVal = selectedParts[0].raw_args[field];
            const isMixed = selectedParts.some(p => p.raw_args[field] !== firstVal);
            return { value: firstVal, isMixed };
        };

        const renderPropRow = (label: string, field: number, animatable: boolean) => {
            const { value, isMixed } = getMixedValue(field);
            
            // Special handling for Parent field: show as select
            if (field === 0 && !isMultiPart) {
                const invalidIdxs = new Set<number>();
                
                // Cycle prevention: can't be parent of self or descendants
                const collectDescendants = (idx: number) => {
                    invalidIdxs.add(idx);
                    allParts.forEach((p: any) => {
                        if (p.parent === idx) collectDescendants(p.index);
                    });
                };
                collectDescendants(primaryPart.index);

                let optionsHtml = `<option value="-1" ${value === -1 ? 'selected' : ''}>None (Root)</option>`;
                allParts.forEach((p: any) => {
                    if (!invalidIdxs.has(p.index)) {
                        optionsHtml += `<option value="${p.index}" ${p.index === value ? 'selected' : ''}>${p.index}: ${p.name || 'Part'}</option>`;
                    }
                });

                return `
                    <div class="prop-group">
                        <span>${label}</span>
                        <div class="prop-input-container">
                            <select data-field="0" class="prop-input" style="width: 100%;">
                                ${optionsHtml}
                            </select>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="prop-group">
                    <span>${label}</span>
                    <div class="prop-input-container">
                        <input type="number" 
                            data-field="${field}" 
                            value="${isMixed ? '' : value}" 
                            placeholder="${isMixed ? 'Mixed' : ''}"
                            class="prop-input ${isMixed ? 'mixed' : ''}">
                        ${animatable ? `<button class="btn-add-kf" data-field="${field}" title="Add Keyframe at Frame ${currentFrame}">+</button>` : ''}
                    </div>
                </div>
            `;
        };
        
        let html = '';
        
        if (selectedParts.length > 0) {
            html += `
                <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--accent);">
                    ${isMultiPart ? `Multiple Parts (${selectedParts.length})` : `Part #${primaryPart.index} Props`}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.7rem; align-items: center; margin-bottom: 1rem;">
                    ${renderPropRow("Parent", 0, false)}
                    ${renderPropRow("Z-Order", 1, true)}
                    ${renderPropRow("Pos X", 4, true)}
                    ${renderPropRow("Pos Y", 5, true)}
                    ${renderPropRow("Pivot X", 6, true)}
                    ${renderPropRow("Pivot Y", 7, true)}
                    ${renderPropRow("Scale X", 8, true)}
                    ${renderPropRow("Scale Y", 9, true)}
                    ${renderPropRow("Angle", 10, true)}
                    ${renderPropRow("Opacity", 11, true)}
                </div>
            `;
        }

        // Keyframe Editor Section
        if (kfSelection.length > 0) {
            const kfData = kfSelection.map(id => {
                const [pIdx, mType, fr] = id.split(':').map(Number);
                const part = anim.parts.find((p: any) => p.ints[0] === pIdx && p.ints[1] === mType);
                if (part) {
                    const move = part.moves.find((m: any) => (m[0] - part.off) === fr);
                    if (move) return { pIdx, mType, fr, val: move[1], interp: move[2], easing: move[3] };
                }
                return null;
            }).filter(d => d !== null);

            if (kfData.length > 0) {
                const isMixedFrame = kfData.some(d => d!.fr !== kfData[0]!.fr);
                const isMixedVal = kfData.some(d => d!.val !== kfData[0]!.val);
                const isMixedInterp = kfData.some(d => d!.interp !== kfData[0]!.interp);
                const isMixedEasing = kfData.some(d => d!.easing !== kfData[0]!.easing);
                const isMixedType = kfData.some(d => d!.mType !== kfData[0]!.mType);

                const typeNames = ["Parent", "Z", "Img", "Glow", "PosX", "PosY", "PivX", "PivY", "ScaleX", "ScaleY", "Angle", "Opacity"];
                const modifName = isMixedType ? "Mixed Types" : (typeNames[kfData[0]!.mType] || "Misc");

                html += `
                    <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
                        <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.5rem; color: #10b981;">
                            ${kfSelection.length > 1 ? `Keyframe Batch (${kfSelection.length})` : `KF Editor: ${modifName}`}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                            <div class="prop-group">
                                <span>Frame</span>
                                <input type="number" class="kf-input ${isMixedFrame ? 'mixed' : ''}" data-type="frame" 
                                    value="${isMixedFrame ? '' : kfData[0]!.fr}" placeholder="${isMixedFrame ? 'Mixed' : ''}">
                            </div>
                            <div class="prop-group">
                                <span>Value</span>
                                <input type="number" class="kf-input ${isMixedVal ? 'mixed' : ''}" data-type="value" 
                                    value="${isMixedVal ? '' : kfData[0]!.val}" placeholder="${isMixedVal ? 'Mixed' : ''}">
                            </div>
                            <div class="prop-group" style="grid-column: span 2;">
                                <span>Interpolation</span>
                                <select class="kf-input ${isMixedInterp ? 'mixed' : ''}" data-type="interp" style="width: 100%; background: rgba(0,0,0,0.3); color: white; border: 1px solid var(--border-color); padding: 4px; border-radius: 4px; font-size: 0.7rem;">
                                    ${isMixedInterp ? '<option value="" disabled selected>Mixed</option>' : ''}
                                    <option value="0" ${!isMixedInterp && kfData[0]!.interp === 0 ? 'selected' : ''}>Linear</option>
                                    <option value="1" ${!isMixedInterp && kfData[0]!.interp === 1 ? 'selected' : ''}>Step</option>
                                    <option value="2" ${!isMixedInterp && kfData[0]!.interp === 2 ? 'selected' : ''}>Easing</option>
                                    <option value="3" ${!isMixedInterp && kfData[0]!.interp === 3 ? 'selected' : ''}>Lagrange</option>
                                    <option value="4" ${!isMixedInterp && kfData[0]!.interp === 4 ? 'selected' : ''}>Sinusoidal</option>
                                </select>
                            </div>
                            <div class="prop-group" style="grid-column: span 2;">
                                <span>Easing Param</span>
                                <input type="number" class="kf-input ${isMixedEasing ? 'mixed' : ''}" data-type="easing" 
                                    value="${isMixedEasing ? '' : kfData[0]!.easing}" placeholder="${isMixedEasing ? 'Mixed' : ''}">
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
                .prop-input, .kf-input { background: rgba(0,0,0,0.3); color: white; border: 1px solid var(--border-color); padding: 4px; border-radius: 4px; font-size: 0.75rem; width: 100%; outline: none; transition: border-color 0.2s; }
                .prop-input:focus, .kf-input:focus { border-color: var(--accent); }
                .prop-input.mixed::placeholder, .kf-input.mixed::placeholder { color: #f59e0b; font-style: italic; opacity: 0.8; }
                .prop-input.mixed, .kf-input.mixed { border-left: 2px solid #f59e0b; }
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
                if (!isNaN(value)) {
                    eventBus.emit('PROPERTY_CHANGED', { partIdxs: this.currentPartIdxs, field, value, source: 'Inspector' });
                }
            });
        });

        this.container.querySelectorAll('.btn-add-kf').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const el = e.target as HTMLButtonElement;
                const field = parseInt(el.getAttribute('data-field')!);
                const input = this.container!.querySelector(`input[data-field="${field}"]`) as HTMLInputElement;
                const value = parseInt(input.value);
                if (!isNaN(value)) {
                    this.currentPartIdxs.forEach(idx => {
                        eventBus.emit('KEYFRAME_ADDED', { partIdx: idx, modifType: field, frame: currentFrame, value });
                    });
                }
            });
        });

        this.container.querySelectorAll('.kf-input').forEach(input => {
            input.addEventListener('change', () => {
                const frameInput = this.container!.querySelector('.kf-input[data-type="frame"]') as HTMLInputElement;
                const valueInput = this.container!.querySelector('.kf-input[data-type="value"]') as HTMLInputElement;
                const interpSelect = this.container!.querySelector('.kf-input[data-type="interp"]') as HTMLSelectElement;
                const easingInput = this.container!.querySelector('.kf-input[data-type="easing"]') as HTMLInputElement;
                
                const frame = parseInt(frameInput.value);
                const value = parseInt(valueInput.value);
                const interp = parseInt(interpSelect.value);
                const easing = parseInt(easingInput.value);
                
                const kfSelection = this.stateManager.getKFSelection();
                const changes: any[] = [];

                kfSelection.forEach(id => {
                    const [pIdx, mType, fr] = id.split(':').map(Number);
                    const part = anim.parts.find((p: any) => p.ints[0] === pIdx && p.ints[1] === mType);
                    if (part) {
                        const move = part.moves.find((m: any) => (m[0] - part.off) === fr);
                        if (move) {
                            changes.push({
                                partIdx: pIdx,
                                modifType: mType,
                                oldData: { frame: fr, value: move[1], interp: move[2], easing: move[3] },
                                newData: {
                                    frame: isNaN(frame) ? fr : frame,
                                    value: isNaN(value) ? move[1] : value,
                                    interp: isNaN(interp) ? move[2] : interp,
                                    easing: isNaN(easing) ? move[3] : easing
                                }
                            });
                        }
                    }
                });

                if (changes.length > 0) {
                    eventBus.emit('KEYFRAME_BATCH_MODIFIED', { changes });
                }
            });
        });
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

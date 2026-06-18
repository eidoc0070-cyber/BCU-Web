import { eventBus } from '../event-bus';
import { EditorStateManager } from '../state-manager';
import { AnimProp, InterpolationType, ANIM_PROP_NAMES } from '../constants';
import { PropertyValidator } from '../integrity';

export class PropertyInspector {
    private container = document.getElementById('property-inspector');
    private currentPartIdxs: number[] = [];

    constructor(private stateManager: EditorStateManager) {
        eventBus.on('PART_SELECTED', () => {
            // Optional: could trigger a clear if needed, but update() handles it
        });
    }

    public update(selectedParts: any[], anim: any, currentFrame: number, allParts: any[], alpha: number = 1.0) {
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

        const getInterpolatedValue = (p: any, field: AnimProp) => {
            const raw = p.raw_args[field];
            // Only interpolate specific fields that are in RenderState
            // Note: raw_args[field] is already the value at curr_state (logic tick)
            // So we interpolate between prev_state and curr_state.
            
            const isPlaying = this.stateManager.getStatus().isPlaying;
            if (!isPlaying || !p.prev_state || !p.curr_state) return raw;

            switch (field) {
                case AnimProp.PosX: return (p.prev_state.pos?.x ?? raw) * (1 - alpha) + (p.curr_state.pos?.x ?? raw) * alpha;
                case AnimProp.PosY: return (p.prev_state.pos?.y ?? raw) * (1 - alpha) + (p.curr_state.pos?.y ?? raw) * alpha;
                case AnimProp.ScaleX: return (p.prev_state.sca?.x ?? raw) * (1 - alpha) + (p.curr_state.sca?.y ?? raw) * alpha;
                case AnimProp.ScaleY: return (p.prev_state.sca?.y ?? raw) * (1 - alpha) + (p.curr_state.sca?.y ?? raw) * alpha;
                case AnimProp.Rotation: return (p.prev_state.angle ?? raw) * (1 - alpha) + (p.curr_state.angle ?? raw) * alpha;
                case AnimProp.Opacity: return (p.prev_state.opacity ?? raw) * (1 - alpha) + (p.curr_state.opacity ?? raw) * alpha;
                default: return raw;
            }
        };

        const getMixedValue = (field: AnimProp) => {
            if (selectedParts.length === 0) return { value: 0, isMixed: false };
            const firstVal = getInterpolatedValue(selectedParts[0], field);
            const isMixed = selectedParts.some(p => Math.abs(getInterpolatedValue(p, field) - firstVal) > 0.001);
            return { value: firstVal, isMixed };
        };

        const renderPropRow = (label: string, field: AnimProp, animatable: boolean) => {
            const { value, isMixed } = getMixedValue(field);
            const isPlaying = this.stateManager.getStatus().isPlaying;
            const displayValue = (typeof value === 'number' && isPlaying && animatable) ? value.toFixed(1) : value;
            
            // Special handling for Parent field: show as select
            if (field === AnimProp.Parent && !isMultiPart) {
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
                            <select data-field="${AnimProp.Parent}" class="prop-input" style="width: 100%;">
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
                            value="${isMixed ? '' : displayValue}" 
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
                    ${renderPropRow("Parent", AnimProp.Parent, false)}
                    ${renderPropRow("Unit ID", AnimProp.UnitID, false)}
                    ${renderPropRow("ImgCut ID", AnimProp.Image, false)}
                    ${renderPropRow("Z-Order", AnimProp.ZOrder, true)}
                    ${renderPropRow("Pos X", AnimProp.PosX, true)}
                    ${renderPropRow("Pos Y", AnimProp.PosY, true)}
                    ${renderPropRow("Pivot X", AnimProp.PivotX, true)}
                    ${renderPropRow("Pivot Y", AnimProp.PivotY, true)}
                    ${renderPropRow("Scale X", AnimProp.ScaleX, true)}
                    ${renderPropRow("Scale Y", AnimProp.ScaleY, true)}
                    ${renderPropRow("Rotation", AnimProp.Rotation, true)}
                    ${renderPropRow("Opacity", AnimProp.Opacity, true)}
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

                const modifName = isMixedType ? "Mixed Types" : (ANIM_PROP_NAMES[kfData[0]!.mType as AnimProp] || "Misc");
                const currentInterp = isMixedInterp ? -1 : kfData[0]!.interp;

                html += `
                    <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
                        <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.5rem; color: #10b981;">
                            ${kfSelection.length > 1 ? `Keyframe Batch (${kfSelection.length})` : `KF Editor: ${modifName}`}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
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
                        </div>

                        <div class="prop-group" style="margin-bottom: 0.5rem;">
                            <span>Interpolation</span>
                            <select class="kf-input ${isMixedInterp ? 'mixed' : ''}" data-type="interp" style="width: 100%; background: rgba(0,0,0,0.3); color: white; border: 1px solid var(--border-color); padding: 4px; border-radius: 4px; font-size: 0.7rem;">
                                ${isMixedInterp ? '<option value="-1" disabled selected>Mixed</option>' : ''}
                                <option value="${InterpolationType.Linear}" ${currentInterp === InterpolationType.Linear ? 'selected' : ''}>Linear</option>
                                <option value="${InterpolationType.Step}" ${currentInterp === InterpolationType.Step ? 'selected' : ''}>Step (None)</option>
                                <option value="${InterpolationType.Easing}" ${currentInterp === InterpolationType.Easing ? 'selected' : ''}>Easing (In/Out)</option>
                                <option value="${InterpolationType.Lagrange}" ${currentInterp === InterpolationType.Lagrange ? 'selected' : ''}>Lagrange (Poly)</option>
                                <option value="${InterpolationType.Sinusoidal}" ${currentInterp === InterpolationType.Sinusoidal ? 'selected' : ''}>Sinusoidal (Wave)</option>
                            </select>
                        </div>

                        ${currentInterp === InterpolationType.Easing ? `
                            <div class="prop-group" style="background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.2);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <span style="color: #10b981; font-size: 0.6rem;">Easing Param</span>
                                    <span style="font-family: monospace; font-size: 0.65rem; color: #10b981;">${isMixedEasing ? 'Mixed' : kfData[0]!.easing}</span>
                                </div>
                                <input type="range" class="kf-input" data-type="easing-slider" min="0" max="1000" step="1" 
                                    value="${isMixedEasing ? 500 : kfData[0]!.easing}" style="width: 100%; height: 4px; padding: 0; accent-color: #10b981;">
                                <input type="number" class="kf-input ${isMixedEasing ? 'mixed' : ''}" data-type="easing" 
                                    value="${isMixedEasing ? '' : kfData[0]!.easing}" placeholder="0-1000" 
                                    style="margin-top: 4px; text-align: center;">
                                <div style="font-size: 0.55rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.2;">
                                    • 0-499: Ease-In (Accel) | 500: Linear | 501-1000: Ease-Out (Decel)
                                </div>
                            </div>
                        ` : ''}

                        ${currentInterp === InterpolationType.Lagrange ? `
                            <div style="font-size: 0.55rem; color: #60a5fa; background: rgba(59, 130, 246, 0.1); padding: 8px; border-radius: 4px; border: 1px solid rgba(59, 130, 246, 0.2); line-height: 1.2;">
                                <strong>Lagrange Mode:</strong><br>
                                Polynomial curve using neighbor keyframes. Best for smooth trajectories.
                            </div>
                        ` : ''}
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
                let value = parseInt(el.value);
                
                if (isNaN(value)) {
                    // Revert to current value if empty
                    this.stateManager.notify(); // Triggers re-render
                    return;
                }

                // Guard Rails (BCU Specification)
                if (field === AnimProp.Parent && !isMultiPart) {
                    if (PropertyValidator.wouldCreateCycle(primaryPart.index, value, allParts)) {
                        eventBus.emit('SHOW_TOAST', { message: "Cannot create circular parent reference", type: 'error' });
                        this.stateManager.notify();
                        return;
                    }
                }

                const result = PropertyValidator.clamp(field, value);
                if (result.corrected) {
                    value = result.value;
                    eventBus.emit('SHOW_TOAST', { message: result.message || "Value clamped to valid range", type: 'warning' });
                }

                eventBus.emit('PROPERTY_CHANGED', { partIdxs: this.currentPartIdxs, field, value, source: 'Inspector' });
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
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const inputType = target.getAttribute('data-type');
                
                const frameInput = this.container!.querySelector('.kf-input[data-type="frame"]') as HTMLInputElement;
                const valueInput = this.container!.querySelector('.kf-input[data-type="value"]') as HTMLInputElement;
                const interpSelect = this.container!.querySelector('.kf-input[data-type="interp"]') as HTMLSelectElement;
                const easingInput = this.container!.querySelector('.kf-input[data-type="easing"]') as HTMLInputElement;
                const easingSlider = this.container!.querySelector('.kf-input[data-type="easing-slider"]') as HTMLInputElement;
                
                const frame = parseInt(frameInput.value);
                const value = parseInt(valueInput.value);
                let interp = parseInt(interpSelect.value);
                let easing = easingInput ? parseInt(easingInput.value) : 0;
                
                if (inputType === 'easing-slider' && easingSlider) {
                    easing = parseInt(easingSlider.value);
                }

                // Guard Rails for Easing
                if (inputType === 'easing' || inputType === 'easing-slider') {
                    const result = PropertyValidator.clamp(AnimProp.Opacity, easing); // Using Opacity bounds for 0-1000 easing
                    easing = result.value;
                }
                
                const kfSelection = this.stateManager.getKFSelection();
                const changes: any[] = [];

                kfSelection.forEach(id => {
                    const [pIdx, mType, fr] = id.split(':').map(Number);
                    const part = anim.parts.find((p: any) => p.ints[0] === pIdx && p.ints[1] === mType);
                    if (part) {
                        const move = part.moves.find((m: any) => (m[0] - part.off) === fr);
                        if (move) {
                            // Validate interpolation for this field
                            const validatedInterp = PropertyValidator.validateInterpolation(mType, interp);

                            changes.push({
                                partIdx: pIdx,
                                modifType: mType,
                                oldData: { frame: fr, value: move[1], interp: move[2], easing: move[3] },
                                newData: {
                                    frame: isNaN(frame) ? fr : frame,
                                    value: isNaN(value) ? move[1] : value,
                                    interp: (isNaN(interp) || interp === -1) ? move[2] : validatedInterp,
                                    easing: isNaN(easing) ? move[3] : easing
                                }
                            });
                        }
                    }
                });

                if (changes.length > 0) {
                    eventBus.emit('KEYFRAME_BATCH_MODIFIED', { changes });
                    if (inputType === 'interp' || inputType === 'easing-slider' || inputType === 'easing') {
                        // Re-render UI to update dynamic interpolation fields or slider labels
                        setTimeout(() => this.update(selectedParts, anim, currentFrame, allParts, alpha), 10);
                    }
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

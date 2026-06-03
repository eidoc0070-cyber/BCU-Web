export class UIManager {
    private partsListContainer = document.getElementById('parts-list');
    private propertyInspector = document.getElementById('property-inspector');
    private frameSlider = document.getElementById('frame-slider') as HTMLInputElement;
    private timelineKeyframesContainer = document.getElementById('timeline-keyframes');
    private currentFrameLabel = document.getElementById('current-frame-label');
    private maxFrameLabel = document.getElementById('max-frame-label');
    private imgcutListContainer = document.getElementById('imgcut-list');
    private fileExplorerContainer = document.getElementById('file-explorer');
    private projectNameInput = document.getElementById('input-project-name') as HTMLInputElement;
    
    private lastPartsJson = '';
    private lastImgCutJson = '';
    private lastFilesJson = '';
    private selectedPartIndex: number | null = null;

    constructor(
        private onFrameSeek: (frame: number) => void,
        private onPropertyChange: (partIdx: number, field: number, value: number) => void,
        private onImgCutChange: (cutIdx: number, field: number, value: number) => void,
        private onFileSelect: (fileName: string) => void,
        private onPartSelect?: (partIdx: number | null) => void,
        private onKeyframeChange?: (partIdx: number, modifType: number, moveIdx: number, newFrame: number) => void,
        private onProjectNameChange?: (name: string) => void,
        private onPartAdd?: (parent: number) => void,
        private onPartDelete?: (partIdx: number) => void,
        private onKeyframeAdd?: (partIdx: number, modifType: number, frame: number, value: number) => void,
        private onKeyframeDelete?: (partIdx: number, modifType: number, moveIdx: number) => void
    ) {
        this.frameSlider?.addEventListener('input', () => {
            this.onFrameSeek(parseFloat(this.frameSlider.value));
        });

        this.projectNameInput?.addEventListener('input', () => {
            if (this.onProjectNameChange) this.onProjectNameChange(this.projectNameInput.value);
        });

        // Tab switching logic
        const tabModel = document.getElementById('tab-model');
        const tabImgCut = document.getElementById('tab-imgcut');
        const tabFiles = document.getElementById('tab-files');
        const viewModel = document.getElementById('view-model-anim');
        const viewImgCut = document.getElementById('view-imgcut');
        const viewFiles = document.getElementById('view-files');

        const switchTab = (activeTab: HTMLElement, activeView: HTMLElement) => {
            [tabModel, tabImgCut, tabFiles].forEach(t => t?.classList.remove('active'));
            [viewModel, viewImgCut, viewFiles].forEach(v => { if (v) v.style.display = 'none'; });
            activeTab.classList.add('active');
            activeView.style.display = 'block';
        };

        tabModel?.addEventListener('click', () => {
            if (viewModel) switchTab(tabModel, viewModel);
            
            const bcuCanvas = document.getElementById('bcu-canvas');
            const gizmoCanvas = document.getElementById('gizmo-canvas');
            const imgcutCanvas = document.getElementById('imgcut-canvas');
            if (bcuCanvas) bcuCanvas.style.display = 'block';
            if (gizmoCanvas) gizmoCanvas.style.display = 'block';
            if (imgcutCanvas) imgcutCanvas.style.display = 'none';
        });

        tabImgCut?.addEventListener('click', () => {
            if (viewImgCut) switchTab(tabImgCut, viewImgCut);

            const bcuCanvas = document.getElementById('bcu-canvas');
            const gizmoCanvas = document.getElementById('gizmo-canvas');
            const imgcutCanvas = document.getElementById('imgcut-canvas');
            if (bcuCanvas) bcuCanvas.style.display = 'none';
            if (gizmoCanvas) gizmoCanvas.style.display = 'none';
            if (imgcutCanvas) imgcutCanvas.style.display = 'block';
        });

        tabFiles?.addEventListener('click', () => {
            if (viewFiles) switchTab(tabFiles, viewFiles);
        });
    }

    public setSelectedPart(index: number | null) {
        this.selectedPartIndex = index;
        this.lastPartsJson = ''; 
    }

    update(state: any, isPlaying: boolean, project?: any) {
        if (!state) return;

        if (this.currentFrameLabel) this.currentFrameLabel.innerText = `Frame: ${Math.floor(state.current_frame)}`;
        if (this.maxFrameLabel) this.maxFrameLabel.innerText = `Max: ${state.max_frame}`;
        
        if (this.frameSlider) {
            this.frameSlider.max = state.max_frame.toString();
            if (isPlaying) this.frameSlider.value = state.current_frame.toString();
        }

        const partsJson = JSON.stringify(state.parts);
        if (partsJson !== this.lastPartsJson && this.partsListContainer) {
            this.lastPartsJson = partsJson;
            this.renderPartsList(state.parts);
        }

        const imgcutJson = JSON.stringify(state.imgcut);
        if (imgcutJson !== this.lastImgCutJson && this.imgcutListContainer) {
            this.lastImgCutJson = imgcutJson;
            this.renderImgCutList(state.imgcut);
        }

        if (project) {
            const filesJson = JSON.stringify(Array.from(project.files.keys()));
            if (filesJson !== this.lastFilesJson) {
                this.lastFilesJson = filesJson;
                this.renderFileExplorer(project);
            }
        }

        if (this.selectedPartIndex !== null) {
            this.updatePropertyInspector(state.parts[this.selectedPartIndex]);
        }
        this.renderKeyframes(state);
    }

    private renderFileExplorer(project: any) {
        if (!this.fileExplorerContainer) return;
        this.fileExplorerContainer.innerHTML = '';

        const files = Array.from(project.files.values()) as any[];
        
        const categories = {
            'Images': files.filter(f => f.type === 'sprite' || f.type === 'icon'),
            'Data': files.filter(f => f.type === 'imgcut' || f.type === 'mamodel'),
            'Animations': files.filter(f => f.type === 'maanim')
        };

        Object.entries(categories).forEach(([name, group]) => {
            if (group.length === 0) return;

            const header = document.createElement('div');
            header.style.fontSize = '0.65rem';
            header.style.textTransform = 'uppercase';
            header.style.color = 'var(--text-secondary)';
            header.style.margin = '1rem 0 0.5rem 0.5rem';
            header.innerText = name;
            this.fileExplorerContainer?.appendChild(header);

            group.forEach(file => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.style.padding = '0.4rem 0.75rem';
                item.style.fontSize = '0.75rem';
                item.style.cursor = 'pointer';
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.gap = '8px';
                item.style.borderRadius = '4px';

                const icon = file.type === 'maanim' ? '🎞️' : (file.type === 'sprite' || file.type === 'icon' ? '🖼️' : '📄');
                item.innerHTML = `<span>${icon}</span> <span style="flex: 1">${file.name}</span>`;

                item.onclick = () => this.onFileSelect(file.name);
                this.fileExplorerContainer?.appendChild(item);
            });
        });
    }

    private renderImgCutList(imgcut: any) {
        if (!this.imgcutListContainer) return;
        this.imgcutListContainer.innerHTML = '';
        
        imgcut.cuts.forEach((cut: number[], idx: number) => {
            const name = imgcut.strs[idx] || `Cut ${idx}`;
            const row = document.createElement('div');
            row.style.padding = '0.75rem';
            row.style.marginBottom = '0.5rem';
            row.style.background = 'rgba(255,255,255,0.03)';
            row.style.borderRadius = '6px';
            row.style.fontSize = '0.75rem';

            row.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--accent);">${idx}: ${name}</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem;">
                    <div style="display: flex; align-items: center; gap: 4px;">X: <input type="number" data-idx="${idx}" data-field="0" value="${cut[0]}" style="width: 100%; background: #000; color: white; border: 1px solid #333; padding: 2px;"></div>
                    <div style="display: flex; align-items: center; gap: 4px;">Y: <input type="number" data-idx="${idx}" data-field="1" value="${cut[1]}" style="width: 100%; background: #000; color: white; border: 1px solid #333; padding: 2px;"></div>
                    <div style="display: flex; align-items: center; gap: 4px;">W: <input type="number" data-idx="${idx}" data-field="2" value="${cut[2]}" style="width: 100%; background: #000; color: white; border: 1px solid #333; padding: 2px;"></div>
                    <div style="display: flex; align-items: center; gap: 4px;">H: <input type="number" data-idx="${idx}" data-field="3" value="${cut[3]}" style="width: 100%; background: #000; color: white; border: 1px solid #333; padding: 2px;"></div>
                </div>
            `;

            row.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', (e) => {
                    const el = e.target as HTMLInputElement;
                    const field = parseInt(el.getAttribute('data-field')!);
                    const cutIdx = parseInt(el.getAttribute('data-idx')!);
                    this.onImgCutChange(cutIdx, field, parseInt(el.value));
                });
            });

            this.imgcutListContainer?.appendChild(row);
        });
    }

    private renderKeyframes(state: any) {
        if (!this.timelineKeyframesContainer) return;
        
        this.timelineKeyframesContainer.innerHTML = '';
        const maxFrame = state.max_frame;
        if (maxFrame <= 0) return;

        state.anim.parts.forEach((p: any) => {
            const isSelected = p.ints[0] === this.selectedPartIndex;
            
            p.moves.forEach((move: any, moveIdx: number) => {
                const frame = move[0] - p.off;
                const ratio = frame / maxFrame;
                
                const dot = document.createElement('div');
                dot.style.position = 'absolute';
                dot.style.left = `${ratio * 100}%`;
                dot.style.top = isSelected ? '0' : '25%';
                dot.style.width = isSelected ? '6px' : '2px';
                dot.style.height = isSelected ? '100%' : '50%';
                dot.style.background = isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.2)';
                dot.style.zIndex = isSelected ? '10' : '1';
                dot.style.cursor = isSelected ? 'ew-resize' : 'default';
                dot.title = `Part ${p.ints[0]}, Frame ${frame}`;
                
                if (isSelected) {
                    dot.oncontextmenu = (e) => {
                        e.preventDefault();
                        if (confirm(`Delete keyframe for Part ${p.ints[0]} at frame ${frame}?`)) {
                            if (this.onKeyframeDelete) this.onKeyframeDelete(p.ints[0], p.ints[1], moveIdx);
                        }
                    };

                    dot.onmousedown = (e) => {
                        if (e.button !== 0) return; // Only left click for dragging
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startFrame = frame;
                        
                        const onMouseMove = (moveEvent: MouseEvent) => {
                            const dx = moveEvent.clientX - startX;
                            const rect = this.timelineKeyframesContainer!.getBoundingClientRect();
                            const frameDelta = Math.round((dx / rect.width) * maxFrame);
                            const newFrame = Math.max(0, Math.min(maxFrame, startFrame + frameDelta));
                            
                            if (this.onKeyframeChange) {
                                this.onKeyframeChange(p.ints[0], p.ints[1], moveIdx, newFrame);
                            }
                        };
                        
                        const onMouseUp = () => {
                            window.removeEventListener('mousemove', onMouseMove);
                            window.removeEventListener('mouseup', onMouseUp);
                        };
                        
                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);
                    };
                }

                this.timelineKeyframesContainer?.appendChild(dot);
            });
        });
    }

    private renderPartsList(parts: any[]) {
        if (!this.partsListContainer) return;
        this.partsListContainer.innerHTML = '';
        
        const addRootBtn = document.createElement('button');
        addRootBtn.className = 'action-btn secondary-btn';
        addRootBtn.style.width = '100%';
        addRootBtn.style.marginBottom = '1rem';
        addRootBtn.style.fontSize = '0.7rem';
        addRootBtn.innerText = '+ Add Root Part';
        addRootBtn.onclick = () => { if (this.onPartAdd) this.onPartAdd(-1); };
        this.partsListContainer.appendChild(addRootBtn);

        const tree: any[] = [];
        const map: Record<number, any> = {};
        
        parts.forEach(p => {
            map[p.index] = { ...p, children: [] };
        });
        
        parts.forEach(p => {
            const parentIdx = p.raw_args[0];
            if (parentIdx === -1 || !map[parentIdx]) {
                tree.push(map[p.index]);
            } else {
                map[parentIdx].children.push(map[p.index]);
            }
        });

        const renderNode = (node: any, depth: number, container: HTMLElement) => {
            const item = document.createElement('div');
            item.className = 'part-item';
            item.style.paddingLeft = `${depth * 12 + 8}px`;
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '6px';
            
            if (this.selectedPartIndex === node.index) {
                item.style.background = 'rgba(139, 92, 246, 0.2)';
                item.style.border = '1px solid var(--accent)';
            }

            const nameSpan = document.createElement('span');
            nameSpan.innerText = `${node.index}: ${node.name || 'Part'}`;
            nameSpan.style.flex = '1';
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            
            item.appendChild(nameSpan);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '8px';
            actions.style.opacity = '0.7';
            actions.innerHTML = `
                <span title="Add Child" class="part-action-add" style="cursor: pointer;">➕</span>
                <span title="Delete Part" class="part-action-delete" style="cursor: pointer;">🗑️</span>
            `;
            
            actions.querySelector('.part-action-add')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onPartAdd) this.onPartAdd(node.index);
            });
            
            actions.querySelector('.part-action-delete')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onPartDelete) this.onPartDelete(node.index);
            });

            item.appendChild(actions);

            item.onclick = (e) => {
                e.stopPropagation();
                this.selectedPartIndex = node.index;
                this.renderPartsList(parts);
                if (this.onPartSelect) this.onPartSelect(this.selectedPartIndex);
            };

            container.appendChild(item);
            node.children.forEach((child: any) => renderNode(child, depth + 1, container));
        };

        tree.forEach(root => renderNode(root, 0, this.partsListContainer!));
    }

    private updatePropertyInspector(part: any) {
        if (!this.propertyInspector || !part) return;
        if (this.propertyInspector.contains(document.activeElement)) return;

        const args = part.raw_args;
        const currentFrame = Math.floor(parseFloat(this.frameSlider?.value || '0'));
        
        this.propertyInspector.innerHTML = `
            <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--accent);">Part #${part.index} Props</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.7rem; align-items: center;">
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
            <style>
                .prop-group { display: flex; flex-direction: column; gap: 2px; }
                .prop-group span { font-size: 0.6rem; color: var(--text-secondary); }
                .prop-input-container { display: flex; align-items: center; gap: 4px; }
                .prop-input { background: rgba(0,0,0,0.3); color: white; border: 1px solid var(--border-color); padding: 4px; border-radius: 4px; font-size: 0.75rem; width: 100%; }
                .btn-add-kf { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer; border-radius: 4px; padding: 2px 4px; font-size: 0.6rem; }
                .btn-add-kf:hover { border-color: var(--accent); color: var(--accent); }
            </style>
        `;

        this.propertyInspector.querySelectorAll('.prop-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const el = e.target as HTMLInputElement;
                const field = parseInt(el.getAttribute('data-field')!);
                const value = parseInt(el.value);
                this.onPropertyChange(part.index, field, value);
            });
        });

        this.propertyInspector.querySelectorAll('.btn-add-kf').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const el = e.target as HTMLButtonElement;
                const field = parseInt(el.getAttribute('data-field')!);
                const value = parseInt((this.propertyInspector!.querySelector(`input[data-field="${field}"]`) as HTMLInputElement).value);
                if (this.onKeyframeAdd) this.onKeyframeAdd(part.index, field, currentFrame, value);
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
}

import { EngineBridge } from './engine-bridge';
import { EDITOR_CONFIG } from './config';
import { UIManager } from './ui-components';
import { CanvasGizmo } from './gizmo';
import { ImgCutEditor } from './imgcut-editor';
import { HistoryManager } from './history-manager';
import { IntegrityChecker } from './integrity';
import { BCUEngine } from '../../pkg/bcu_api.js';
import { EditorStateManager, EditorSession } from './state-manager';
import { ProjectManager } from './project-manager';
import { PersistenceManager } from './persistence-manager';
import { eventBus } from './event-bus';
import { AnimProp } from './constants';

import { UpdatePropertyCommand } from './commands/property-commands';
import { BatchCommand } from './commands/batch-commands';
import { AddPartCommand, DeletePartCommand } from './commands/hierarchy-commands';
import { AddKeyframeCommand, ModifyKeyframeCommand, DeleteKeyframeCommand } from './commands/animation-commands';

export class BCUController {
    public bridge: EngineBridge | null = null;
    public ui: UIManager | null = null;
    public gizmo: CanvasGizmo | null = null;
    public imgcutEditor: ImgCutEditor | null = null;
    public history: HistoryManager;
    public state: EditorStateManager;
    public project: ProjectManager;
    
    private lastTime = performance.now();
    private accumulator = 0;
    private readonly TICK_RATE = 30;
    private readonly TICK_TIME = 1000 / this.TICK_RATE;

    constructor(
        private engine: BCUEngine,
        private canvas: HTMLCanvasElement,
        private gizmoCanvas: HTMLCanvasElement,
        private imgcutCanvas: HTMLCanvasElement,
        private log: (msg: string, type?: 'info' | 'error') => void
    ) {
        console.log("[Editor] Initializing BCUController...");
        this.state = new EditorStateManager();
        this.project = new ProjectManager(engine, log);
        this.bridge = new EngineBridge(engine, this.state.getStatus().animId);
        this.history = new HistoryManager();

        this.initMembers();
        this.initEventSubscriptions();
        this.initGlobalEvents();
        
        this.restoreSession();
        console.log("[Editor] BCUController initialized.");
    }

    private initMembers() {
        this.gizmo = new CanvasGizmo(this.canvas, this.gizmoCanvas, this.bridge!);
        this.imgcutEditor = new ImgCutEditor(this.imgcutCanvas, this.bridge!);
        this.ui = new UIManager(this.state);
    }

    private initEventSubscriptions() {
        const triggerSave = () => {
            if (this.ui && this.state.getStatus().isReady) {
                const session = this.state.getSession(
                    this.ui.getCurrentFrame(),
                    this.project.getProjectName(),
                    this.history.serialize()
                );
                PersistenceManager.saveSession(session);
            }
        };

        // Reactive auto-save: subscribe to any state change
        this.state.subscribe(() => {
            if (this.state.getStatus().isReady) triggerSave();
        });

        eventBus.on('PART_SELECTED', (data) => {
            this.state.setSelection(data.partIdxs);
            if (this.imgcutEditor) this.imgcutEditor.setSelectedCut(null);
        });

        eventBus.on('PROPERTY_CHANGED', (data) => {
            if (this.bridge && this.state.getStatus().isReady) {
                const state = this.bridge.getState();
                if (state && state.animation) {
                    const validPartIdxs: number[] = [];
                    const oldValuesMap: Map<number, number> = new Map();
                    
                    data.partIdxs.forEach(partIdx => {
                        const part = state.animation.parts[partIdx];
                        if (part) {
                            const oldValue = part.raw_args[data.field];
                            if (oldValue !== data.value) {
                                // Cycle detection for Parent field
                                if (data.field === AnimProp.Parent && data.value !== -1) {
                                    if (this.bridge!.isAncestor && this.bridge!.isAncestor(partIdx, data.value)) {
                                        this.ui?.showToast("Hierarchy cycle detected! Action blocked.", "error");
                                        return;
                                    }
                                }

                                if (data.source === 'Gizmo') {
                                    // Update visual ONLY, no history (handled by TRANSFORM_COMMITTED)
                                    this.bridge!.updateModelPart(partIdx, data.field, data.value);
                                } else {
                                    validPartIdxs.push(partIdx);
                                    oldValuesMap.set(partIdx, oldValue);
                                }
                            }
                        }
                    });

                    if (validPartIdxs.length > 0) {
                        const cmd = new UpdatePropertyCommand(this.bridge!, validPartIdxs, data.field, oldValuesMap, data.value);
                        this.history.execute(cmd);
                        // triggerSave will be called via state change or manual trigger
                    }
                }
            }
        });

        eventBus.on('TRANSFORM_COMMITTED', (data) => {
            if (this.bridge && this.state.getStatus().isReady) {
                // Group by field to create efficient batch property commands
                const byField: Map<number, { idxs: number[], olds: Map<number, number>, val: number }> = new Map();
                
                data.targets.forEach((t: any) => {
                    if (!byField.has(t.field)) {
                        byField.set(t.field, { idxs: [], olds: new Map(), val: t.newValue });
                    }
                    const group = byField.get(t.field)!;
                    group.idxs.push(t.partIdx);
                    group.olds.set(t.partIdx, t.oldValue);
                });

                const commands: UpdatePropertyCommand[] = [];
                byField.forEach((group, field) => {
                    commands.push(new UpdatePropertyCommand(this.bridge!, group.idxs, field, group.olds, group.val));
                });

                if (commands.length === 1) {
                    this.history.push(commands[0]); 
                } else if (commands.length > 1) {
                    this.history.push(new BatchCommand(commands));
                }
                triggerSave(); // Explicit trigger for history-only change
            }
        });

        eventBus.on('IMGCUT_CHANGED', (data) => {
            if (this.bridge && this.state.getStatus().isReady) {
                this.bridge.updateImgCut(data.cutIdx, data.field, data.value);
                triggerSave();
            }
        });

        eventBus.on('FRAME_SEEK', (data) => {
            if (this.bridge && !this.state.getStatus().isPlaying && this.state.getStatus().isReady) {
                this.bridge.setFrame(data.frame); 
                // Seeking changes frame, which should be saved
                triggerSave();
            }
        });

        eventBus.on('KEYFRAME_MODIFIED', (data) => {
            if (this.bridge && this.state.getStatus().isReady) {
                const state = this.bridge.getState();
                if (state && state.animation && state.animation.anim) {
                    const part = state.animation.anim.parts.find((p: any) => p.ints[0] === data.partIdx && p.ints[1] === data.modifType);
                    if (part) {
                        const targetFrame = data.oldFrame !== undefined ? data.oldFrame : part.moves[data.moveIdx][0] - part.off;
                        const moveIdx = part.moves.findIndex((m: any) => (m[0] - part.off) === targetFrame);
                        
                        if (moveIdx !== -1) {
                            const move = part.moves[moveIdx];
                            const oldData = { 
                                frame: move[0] - part.off, 
                                value: move[1], 
                                interp: move[2], 
                                easing: move[3] 
                            };
                            const newData = { 
                                frame: data.frame, 
                                value: data.value, 
                                interp: data.interp, 
                                easing: data.easing 
                            };
                            
                            if (JSON.stringify(oldData) !== JSON.stringify(newData)) {
                                const cmd = new ModifyKeyframeCommand(this.bridge, data.partIdx, data.modifType, oldData, newData);
                                
                                if (data.isPreview) {
                                    cmd.execute();
                                } else {
                                    this.history.execute(cmd);
                                    triggerSave();
                                }
                                
                                if (!data.isPreview && data.oldFrame !== undefined && data.oldFrame !== data.frame) {
                                    const oldId = `${data.partIdx}:${data.modifType}:${data.oldFrame}`;
                                    const newId = `${data.partIdx}:${data.modifType}:${data.frame}`;
                                    if (this.state.isKFSelected(oldId)) {
                                        this.state.toggleKFSelection(oldId);
                                        this.state.toggleKFSelection(newId);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        eventBus.on('KEYFRAME_BATCH_MODIFIED', (data) => {
            if (this.bridge && this.state.getStatus().isReady) {
                const commands: ModifyKeyframeCommand[] = [];
                const selectionUpdates: Array<{old: string, new: string}> = [];

                data.changes.forEach((change: any) => {
                    const cmd = new ModifyKeyframeCommand(
                        this.bridge!, 
                        change.partIdx, 
                        change.modifType, 
                        change.oldData, 
                        change.newData
                    );
                    commands.push(cmd);
                    
                    if (change.oldData.frame !== change.newData.frame) {
                        selectionUpdates.push({
                            old: `${change.partIdx}:${change.modifType}:${change.oldData.frame}`,
                            new: `${change.partIdx}:${change.modifType}:${change.newData.frame}`
                        });
                    }
                });

                if (commands.length > 0) {
                    if (commands.length === 1) {
                        this.history.execute(commands[0]);
                    } else {
                        this.history.execute(new BatchCommand(commands));
                    }

                    selectionUpdates.forEach(update => {
                        if (this.state.isKFSelected(update.old)) {
                            this.state.toggleKFSelection(update.old);
                            this.state.toggleKFSelection(update.new);
                        }
                    });

                    triggerSave();
                }
            }
        });

        eventBus.on('KEYFRAME_ADDED', (data) => {
            if (this.bridge && this.state.getStatus().isReady) {
                const cmd = new AddKeyframeCommand(this.bridge, data.partIdx, data.modifType, data.frame, data.value);
                this.history.execute(cmd);
                this.log(`Added keyframe: Part ${data.partIdx}, Type ${data.modifType}, Frame ${data.frame}`);
                triggerSave();
            }
        });

        eventBus.on('KEYFRAME_DELETED', (data) => {
            if (this.bridge && this.state.getStatus().isReady) {
                const targetFrame = data.frame !== undefined ? data.frame : undefined;
                if (targetFrame !== undefined) {
                    const cmd = new DeleteKeyframeCommand(this.bridge, data.partIdx, data.modifType, targetFrame);
                    this.history.execute(cmd);
                    
                    const kfId = `${data.partIdx}:${data.modifType}:${targetFrame}`;
                    if (this.state.isKFSelected(kfId)) {
                        this.state.toggleKFSelection(kfId);
                    }
                    
                    this.log(`Deleted keyframe at frame ${targetFrame}`);
                    triggerSave();
                }
            }
        });

        eventBus.on('PART_ADDED', (data) => {
            if (this.bridge && this.state.getStatus().isReady) {
                const cmd = new AddPartCommand(this.bridge, data.parent);
                this.history.execute(cmd);
                this.log(`Added part with parent: ${data.parent}`);
                triggerSave();
            }
        });

        eventBus.on('PART_DELETED', (data) => {
            if (this.bridge && this.state.getStatus().isReady) {
                if (confirm(`Are you sure you want to delete part ${data.partIdx}?`)) {
                    const cmd = new DeletePartCommand(this.bridge, this.state, data.partIdx);
                    this.history.execute(cmd);
                    
                    // Remap selection indices after execution
                    this.state.remapPartIndices(data.partIdx);
                    
                    this.log(`Deleted part: ${data.partIdx}`);
                    triggerSave();
                }
            }
        });

        eventBus.on('FILE_SELECTED', (data) => {
            this.selectFile(data.fileName);
        });

        eventBus.on('PROJECT_NAME_CHANGED', (data) => {
            this.project.setProjectName(data.name);
        });

        eventBus.on('ANIMATION_SWITCHED', (data) => {
            this.setAnimation(data.animId);
        });

        eventBus.on('SHOW_TOAST', (data) => {
            this.ui?.showToast(data.message, data.type);
        });
    }

    private async restoreSession() {
        const session = PersistenceManager.loadSession();
        if (!session) return;

        console.log('[Persistence] Restoring session:', session);
        
        // 1. Restore project and history immediately
        if (session.projectName) this.project.setProjectName(session.projectName);
        if (this.bridge && session.history) {
            this.history.deserialize(session.history, this.bridge, this.state);
        }

        // 2. Wait for character/animation loading if needed
        if (session.animId !== 'none') {
            // We need to wait until the project manager has loaded files (e.g. from previous OPFS or similar)
            // For now, we assume the user might need to drop files again, 
            // OR if it's a sample unit, it might already be loading.
            
            // Poll for bridge readiness if an animation is being restored
            let attempts = 0;
            const checkReady = setInterval(() => {
                if (this.bridge && this.state.getStatus().isReady) {
                    clearInterval(checkReady);
                    this.applySessionData(session);
                }
                if (++attempts > 20) clearInterval(checkReady); // Timeout after 10s
            }, 500);
        }
    }

    private applySessionData(session: EditorSession) {
        if (!this.bridge) return;

        try {
            this.setAnimation(session.animId);
            this.bridge.setFrame(session.currentFrame);
            
            // Restore UI state
            this.setView(session.currentView);
            
            // Selection restoration
            if (session.selectedPartIdxs) {
                this.state.setSelection(session.selectedPartIdxs);
            }
            if (session.selectedKeyframeIds) {
                this.state.setKFSelection(session.selectedKeyframeIds);
            }

            this.log(`Session restored: ${session.animId} at frame ${session.currentFrame}`);
        } catch (e) {
            console.error('[Persistence] Failed to apply session data:', e);
        }
    }

    private initGlobalEvents() {
        window.addEventListener('resize', () => this.resize());
        this.resize();

        window.addEventListener('keydown', (e) => {
            if (e.target instanceof HTMLInputElement) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    this.history.undo();
                    this.log("Undo");
                } else if (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) {
                    e.preventDefault();
                    this.history.redo();
                    this.log("Redo");
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                const selection = this.state.getSelection();
                if (selection.length > 0) {
                    // Delete all selected parts (one by one for now)
                    selection.forEach(partIdx => {
                        eventBus.emit('PART_DELETED', { partIdx });
                    });
                }
            }
        });

        const dropZone = document.getElementById('drop-zone');
        const overlay = document.getElementById('drag-overlay');

        dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            overlay?.classList.add('active');
        });

        dropZone?.addEventListener('dragleave', () => {
            overlay?.classList.remove('active');
        });

        dropZone?.addEventListener('drop', async (e) => {
            e.preventDefault();
            overlay?.classList.remove('active');
            
            const items = e.dataTransfer?.items;
            if (items) {
                this.log("Processing dropped items...");
                const files: Map<string, File> = new Map();
                
                const traverse = async (entry: any) => {
                    if (entry.isFile) {
                        const file = await new Promise<File>((resolve) => entry.file(resolve));
                        files.set(file.name, file);
                    } else if (entry.isDirectory) {
                        const reader = entry.createReader();
                        const entries = await new Promise<any[]>((resolve) => reader.readEntries(resolve));
                        for (const child of entries) {
                            await traverse(child);
                        }
                    }
                };

                for (let i = 0; i < items.length; i++) {
                    const entry = items[i].webkitGetAsEntry();
                    if (entry) await traverse(entry);
                }

                if (files.size > 0) {
                    this.state.setReady(false);
                    await this.project.loadFromFiles(files, (defaultAnim) => {
                        this.state.setReady(true);
                        this.setAnimation(defaultAnim);
                        const spriteFile = this.project.getFile('sprite.png');
                        if (spriteFile && spriteFile.url) {
                            const img = new Image();
                            img.src = spriteFile.url;
                            img.onload = () => { if (this.imgcutEditor) this.imgcutEditor.setSprite(img); };
                        }
                    });
                }
            }
        });

        document.getElementById('btn-play-pause')?.addEventListener('click', () => {
            this.state.setPlaying(!this.state.getStatus().isPlaying);
            this.updatePlayPauseUI();
        });

        document.getElementById('anim-selector')?.addEventListener('change', (e) => {
            const val = (e.target as HTMLSelectElement).value;
            this.setAnimation(val);
        });

        document.getElementById('btn-export-tar')?.addEventListener('click', () => {
            if (this.bridge) {
                this.project.exportProject(this.bridge, this.state.getStatus().animId);
            }
        });
    }

    public selectFile(name: string) {
        const file = this.project.getFile(name);
        if (!file) return;

        this.state.setSelectedFile(name);
        if (file.type === 'maanim') {
            this.setAnimation(file.name.replace('maanim_', '').replace('.txt', ''));
            this.setView('animation');
        } else if (file.type === 'imgcut') {
            this.setView('imgcut');
        } else if (file.type === 'sprite' || file.type === 'icon') {
            this.setView('image');
        }
    }

    public setView(view: 'animation' | 'imgcut' | 'image') {
        this.state.setView(view);
        const tabMap: Record<string, string> = {
            'animation': 'tab-model',
            'imgcut': 'tab-imgcut',
            'image': 'tab-imgcut' 
        };
        document.getElementById(tabMap[view])?.click();
    }

    public resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.canvas.width = w; this.canvas.height = h;
        this.gizmoCanvas.width = w; this.gizmoCanvas.height = h;
        this.imgcutCanvas.width = w; this.imgcutCanvas.height = h;
        this.engine.resize(w, h);
    }

    public updatePlayPauseUI() {
        const btn = document.getElementById('btn-play-pause');
        if (!btn) return;
        btn.innerText = this.state.getStatus().isPlaying ? '⏸' : '▶';
    }

    public setAnimation(id: string) {
        if (this.bridge) {
            try {
                this.bridge.setAnimId(id);
                this.state.setAnimId(id);
                this.state.setReady(true);
                this.log(`Switched to: ${id}`);
            } catch (e) {
                this.log(`Anim switch failed: ${id} - ${e}`, "error");
                this.state.setAnimId('none');
            }
        }
    }

    public async loadCharacter(baseUrl: string) {
        this.state.setReady(false);
        this.state.setAnimId('none');
        if (this.bridge) this.bridge.setAnimId('none');

        await this.project.loadCharacter(baseUrl, (defaultAnim) => {
            const spriteFile = this.project.getFile('sprite.png');
            if (spriteFile && spriteFile.url) {
                const img = new Image();
                img.src = spriteFile.url;
                img.onload = () => { if (this.imgcutEditor) this.imgcutEditor.setSprite(img); };
            }
            this.state.setReady(true);
            this.setAnimation(defaultAnim);
            this.state.setPlaying(true);
            this.updatePlayPauseUI();
        });
    }

    public renderTick() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        const status = this.state.getStatus();
        if (!status.isReady || !this.bridge || status.animId === 'none') {
            this.drawPlaceholder();
            this.accumulator = 0;
            return;
        }

        if (status.isPlaying) {
            this.accumulator += deltaTime;
            
            // Limit catch-up to avoid "spiral of death" on heavy lag
            if (this.accumulator > 500) this.accumulator = this.TICK_TIME;

            while (this.accumulator >= this.TICK_TIME) {
                this.bridge.tick();
                this.accumulator -= this.TICK_TIME;
            }
        } else {
            this.accumulator = 0;
        }

        const alpha = status.isPlaying ? this.accumulator / this.TICK_TIME : 1.0;

        try {
            if (this.canvas.style.display !== 'none') {
                this.bridge.render(
                    'test_unit', 
                    this.canvas.width * EDITOR_CONFIG.RENDER_OFFSET_X, 
                    this.canvas.height * EDITOR_CONFIG.RENDER_OFFSET_Y,
                    alpha
                );
            }

            const state = this.bridge.getState();
            if (state && state.animation) {
                const versionChanged = state.version !== status.lastRenderedVersion;
                if (versionChanged) {
                    this.state.updateStatus({ lastRenderedVersion: state.version });
                }
                
                if (state.animation.parts && state.animation.parts.length > 0) {
                    // Update UI every frame for interpolation
                    this.ui?.update(
                        state.animation, 
                        status.isPlaying, 
                        alpha, 
                        versionChanged ? this.project.getProject() : undefined, 
                        state.imgcut
                    );
                }
            }
        } catch (e: any) {
            if (e?.toString().includes("Animation not found")) {
                this.state.setReady(false);
            }
            console.error('Render error:', e);
        }
    }

    private drawPlaceholder() {
        const ctx = this.gizmoCanvas.getContext('2d')!;
        ctx.clearRect(0, 0, this.gizmoCanvas.width, this.gizmoCanvas.height);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px Outfit';
        ctx.textAlign = 'center';
        
        const msg = !this.state.getStatus().isReady ? 'Preparing Engine...' : 'Select an animation to preview';
        ctx.fillText(msg, this.gizmoCanvas.width / 2, this.gizmoCanvas.height / 2);
    }

    public getStatus() { return this.state.getStatus(); }

    public runIntegrityCheck() {
        if (this.bridge) {
            const state = this.bridge.getState();
            IntegrityChecker.logReport(state);
        } else {
            console.error("Bridge not initialized.");
        }
    }
}

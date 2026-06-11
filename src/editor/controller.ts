import { EngineBridge } from './engine-bridge';
import { EDITOR_CONFIG } from './config';
import { UIManager } from './ui-components';
import { CanvasGizmo } from './gizmo';
import { ImgCutEditor } from './imgcut-editor';
import { HistoryManager } from './history-manager';
import { IntegrityChecker } from './integrity';
import { BCUEngine } from '../../pkg/bcu_api.js';
import { EditorStateManager } from './state-manager';
import { ProjectManager } from './project-manager';

export class BCUController {
    public bridge: EngineBridge | null = null;
    public ui: UIManager | null = null;
    public gizmo: CanvasGizmo | null = null;
    public imgcutEditor: ImgCutEditor | null = null;
    public history: HistoryManager | null = null;
    public state: EditorStateManager;
    public project: ProjectManager;
    
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
        this.history = new HistoryManager((idx, field, val) => {
            if (this.bridge) this.bridge.updateModelPart(idx, field, val);
        });

        this.initMembers();
        this.initGlobalEvents();
        console.log("[Editor] BCUController initialized.");
    }

    private initMembers() {
        const handlePropertyChange = (partIdx: number, field: number, value: number) => {
            if (this.bridge && this.state.getStatus().isReady) {
                const state = this.bridge.getState();
                if (state && state.animation && state.animation.parts[partIdx]) {
                    const oldValue = state.animation.parts[partIdx].raw_args[field];
                    this.history?.push({ op: 'PROP', partIdx, field, oldValue, newValue: value });
                    this.bridge.updateModelPart(partIdx, field, value);
                }
            }
        };

        const handleImgCutChange = (cutIdx: number, field: number, value: number) => {
            if (this.bridge && this.state.getStatus().isReady) this.bridge.updateImgCut(cutIdx, field, value);
        };

        const handleKeyframeChange = (partIdx: number, modifType: number, moveIdx: number, newFrame: number, newValue: number, interp: number, easing: number) => {
            if (this.bridge && this.state.getStatus().isReady) {
                this.bridge.updateAnimKeyframe(partIdx, modifType, moveIdx, newFrame, newValue, interp, easing); 
            }
        };

        this.gizmo = new CanvasGizmo(this.canvas, this.gizmoCanvas, this.bridge!, handlePropertyChange, (idx) => {
            if (this.ui) this.ui.setSelectedPart(idx);
            if (this.imgcutEditor) this.imgcutEditor.setSelectedCut(null);
        });

        this.imgcutEditor = new ImgCutEditor(this.imgcutCanvas, this.bridge!, handleImgCutChange);

        this.ui = new UIManager(
            (frame) => { 
                if (this.bridge && !this.state.getStatus().isPlaying && this.state.getStatus().isReady) {
                    this.bridge.setFrame(frame); 
                }
            },
            handlePropertyChange,
            handleImgCutChange,
            (fileName) => this.selectFile(fileName),
            (partIdx) => { if (this.gizmo) this.gizmo.setSelectedPart(partIdx); },
            handleKeyframeChange,
            (name) => { this.project.setProjectName(name); },
            (parent) => { 
                if (this.bridge && this.state.getStatus().isReady) {
                    this.bridge.addPart(parent);
                    this.log(`Added part with parent: ${parent}`);
                }
            },
            (partIdx) => {
                if (this.bridge && this.state.getStatus().isReady) {
                    if (confirm(`Are you sure you want to delete part ${partIdx}?`)) {
                        this.bridge.deletePart(partIdx);
                        if (this.gizmo) this.gizmo.setSelectedPart(null);
                        if (this.ui) this.ui.setSelectedPart(null);
                        this.log(`Deleted part: ${partIdx}`);
                    }
                }
            },
            (partIdx, modifType, frame, value) => {
                if (this.bridge && this.state.getStatus().isReady) {
                    this.bridge.addAnimKeyframe(partIdx, modifType, frame, value);
                    this.log(`Added keyframe: Part ${partIdx}, Type ${modifType}, Frame ${frame}`);
                }
            },
            (partIdx, modifType, moveIdx) => {
                if (this.bridge && this.state.getStatus().isReady) {
                    this.bridge.deleteAnimKeyframe(partIdx, modifType, moveIdx);
                    this.log(`Deleted keyframe: Part ${partIdx}, Type ${modifType}, Index ${moveIdx}`);
                }
            }
        );
    }

    private initGlobalEvents() {
        window.addEventListener('resize', () => this.resize());
        this.resize();

        window.addEventListener('keydown', (e) => {
            if (e.target instanceof HTMLInputElement) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    const entry = this.history?.undo();
                    if (entry) {
                        this.log("Undo");
                        if (this.ui && entry.op === 'PROP') this.ui.flashProperty(entry.field);
                    }
                } else if (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) {
                    e.preventDefault();
                    const entry = this.history?.redo();
                    if (entry) {
                        this.log("Redo");
                        if (this.ui && entry.op === 'PROP') this.ui.flashProperty(entry.field);
                    }
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                const selectedPart = (this.ui as any).selectedPartIndex;
                if (selectedPart !== null) {
                    if (confirm(`Delete part ${selectedPart}?`)) {
                        this.bridge?.deletePart(selectedPart);
                        this.ui?.setSelectedPart(null);
                        this.gizmo?.setSelectedPart(null);
                        this.log(`Deleted part: ${selectedPart}`);
                    }
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
            for(let i=0; i<3; i++) { this.bridge?.update(); }
            this.state.setPlaying(true);
            this.updatePlayPauseUI();
        });
    }

    public renderTick() {
        const status = this.state.getStatus();
        if (!status.isReady || !this.bridge || status.animId === 'none') {
            this.drawPlaceholder();
            return;
        }

        try {
            if (status.isPlaying) this.bridge.update();
            
            if (this.canvas.style.display !== 'none') {
                this.bridge.render('test_unit', this.canvas.width * EDITOR_CONFIG.RENDER_OFFSET_X, this.canvas.height * EDITOR_CONFIG.RENDER_OFFSET_Y);
            }

            const state = this.bridge.getState();
            if (state && state.animation) {
                if (state.version !== status.lastRenderedVersion) {
                    this.state.updateStatus({ lastRenderedVersion: state.version });
                    if (state.animation.parts && state.animation.parts.length > 0) {
                        this.ui?.update(state.animation, status.isPlaying, this.project.getProject(), state.imgcut);
                    }
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

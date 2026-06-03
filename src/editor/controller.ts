import { EngineBridge } from './engine-bridge';
import { EDITOR_CONFIG } from './config';

import { UIManager } from './ui-components';
import { CanvasGizmo } from './gizmo';
import { ImgCutEditor } from './imgcut-editor';
import { TarBuilder } from './tar-utils';
import { HistoryManager } from './history-manager';
import { BCUEngine } from '../../pkg/bcu_api.js';

export interface EditorStatus {
    isPlaying: boolean;
    isReady: boolean;
    animId: string;
    currentView: 'animation' | 'imgcut' | 'image';
    selectedFile: string | null;
}

export interface BCUProject {
    name: string;
    files: Map<string, ProjectFile>;
}

export interface ProjectFile {
    name: string;
    type: 'maanim' | 'mamodel' | 'imgcut' | 'sprite' | 'icon';
    data: any; // Blob for images, string for text
    url?: string; // Preview URL for images
}

export class BCUController {
    public bridge: EngineBridge | null = null;
    public ui: UIManager | null = null;
    public gizmo: CanvasGizmo | null = null;
    public imgcutEditor: ImgCutEditor | null = null;
    public history: HistoryManager | null = null;
    
    private status: EditorStatus = {
        isPlaying: true,
        isReady: false,
        animId: 'none',
        currentView: 'animation',
        selectedFile: null
    };

    private project: BCUProject = {
        name: 'New Project',
        files: new Map()
    };

    constructor(
        private engine: BCUEngine,
        private canvas: HTMLCanvasElement,
        private gizmoCanvas: HTMLCanvasElement,
        private imgcutCanvas: HTMLCanvasElement,
        private log: (msg: string, type?: 'info' | 'error') => void
    ) {
        console.log("[Editor] Initializing BCUController...");
        this.bridge = new EngineBridge(engine, this.status.animId);
        this.history = new HistoryManager((idx, field, val) => {
            if (this.bridge) this.bridge.updateModelPart(idx, field, val);
        });
        this.initMembers();
        this.initGlobalEvents();
        console.log("[Editor] BCUController initialized.");
    }

    private initMembers() {
        const handlePropertyChange = (partIdx: number, field: number, value: number) => {
            if (this.bridge && this.status.isReady) {
                const state = this.bridge.getState();
                const oldValue = state.parts[partIdx].raw_args[field];
                this.history?.push({ op: 'PROP', partIdx, field, oldValue, newValue: value });
                this.bridge.updateModelPart(partIdx, field, value);
            }
        };

        const handleImgCutChange = (cutIdx: number, field: number, value: number) => {
            if (this.bridge && this.status.isReady) this.bridge.updateImgCut(cutIdx, field, value);
        };

        this.gizmo = new CanvasGizmo(this.canvas, this.gizmoCanvas, this.bridge!, handlePropertyChange, (idx) => {
            if (this.ui) this.ui.setSelectedPart(idx);
            if (this.imgcutEditor) this.imgcutEditor.setSelectedCut(null);
        });

        this.imgcutEditor = new ImgCutEditor(this.imgcutCanvas, this.bridge!, handleImgCutChange);

        this.ui = new UIManager(
            (frame) => { if (this.bridge && !this.status.isPlaying && this.status.isReady) this.bridge.setFrame(frame); },
            handlePropertyChange,
            handleImgCutChange,
            (fileName) => this.selectFile(fileName),
            (partIdx) => { if (this.gizmo) this.gizmo.setSelectedPart(partIdx); },
            (partIdx, type, moveIdx, frame) => { if (this.bridge && this.status.isReady) this.bridge.updateAnimKeyframe(partIdx, type, moveIdx, frame); },
            (name) => { this.project.name = name; },
            (parent) => { 
                if (this.bridge && this.status.isReady) {
                    this.bridge.addPart(parent);
                    this.log(`Added part with parent: ${parent}`);
                }
            },
            (partIdx) => {
                if (this.bridge && this.status.isReady) {
                    if (confirm(`Are you sure you want to delete part ${partIdx}?`)) {
                        this.bridge.deletePart(partIdx);
                        if (this.gizmo) this.gizmo.setSelectedPart(null);
                        if (this.ui) this.ui.setSelectedPart(null);
                        this.log(`Deleted part: ${partIdx}`);
                    }
                }
            },
            (partIdx, modifType, frame, value) => {
                if (this.bridge && this.status.isReady) {
                    this.bridge.addAnimKeyframe(partIdx, modifType, frame, value);
                    this.log(`Added keyframe: Part ${partIdx}, Type ${modifType}, Frame ${frame}`);
                }
            },
            (partIdx, modifType, moveIdx) => {
                if (this.bridge && this.status.isReady) {
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
                    this.history?.undo();
                    this.log("Undo");
                } else if (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) {
                    e.preventDefault();
                    this.history?.redo();
                    this.log("Redo");
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
                    await this.loadFromFiles(files);
                }
            }
        });

        document.getElementById('btn-play-pause')?.addEventListener('click', () => {
            this.status.isPlaying = !this.status.isPlaying;
            this.updatePlayPauseUI();
        });

        document.getElementById('anim-selector')?.addEventListener('change', (e) => {
            const val = (e.target as HTMLSelectElement).value;
            this.setAnimation(val);
        });

        document.getElementById('btn-export-tar')?.addEventListener('click', () => {
            this.exportProject();
        });
    }

    public async loadFromFiles(files: Map<string, File>) {
        this.log(`Loading ${files.size} files...`);
        this.status.isReady = false;
        this.project.files.clear();

        try {
            // 1. Load Sprite
            const spriteFile = files.get('sprite.png');
            if (spriteFile) {
                const blob = spriteFile;
                this.project.files.set('sprite.png', { name: 'sprite.png', type: 'sprite', data: blob, url: URL.createObjectURL(blob) });
                const spriteBytes = new Uint8Array(await blob.arrayBuffer());
                this.engine.load_sprite('test_unit', spriteBytes);
                
                const img = new Image();
                img.src = this.project.files.get('sprite.png')!.url!;
                img.onload = () => {
                    if (this.imgcutEditor) this.imgcutEditor.setSprite(img);
                };
            }

            // 2. Load Icons
            const iconNames = ['icon_deploy.png', 'icon_display.png'];
            for (const name of iconNames) {
                const file = files.get(name);
                if (file) {
                    this.project.files.set(name, { name, type: 'icon', data: file, url: URL.createObjectURL(file) });
                }
            }

            // 3. Load Data
            const imgcutTxt = await files.get('imgcut.txt')?.text();
            const mamodelTxt = await files.get('mamodel.txt')?.text();

            if (!imgcutTxt || !mamodelTxt) {
                throw new Error("Missing imgcut.txt or mamodel.txt");
            }

            this.project.files.set('imgcut.txt', { name: 'imgcut.txt', type: 'imgcut', data: imgcutTxt });
            this.project.files.set('mamodel.txt', { name: 'mamodel.txt', type: 'mamodel', data: mamodelTxt });

            // 4. Load Animations
            let loadedAny = false;
            for (const [name, file] of files) {
                if (name.startsWith('maanim_') && name.endsWith('.txt')) {
                    const id = name.replace('maanim_', '').replace('.txt', '');
                    const maanimTxt = await file.text();
                    this.project.files.set(name, { name, type: 'maanim', data: maanimTxt });
                    this.engine.load_animation(id, imgcutTxt, mamodelTxt, maanimTxt);
                    loadedAny = true;
                }
            }

            if (loadedAny) {
                this.status.isReady = true;
                const anims = this.bridge?.listAnimations() || [];
                const defaultAnim = anims.includes('walk') ? 'walk' : anims[0];
                this.setAnimation(defaultAnim);
                this.log("Project loaded from files.");
            } else {
                throw new Error("No animations found in dropped files.");
            }

        } catch (e) {
            this.log(`Drop load failed: ${e}`, 'error');
        }
    }

    public selectFile(name: string) {
        const file = this.project.files.get(name);
        if (!file) return;

        this.status.selectedFile = name;
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
        this.status.currentView = view;
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
        btn.innerText = this.status.isPlaying ? '⏸' : '▶';
    }

    public setAnimation(id: string) {
        if (this.bridge) {
            try {
                this.bridge.setAnimId(id);
                this.status.animId = id;
                this.status.isReady = true; // Ensure ready when a valid ID is set
                this.log(`Switched to: ${id}`);
                
                // Verify engine has it
                const state = this.bridge.getState();
                if (!state) {
                    throw new Error(`Engine could not find state for animation: ${id}`);
                }
            } catch (e) {
                this.log(`Anim switch failed: ${id} - ${e}`, "error");
                this.status.animId = 'none';
            }
        }
    }

    public async loadCharacter(baseUrl: string) {
        this.status.isReady = false; 
        this.status.animId = 'none';
        if (this.bridge) {
            this.bridge.setAnimId('none');
        }
        try {
            this.log(`Loading character: ${baseUrl}...`);
            this.project.files.clear();

            // Load Sprite
            const spriteRes = await fetch(`${baseUrl}/sprite.png`);
            if (spriteRes.ok) {
                const blob = await spriteRes.blob();
                this.project.files.set('sprite.png', { name: 'sprite.png', type: 'sprite', data: blob, url: URL.createObjectURL(blob) });
                const spriteBytes = new Uint8Array(await blob.arrayBuffer());
                this.engine.load_sprite('test_unit', spriteBytes);
                
                const img = new Image();
                img.src = this.project.files.get('sprite.png')!.url!;
                img.onload = () => {
                    if (this.imgcutEditor) this.imgcutEditor.setSprite(img);
                };
            }

            // Load Icons
            const icons = ['icon_deploy.png', 'icon_display.png'];
            for (const icon of icons) {
                const res = await fetch(`${baseUrl}/${icon}`);
                if (res.ok) {
                    const blob = await res.blob();
                    this.project.files.set(icon, { name: icon, type: 'icon', data: blob, url: URL.createObjectURL(blob) });
                }
            }

            const imgcutTxt = await (await fetch(`${baseUrl}/imgcut.txt`)).text();
            this.project.files.set('imgcut.txt', { name: 'imgcut.txt', type: 'imgcut', data: imgcutTxt });

            const mamodelTxt = await (await fetch(`${baseUrl}/mamodel.txt`)).text();
            this.project.files.set('mamodel.txt', { name: 'mamodel.txt', type: 'mamodel', data: mamodelTxt });
            
            const animFiles = [
                { id: 'walk', file: 'maanim_walk.txt' },
                { id: 'idle', file: 'maanim_idle.txt' },
                { id: 'attack', file: 'maanim_attack.txt' },
                { id: 'kb', file: 'maanim_kb.txt' },
                { id: 'burrow_up', file: 'maanim_burrow_up.txt' },
                { id: 'burrow_down', file: 'maanim_burrow_down.txt' },
                { id: 'burrow_move', file: 'maanim_burrow_move.txt' }
            ];

            let loadedAny = false;
            for (const anim of animFiles) {
                try {
                    const res = await fetch(`${baseUrl}/${anim.file}`);
                    if (!res.ok) {
                        this.log(`Asset not found: ${anim.file}`, 'info');
                        continue;
                    }
                    const maanimTxt = await res.text();
                    this.project.files.set(anim.file, { name: anim.file, type: 'maanim', data: maanimTxt });
                    this.engine.load_animation(anim.id, imgcutTxt, mamodelTxt, maanimTxt);
                    this.log(`Engine loaded animation: ${anim.id}`);
                    loadedAny = true;
                } catch (e) {
                    this.log(`Error loading ${anim.id}: ${e}`, 'error');
                }
            }

            if (loadedAny) {
                // Default to 'walk' if it exists, otherwise use the first loaded animation
                const firstAnim = this.bridge?.listAnimations()[0];
                const targetAnim = this.project.files.has('maanim_walk.txt') ? 'walk' : firstAnim;
                
                if (targetAnim) {
                    this.status.isReady = true; // Set ready before switching to allow state retrieval
                    this.setAnimation(targetAnim);
                    for(let i=0; i<3; i++) { this.bridge?.update(); }
                    
                    this.status.isPlaying = true;
                    this.updatePlayPauseUI();
                    this.log(`Load complete. Starting animation: ${targetAnim}`);
                } else {
                    throw new Error("Animations loaded into engine but listing returned empty");
                }
            } else {
                throw new Error("No animations could be loaded");
            }
        } catch (e) {
            this.log(`Load failed: ${e}`, 'error');
        }
    }

    public async exportProject() {
        if (!this.bridge || !this.status.isReady) return;
        
        this.log(`Exporting project: ${this.project.name}...`);
        const tar = new TarBuilder();
        
        try {
            // Include images (sprite and icons)
            for (const [name, file] of this.project.files) {
                if (file.type === 'sprite' || file.type === 'icon') {
                    const bytes = new Uint8Array(await file.data.arrayBuffer());
                    tar.addFile(name, bytes);
                }
            }

            const animIds = this.bridge.listAnimations();
            if (animIds.length > 0) {
                const oldId = this.status.animId;
                
                // Use the first animation to get model and imgcut (they are shared)
                this.bridge.setAnimId(animIds[0]);
                tar.addFile('imgcut.txt', this.bridge.exportImgCut());
                tar.addFile('mamodel.txt', this.bridge.exportModel());

                // Export all animations
                for (const id of animIds) {
                    const data = this.bridge.exportAnimById(id);
                    tar.addFile(`maanim_${id}.txt`, data);
                }
                
                this.bridge.setAnimId(oldId);
            }

            const blob = tar.build();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.project.name.trim().replace(/\s+/g, '_') || 'BCU_Project'}.tar`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.log("Project exported successfully!");
        } catch (e) {
            this.log(`Export failed: ${e}`, 'error');
        }
    }

    public renderTick() {
        if (!this.status.isReady || !this.bridge || this.status.animId === 'none') {
            this.drawPlaceholder();
            return;
        }

        try {
            if (this.status.isPlaying) this.bridge.update();
            
            if (this.canvas.style.display !== 'none') {
                this.bridge.render('test_unit', this.canvas.width * EDITOR_CONFIG.RENDER_OFFSET_X, this.canvas.height * EDITOR_CONFIG.RENDER_OFFSET_Y);
            }

            const state = this.bridge.getState();
            if (state && state.animation) {
                if (state.animation.parts && state.animation.parts.length > 0) {
                    this.ui?.update(state.animation, this.status.isPlaying, this.project, state.imgcut);
                }
            }
        } catch (e: any) {
            // Only log if it's not the "Animation not found" during a switch
            if (e?.toString().includes("Animation not found")) {
                this.status.isReady = false; // Gracefully stop until next successful load
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
        
        const msg = !this.status.isReady ? 'Preparing Engine...' : 'Select an animation to preview';
        ctx.fillText(msg, this.gizmoCanvas.width / 2, this.gizmoCanvas.height / 2);
    }

    public getStatus() { return this.status; }
}

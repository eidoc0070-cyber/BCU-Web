import { EngineBridge } from './engine-bridge';
import { EDITOR_CONFIG } from './config';

import { UIManager } from './ui-components';
import { CanvasGizmo } from './gizmo';
import { ImgCutEditor } from './imgcut-editor';
import { TarBuilder } from './tar-utils';
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
        this.bridge = new EngineBridge(engine, this.status.animId);
        this.initMembers();
        this.initGlobalEvents();
    }

    private initMembers() {
        const handlePropertyChange = (partIdx: number, field: number, value: number) => {
            if (this.bridge && this.status.isReady) this.bridge.updateModelPart(partIdx, field, value);
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
            (partIdx, type, moveIdx, frame) => { if (this.bridge && this.status.isReady) this.bridge.updateAnimKeyframe(partIdx, type, moveIdx, frame); }
        );
    }

    private initGlobalEvents() {
        window.addEventListener('resize', () => this.resize());
        this.resize();

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
                const firstAnim = this.bridge.listAnimations()[0];
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
        
        this.log("Preparing project export...");
        const tar = new TarBuilder();
        
        try {
            for (const [name, file] of this.project.files) {
                if (file.type === 'sprite' || file.type === 'icon') {
                    const bytes = new Uint8Array(await file.data.arrayBuffer());
                    tar.addFile(name, bytes);
                }
            }

            const animIds = this.bridge.listAnimations();
            if (animIds.length > 0) {
                const firstId = animIds[0];
                const oldId = this.status.animId;
                
                this.bridge.setAnimId(firstId);
                tar.addFile('imgcut.txt', this.bridge.exportImgCut());
                tar.addFile('mamodel.txt', this.bridge.exportModel());

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
            a.download = `${this.project.name.replace(/\s+/g, '_')}.tar`;
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
            if (state && state.parts.length > 0) {
                this.ui?.update(state, this.status.isPlaying, this.project);
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

import { BCUEngine } from '../../pkg/bcu_api.js';
import { EngineBridge } from './engine-bridge';
import { TarBuilder } from './tar-utils';

export interface BCUProject {
    name: string;
    files: Map<string, ProjectFile>;
}

export interface ProjectFile {
    name: string;
    type: 'maanim' | 'mamodel' | 'imgcut' | 'sprite' | 'icon';
    data: any; 
    url?: string; 
}

export class ProjectManager {
    private project: BCUProject = {
        name: 'New Project',
        files: new Map()
    };

    constructor(
        private engine: BCUEngine,
        private log: (msg: string, type?: 'info' | 'error') => void
    ) {}

    public getProjectName(): string {
        return this.project.name;
    }

    public getProject(): BCUProject {
        return this.project;
    }

    public clearProject() {
        this.project.files.clear();
    }

    public setProjectName(name: string) {
        this.project.name = name;
    }

    public getFile(name: string): ProjectFile | undefined {
        return this.project.files.get(name);
    }

    public async loadFromFiles(files: Map<string, File>, onReady: (defaultAnim: string) => void) {
        this.log(`Loading ${files.size} files...`);
        this.clearProject();

        try {
            const spriteFile = files.get('sprite.png');
            if (spriteFile) {
                const blob = spriteFile;
                this.project.files.set('sprite.png', { name: 'sprite.png', type: 'sprite', data: blob, url: URL.createObjectURL(blob) });
                const spriteBytes = new Uint8Array(await blob.arrayBuffer());
                this.engine.load_sprite('test_unit', spriteBytes);
            }

            const iconNames = ['icon_deploy.png', 'icon_display.png'];
            for (const name of iconNames) {
                const file = files.get(name);
                if (file) {
                    this.project.files.set(name, { name, type: 'icon', data: file, url: URL.createObjectURL(file) });
                }
            }

            const imgcutTxt = await files.get('imgcut.txt')?.text();
            const mamodelTxt = await files.get('mamodel.txt')?.text();

            if (!imgcutTxt || !mamodelTxt) throw new Error("Missing imgcut.txt or mamodel.txt");

            this.project.files.set('imgcut.txt', { name: 'imgcut.txt', type: 'imgcut', data: imgcutTxt });
            this.project.files.set('mamodel.txt', { name: 'mamodel.txt', type: 'mamodel', data: mamodelTxt });

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
                const anims = this.engine.list_animations();
                const defaultAnim = anims.includes('walk') ? 'walk' : anims[0];
                onReady(defaultAnim);
                this.log("Project loaded from files.");
            } else {
                throw new Error("No animations found in dropped files.");
            }
        } catch (e) {
            this.log(`Drop load failed: ${e}`, 'error');
        }
    }

    public async loadCharacter(baseUrl: string, onReady: (defaultAnim: string) => void) {
        try {
            this.log(`Loading character: ${baseUrl}...`);
            this.clearProject();

            const spriteRes = await fetch(`${baseUrl}/sprite.png`);
            if (spriteRes.ok) {
                const blob = await spriteRes.blob();
                this.project.files.set('sprite.png', { name: 'sprite.png', type: 'sprite', data: blob, url: URL.createObjectURL(blob) });
                const spriteBytes = new Uint8Array(await blob.arrayBuffer());
                this.engine.load_sprite('test_unit', spriteBytes);
            }

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
                const res = await fetch(`${baseUrl}/${anim.file}`);
                if (res.ok) {
                    const maanimTxt = await res.text();
                    this.project.files.set(anim.file, { name: anim.file, type: 'maanim', data: maanimTxt });
                    this.engine.load_animation(anim.id, imgcutTxt, mamodelTxt, maanimTxt);
                    loadedAny = true;
                }
            }

            if (loadedAny) {
                const anims = this.engine.list_animations();
                const targetAnim = this.project.files.has('maanim_walk.txt') ? 'walk' : anims[0];
                onReady(targetAnim);
                this.log(`Load complete. Starting animation: ${targetAnim}`);
            } else {
                throw new Error("No animations could be loaded");
            }
        } catch (e) {
            this.log(`Load failed: ${e}`, 'error');
        }
    }

    public async exportProject(bridge: EngineBridge, animId: string) {
        this.log(`Exporting project: ${this.project.name}...`);
        const tar = new TarBuilder();
        
        try {
            for (const [name, file] of this.project.files) {
                if (file.type === 'sprite' || file.type === 'icon') {
                    const bytes = new Uint8Array(await file.data.arrayBuffer());
                    tar.addFile(name, bytes);
                }
            }

            const animIds = bridge.listAnimations();
            if (animIds.length > 0) {
                const oldId = animId;
                bridge.setAnimId(animIds[0]);
                tar.addFile('imgcut.txt', bridge.exportImgCut());
                tar.addFile('mamodel.txt', bridge.exportModel());

                for (const id of animIds) {
                    tar.addFile(`maanim_${id}.txt`, bridge.exportAnimById(id));
                }
                bridge.setAnimId(oldId);
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
}

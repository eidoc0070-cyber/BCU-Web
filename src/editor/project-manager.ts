import type { BCUEngine } from '../../pkg/bcu_api.js';
import type { EngineBridge } from './engine-bridge';
import { ExportManager } from './exports/base';
import { RawTextExportProvider } from './exports/raw-provider';
import { BCUTarExportProvider } from './exports/tar-provider';

// Register providers once
ExportManager.registerProvider(new BCUTarExportProvider());
ExportManager.registerProvider(new RawTextExportProvider());

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
    files: new Map(),
  };

  constructor(
    private engine: BCUEngine,
    private log: (msg: string, type?: 'info' | 'error') => void,
  ) {}

  public setEngine(engine: BCUEngine) {
    this.engine = engine;
  }

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

  public async loadFromFiles(
    files: Map<string, File>,
    onReady: (defaultAnim: string) => void,
  ) {
    this.log(`Loading ${files.size} files...`);
    this.clearProject();

    try {
      const spriteFile = files.get('sprite.png');
      if (spriteFile) {
        const blob = spriteFile;
        this.project.files.set('sprite.png', {
          name: 'sprite.png',
          type: 'sprite',
          data: blob,
          url: URL.createObjectURL(blob),
        });
        const spriteBytes = new Uint8Array(await blob.arrayBuffer());
        this.engine.load_sprite('test_unit', spriteBytes);
      }

      const iconNames = ['icon_deploy.png', 'icon_display.png'];
      for (const name of iconNames) {
        const file = files.get(name);
        if (file) {
          this.project.files.set(name, {
            name,
            type: 'icon',
            data: file,
            url: URL.createObjectURL(file),
          });
        }
      }

      const imgcutTxt = await files.get('imgcut.txt')?.text();
      const mamodelTxt = await files.get('mamodel.txt')?.text();

      if (!imgcutTxt || !mamodelTxt)
        throw new Error('Missing imgcut.txt or mamodel.txt');

      this.project.files.set('imgcut.txt', {
        name: 'imgcut.txt',
        type: 'imgcut',
        data: imgcutTxt,
      });
      this.project.files.set('mamodel.txt', {
        name: 'mamodel.txt',
        type: 'mamodel',
        data: mamodelTxt,
      });

      let loadedAny = false;
      for (const [name, file] of files) {
        if (name.startsWith('maanim_') && name.endsWith('.txt')) {
          const id = name.replace('maanim_', '').replace('.txt', '');
          const maanimTxt = await file.text();
          this.project.files.set(name, {
            name,
            type: 'maanim',
            data: maanimTxt,
          });
          this.engine.load_animation(id, imgcutTxt, mamodelTxt, maanimTxt);
          loadedAny = true;
        }
      }

      if (loadedAny) {
        const anims = this.engine.list_animations();
        const defaultAnim = anims.includes('walk') ? 'walk' : anims[0];
        onReady(defaultAnim);
        this.log('Project loaded from files.');
      } else {
        throw new Error('No animations found in dropped files.');
      }
    } catch (e) {
      this.log(`Drop load failed: ${e}`, 'error');
    }
  }

  public async loadCharacter(
    baseUrl: string,
    onReady: (defaultAnim: string) => void,
  ) {
    try {
      this.log(`Loading character: ${baseUrl}...`);
      this.clearProject();

      const spriteRes = await fetch(`${baseUrl}/sprite.png`);
      if (spriteRes.ok) {
        const blob = await spriteRes.blob();
        this.project.files.set('sprite.png', {
          name: 'sprite.png',
          type: 'sprite',
          data: blob,
          url: URL.createObjectURL(blob),
        });
        const spriteBytes = new Uint8Array(await blob.arrayBuffer());
        this.engine.load_sprite('test_unit', spriteBytes);
      }

      const icons = ['icon_deploy.png', 'icon_display.png'];
      for (const icon of icons) {
        const res = await fetch(`${baseUrl}/${icon}`);
        if (res.ok) {
          const blob = await res.blob();
          this.project.files.set(icon, {
            name: icon,
            type: 'icon',
            data: blob,
            url: URL.createObjectURL(blob),
          });
        }
      }

      const imgcutTxt = await (await fetch(`${baseUrl}/imgcut.txt`)).text();
      this.project.files.set('imgcut.txt', {
        name: 'imgcut.txt',
        type: 'imgcut',
        data: imgcutTxt,
      });

      const mamodelTxt = await (await fetch(`${baseUrl}/mamodel.txt`)).text();
      this.project.files.set('mamodel.txt', {
        name: 'mamodel.txt',
        type: 'mamodel',
        data: mamodelTxt,
      });

      const animFiles = [
        { id: 'walk', file: 'maanim_walk.txt' },
        { id: 'idle', file: 'maanim_idle.txt' },
        { id: 'attack', file: 'maanim_attack.txt' },
        { id: 'kb', file: 'maanim_kb.txt' },
        { id: 'burrow_up', file: 'maanim_burrow_up.txt' },
        { id: 'burrow_down', file: 'maanim_burrow_down.txt' },
        { id: 'burrow_move', file: 'maanim_burrow_move.txt' },
      ];

      let loadedAny = false;
      for (const anim of animFiles) {
        const res = await fetch(`${baseUrl}/${anim.file}`);
        if (res.ok) {
          const maanimTxt = await res.text();
          this.project.files.set(anim.file, {
            name: anim.file,
            type: 'maanim',
            data: maanimTxt,
          });
          this.engine.load_animation(anim.id, imgcutTxt, mamodelTxt, maanimTxt);
          loadedAny = true;
        }
      }

      if (loadedAny) {
        const anims = this.engine.list_animations();
        const targetAnim = this.project.files.has('maanim_walk.txt')
          ? 'walk'
          : anims[0];
        onReady(targetAnim);
        this.log(`Load complete. Starting animation: ${targetAnim}`);
      } else {
        throw new Error('No animations could be loaded');
      }
    } catch (e) {
      this.log(`Load failed: ${e}`, 'error');
    }
  }

  public async exportProject(
    bridge: EngineBridge,
    animId: string,
    providerId: string = 'bcu-tar',
  ) {
    this.log(`Exporting project via ${providerId}: ${this.project.name}...`);

    try {
      const filesToExport: ProjectFile[] = [];

      // 1. Add binary assets
      for (const file of this.project.files.values()) {
        if (file.type === 'sprite' || file.type === 'icon') {
          filesToExport.push(file);
        }
      }

      // 2. Add dynamic text assets from engine
      const animIds = bridge.listAnimations();
      if (animIds.length > 0) {
        const oldId = animId;
        bridge.setAnimId(animIds[0]);
        filesToExport.push({
          name: 'imgcut.txt',
          type: 'imgcut',
          data: bridge.exportImgCut(),
        });
        filesToExport.push({
          name: 'mamodel.txt',
          type: 'mamodel',
          data: bridge.exportModel(),
        });

        for (const id of animIds) {
          filesToExport.push({
            name: `maanim_${id}.txt`,
            type: 'maanim',
            data: bridge.exportAnimById(id),
          });
        }
        bridge.setAnimId(oldId);
      }

      await ExportManager.export(providerId, this.project.name, filesToExport);
      this.log('Project exported successfully!');
    } catch (e) {
      this.log(`Export failed: ${e}`, 'error');
    }
  }
}

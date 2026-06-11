import { ToastManager } from './components/ToastManager';
import { TabManager } from './components/TabManager';
import { FileExplorer } from './components/FileExplorer';
import { PartsTree } from './components/PartsTree';
import { PropertyInspector } from './components/PropertyInspector';
import { Timeline } from './components/Timeline';
import { ImgCutList } from './components/ImgCutList';

export class UIManager {
    private toastManager = new ToastManager();
    private fileExplorer: FileExplorer;
    private partsTree: PartsTree;
    private propertyInspector: PropertyInspector;
    private timeline: Timeline;
    private imgcutList: ImgCutList;

    private projectNameInput = document.getElementById('input-project-name') as HTMLInputElement;
    
    private lastPartsJson = '';
    private lastImgCutJson = '';
    private lastFilesJson = '';
    public selectedPartIndex: number | null = null;

    constructor(
        onFrameSeek: (frame: number) => void,
        onPropertyChange: (partIdx: number, field: number, value: number) => void,
        onImgCutChange: (cutIdx: number, field: number, value: number) => void,
        onFileSelect: (fileName: string) => void,
        private onPartSelect?: (partIdx: number | null) => void,
        private onKeyframeChange?: (partIdx: number, modifType: number, moveIdx: number, newFrame: number, newValue: number, interp: number, easing: number) => void,
        private onProjectNameChange?: (name: string) => void,
        private onPartAdd?: (parent: number) => void,
        private onPartDelete?: (partIdx: number) => void,
        private onKeyframeAdd?: (partIdx: number, modifType: number, frame: number, value: number) => void,
        private onKeyframeDelete?: (partIdx: number, modifType: number, moveIdx: number) => void
    ) {
        new TabManager();
        this.fileExplorer = new FileExplorer(onFileSelect);
        this.partsTree = new PartsTree(
            (idx) => {
                this.selectedPartIndex = idx;
                if (this.onPartSelect) this.onPartSelect(idx);
            },
            (parent) => { if (this.onPartAdd) this.onPartAdd(parent); },
            (idx) => { if (this.onPartDelete) this.onPartDelete(idx); }
        );
        this.propertyInspector = new PropertyInspector(
            onPropertyChange, 
            (p, m, f, v) => { if (this.onKeyframeAdd) this.onKeyframeAdd(p, m, f, v); },
            (p, m, i, f, v, interp, easing) => { if (this.onKeyframeChange) this.onKeyframeChange(p, m, i, f, v, interp, easing); }
        );
        this.timeline = new Timeline(
            onFrameSeek,
            (p, m, i, f, v, interp, easing) => { if (this.onKeyframeChange) this.onKeyframeChange(p, m, i, f, v, interp, easing); },
            (p, m, i) => { if (this.onKeyframeDelete) this.onKeyframeDelete(p, m, i); },
            (kf) => {
                this.propertyInspector.setSelectedKeyframe(kf);
            }
        );
        this.imgcutList = new ImgCutList(onImgCutChange);

        this.projectNameInput?.addEventListener('input', () => {
            if (this.onProjectNameChange) this.onProjectNameChange(this.projectNameInput.value);
        });
    }

    public showToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
        this.toastManager.show(message, type);
    }

    public flashProperty(field: number) {
        this.propertyInspector.flash(field);
    }

    public setSelectedPart(index: number | null) {
        this.selectedPartIndex = index;
        this.lastPartsJson = ''; 
    }

    update(state: any, isPlaying: boolean, project?: any, imgcut?: any) {
        if (!state) return;

        this.timeline.update(state, isPlaying, this.selectedPartIndex);

        const partsJson = JSON.stringify(state.parts);
        if (partsJson !== this.lastPartsJson) {
            this.lastPartsJson = partsJson;
            this.partsTree.render(state.parts, this.selectedPartIndex);
        }

        if (imgcut) {
            const imgcutJson = JSON.stringify(imgcut);
            if (imgcutJson !== this.lastImgCutJson) {
                this.lastImgCutJson = imgcutJson;
                this.imgcutList.render(imgcut);
            }
        }

        if (project) {
            const filesJson = JSON.stringify(Array.from(project.files.keys()));
            if (filesJson !== this.lastFilesJson) {
                this.lastFilesJson = filesJson;
                this.fileExplorer.render(project);
            }
        }

        if (this.selectedPartIndex !== null && state.parts[this.selectedPartIndex]) {
            this.propertyInspector.update(state.parts[this.selectedPartIndex], state.anim, this.timeline.getCurrentFrame());
        }
    }
}

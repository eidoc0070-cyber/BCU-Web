import { ToastManager } from './components/ToastManager';
import { TabManager } from './components/TabManager';
import { FileExplorer } from './components/FileExplorer';
import { PartsTree } from './components/PartsTree';
import { PropertyInspector } from './components/PropertyInspector';
import { Timeline } from './components/Timeline';
import { ImgCutList } from './components/ImgCutList';
import { eventBus } from './event-bus';

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

    constructor() {
        new TabManager();
        this.fileExplorer = new FileExplorer();
        this.partsTree = new PartsTree();
        this.propertyInspector = new PropertyInspector();
        this.timeline = new Timeline((kf) => {
            this.propertyInspector.setSelectedKeyframe(kf);
        });
        this.imgcutList = new ImgCutList();

        this.projectNameInput?.addEventListener('input', () => {
            eventBus.emit('PROJECT_NAME_CHANGED', { name: this.projectNameInput.value });
        });

        eventBus.on('PART_SELECTED', (data) => {
            this.selectedPartIndex = data.partIdx;
            this.lastPartsJson = ''; // Force re-render of tree if needed
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

    public getCurrentFrame(): number {
        return this.timeline.getCurrentFrame();
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

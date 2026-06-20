import { ToastManager } from './components/ToastManager';
import { TabManager } from './components/TabManager';
import { FileExplorer } from './components/FileExplorer';
import { PartsTree } from './components/PartsTree';
import { PropertyInspector } from './components/PropertyInspector';
import { Timeline } from './components/Timeline';
import { ImgCutList } from './components/ImgCutList';
import { eventBus } from './event-bus';
import { EditorStateManager } from './state-manager';
import { UIErrorBoundary } from './components/ErrorBoundary';

export class UIManager {
    private toastManager = new ToastManager();
    private fileExplorer: FileExplorer;
    private partsTree: PartsTree;
    private propertyInspector: PropertyInspector;
    private timeline: Timeline;
    private imgcutList: ImgCutList;

    // UI Error Boundaries
    private timelineBoundary: UIErrorBoundary;
    private partsTreeBoundary: UIErrorBoundary;
    private imgcutListBoundary: UIErrorBoundary;
    private fileExplorerBoundary: UIErrorBoundary;
    private propertyInspectorBoundary: UIErrorBoundary;

    private projectNameInput = document.getElementById('input-project-name') as HTMLInputElement;
    
    private lastPartsJson = '';
    private lastImgCutJson = '';
    private lastFilesJson = '';
    public selectedPartIdxs: number[] = [];

    constructor(private stateManager: EditorStateManager) {
        new TabManager();
        this.fileExplorer = new FileExplorer();
        this.partsTree = new PartsTree();
        this.propertyInspector = new PropertyInspector(this.stateManager);
        this.timeline = new Timeline(this.stateManager, () => {
            // PropertyInspector now uses direct stateManager access in update()
        });
        this.imgcutList = new ImgCutList();

        // Initialize UI Error Boundaries
        this.timelineBoundary = new UIErrorBoundary(
            document.getElementById('timeline-keyframes'),
            'Timeline',
            () => { this.timelineBoundary.clearError(); }
        );
        this.partsTreeBoundary = new UIErrorBoundary(
            document.getElementById('parts-list'),
            'PartsTree',
            () => { this.partsTreeBoundary.clearError(); this.lastPartsJson = ''; }
        );
        this.imgcutListBoundary = new UIErrorBoundary(
            document.getElementById('imgcut-list'),
            'ImgCutList',
            () => { this.imgcutListBoundary.clearError(); this.lastImgCutJson = ''; }
        );
        this.fileExplorerBoundary = new UIErrorBoundary(
            document.getElementById('file-explorer'),
            'FileExplorer',
            () => { this.fileExplorerBoundary.clearError(); this.lastFilesJson = ''; }
        );
        this.propertyInspectorBoundary = new UIErrorBoundary(
            document.getElementById('property-inspector'),
            'PropertyInspector',
            () => { this.propertyInspectorBoundary.clearError(); }
        );

        this.projectNameInput?.addEventListener('input', () => {
            eventBus.emit('PROJECT_NAME_CHANGED', { name: this.projectNameInput.value });
        });

        eventBus.on('PART_SELECTED', (data) => {
            this.selectedPartIdxs = data.partIdxs;
            this.lastPartsJson = ''; // Force re-render of tree if needed
        });
    }

    public showToast(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
        this.toastManager.show(message, type);
    }

    public flashProperty(field: number) {
        this.propertyInspector.flash(field);
    }

    public setSelectedParts(idxs: number[]) {
        this.selectedPartIdxs = idxs;
        this.lastPartsJson = ''; 
    }

    public getCurrentFrame(): number {
        return this.timeline.getCurrentFrame();
    }

    update(state: any, isPlaying: boolean, alpha: number, project?: any, imgcut?: any) {
        if (!state) return;

        this.timelineBoundary.run(() => {
            this.timeline.update(state, isPlaying, this.selectedPartIdxs);
        });

        const partsJson = JSON.stringify(state.parts);
        if (partsJson !== this.lastPartsJson) {
            this.partsTreeBoundary.run(() => {
                this.partsTree.render(state.parts, this.selectedPartIdxs);
                this.lastPartsJson = partsJson;
            });
        }

        if (imgcut) {
            const imgcutJson = JSON.stringify(imgcut);
            if (imgcutJson !== this.lastImgCutJson) {
                this.imgcutListBoundary.run(() => {
                    this.imgcutList.render(imgcut);
                    this.lastImgCutJson = imgcutJson;
                });
            }
        }

        if (project) {
            const filesJson = JSON.stringify(Array.from(project.files.keys()));
            if (filesJson !== this.lastFilesJson) {
                this.fileExplorerBoundary.run(() => {
                    this.fileExplorer.render(project);
                    this.lastFilesJson = filesJson;
                });
            }
        }

        if (this.selectedPartIdxs.length > 0) {
            const selectedParts = this.selectedPartIdxs
                .map(idx => state.parts[idx])
                .filter(p => !!p);
            
            if (selectedParts.length > 0) {
                this.propertyInspectorBoundary.run(() => {
                    this.propertyInspector.update(selectedParts, state.anim, this.timeline.getCurrentFrame(), state.parts, alpha);
                });
            }
        } else {
            this.propertyInspectorBoundary.run(() => {
                this.propertyInspector.update([], null, 0, [], alpha);
            });
        }
    }
}

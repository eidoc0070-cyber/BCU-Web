export interface EditorStatus {
    isPlaying: boolean;
    isReady: boolean;
    animId: string;
    currentView: 'animation' | 'imgcut' | 'image';
    selectedFile: string | null;
    lastRenderedVersion: bigint;
}

export interface EditorSession {
    animId: string;
    selectedPartIdxs: number[];
    selectedKeyframeIds: string[];
    currentFrame: number;
    currentView: 'animation' | 'imgcut' | 'image';
    projectName: string;
}

export type StateListener = (status: EditorStatus) => void;

export class EditorStateManager {
    private status: EditorStatus = {
        isPlaying: true,
        isReady: false,
        animId: 'none',
        currentView: 'animation',
        selectedFile: null,
        lastRenderedVersion: -1n
    };

    private selectedPartIdxs: Set<number> = new Set();
    private selectedKeyframeIds: Set<string> = new Set();
    private listeners: StateListener[] = [];

    constructor() {}

    public subscribe(listener: StateListener) {
        this.listeners.push(listener);
        listener(this.status);
    }

    public updateStatus(update: Partial<EditorStatus>) {
        this.status = { ...this.status, ...update };
        this.notify();
    }

    public getStatus(): EditorStatus {
        return { ...this.status };
    }

    private notify() {
        this.listeners.forEach(l => l(this.status));
    }

    // Part Selection management
    public getSelection(): number[] {
        return Array.from(this.selectedPartIdxs);
    }

    public setSelection(idxs: number[]) {
        this.selectedPartIdxs = new Set(idxs);
    }

    public toggleSelection(idx: number) {
        if (this.selectedPartIdxs.has(idx)) {
            this.selectedPartIdxs.delete(idx);
        } else {
            this.selectedPartIdxs.add(idx);
        }
    }

    public isSelected(idx: number): boolean {
        return this.selectedPartIdxs.has(idx);
    }

    // Keyframe Selection management
    // ID format: "partIdx:modifType:frame"
    public getKFSelection(): string[] {
        return Array.from(this.selectedKeyframeIds);
    }

    public setKFSelection(ids: string[]) {
        this.selectedKeyframeIds = new Set(ids);
    }

    public toggleKFSelection(id: string) {
        if (this.selectedKeyframeIds.has(id)) {
            this.selectedKeyframeIds.delete(id);
        } else {
            this.selectedKeyframeIds.add(id);
        }
    }

    public isKFSelected(id: string): boolean {
        return this.selectedKeyframeIds.has(id);
    }

    public clearKFSelection() {
        this.selectedKeyframeIds.clear();
    }

    public remapPartIndices(deletedIdx: number) {
        const newSelection = new Set<number>();
        this.selectedPartIdxs.forEach(idx => {
            if (idx === deletedIdx) {
                // Remove deleted part
            } else if (idx > deletedIdx) {
                newSelection.add(idx - 1);
            } else {
                newSelection.add(idx);
            }
        });
        this.selectedPartIdxs = newSelection;
        
        // Also remap Keyframe IDs if they contain partIdx
        const newKFSelection = new Set<string>();
        this.selectedKeyframeIds.forEach(id => {
            const parts = id.split(':');
            const pIdx = parseInt(parts[0]);
            if (pIdx === deletedIdx) {
                // Remove keyframes of deleted part
            } else if (pIdx > deletedIdx) {
                parts[0] = (pIdx - 1).toString();
                newKFSelection.add(parts.join(':'));
            } else {
                newKFSelection.add(id);
            }
        });
        this.selectedKeyframeIds = newKFSelection;
    }

    public remapPartIndicesReverse(insertedIdx: number, restoredKFIds: string[] = []) {
        const newSelection = new Set<number>();
        this.selectedPartIdxs.forEach(idx => {
            if (idx >= insertedIdx) {
                newSelection.add(idx + 1);
            } else {
                newSelection.add(idx);
            }
        });
        // Add the restored part back to selection
        newSelection.add(insertedIdx);
        this.selectedPartIdxs = newSelection;

        const newKFSelection = new Set<string>();
        this.selectedKeyframeIds.forEach(id => {
            const parts = id.split(':');
            const pIdx = parseInt(parts[0]);
            if (pIdx >= insertedIdx) {
                parts[0] = (pIdx + 1).toString();
                newKFSelection.add(parts.join(':'));
            } else {
                newKFSelection.add(id);
            }
        });
        
        // Add restored keyframes back to selection
        restoredKFIds.forEach(id => newKFSelection.add(id));
        
        this.selectedKeyframeIds = newKFSelection;
    }

    // Specialized helpers
    public setPlaying(playing: boolean) {
        this.updateStatus({ isPlaying: playing });
    }

    public setReady(ready: boolean) {
        this.updateStatus({ isReady: ready });
    }

    public setAnimId(id: string) {
        this.updateStatus({ animId: id });
    }

    public setView(view: 'animation' | 'imgcut' | 'image') {
        this.updateStatus({ currentView: view });
    }

    public setSelectedFile(file: string | null) {
        this.updateStatus({ selectedFile: file });
    }

    public getSession(currentFrame: number, projectName: string): EditorSession {
        return {
            animId: this.status.animId,
            selectedPartIdxs: this.getSelection(),
            selectedKeyframeIds: this.getKFSelection(),
            currentFrame,
            currentView: this.status.currentView,
            projectName
        };
    }
}

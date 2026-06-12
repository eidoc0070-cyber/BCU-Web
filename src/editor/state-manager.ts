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
    selectedPartIdx: number | null;
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

    public getSession(selectedPartIdx: number | null, currentFrame: number, projectName: string): EditorSession {
        return {
            animId: this.status.animId,
            selectedPartIdx,
            currentFrame,
            currentView: this.status.currentView,
            projectName
        };
    }
}

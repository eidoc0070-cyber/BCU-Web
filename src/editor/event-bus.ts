export type EditorEventType = 
    | 'PART_SELECTED' 
    | 'PROPERTY_CHANGED' 
    | 'FRAME_SEEK' 
    | 'KEYFRAME_MODIFIED'
    | 'KEYFRAME_ADDED'
    | 'KEYFRAME_DELETED'
    | 'PART_ADDED' 
    | 'PART_DELETED' 
    | 'IMGCUT_CHANGED'
    | 'PROJECT_NAME_CHANGED' 
    | 'FILE_SELECTED' 
    | 'ANIMATION_SWITCHED';

    export interface EditorEventData {
    'PART_SELECTED': { partIdx: number | null };
    'PROPERTY_CHANGED': { partIdx: number, field: number, value: number, source?: string };
    'FRAME_SEEK': { frame: number };
    'KEYFRAME_MODIFIED': { partIdx: number, modifType: number, moveIdx: number, frame: number, value: number, interp: number, easing: number };
    'KEYFRAME_ADDED': { partIdx: number, modifType: number, frame: number, value: number };
    'KEYFRAME_DELETED': { partIdx: number, modifType: number, moveIdx: number };
    'PART_ADDED': { parent: number };
    'PART_DELETED': { partIdx: number };
    'IMGCUT_CHANGED': { cutIdx: number, field: number, value: number };
    'PROJECT_NAME_CHANGED': { name: string };
    'FILE_SELECTED': { fileName: string };
    'ANIMATION_SWITCHED': { animId: string };
    }
type Callback<T extends EditorEventType> = (data: EditorEventData[T]) => void;

export class EventBus {
    private listeners: Partial<Record<EditorEventType, Callback<any>[]>> = {};

    public on<T extends EditorEventType>(type: T, callback: Callback<T>): void {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type]!.push(callback);
    }

    public off<T extends EditorEventType>(type: T, callback: Callback<T>): void {
        if (!this.listeners[type]) return;
        this.listeners[type] = this.listeners[type]!.filter(cb => cb !== callback);
    }

    public emit<T extends EditorEventType>(type: T, data: EditorEventData[T]): void {
        if (!this.listeners[type]) return;
        this.listeners[type]!.forEach(callback => callback(data));
    }
}

export const eventBus = new EventBus();

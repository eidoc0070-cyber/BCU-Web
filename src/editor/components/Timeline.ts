export class Timeline {
    private frameSlider = document.getElementById('frame-slider') as HTMLInputElement;
    private keyframesContainer = document.getElementById('timeline-keyframes');
    private currentFrameLabel = document.getElementById('current-frame-label');
    private maxFrameLabel = document.getElementById('max-frame-label');
    private selectedKeyframe: { partIdx: number, modifType: number, moveIdx: number } | null = null;

    constructor(
        private onFrameSeek: (frame: number) => void,
        private onKeyframeChange: (partIdx: number, modifType: number, moveIdx: number, newFrame: number, newValue: number, interp: number, easing: number) => void,
        private onKeyframeDelete: (partIdx: number, modifType: number, moveIdx: number) => void,
        private onKeyframeSelect: (kf: { partIdx: number, modifType: number, moveIdx: number } | null) => void
    ) {
        this.frameSlider?.addEventListener('input', () => {
            this.onFrameSeek(parseFloat(this.frameSlider.value));
        });
    }

    public update(state: any, isPlaying: boolean, selectedPartIndex: number | null) {
        if (!state) return;

        if (this.currentFrameLabel) this.currentFrameLabel.innerText = `Frame: ${Math.floor(state.current_frame)}`;
        if (this.maxFrameLabel) this.maxFrameLabel.innerText = `Max: ${state.max_frame}`;
        
        if (this.frameSlider) {
            this.frameSlider.max = state.max_frame.toString();
            if (isPlaying) this.frameSlider.value = state.current_frame.toString();
        }

        this.renderKeyframes(state, selectedPartIndex);
    }

    private renderKeyframes(state: any, selectedPartIndex: number | null) {
        if (!this.keyframesContainer) return;
        
        this.keyframesContainer.innerHTML = '';
        const maxFrame = state.max_frame;
        if (maxFrame <= 0) return;

        state.anim.parts.forEach((p: any) => {
            const isPartSelected = p.ints[0] === selectedPartIndex;
            
            p.moves.forEach((move: any, moveIdx: number) => {
                const frame = move[0] - p.off;
                const ratio = frame / maxFrame;
                const isKFSelected = this.selectedKeyframe?.partIdx === p.ints[0] && 
                                   this.selectedKeyframe?.modifType === p.ints[1] && 
                                   this.selectedKeyframe?.moveIdx === moveIdx;
                
                const dot = document.createElement('div');
                dot.style.position = 'absolute';
                dot.style.left = `${ratio * 100}%`;
                dot.style.top = isPartSelected ? (isKFSelected ? '0' : '20%') : '35%';
                dot.style.width = isKFSelected ? '8px' : (isPartSelected ? '4px' : '2px');
                dot.style.height = isKFSelected ? '100%' : (isPartSelected ? '60%' : '30%');
                
                // Color based on interpolation type: Linear, Step, Easing, Lagrange, Sinusoidal
                const interpColors = ['#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#3b82f6'];
                const color = interpColors[move[2]] || 'var(--accent)';
                
                dot.style.background = isPartSelected ? color : 'rgba(255,255,255,0.2)';
                dot.style.border = isKFSelected ? '2px solid white' : 'none';
                dot.style.borderRadius = '2px';
                dot.style.zIndex = isKFSelected ? '20' : (isPartSelected ? '10' : '1');
                dot.style.cursor = isPartSelected ? 'pointer' : 'default';
                dot.title = `Part ${p.ints[0]}, Frame ${frame}, Type ${move[2]}`;
                
                if (isPartSelected) {
                    dot.onclick = (e) => {
                        e.stopPropagation();
                        this.selectedKeyframe = { partIdx: p.ints[0], modifType: p.ints[1], moveIdx };
                        this.onKeyframeSelect(this.selectedKeyframe);
                        this.renderKeyframes(state, selectedPartIndex);
                    };

                    dot.oncontextmenu = (e) => {
                        e.preventDefault();
                        if (confirm(`Delete keyframe for Part ${p.ints[0]} at frame ${frame}?`)) {
                            this.onKeyframeDelete(p.ints[0], p.ints[1], moveIdx);
                            if (isKFSelected) {
                                this.selectedKeyframe = null;
                                this.onKeyframeSelect(null);
                            }
                        }
                    };

                    dot.onmousedown = (e) => {
                        if (e.button !== 0) return;
                        e.stopPropagation();
                        
                        this.selectedKeyframe = { partIdx: p.ints[0], modifType: p.ints[1], moveIdx };
                        this.onKeyframeSelect(this.selectedKeyframe);
                        this.renderKeyframes(state, selectedPartIndex);

                        const startX = e.clientX;
                        const startFrame = frame;
                        
                        const onMouseMove = (moveEvent: MouseEvent) => {
                            const dx = moveEvent.clientX - startX;
                            const rect = this.keyframesContainer!.getBoundingClientRect();
                            const frameDelta = Math.round((dx / rect.width) * maxFrame);
                            const newFrame = Math.max(0, Math.min(maxFrame, startFrame + frameDelta));
                            
                            this.onKeyframeChange(p.ints[0], p.ints[1], moveIdx, newFrame, move[1], move[2], move[3]);
                        };
                        
                        const onMouseUp = () => {
                            window.removeEventListener('mousemove', onMouseMove);
                            window.removeEventListener('mouseup', onMouseUp);
                        };
                        
                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);
                    };
                }

                this.keyframesContainer?.appendChild(dot);
            });
        });
    }

    public setSelectedKeyframe(kf: { partIdx: number, modifType: number, moveIdx: number } | null) {
        this.selectedKeyframe = kf;
    }

    public getCurrentFrame(): number {
        return Math.floor(parseFloat(this.frameSlider?.value || '0'));
    }
}

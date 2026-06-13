import { eventBus } from '../event-bus';

export class Timeline {
    private frameSlider = document.getElementById('frame-slider') as HTMLInputElement;
    private keyframesContainer = document.getElementById('timeline-keyframes');
    private currentFrameLabel = document.getElementById('current-frame-label');
    private maxFrameLabel = document.getElementById('max-frame-label');
    private selectedKeyframe: { partIdx: number, modifType: number, moveIdx: number } | null = null;

    constructor(
        private onKeyframeSelect: (kf: { partIdx: number, modifType: number, moveIdx: number } | null) => void
    ) {
        this.frameSlider?.addEventListener('input', () => {
            eventBus.emit('FRAME_SEEK', { frame: parseFloat(this.frameSlider.value) });
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

        // Create SVG layer for connections
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';
        this.keyframesContainer.appendChild(svg);

        const interpColors = ['#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#3b82f6'];

        state.anim.parts.forEach((p: any) => {
            const isPartSelected = p.ints[0] === selectedPartIndex;
            if (!isPartSelected) return;

            // Sort moves by frame
            const sortedMoves = [...p.moves].sort((a, b) => a[0] - b[0]);
            const modifType = p.ints[1];
            
            // vertical offset based on modifType to reduce overlapping
            // We have about 12 types. Let's spread them between 20% and 80%
            const y = 20 + (modifType % 12) * 5; 
            
            for (let i = 0; i < sortedMoves.length - 1; i++) {
                const startMove = sortedMoves[i];
                const endMove = sortedMoves[i + 1];
                
                const startFrame = startMove[0] - p.off;
                const endFrame = endMove[0] - p.off;
                const interp = startMove[2];
                
                const x1 = (startFrame / maxFrame) * 100;
                const x2 = (endFrame / maxFrame) * 100;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                let d = '';
                
                if (interp === 1) { // Step
                    // Square "staircase" look even on a single line
                    const midX = x1 + (x2 - x1) * 0.5;
                    d = `M ${x1}% ${y}% L ${midX}% ${y}% L ${midX}% ${y-3}% L ${midX}% ${y+3}% L ${midX}% ${y}% L ${x2}% ${y}%`;
                    path.setAttribute('stroke-dasharray', '2,2');
                } else if (interp === 2 || interp === 4) { // Easing / Sinusoidal
                    const cp1 = x1 + (x2 - x1) * 0.3;
                    const cp2 = x1 + (x2 - x1) * 0.7;
                    // Draw a wave to indicate smooth transition
                    d = `M ${x1}% ${y}% C ${cp1}% ${y-8}% ${cp2}% ${y+8}% ${x2}% ${y}%`;
                } else if (interp === 3) { // Lagrange
                    d = `M ${x1}% ${y}% L ${x2}% ${y}%`;
                    path.setAttribute('stroke-dasharray', '1,3');
                } else { // Linear (0)
                    d = `M ${x1}% ${y}% L ${x2}% ${y}%`;
                }

                path.setAttribute('d', d);
                path.setAttribute('stroke', interpColors[interp] || 'white');
                path.setAttribute('stroke-width', '1');
                path.setAttribute('fill', 'none');
                path.setAttribute('opacity', '0.4');
                svg.appendChild(path);
            }
        });

        // Render Dots on top
        state.anim.parts.forEach((p: any) => {
            const isPartSelected = p.ints[0] === selectedPartIndex;
            const modifType = p.ints[1];
            const yOffset = isPartSelected ? 20 + (modifType % 12) * 5 : 35;
            
            p.moves.forEach((move: any, moveIdx: number) => {
                const frame = move[0] - p.off;
                const ratio = frame / maxFrame;
                const isKFSelected = this.selectedKeyframe?.partIdx === p.ints[0] && 
                                   this.selectedKeyframe?.modifType === p.ints[1] && 
                                   this.selectedKeyframe?.moveIdx === moveIdx;
                
                const dot = document.createElement('div');
                dot.className = 'timeline-kf-dot';
                dot.style.position = 'absolute';
                dot.style.left = `${ratio * 100}%`;
                dot.style.top = `${yOffset}%`;
                dot.style.transform = 'translate(-50%, -50%)'; 
                dot.style.width = isKFSelected ? '10px' : (isPartSelected ? '6px' : '3px');
                dot.style.height = isKFSelected ? '10px' : (isPartSelected ? '6px' : '3px');
                
                const color = interpColors[move[2]] || 'var(--accent)';
                
                dot.style.background = isPartSelected ? color : 'rgba(255,255,255,0.2)';
                dot.style.border = isKFSelected ? '2px solid white' : 'none';
                dot.style.borderRadius = '50%';
                dot.style.zIndex = isKFSelected ? '20' : (isPartSelected ? '10' : '1');
                dot.style.cursor = isPartSelected ? 'pointer' : 'default';
                dot.title = `Part ${p.ints[0]}, Type ${modifType}, Frame ${frame}, Mode ${move[2]}`;
                
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
                            eventBus.emit('KEYFRAME_DELETED', { partIdx: p.ints[0], modifType: p.ints[1], moveIdx });
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
                            
                            eventBus.emit('KEYFRAME_MODIFIED', {
                                partIdx: p.ints[0],
                                modifType: p.ints[1],
                                moveIdx,
                                frame: newFrame,
                                value: move[1],
                                interp: move[2],
                                easing: move[3]
                            });
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

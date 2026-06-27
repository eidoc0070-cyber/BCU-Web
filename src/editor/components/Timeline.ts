import { eventBus } from '../event-bus';
import type { EditorStateManager } from '../state-manager';
import { ContextMenu } from './ContextMenu';

export class Timeline {
  private frameSlider = document.getElementById(
    'frame-slider',
  ) as HTMLInputElement;
  private keyframesContainer = document.getElementById('timeline-keyframes');
  private currentFrameLabel = document.getElementById('current-frame-label');
  private maxFrameLabel = document.getElementById('max-frame-label');
  private isDragging = false;

  constructor(
    private stateManager: EditorStateManager,
    private onKeyframeSelect: (
      kf: {
        partIdx: number;
        modifType: number;
        moveIdx: number;
        frame: number;
      } | null,
    ) => void,
  ) {
    this.frameSlider?.addEventListener('input', () => {
      eventBus.emit('FRAME_SEEK', {
        frame: parseFloat(this.frameSlider.value),
      });
    });
  }

  private getKFId(partIdx: number, modifType: number, frame: number): string {
    return `${partIdx}:${modifType}:${frame}`;
  }

  public update(state: any, isPlaying: boolean, selectedPartIdxs: number[]) {
    if (!state || this.isDragging) return;

    if (this.currentFrameLabel)
      this.currentFrameLabel.innerText = `Frame: ${Math.floor(state.current_frame)}`;
    if (this.maxFrameLabel)
      this.maxFrameLabel.innerText = `Max: ${state.max_frame}`;

    if (this.frameSlider) {
      this.frameSlider.max = state.max_frame.toString();
      if (isPlaying) this.frameSlider.value = state.current_frame.toString();
    }

    this.renderKeyframes(state, selectedPartIdxs);
  }

  private renderKeyframes(state: any, selectedPartIdxs: number[]) {
    if (!this.keyframesContainer) return;

    this.keyframesContainer.innerHTML = '';
    const maxFrame = state.max_frame;
    if (maxFrame <= 0) return;

    const selectedSet = new Set(selectedPartIdxs);

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

    const interpColors = [
      '#8b5cf6',
      '#ef4444',
      '#10b981',
      '#f59e0b',
      '#3b82f6',
    ];

    state.anim.parts.forEach((p: any) => {
      const isPartSelected = selectedSet.has(p.ints[0]);
      if (!isPartSelected) return;

      // Sort moves by frame
      const sortedMoves = [...p.moves].sort((a, b) => a[0] - b[0]);
      const modifType = p.ints[1];
      const y = 20 + (modifType % 12) * 5;

      for (let i = 0; i < sortedMoves.length - 1; i++) {
        const startMove = sortedMoves[i];
        const endMove = sortedMoves[i + 1];

        const startFrame = startMove[0] - p.off;
        const endFrame = endMove[0] - p.off;
        const interp = startMove[2];

        const x1 = (startFrame / maxFrame) * 100;
        const x2 = (endFrame / maxFrame) * 100;

        const path = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path',
        );
        let d = '';

        if (interp === 1) {
          // Step: Sharp vertical-horizontal steps
          const midX = x1 + (x2 - x1) * 0.99; // Sharp step near the end
          d = `M ${x1}% ${y}% L ${midX}% ${y}% L ${midX}% ${y - 6}% L ${midX}% ${y + 6}% L ${midX}% ${y}% L ${x2}% ${y}%`;
          path.setAttribute('stroke-width', '1.5');
        } else if (interp === 2 || interp === 4) {
          // Easing / Sinusoidal: Smooth S-curves
          const cp1 = x1 + (x2 - x1) * 0.4;
          const cp2 = x1 + (x2 - x1) * 0.6;
          const curveY = interp === 2 ? 10 : 6;
          d = `M ${x1}% ${y}% C ${cp1}% ${y - curveY}% ${cp2}% ${y + curveY}% ${x2}% ${y}%`;
          path.setAttribute('stroke-width', '1.2');
        } else {
          // Linear / Lagrange: Straight lines
          d = `M ${x1}% ${y}% L ${x2}% ${y}%`;
          if (interp === 3) {
            path.setAttribute('stroke-dasharray', '1,2');
            path.setAttribute('stroke-width', '1.2');
          } else {
            path.setAttribute('stroke-width', '1');
          }
        }

        path.setAttribute('d', d);
        path.setAttribute('stroke', interpColors[interp] || 'white');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.6');
        svg.appendChild(path);
      }
    });

    // Render Dots on top
    state.anim.parts.forEach((p: any) => {
      const isPartSelected = selectedSet.has(p.ints[0]);
      const modifType = p.ints[1];
      const yOffset = isPartSelected ? 20 + (modifType % 12) * 5 : 35;

      p.moves.forEach((move: any, moveIdx: number) => {
        const frame = move[0] - p.off;
        const ratio = frame / maxFrame;
        const kfId = this.getKFId(p.ints[0], p.ints[1], frame);
        const isKFSelected = this.stateManager.isKFSelected(kfId);
        const interp = move[2];

        const dot = document.createElement('div');
        dot.className = 'timeline-kf-dot';
        dot.setAttribute('data-kf-id', kfId);
        dot.style.position = 'absolute';
        dot.style.left = `${ratio * 100}%`;
        dot.style.top = `${yOffset}%`;

        const color = interpColors[interp] || 'var(--accent)';

        // Shape and Size based on Interpolation
        const size = isKFSelected ? 10 : isPartSelected ? 7 : 4;
        let borderRadius = '50%';
        let transform = 'translate(-50%, -50%)';

        if (interp === 1) {
          // Step: Square
          borderRadius = '0%';
        } else if (interp === 2) {
          // Easing: Diamond
          borderRadius = '2px';
          transform = 'translate(-50%, -50%) rotate(45deg)';
        } else if (interp === 3) {
          // Lagrange: Hexagon-like
          borderRadius = '30%';
          transform = 'translate(-50%, -50%) rotate(30deg)';
        }

        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.background = isPartSelected ? color : 'rgba(255,255,255,0.2)';
        dot.style.border = isKFSelected ? '2px solid white' : 'none';
        dot.style.borderRadius = borderRadius;
        dot.style.transform = transform;
        dot.style.boxShadow = isKFSelected ? `0 0 8px ${color}` : 'none';
        dot.style.zIndex = isKFSelected ? '20' : isPartSelected ? '10' : '1';
        dot.style.cursor = isPartSelected ? 'pointer' : 'default';
        dot.style.transition = 'all 0.15s ease';

        if (isPartSelected) {
          dot.onclick = (e) => {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
              this.stateManager.toggleKFSelection(kfId);
            } else {
              this.stateManager.setKFSelection([kfId]);
            }

            // Notify primary selection for Inspector
            const selection = this.stateManager.getKFSelection();
            if (selection.length > 0) {
              const [pIdx, mType, fr] = selection[0].split(':').map(Number);
              this.onKeyframeSelect({
                partIdx: pIdx,
                modifType: mType,
                moveIdx,
                frame: fr,
              });
            } else {
              this.onKeyframeSelect(null);
            }

            this.renderKeyframes(state, selectedPartIdxs);
          };

          dot.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!this.stateManager.isKFSelected(kfId)) {
              this.stateManager.setKFSelection([kfId]);
              this.renderKeyframes(state, selectedPartIdxs);
            }

            const selectedIds = this.stateManager.getKFSelection();

            ContextMenu.show(e.clientX, e.clientY, [
              {
                label: `Delete ${selectedIds.length} Keyframe(s)`,
                icon: '🗑️',
                danger: true,
                action: () => {
                  selectedIds.forEach((id) => {
                    const [pIdx, mType, fr] = id.split(':').map(Number);
                    eventBus.emit('KEYFRAME_DELETED', {
                      partIdx: pIdx,
                      modifType: mType,
                      frame: fr,
                      moveIdx: -1,
                    });
                  });
                },
              },
              { type: 'separator' },
              {
                label: 'Linear',
                icon: '📈',
                action: () => this.batchSetInterpolation(state, selectedIds, 0),
              },
              {
                label: 'Step (None)',
                icon: '📉',
                action: () => this.batchSetInterpolation(state, selectedIds, 1),
              },
              {
                label: 'Easing (In/Out)',
                icon: '🌊',
                action: () => this.batchSetInterpolation(state, selectedIds, 2),
              },
              {
                label: 'Lagrange (Poly)',
                icon: '➰',
                action: () => this.batchSetInterpolation(state, selectedIds, 3),
              },
              {
                label: 'Sinusoidal (Wave)',
                icon: '〰️',
                action: () => this.batchSetInterpolation(state, selectedIds, 4),
              },
            ]);
          };

          dot.onmousedown = (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();

            if (!this.stateManager.isKFSelected(kfId)) {
              if (e.ctrlKey || e.metaKey) {
                this.stateManager.toggleKFSelection(kfId);
              } else {
                this.stateManager.setKFSelection([kfId]);
              }
              this.renderKeyframes(state, selectedPartIdxs);
            }

            this.isDragging = true;
            const startX = e.clientX;
            const selectedIds = this.stateManager.getKFSelection();

            const initialStates = new Map<
              string,
              {
                partIdx: number;
                modifType: number;
                frame: number;
                value: number;
                interp: number;
                easing: number;
                element: HTMLElement;
              }
            >();

            selectedIds.forEach((id) => {
              const [pIdx, mType, fr] = id.split(':').map(Number);
              const part = state.anim.parts.find(
                (ap: any) => ap.ints[0] === pIdx && ap.ints[1] === mType,
              );
              if (part) {
                const mv = part.moves.find((m: any) => m[0] - part.off === fr);
                if (mv) {
                  const el = this.keyframesContainer!.querySelector(
                    `[data-kf-id="${id}"]`,
                  ) as HTMLElement;
                  initialStates.set(id, {
                    partIdx: pIdx,
                    modifType: mType,
                    frame: fr,
                    value: mv[1],
                    interp: mv[2],
                    easing: mv[3],
                    element: el,
                  });
                }
              }
            });

            const onMouseMove = (moveEvent: MouseEvent) => {
              const dx = moveEvent.clientX - startX;
              const rect = this.keyframesContainer!.getBoundingClientRect();
              const frameDelta = Math.round((dx / rect.width) * maxFrame);

              initialStates.forEach((initial) => {
                const newFrame = Math.max(
                  0,
                  Math.min(maxFrame, initial.frame + frameDelta),
                );

                if (initial.element) {
                  initial.element.style.left = `${(newFrame / maxFrame) * 100}%`;
                }

                eventBus.emit('KEYFRAME_MODIFIED', {
                  partIdx: initial.partIdx,
                  modifType: initial.modifType,
                  moveIdx,
                  frame: newFrame,
                  value: initial.value,
                  interp: initial.interp,
                  easing: initial.easing,
                  oldFrame: initial.frame,
                  isPreview: true,
                });
              });
            };

            const onMouseUp = (upEvent: MouseEvent) => {
              this.isDragging = false;
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);

              const dx = upEvent.clientX - startX;
              const rect = this.keyframesContainer!.getBoundingClientRect();
              const frameDelta = Math.round((dx / rect.width) * maxFrame);

              if (frameDelta === 0) return;

              const changes: any[] = [];
              initialStates.forEach((initial) => {
                const newFrame = Math.max(
                  0,
                  Math.min(maxFrame, initial.frame + frameDelta),
                );
                if (newFrame !== initial.frame) {
                  changes.push({
                    partIdx: initial.partIdx,
                    modifType: initial.modifType,
                    oldData: {
                      frame: initial.frame,
                      value: initial.value,
                      interp: initial.interp,
                      easing: initial.easing,
                    },
                    newData: {
                      frame: newFrame,
                      value: initial.value,
                      interp: initial.interp,
                      easing: initial.easing,
                    },
                  });
                }
              });

              if (changes.length > 0) {
                eventBus.emit('KEYFRAME_BATCH_MODIFIED', { changes });
              } else {
                this.renderKeyframes(state, selectedPartIdxs);
              }
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          };
        }

        this.keyframesContainer?.appendChild(dot);
      });
    });
  }

  public getCurrentFrame(): number {
    return Math.floor(parseFloat(this.frameSlider?.value || '0'));
  }

  private batchSetInterpolation(state: any, kfIds: string[], interp: number) {
    const changes: any[] = [];
    kfIds.forEach((id) => {
      const [pIdx, mType, fr] = id.split(':').map(Number);
      const part = state.anim.parts.find(
        (p: any) => p.ints[0] === pIdx && p.ints[1] === mType,
      );
      if (part) {
        const move = part.moves.find((m: any) => m[0] - part.off === fr);
        if (move) {
          changes.push({
            partIdx: pIdx,
            modifType: mType,
            oldData: {
              frame: fr,
              value: move[1],
              interp: move[2],
              easing: move[3],
            },
            newData: {
              frame: fr,
              value: move[1],
              interp: interp,
              easing: move[3],
            },
          });
        }
      }
    });

    if (changes.length > 0) {
      eventBus.emit('KEYFRAME_BATCH_MODIFIED', { changes });
    }
  }
}

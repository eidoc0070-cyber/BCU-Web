import { expect, test, describe, beforeAll, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Timeline } from "../src/editor/components/Timeline";

describe("Timeline Visualization Unit Tests", () => {
    let timeline: Timeline;

    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch (e) {}
    });

    beforeEach(() => {
        document.body.innerHTML = `
            <input type="range" id="frame-slider">
            <div id="timeline-keyframes" style="width: 1000px; height: 100px;"></div>
            <div id="current-frame-label"></div>
            <div id="max-frame-label"></div>
        `;
        timeline = new Timeline(() => {});
    });

    test("should generate correct SVG paths for different interpolation types", () => {
        const mockState = {
            current_frame: 0,
            max_frame: 100,
            anim: {
                parts: [
                    {
                        ints: [0, 4, 1, 0, 0], // Part 0, ModifType 4 (PosX)
                        off: 0,
                        moves: [
                            [0, 100, 0, 0],   // Frame 0, Value 100, Linear
                            [50, 200, 1, 0],  // Frame 50, Value 200, Step
                            [100, 300, 2, 0]  // Frame 100, Value 300, Easing
                        ]
                    }
                ]
            }
        };

        timeline.update(mockState, false, 0); // Part 0 selected

        const container = document.getElementById('timeline-keyframes')!;
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();

        const paths = svg?.querySelectorAll('path');
        expect(paths?.length).toBe(2); // Two segments between 3 keyframes

        // First segment: Linear (0) -> should be a straight line "L"
        const path1 = paths![0];
        expect(path1.getAttribute('d')).toContain('L');
        expect(path1.getAttribute('stroke')).toBe('#8b5cf6'); // Linear color

        // Second segment: Step (1) -> should have dash-array and staircase logic
        const path2 = paths![1];
        expect(path2.getAttribute('stroke-dasharray')).toBe('2,2');
        expect(path2.getAttribute('stroke')).toBe('#ef4444'); // Step color
    });

    test("should offset different property channels vertically", () => {
        const mockState = {
            current_frame: 0,
            max_frame: 100,
            anim: {
                parts: [
                    { ints: [0, 4, 0, 0, 0], off: 0, moves: [[0, 0, 0, 0], [100, 0, 0, 0]] }, // PosX
                    { ints: [0, 5, 0, 0, 0], off: 0, moves: [[0, 0, 0, 0], [100, 0, 0, 0]] }  // PosY
                ]
            }
        };

        timeline.update(mockState, false, 0);

        const svg = document.querySelector('svg');
        const paths = svg?.querySelectorAll('path');
        
        // Each path should have a different Y coordinate in its "M" command
        const d1 = paths![0].getAttribute('d')!;
        const d2 = paths![1].getAttribute('d')!;
        
        // Path format: "M x% y% L x% y%"
        const getY = (d: string) => d.split('%')[1].trim(); 
        expect(getY(d1)).not.toBe(getY(d2));
    });

    test("should highlight selected keyframe dot", () => {
        const mockState = {
            current_frame: 0,
            max_frame: 100,
            anim: {
                parts: [{ ints: [0, 4, 0, 0, 0], off: 0, moves: [[0, 0, 0, 0]] }]
            }
        };

        // Select the keyframe
        timeline.setSelectedKeyframe({ partIdx: 0, modifType: 4, moveIdx: 0 });
        timeline.update(mockState, false, 0);

        const dot = document.querySelector('.timeline-kf-dot') as HTMLElement;
        expect(dot.style.width).toBe('10px'); // Larger for selected
        expect(dot.style.border).toContain('white');
    });
});

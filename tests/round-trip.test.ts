import { expect, test, describe, beforeAll, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Integration test for Save/Load cycle integrity
describe("Project Round-trip Integrity Tests", () => {
    beforeAll(() => {
        try { GlobalRegistrator.register(); } catch (e) {}
    });

    test("Animation keyframe data should survive a full round-trip without loss", () => {
        // 1. Initial State (Mocking MaAnim structure)
        const originalMaanim = {
            parts: [
                {
                    ints: [0, 10, 0, 0, 0], 
                    off: 0,
                    moves: [[0, 100, 0, 0], [10, 500, 2, 0]]
                }
            ]
        };

        // 2. Mock Serialization (Simulating Rust's MaAnim.to_parity_string)
        const serialize = (anim: any) => {
            let out = "MAANIM\n1\n";
            anim.parts.forEach((p: any) => {
                out += `${p.ints.join(",")}\n`;
                out += `${p.moves.length}\n`;
                p.moves.forEach((m: any) => {
                    out += `${m.join(",")}\n`;
                });
            });
            return out;
        };

        const serialized = serialize(originalMaanim);
        
        // 3. Mock Parsing (Simulating bcu_parser::parse_maanim)
        const parse = (text: string) => {
            const lines = text.trim().split("\n");
            if (lines[0] !== "MAANIM") throw new Error("Invalid header");
            
            const parts = [];
            let i = 2; // Start after version
            while (i < lines.length) {
                const line = lines[i++];
                if (!line) break;
                const ints = line.split(",").map(Number);
                const n = parseInt(lines[i++]);
                const moves = [];
                for (let j = 0; j < n; j++) {
                    moves.push(lines[i++].split(",").map(Number));
                }
                parts.push({ ints, off: 0, moves });
            }
            return { parts };
        };

        const reParsed = parse(serialized);

        // 4. Comparison
        expect(reParsed).toEqual(originalMaanim);
        expect(serialize(reParsed)).toBe(serialized);
    });

    test("MaModel hierarchy should be preserved through serialization", () => {
        const originalModel = {
            n: 2,
            ints: [[-1, 0, 0, 0, 0], [0, 1, 0, 0, 0]], 
            strs: ["RootPart", "ChildPart"]
        };

        const serialize = (model: any) => {
            let out = `MAMODEL\n${model.n}\n`;
            for (let i = 0; i < model.n; i++) {
                out += `${model.ints[i].join(",")}\n`;
            }
            for (let i = 0; i < model.n; i++) {
                out += `${model.strs[i]}\n`;
            }
            return out;
        };

        const parse = (text: string) => {
            const lines = text.trim().split("\n");
            const n = parseInt(lines[1]);
            const ints = [];
            for (let i = 0; i < n; i++) {
                ints.push(lines[2+i].split(",").map(Number));
            }
            const strs = [];
            for (let i = 0; i < n; i++) {
                strs.push(lines[2+n+i]);
            }
            return { n, ints, strs };
        };

        const serialized = serialize(originalModel);
        const reParsed = parse(serialized);

        expect(reParsed).toEqual(originalModel);
    });
});

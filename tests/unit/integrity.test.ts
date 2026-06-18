import { expect, test, describe } from "bun:test";
import { PropertyValidator } from "../../src/editor/integrity";
import { AnimProp, InterpolationType } from "../../src/editor/constants";

describe("PropertyValidator Guard Rails Tests", () => {
    
    test("should clamp PosX/Y within safety bounds", () => {
        expect(PropertyValidator.clamp(AnimProp.PosX, -30000).value).toBe(-20000);
        expect(PropertyValidator.clamp(AnimProp.PosY, 25000).value).toBe(20000);
        expect(PropertyValidator.clamp(AnimProp.PosX, 500).value).toBe(500);
    });

    test("should clamp ScaleX/Y and ScaleXY", () => {
        expect(PropertyValidator.clamp(AnimProp.ScaleX, -10).value).toBe(1);
        expect(PropertyValidator.clamp(AnimProp.ScaleY, 60000).value).toBe(50000);
        expect(PropertyValidator.clamp(AnimProp.ScaleXY, 1000).value).toBe(1000);
    });

    test("should clamp Opacity between 0 and 1000", () => {
        expect(PropertyValidator.clamp(AnimProp.Opacity, -1).value).toBe(0);
        expect(PropertyValidator.clamp(AnimProp.Opacity, 1500).value).toBe(1000);
        expect(PropertyValidator.clamp(AnimProp.Opacity, 500).value).toBe(500);
    });

    test("should clamp Rotation", () => {
        expect(PropertyValidator.clamp(AnimProp.Rotation, -40000).value).toBe(-36000);
        expect(PropertyValidator.clamp(AnimProp.Rotation, 40000).value).toBe(36000);
    });

    test("should force Step interpolation for Parent, UnitID, Sprite, and Flips", () => {
        // Step only fields
        expect(PropertyValidator.validateInterpolation(AnimProp.Parent, InterpolationType.Linear)).toBe(InterpolationType.Step);
        expect(PropertyValidator.validateInterpolation(AnimProp.Image, InterpolationType.Easing)).toBe(InterpolationType.Step);
        expect(PropertyValidator.validateInterpolation(AnimProp.HFlip, InterpolationType.Sinusoidal)).toBe(InterpolationType.Step);

        // Animatable fields
        expect(PropertyValidator.validateInterpolation(AnimProp.PosX, InterpolationType.Linear)).toBe(InterpolationType.Linear);
        expect(PropertyValidator.validateInterpolation(AnimProp.Opacity, InterpolationType.Easing)).toBe(InterpolationType.Easing);
    });

    test("should detect circular parent references", () => {
        const parts = [
            { index: 0, raw_args: [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, // Parent index at raw_args[0]
            { index: 1, raw_args: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },  // 1 -> 0
            { index: 2, raw_args: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }   // 2 -> 1
        ];

        // Valid: 0 as root
        expect(PropertyValidator.wouldCreateCycle(0, -1, parts)).toBe(false);
        // Valid: 2 as child of 0
        expect(PropertyValidator.wouldCreateCycle(2, 0, parts)).toBe(false);

        // Invalid: 0 as child of 2 (0 -> 2 -> 1 -> 0)
        expect(PropertyValidator.wouldCreateCycle(0, 2, parts)).toBe(true);
        // Invalid: Self-parenting
        expect(PropertyValidator.wouldCreateCycle(1, 1, parts)).toBe(true);
    });
});

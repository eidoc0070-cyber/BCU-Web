import { AnimProp, InterpolationType } from './constants';
import { eventBus } from './event-bus';

export interface ValidationResult {
    value: number;
    corrected: boolean;
    message?: string;
}

export class PropertyValidator {
    /**
     * Clamps a property value based on BCU safety bounds.
     * Some properties are additive (Pos, Rotation), others multiplicative (Scale, Opacity).
     */
    public static clamp(field: AnimProp, value: number): ValidationResult {
        let corrected = false;
        let message: string | undefined;
        let newValue = value;

        switch (field) {
            case AnimProp.PosX:
            case AnimProp.PosY:
            case AnimProp.PivotX:
            case AnimProp.PivotY:
                // Additive: -20,000 to 20,000 safety range
                if (value < -20000) { newValue = -20000; corrected = true; }
                if (value > 20000) { newValue = 20000; corrected = true; }
                if (corrected) message = `${AnimProp[field]} limited to +/- 20,000`;
                break;

            case AnimProp.ScaleXY:
            case AnimProp.ScaleX:
            case AnimProp.ScaleY:
                // Multiplicative: 1 to 50,000 (0.1% to 5000%)
                // We clamp to 1 minimum to prevent parts from disappearing or causing math errors
                if (value < 1) { newValue = 1; corrected = true; }
                if (value > 50000) { newValue = 50000; corrected = true; }
                if (corrected) message = `${AnimProp[field]} limited to 0.1% - 5000%`;
                break;

            case AnimProp.Rotation:
                // Additive: normalize to -36,000 to 36,000 (though usually -3600 to 3600 is enough)
                if (value < -36000) { newValue = -36000; corrected = true; }
                if (value > 36000) { newValue = 36000; corrected = true; }
                if (corrected) message = "Rotation limited to +/- 3,600 degrees";
                break;

            case AnimProp.Opacity:
                // Multiplicative: 0 to 1,000
                if (value < 0) { newValue = 0; corrected = true; }
                if (value > 1000) { newValue = 1000; corrected = true; }
                if (corrected) message = "Opacity limited to 0 - 100%";
                break;

            case AnimProp.ZOrder:
                if (value < -1000) { newValue = -1000; corrected = true; }
                if (value > 1000) { newValue = 1000; corrected = true; }
                break;
        }

        return { value: newValue, corrected, message };
    }

    /**
     * Forces interpolation type to Step (1) for properties that don't support interpolation.
     */
    public static validateInterpolation(field: AnimProp, interp: InterpolationType): InterpolationType {
        const stepOnlyFields = [
            AnimProp.Parent,
            AnimProp.UnitID,
            AnimProp.Image,
            AnimProp.HFlip,
            AnimProp.VFlip
        ];

        if (stepOnlyFields.includes(field) && interp !== InterpolationType.Step) {
            eventBus.emit('SHOW_TOAST', { 
                message: `${AnimProp[field]} only supports Step interpolation`, 
                type: 'warning' 
            });
            return InterpolationType.Step;
        }
        return interp;
    }

    /**
     * Detects if setting a parent would create a cycle in the hierarchy.
     */
    public static wouldCreateCycle(partIdx: number, targetParentIdx: number, allParts: any[]): boolean {
        if (targetParentIdx === -1) return false;
        if (partIdx === targetParentIdx) return true;

        let current = targetParentIdx;
        const visited = new Set<number>([partIdx]);

        while (current !== -1) {
            if (visited.has(current)) return true;
            visited.add(current);
            const parentPart = allParts.find(p => p.index === current);
            if (!parentPart) break;
            current = parentPart.raw_args[AnimProp.Parent];
        }

        return false;
    }
}

export class IntegrityChecker {
    public static logReport(state: any) {
        console.log("=== BCU Integrity Report ===");
        if (!state) {
            console.warn("No state found.");
            return;
        }
        console.log(`Current Frame: ${state.animation.current_frame}`);
        console.log(`Parts Count: ${state.animation.parts.length}`);
        console.log("============================");
    }
}


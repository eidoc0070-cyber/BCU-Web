/**
 * Animation Property Indices (BCU Specification)
 */
export enum AnimProp {
    Parent = 0,
    ZOrder = 1,
    Image = 2,
    Opacity = 11,
    PosX = 4,
    PosY = 5,
    PivotX = 6,
    PivotY = 7,
    ScaleX = 8,
    ScaleY = 9,
    Angle = 10,
    // Add others if needed (e.g., Glow/Blend Mode = 3)
    Glow = 3,
}

/**
 * Keyframe Interpolation Types
 */
export enum InterpolationType {
    Linear = 0,
    Step = 1,
    Easing = 2,
    Lagrange = 3,
    Sinusoidal = 4,
}

export const ANIM_PROP_NAMES: Record<AnimProp, string> = {
    [AnimProp.Parent]: "Parent",
    [AnimProp.ZOrder]: "Z-Order",
    [AnimProp.Image]: "Image",
    [AnimProp.PosX]: "Pos X",
    [AnimProp.PosY]: "Pos Y",
    [AnimProp.PivotX]: "Pivot X",
    [AnimProp.PivotY]: "Pivot Y",
    [AnimProp.ScaleX]: "Scale X",
    [AnimProp.ScaleY]: "Scale Y",
    [AnimProp.Angle]: "Angle",
    [AnimProp.Opacity]: "Opacity",
    [AnimProp.Glow]: "Glow",
};

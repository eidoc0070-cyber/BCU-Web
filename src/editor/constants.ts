/**
 * Animation Property Indices (BCU Specification - Section 5)
 */
export enum AnimProp {
    Parent = 0,
    UnitID = 1,
    Image = 2,
    ZOrder = 3,
    PosX = 4,
    PosY = 5,
    PivotX = 6,
    PivotY = 7,
    ScaleXY = 8,
    ScaleX = 9,
    ScaleY = 10,
    Rotation = 11,
    Opacity = 12,
    HFlip = 13,
    VFlip = 14,
    ExtendX_Slow = 50,
    ExtendX_Curse = 51,
    ExtendY = 52,
    ScaleMult = 53,
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

export const ANIM_PROP_NAMES: Record<number, string> = {
    [AnimProp.Parent]: "Parent",
    [AnimProp.UnitID]: "Unit ID",
    [AnimProp.Image]: "Image",
    [AnimProp.ZOrder]: "Z-Order",
    [AnimProp.PosX]: "Pos X",
    [AnimProp.PosY]: "Pos Y",
    [AnimProp.PivotX]: "Pivot X",
    [AnimProp.PivotY]: "Pivot Y",
    [AnimProp.ScaleXY]: "Scale XY",
    [AnimProp.ScaleX]: "Scale X",
    [AnimProp.ScaleY]: "Scale Y",
    [AnimProp.Rotation]: "Rotation",
    [AnimProp.Opacity]: "Opacity",
    [AnimProp.HFlip]: "H-Flip",
    [AnimProp.VFlip]: "V-Flip",
    [AnimProp.ExtendX_Slow]: "Extend X (Slow)",
    [AnimProp.ExtendX_Curse]: "Extend X (Curse)",
    [AnimProp.ExtendY]: "Extend Y",
    [AnimProp.ScaleMult]: "Scale Mult",
};

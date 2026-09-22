export const FORMAT_ID = 'marionette';

// values of the `marionette_type` Group property
export const ROLE_NONE = 'none';
export const ROLE_LIMB = 'limb';
export const ROLE_SEGMENT = 'segment';

// maps ArmatureBone local +Y (mesh direction) onto segment group local +Z (segment extend direction, see docs/DESIGN.md §1); +90 about X maps (0,1,0) -> (0,0,1)
export const BONE_ROTATION = [90, 0, 0];

export const DEFAULT_BONE_LENGTH = 8;

export const DEFAULT_BONE_WIDTH = 2;

// segment lengths are authored in blocks
export const UNITS_PER_BLOCK = 16;

// stamped into exported files and the sidecar so a diff shows what produced them
export const PLUGIN_VERSION = '0.3.0';

export const TARGET_FABRIK = 'fabrik';
export const TARGET_PRIME = 'prime';

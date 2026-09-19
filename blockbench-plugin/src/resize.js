// makes the Resize tool work in segment space instead of bone space.
// ArmatureBone.resize writes length at axis_number==1 and width otherwise since a bone's mesh runs along its own local +Y, but a marionette bone's fixed [90,0,0] rotation points that +Y along the segment's local +Z, so blockbench has segment-Z resize changing bone width and segment-Y changing length, both wrong by one axis
// remapped only while the bone is selected alongside something else, i.e. working in segment space: segment/limb selected -> bone is one of several selected, Z resizes length and X/Y are left alone,
// bone clicked alone -> no remap, gizmo is bone-oriented, Y handle points down the bone and Y is length already, matches the Element panel
// could be a little confusing if you pay attention to the axis colors but overall its more intuitive
// PATCH: no behavior flag exists for "reinterpret an axis" so this is unavoidable, confined to these two methods, no-ops off segment bones in this format, onunload restores both originals by identity

import { isMarionetteFormat, isSegment } from './roles.js';

// segment's local +Z, the direction its bone runs
const SEGMENT_LENGTH_AXIS = 2;

// Outliner.selected.length > 1 is the test: selecting a segment group (or limb) marks every descendant selected, so a bone is alone in that list only when clicked directly
// kinda fucky but it works
function remapsAxes(bone) {
	if (!isMarionetteFormat()) return false;
	if (!isSegment(bone.parent)) return false;
	if (typeof Outliner === 'undefined' || !Outliner.selected) return false;
	return Outliner.selected.length > 1;
}

export function installResizeRemap() {
	const originalResize = ArmatureBone.prototype.resize;
	const originalSize = ArmatureBone.prototype.size;

	// reports dimensions in segment space, [width, width, length] instead of [width, length, width]
	ArmatureBone.prototype.size = function (axis) {
		if (!remapsAxes(this)) return originalSize.call(this, axis);
		if (typeof axis === 'number') {
			return axis === SEGMENT_LENGTH_AXIS ? this.length : this.width;
		}
		return [this.width, this.width, this.length];
	};

	ArmatureBone.prototype.resize = function (move_value, axis_number, invert, ...rest) {
		if (!remapsAxes(this)) {
			return originalResize.call(this, move_value, axis_number, invert, ...rest);
		}

		// segment's X and Y are across the bone, width is purely visual, growing it while resizing geometry confusing so this removes it
		if (axis_number !== SEGMENT_LENGTH_AXIS) return;

		const old_size = this.temp_data.old_size;
		const previous = Array.isArray(old_size)
			? old_size[SEGMENT_LENGTH_AXIS]
			: (old_size ?? this.length);

		this.length = typeof move_value === 'function'
			? move_value(previous)
			: previous + move_value * (invert ? -1 : 1);

		if (this.preview_controller) this.preview_controller.updateTransform(this);
	};

	return () => {
		ArmatureBone.prototype.resize = originalResize;
		ArmatureBone.prototype.size = originalSize;
	};
}

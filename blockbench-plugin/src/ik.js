// blockbench has its own IK on null objects, driven by keyframes in animate mode: ik_target names the
// tip bone, ik_source the chain root, ik_pole an elbow hint, lock_ik_target_rotation holds the tip's
// rotation while the chain moves. none of it reaches a marionette export (displayIK returns early unless
// the null object has keyframes) and ik_pole does the same job as a prime target, so side by side the two
// read as one feature when they are not. the inputs are hidden while this format is active.
//
// stored values are deliberately left alone. Property.condition gates merge/copy/reset as well as the
// element panel, so hiding through the data path would silently drop a converted project's IK setup the
// next time it loaded. only the panel call passes no instance, which is what separates the two.

import { isMarionetteFormat } from './roles.js';

const STOCK_IK_PROPERTIES = ['ik_target', 'ik_source', 'ik_pole', 'lock_ik_target_rotation'];

export function hiddenInPanel(original) {
	return instance => Condition(original, instance) && (!!instance || !isMarionetteFormat());
}

export function installIkFieldHiding() {
	const patched = [];

	for (const name of STOCK_IK_PROPERTIES) {
		const properties = typeof NullObject !== 'undefined' && NullObject.properties;
		const property = properties && properties[name];

		// stock property, so a rename upstream is a real possibility, warn instead of throwing: an extra
		// field in the panel is a far smaller problem than the plugin failing to install
		if (!property) {
			console.warn(`[Marionette] NullObject.${name} is missing; leaving that IK field visible.`);
			continue;
		}

		const original = property.condition;
		property.condition = hiddenInPanel(original);
		patched.push({ property, original });
	}

	return () => {
		for (const { property, original } of patched) property.condition = original;
	};
}

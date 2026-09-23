// built against blockbench v5.1.6, see
// everything installed here returns a teardown, onunload runs them in reverse, no global left patched

import { FORMAT_ID, PLUGIN_VERSION } from './constants.js';
import { installFormat } from './format.js';
import { installNormalizePass } from './invariants.js';
import { installMarker } from './marker.js';
import { installActions } from './actions.js';
import { installScaleHook } from './scaling.js';
import { installResizeRemap } from './resize.js';
import { installSelectionFix } from './selection.js';
import { installExport } from './export.js';
import { installSimulation } from './simulate_actions.js';
import { installNesting } from './nesting.js';
import { installIkFieldHiding } from './ik.js';

(function () {
	let teardowns = [];

	function reportWarnings(messages) {
		console.warn('[Marionette]', messages.join(' '));
		Blockbench.showMessageBox({
			title: 'Marionette',
			icon: 'warning',
			message: messages.join('\n\n'),
		});
	}

	BBPlugin.register('marionette', {
		title: 'Marionette',
		author: 'JellyCarbonara',
		description:
			'Authoring format for the Marionette procedural animation library: ' +
			'segment and limb rigging with visual length handles, and a Java exporter ' +
			'that does the pose-zeroing and origin-centering by hand no longer required.',
		icon: 'polyline',
		version: PLUGIN_VERSION,
		variant: 'both',
		tags: ['Minecraft: Java Edition', 'Rigging', 'Animation'],

		onload() {
			// each step isolated so a throw in one doesn't screw up whats after
			const step = (label, install) => {
				try {
					const teardown = install();
					if (typeof teardown === 'function') teardowns.push(teardown);
					return true;
				} catch (err) {
					console.error(`[Marionette] failed to install ${label}:`, err);
					Blockbench.showMessageBox({
						title: 'Marionette',
						icon: 'error',
						message:
							`Marionette failed to install its ${label}.\n\n${err && err.message}\n\n` +
							`The rest of the plugin is still loaded. Please report this with the ` +
							`full error from the developer console (Help > Developer > Toggle DevTools).`,
					});
					return false;
				}
			};

			step('model format', () => installFormat().teardown);
			step('export origin marker', installMarker);
			step('invariant pass', () => installNormalizePass(reportWarnings));
			step('actions', installActions);
			step('scale hook', installScaleHook);
			step('resize remap', installResizeRemap);
			step('selection repair', installSelectionFix);
			step('Java exporter', installExport);
			step('simulation mode', installSimulation);
			step('nesting prompt', installNesting);
			step('Blockbench IK field hiding', installIkFieldHiding);

			console.log('[Marionette] loaded; format registered as', FORMAT_ID);
		},

		onunload() {
			for (const teardown of teardowns.reverse()) {
				try {
					teardown();
				} catch (err) {
					console.error('[Marionette] teardown step failed:', err);
				}
			}
			teardowns = [];
		},
	});
})();

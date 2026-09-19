// three java files plus a json sidecar for potential runtime construction for Marionette java version indifference
// overwritten unconditionally each export, same deal as blockbench's java export
import { PLUGIN_VERSION } from './constants.js';
import { isMarionetteFormat } from './roles.js';
import { collectRig, javaIdentifier } from './rig.js';
import { emitModel, emitEntity, emitRenderer, emitSidecar } from './java.js';

const BASE_CLASSES = {
	'PathfinderMob': 'PathfinderMob',
	'Mob': 'Mob',
	'Monster': 'monster.Monster',
	'Animal': 'animal.Animal',
	'WaterAnimal': 'animal.WaterAnimal',
	'Phantom': 'monster.Phantom',
};

export function snakeCase(name) {
	return String(name)
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[^A-Za-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.toLowerCase();
}

export function buildNames(form, generator) {
	const className = javaIdentifier(form.class_name || 'Marionette', 'Rig');
	const snake = snakeCase(className);

	return {
		className,
		package: (form.package || 'com.example.mod.entity').trim(),
		modid: (form.modid || 'examplemod').trim(),
		baseClass: form.base_class || 'PathfinderMob',
		baseClassImport: BASE_CLASSES[form.base_class] || 'PathfinderMob',
		textureName: snake,
		layerName: `${snake}_layer`,
		layerConstant: `${snake.toUpperCase()}_LAYER`,
		screamingName: snake.toUpperCase(),
		generator,
	};
}

export function buildFiles(rig, names) {
	return [
		{ name: `${names.className}Model.java`, content: emitModel(rig, names) },
		{ name: `${names.className}Entity.java`, content: emitEntity(rig, names) },
		{ name: `${names.className}Renderer.java`, content: emitRenderer(rig, names) },
		{ name: `${snakeCase(names.className)}.marionette.json`, content: emitSidecar(rig, names) },
	];
}

function reportWarnings(warnings) {
	if (!warnings.length) return;
	Blockbench.showMessageBox({
		title: 'Marionette export',
		icon: 'warning',
		message: warnings.join('\n\n'),
	});
}

// on web, pickDirectory/writeFile are no-ops (bail on !isApp), so each file goes through Blockbench.export as its own download instead
function writeFiles(files, names) {
	const isDesktop = typeof Blockbench.pickDirectory === 'function' && Blockbench.isApp;

	if (isDesktop) {
		const directory = Blockbench.pickDirectory({
			resource_id: 'marionette_java_export',
			title: 'Export Marionette Java to...',
		});
		if (!directory) return false;

		for (const file of files) {
			Blockbench.writeFile(`${directory}${PathModule.sep}${file.name}`, {
				content: file.content,
				savetype: 'text',
			});
		}

		Blockbench.showQuickMessage(`Exported ${files.length} files to ${directory}`, 3000);
		return true;
	}

	for (const file of files) {
		Blockbench.export({
			type: file.name.endsWith('.json') ? 'JSON' : 'Java Source',
			extensions: [file.name.split('.').pop()],
			name: file.name,
			content: file.content,
			savetype: 'text',
			resource_id: 'marionette_java_export',
		});
	}
	return true;
}

export function runExport(form) {
	const rig = collectRig();
	reportWarnings(rig.warnings);
	if (!rig.segments.length) return false;

	const names = buildNames(form, `Marionette Blockbench plugin ${PLUGIN_VERSION}`);
	return writeFiles(buildFiles(rig, names), names);
}

export function buildExportAction() {
	return new Action('marionette_export_java', {
		name: 'Export Marionette Java',
		description: 'Write the model, entity and renderer classes plus a JSON sidecar',
		icon: 'code',
		category: 'file',
		condition: () => isMarionetteFormat(),
		click() {
			const dialog = new Dialog({
				id: 'marionette_export',
				title: 'Export Marionette Java',
				form: {
					class_name: {
						label: 'Class name',
						type: 'text',
						value: javaIdentifier(Project.name || 'Marionette', 'Rig'),
						description: 'Produces <Name>Model, <Name>Entity and <Name>Renderer',
					},
					package: {
						label: 'Package',
						type: 'text',
						value: 'com.example.mod.entity',
					},
					modid: {
						label: 'Mod id',
						type: 'text',
						value: 'examplemod',
						description: 'Used for the texture and model layer ResourceLocations',
					},
					base_class: {
						label: 'Entity base class',
						type: 'select',
						default: 'PathfinderMob',
						options: Object.fromEntries(Object.keys(BASE_CLASSES).map(k => [k, k])),
					},
					overwrite_warning: {
						type: 'info',
						text: 'All four files are overwritten without asking. Keep hand edits elsewhere.',
					},
				},
				onConfirm(form) {
					// close first, pickDirectory opens a native modal, stacking it here leaves dialog wedged if user cancels
					dialog.hide();
					try {
						runExport(form);
					} catch (err) {
						console.error('[Marionette] export failed:', err);
						Blockbench.showMessageBox({
							title: 'Marionette export',
							icon: 'error',
							message: `Export failed.\n\n${err && err.message}`,
						});
					}
				},
			});
			dialog.show();
		},
	});
}

export function installExport() {
	const action = buildExportAction();
	MenuBar.addAction(action, 'file.export');
	MenuBar.addAction(action, 'tools');

	return () => {
		MenuBar.removeAction(`file.export.${action.id}`);
		MenuBar.removeAction(`tools.${action.id}`);
		action.delete();
	};
}

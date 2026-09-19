// ring at each segment bone's centre marks the segment's export origin, the point every exported cube offset is measured from.
import { isBone, isSegment, isMarionetteFormat } from './roles.js';

const MARKER_NAME = 'marionette_export_origin';
const MARKER_COLOR = 0x4d9bff;

let geometry = null;
let material = null;

function ensureAssets() {
	if (!geometry) {
		geometry = new THREE.TorusGeometry(1.6, 0.22, 6, 16);
		// torus lies in XY by default, stand it up so the ring encircles the bone which runs along +Y here
		geometry.rotateX(Math.PI / 2);
	}
	if (!material) {
		material = new THREE.MeshBasicMaterial({
			color: MARKER_COLOR,
			depthTest: false,
			depthWrite: false,
			transparent: true,
			opacity: 0.9,
		});
	}
}

function findMarker(sceneObject) {
	return sceneObject.children.find(child => child.name === MARKER_NAME) || null;
}

export function syncMarker(bone) {
	const sceneObject = bone && bone.scene_object;
	if (!sceneObject) return;

	const wanted = isMarionetteFormat() && isSegment(bone.parent);
	let marker = findMarker(sceneObject);

	if (!wanted) {
		if (marker) sceneObject.remove(marker);
		return;
	}

	if (!marker) {
		ensureAssets();
		marker = new THREE.Mesh(geometry, material);
		marker.name = MARKER_NAME;
		// excluded from exports and screenshots the same way bone meshes are
		marker.no_export = true;
		marker.renderOrder = 21;
		sceneObject.add(marker);
	}

	marker.position.set(0, bone.length / 2, 0);
	// marker is a sibling of the bone mesh, not a child so the mesh's scale doesn't apply -> no counterscale is needed
	marker.visible = bone.visibility !== false;
}

function pinBoneToJoint(bone) {
	if (!isSegment(bone.parent)) return;

	const sceneObject = bone.scene_object;
	if (!sceneObject) return;

	const { position } = sceneObject;
	if (position.x !== 0 || position.y !== 0 || position.z !== 0) {
		position.set(0, 0, 0);
		sceneObject.updateMatrixWorld();
	}
}

export function syncAllMarkers() {
	if (typeof ArmatureBone === 'undefined' || !ArmatureBone.all) return;
	for (const bone of ArmatureBone.all) syncMarker(bone);
}

export function installMarker() {
	const controller = ArmatureBone.preview_controller;

	const onTransform = controller.on('update_transform', ({ element }) => {
		if (!isBone(element)) return;
		pinBoneToJoint(element);
		syncMarker(element);
	});
	const onSetup = controller.on('setup', ({ element }) => {
		if (isBone(element)) syncMarker(element);
	});

	// format switches and project loads change whether markers apply at all
	const onProject = Blockbench.on('select_project', () => syncAllMarkers());
	const onFormat = Blockbench.on('convert_format', () => syncAllMarkers());

	syncAllMarkers();

	return () => {
		onTransform.delete();
		onSetup.delete();
		onProject.delete();
		onFormat.delete();

		// strip every marker added, then release shared assets
		if (typeof ArmatureBone !== 'undefined' && ArmatureBone.all) {
			for (const bone of ArmatureBone.all) {
				const sceneObject = bone.scene_object;
				if (!sceneObject) continue;
				const marker = findMarker(sceneObject);
				if (marker) sceneObject.remove(marker);
			}
		}
		if (geometry) { geometry.dispose(); geometry = null; }
		if (material) { material.dispose(); material = null; }
	};
}

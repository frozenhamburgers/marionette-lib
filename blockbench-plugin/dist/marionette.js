// Marionette plugin for Blockbench -- built from src/, do not edit dist/ by hand.
(() => {
  // src/constants.js
  var FORMAT_ID = "marionette";
  var ROLE_NONE = "none";
  var ROLE_LIMB = "limb";
  var ROLE_SEGMENT = "segment";
  var BONE_ROTATION = [90, 0, 0];
  var DEFAULT_BONE_LENGTH = 8;
  var DEFAULT_BONE_WIDTH = 2;
  var UNITS_PER_BLOCK = 16;
  var PLUGIN_VERSION = "1.0.0";
  var TARGET_FABRIK = "fabrik";
  var TARGET_PRIME = "prime";

  // src/geometry.js
  var DEG = Math.PI / 180;
  function matrixZYX(rotation) {
    const [rx, ry, rz] = rotation.map((d2) => d2 * DEG);
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);
    return [
      [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
      [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
      [-sy, cy * sx, cy * cx]
    ];
  }
  function applyMatrix(m, v) {
    return [
      m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
      m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
      m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
    ];
  }
  function isUnrotated(rotation) {
    return !rotation || rotation[0] === 0 && rotation[1] === 0 && rotation[2] === 0;
  }
  function cubeCorners(cube) {
    const inflate = cube.inflate || 0;
    const lo = [cube.from[0] - inflate, cube.from[1] - inflate, cube.from[2] - inflate];
    const hi = [cube.to[0] + inflate, cube.to[1] + inflate, cube.to[2] + inflate];
    const corners = [];
    for (const x of [lo[0], hi[0]]) {
      for (const y of [lo[1], hi[1]]) {
        for (const z of [lo[2], hi[2]]) {
          corners.push([x, y, z]);
        }
      }
    }
    if (isUnrotated(cube.rotation)) return corners;
    const m = matrixZYX(cube.rotation);
    const o = cube.origin || [0, 0, 0];
    return corners.map((c) => {
      const local = [c[0] - o[0], c[1] - o[1], c[2] - o[2]];
      const r = applyMatrix(m, local);
      return [r[0] + o[0], r[1] + o[1], r[2] + o[2]];
    });
  }
  function meshVertexPoints(mesh) {
    const o = mesh.origin || [0, 0, 0];
    const rotated = !isUnrotated(mesh.rotation);
    const m = rotated ? matrixZYX(mesh.rotation) : null;
    return Object.keys(mesh.vertices).map((key) => {
      const v = mesh.vertices[key];
      const p = rotated ? applyMatrix(m, v) : v;
      return [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
    });
  }
  function boundsOfPoints(points) {
    if (!points.length) return null;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const p of points) {
      for (let i = 0; i < 3; i++) {
        if (p[i] < min[i]) min[i] = p[i];
        if (p[i] > max[i]) max[i] = p[i];
      }
    }
    return {
      min,
      max,
      center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
      size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
    };
  }
  function exportOrigin(groupOrigin, boneLength) {
    return [groupOrigin[0], groupOrigin[1], groupOrigin[2] + boneLength / 2];
  }
  function boneTip(groupOrigin, boneLength) {
    return [groupOrigin[0], groupOrigin[1], groupOrigin[2] + boneLength];
  }
  function distanceSquared(a, b) {
    const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    return dx * dx + dy * dy + dz * dz;
  }
  function fitBoneToBounds(bounds) {
    return {
      origin: [bounds.center[0], bounds.center[1], bounds.min[2]],
      length: bounds.size[2]
    };
  }
  function multiplyMatrix(a, b) {
    const out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out[r][c] = a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c];
      }
    }
    return out;
  }
  function chainDirectionZ(rotations) {
    let m = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (const rotation of rotations) {
      if (isUnrotated(rotation)) continue;
      m = multiplyMatrix(m, matrixZYX(rotation));
    }
    return applyMatrix(m, [0, 0, 1]);
  }
  function lengthScaleFactor(direction, scale2) {
    const length = Math.hypot(direction[0], direction[1], direction[2]);
    if (!length) return 1;
    return Math.hypot(
      direction[0] * scale2[0],
      direction[1] * scale2[1],
      direction[2] * scale2[2]
    ) / length;
  }
  function isAxisAligned(direction, epsilon = 1e-6) {
    let off = 0;
    for (const component of direction) if (Math.abs(component) > epsilon) off++;
    return off <= 1;
  }
  function quaternionFromMatrix(m) {
    const trace = m[0][0] + m[1][1] + m[2][2];
    if (trace > 0) {
      const s2 = 0.5 / Math.sqrt(trace + 1);
      return [(m[2][1] - m[1][2]) * s2, (m[0][2] - m[2][0]) * s2, (m[1][0] - m[0][1]) * s2, 0.25 / s2];
    }
    if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
      const s2 = 2 * Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]);
      return [0.25 * s2, (m[0][1] + m[1][0]) / s2, (m[0][2] + m[2][0]) / s2, (m[2][1] - m[1][2]) / s2];
    }
    if (m[1][1] > m[2][2]) {
      const s2 = 2 * Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]);
      return [(m[0][1] + m[1][0]) / s2, 0.25 * s2, (m[1][2] + m[2][1]) / s2, (m[0][2] - m[2][0]) / s2];
    }
    const s = 2 * Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]);
    return [(m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s, (m[1][0] - m[0][1]) / s];
  }
  function quaternionFromRotation(rotation) {
    if (isUnrotated(rotation)) return [0, 0, 0, 1];
    return quaternionFromMatrix(matrixZYX(rotation));
  }
  function quaternionMultiply(a, b) {
    const [ax, ay, az, aw] = a;
    const [bx, by, bz, bw] = b;
    return [
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
      aw * bw - ax * bx - ay * by - az * bz
    ];
  }
  function quaternionConjugate(q) {
    return [-q[0], -q[1], -q[2], q[3]];
  }
  function applyQuaternion(q, v) {
    const [x, y, z, w] = q;
    const tx = 2 * (y * v[2] - z * v[1]);
    const ty = 2 * (z * v[0] - x * v[2]);
    const tz = 2 * (x * v[1] - y * v[0]);
    return [
      v[0] + w * tx + y * tz - z * ty,
      v[1] + w * ty + z * tx - x * tz,
      v[2] + w * tz + x * ty - y * tx
    ];
  }
  function worldDirection(direction) {
    return [-direction[0] + 0, direction[1] + 0, -direction[2] + 0];
  }
  function unitVector(v) {
    const d2 = Math.hypot(v[0], v[1], v[2]);
    if (d2 < 1e-4) return [0, 0, 0];
    return [v[0] / d2, v[1] / d2, v[2] / d2];
  }
  var DEFAULT_UP = [0, 1, 0];
  function crossProduct(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function partFrame(direction, up = DEFAULT_UP) {
    let forward = unitVector(direction);
    if (!forward[0] && !forward[1] && !forward[2]) forward = [0, 1, 0];
    let upward = unitVector(up);
    if (!upward[0] && !upward[1] && !upward[2]) upward = DEFAULT_UP;
    let sideways = crossProduct(upward, forward);
    if (Math.hypot(...sideways) < 1e-5) {
      const fallback = Math.abs(forward[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0];
      sideways = crossProduct(fallback, forward);
    }
    sideways = unitVector(sideways);
    const vertical = crossProduct(forward, sideways);
    return quaternionFromMatrix([
      [sideways[0], vertical[0], forward[0]],
      [sideways[1], vertical[1], forward[1]],
      [sideways[2], vertical[2], forward[2]]
    ]);
  }
  function partToWorld(direction, up, local) {
    return applyQuaternion(partFrame(direction, up), local);
  }
  function worldToPart(direction, up, world) {
    return applyQuaternion(quaternionConjugate(partFrame(direction, up)), world);
  }

  // src/roles.js
  function isMarionetteFormat() {
    return typeof Format !== "undefined" && Format && Format.id === FORMAT_ID;
  }
  function getRole(node) {
    if (!isGroup(node)) return ROLE_NONE;
    return node.marionette_type || ROLE_NONE;
  }
  function isGroup(node) {
    return typeof Group !== "undefined" && node instanceof Group;
  }
  function isSegment(node) {
    return getRole(node) === ROLE_SEGMENT;
  }
  function isLimb(node) {
    return getRole(node) === ROLE_LIMB;
  }
  function followsRootOnly(limb) {
    return isLimb(limb) && !!limb.marionette_follow_root;
  }
  function upVectorOf(limb) {
    const up = isLimb(limb) ? limb.marionette_up : null;
    if (!up || !up[0] && !up[1] && !up[2]) return DEFAULT_UP.slice();
    return [up[0], up[1], up[2]];
  }
  function isBone(node) {
    return typeof ArmatureBone !== "undefined" && node instanceof ArmatureBone;
  }
  function bonesOf(group) {
    if (!group || !group.children) return [];
    return group.children.filter(isBone);
  }
  function boneOf(group) {
    return bonesOf(group)[0] || null;
  }
  function lengthOf(group) {
    const bone = boneOf(group);
    return bone ? bone.length : 0;
  }
  function exportOriginOf(group) {
    return exportOrigin(group.origin, lengthOf(group));
  }
  function tipOf(group) {
    return boneTip(group.origin, lengthOf(group));
  }
  function allGroups() {
    if (typeof Group === "undefined" || !Group.all) return [];
    return Group.all;
  }
  function allLimbs() {
    return allGroups().filter(isLimb);
  }
  function allSegments() {
    return allGroups().filter(isSegment);
  }
  function nearestAncestorWithRole(node, role) {
    let parent = node && node.parent;
    while (parent && parent !== "root") {
      if (getRole(parent) === role) return parent;
      parent = parent.parent;
    }
    return null;
  }
  function limbOf(segment) {
    return nearestAncestorWithRole(segment, ROLE_LIMB);
  }
  function nearestRigAncestor(node) {
    let parent = node && node.parent;
    while (parent && parent !== "root") {
      if (isSegment(parent) || isLimb(parent)) return parent;
      parent = parent.parent;
    }
    return null;
  }
  function parentSegmentOf(limb) {
    const ancestor = nearestRigAncestor(limb);
    return isSegment(ancestor) ? ancestor : null;
  }
  function enclosingLimbOf(limb) {
    return nearestAncestorWithRole(limb, ROLE_LIMB);
  }
  function isMisnestedLimb(limb) {
    return isLimb(limb) && isLimb(nearestRigAncestor(limb));
  }
  function limbsInAttachOrder() {
    const limbs = allLimbs();
    const order = [];
    const placed = /* @__PURE__ */ new Set();
    for (const limb of limbs) place(limb);
    return order;
    function place(limb) {
      if (placed.has(limb)) return;
      placed.add(limb);
      const segment = parentSegmentOf(limb);
      const parent = segment && limbOf(segment);
      if (parent && parent !== limb) place(parent);
      order.push(limb);
    }
  }
  function chainOf(limb) {
    const out = [];
    walk(limb);
    return out;
    function walk(node) {
      if (!node || !node.children) return;
      for (const child of node.children) {
        if (isLimb(child)) continue;
        if (isSegment(child)) out.push(child);
        if (isGroup(child)) walk(child);
      }
    }
  }
  function childSegmentsOf(segment) {
    if (!segment || !segment.children) return [];
    return segment.children.filter(isSegment);
  }
  function segmentAround(node) {
    if (isSegment(node)) return node;
    if (isLimb(node)) return null;
    return isSegment(nearestRigAncestor(node)) ? nearestRigAncestor(node) : null;
  }
  function selectedSegment() {
    if (typeof Group !== "undefined" && Group.first_selected) {
      const segment = segmentAround(Group.first_selected);
      if (segment) return segment;
    }
    if (typeof Outliner !== "undefined" && Outliner.selected && Outliner.selected.length) {
      return segmentAround(Outliner.selected[0]);
    }
    return null;
  }
  function selectedLimb() {
    if (typeof Group !== "undefined" && Group.first_selected) {
      if (isLimb(Group.first_selected)) return Group.first_selected;
      const limb = nearestAncestorWithRole(Group.first_selected, ROLE_LIMB);
      if (limb) return limb;
    }
    if (typeof Outliner !== "undefined" && Outliner.selected && Outliner.selected.length) {
      return nearestAncestorWithRole(Outliner.selected[0], ROLE_LIMB);
    }
    return null;
  }
  function ownGeometryOf(segment) {
    const out = [];
    walk(segment);
    return out;
    function walk(node) {
      if (!node || !node.children) return;
      for (const child of node.children) {
        if (isBone(child)) continue;
        if (isSegment(child)) continue;
        if (isLimb(child)) continue;
        if (isGroup(child)) {
          walk(child);
        } else if (child.export !== false) {
          out.push(child);
        }
      }
    }
  }
  function rotationChainOf(node) {
    const chain = [];
    let current = node;
    while (current && current !== "root") {
      if (isGroup(current)) chain.unshift((current.rotation || [0, 0, 0]).slice());
      current = current.parent;
    }
    return chain;
  }
  function targetTypeOf(node) {
    return node && node.marionette_target || TARGET_FABRIK;
  }

  // src/format.js
  function baseFlags() {
    const source = Formats.modded_entity;
    if (!source) {
      console.warn("[Marionette] Formats.modded_entity is missing; using built-in defaults.");
      return {
        box_uv: true,
        box_uv_float_size: true,
        single_texture: true,
        bone_rig: true,
        centered_grid: true,
        rotate_cubes: true,
        animation_mode: true,
        pbr: true,
        node_name_regex: "\\w"
      };
    }
    return {
      box_uv: source.box_uv,
      box_uv_float_size: source.box_uv_float_size,
      single_texture: source.single_texture,
      bone_rig: source.bone_rig,
      centered_grid: source.centered_grid,
      rotate_cubes: source.rotate_cubes,
      animation_mode: source.animation_mode,
      // animation_mode gates Null Object element used as simulation mode's draggable target
      pbr: source.pbr,
      node_name_regex: source.node_name_regex
    };
  }
  function registerFormat() {
    const format = new ModelFormat(FORMAT_ID, {
      icon: "polyline",
      category: "minecraft",
      target: "Minecraft: Java Edition",
      name: "Marionette Rig",
      description: "Procedurally animated multipart entity for the Marionette library",
      show_on_start_screen: true,
      ...baseFlags()
    });
    Object.defineProperty(format, "integer_size", {
      configurable: true,
      get() {
        const setting = typeof settings !== "undefined" && settings.modded_entity_integer_size;
        return setting ? !!setting.value : false;
      }
    });
    return format;
  }
  function registerRoleProperty() {
    return new Property(Group, "enum", "marionette_type", {
      default: ROLE_NONE,
      values: [ROLE_NONE, ROLE_LIMB, ROLE_SEGMENT],
      condition: { formats: [FORMAT_ID] },
      label: "Marionette role",
      inputs: {
        element_panel: {
          input: {
            label: "Marionette role",
            type: "select",
            options: {
              [ROLE_NONE]: "None",
              [ROLE_LIMB]: "Limb (chain of segments)",
              [ROLE_SEGMENT]: "Segment (pivot is the joint)"
            }
          }
        }
      }
    });
  }
  function registerFollowRootProperty() {
    return new Property(Group, "boolean", "marionette_follow_root", {
      default: false,
      // the element panel replaces input.condition with this one wholesale, so limiting the checkbox to
      // limbs has to happen here rather than on the input. and an `instance` asks whether to keep a
      // stored value on merge/copy/reset, not whether to draw anything, so it answers yes regardless of
      // the selection -- reading the instance's own role there would drop the value of a limb whose
      // marionette_type has not been loaded onto it yet
      condition: (instance) => Format && Format.id === FORMAT_ID && (!!instance || isLimb(Group.first_selected)),
      label: "Follow root only",
      inputs: {
        element_panel: {
          input: {
            label: "Follow root only (chain trails the root)",
            type: "checkbox"
          }
        }
      }
    });
  }
  function registerUpProperty() {
    return new Property(Group, "vector", "marionette_up", {
      default: [0, 1, 0],
      // same trap as the checkbox above: element panel takes this over input.condition, and an instance asks whether to keep a value not whether to draw
      condition: (instance) => Format && Format.id === FORMAT_ID && (!!instance || isLimb(Group.first_selected)),
      label: "Up vector",
      inputs: {
        element_panel: {
          input: {
            label: "Up vector (pins the limb's roll)",
            type: "vector",
            dimensions: 3
          }
        }
      }
    });
  }
  function registerBehaviorOverrides() {
    const overrides = [];
    overrides.push(ArmatureBone.addBehaviorOverride({
      condition: { formats: [FORMAT_ID] },
      priority: 10,
      behavior: {
        // bones never parent other bones, replacing the array (not extending) enforces that
        parent_types: ["group"],
        child_types: []
        // movable/rotatable actually NOT set false here, causes attachment issues for higher level groups
        // + locking isn't needed for correctness since trying to manually rotate the bones will just cause it to snap back to its segment rotation once released
        // probably a more elegant way to do this but i can't be bothered for now
      }
    }));
    return overrides;
  }
  function registerTargetProperty() {
    return new Property(NullObject, "enum", "marionette_target", {
      default: TARGET_FABRIK,
      values: [TARGET_FABRIK, TARGET_PRIME],
      // selecting a group marks every descendant selected too (Group.select), so a limb holding a target
      // would otherwise show this field as if it were the limb's own. an `instance` means the question
      // is whether to keep a stored value on merge/copy/reset, not whether to draw the input, and that
      // answer must never depend on the selection or loading a file would drop the value
      condition: (instance) => Format && Format.id === FORMAT_ID && (!!instance || !Group.first_selected),
      label: "Marionette target",
      inputs: {
        element_panel: {
          input: {
            label: "Marionette target",
            type: "select",
            options: {
              [TARGET_FABRIK]: "FABRIK target (chain reaches for it)",
              [TARGET_PRIME]: "Prime target (biases which way it folds)"
            }
          }
        }
      }
    });
  }
  function installFormat() {
    const format = registerFormat();
    const properties = [
      registerRoleProperty(),
      registerTargetProperty(),
      registerFollowRootProperty(),
      registerUpProperty()
    ];
    const overrides = registerBehaviorOverrides();
    return {
      format,
      teardown() {
        for (const override of overrides) override.delete();
        for (const property of properties) property.delete();
        format.delete();
      }
    };
  }

  // src/bones.js
  var visible = true;
  function bonesVisible() {
    return visible;
  }
  function allBones() {
    return allSegments().flatMap(bonesOf);
  }
  function applyBoneVisibility(bones, value = visible) {
    const changed = [];
    for (const bone of bones) {
      if (bone.visibility === value) continue;
      bone.visibility = value;
      changed.push(bone);
    }
    if (!changed.length) return changed;
    if (typeof Canvas !== "undefined" && Canvas.updateVisibility) Canvas.updateVisibility();
    return changed;
  }
  function buildBoneToggle() {
    return new Toggle("marionette_toggle_bones", {
      name: "Show Marionette Bones",
      description: "Show or hide every segment bone in the viewport; their outliner rows stay put",
      icon: "humerus",
      category: "edit",
      condition: { formats: [FORMAT_ID] },
      default: true,
      onChange(value) {
        visible = value;
        applyBoneVisibility(allBones(), value);
      }
    });
  }
  function placeInOutliner(toggle) {
    const toolbar = typeof Toolbars !== "undefined" && Toolbars.outliner;
    if (!toolbar) {
      console.warn("[Marionette] Toolbars.outliner is unavailable; the bone toggle was not added to the outliner bar. It is still in Tools and in the keybind list.");
      return false;
    }
    const anchor = typeof BarItems !== "undefined" && BarItems.outliner_toggle;
    const index = anchor ? toolbar.children.indexOf(anchor) : -1;
    toolbar.add(toggle, index === -1 ? void 0 : index + 1);
    return true;
  }
  function installBoneVisibility() {
    const toggle = buildBoneToggle();
    const placed = placeInOutliner(toggle);
    const reapply = () => applyBoneVisibility(allBones());
    const onSelect = Blockbench.on("select_project", reapply);
    const onLoad = Blockbench.on("load_project", reapply);
    return () => {
      onSelect.delete();
      onLoad.delete();
      if (placed && Toolbars.outliner) Toolbars.outliner.remove(toggle);
      applyBoneVisibility(allBones(), true);
      toggle.delete();
    };
  }

  // src/invariants.js
  var warned = /* @__PURE__ */ new WeakSet();
  function normalizeSegment(group) {
    const warnings = [];
    let changed = false;
    let created = null;
    let bones = bonesOf(group);
    if (bones.length === 0) {
      created = createBone(group);
      if (!created) {
        warnings.push(`Could not add a bone to segment "${group.name}".`);
        return { changed, created: null, warnings };
      }
      bones = [created];
      changed = true;
    } else if (bones.length > 1 && !warned.has(bones[0])) {
      warned.add(bones[0]);
      warnings.push(
        `Segment "${group.name}" has ${bones.length} bones. Marionette uses the first one ("${bones[0].name}") as the segment length. Delete the others.`
      );
    }
    const bone = bones[0];
    if (bone.origin[0] !== 0 || bone.origin[1] !== 0 || bone.origin[2] !== 0) {
      bone.origin[0] = bone.origin[1] = bone.origin[2] = 0;
      changed = true;
    }
    for (let i = 0; i < 3; i++) {
      if (bone.rotation[i] !== BONE_ROTATION[i]) {
        bone.rotation[i] = BONE_ROTATION[i];
        changed = true;
      }
    }
    if (bone.connected !== false) {
      bone.connected = false;
      changed = true;
    }
    const siblings = group.children;
    const index = siblings.indexOf(bone);
    if (index !== -1 && index !== siblings.length - 1) {
      siblings.splice(index, 1);
      siblings.push(bone);
      changed = true;
    }
    if (changed && bone.preview_controller) {
      bone.preview_controller.updateTransform(bone);
    }
    return { changed, created, warnings };
  }
  function createBone(group) {
    const bone = new ArmatureBone({
      name: `${group.name}_bone`,
      origin: [0, 0, 0],
      rotation: BONE_ROTATION.slice(),
      connected: false,
      length: DEFAULT_BONE_LENGTH,
      width: DEFAULT_BONE_WIDTH
    });
    const added = bone.addTo(group);
    if (added === void 0) return null;
    bone.init();
    if (typeof Format !== "undefined" && Format.bone_rig) bone.createUniqueName();
    bone.visibility = bonesVisible();
    if (group.selected && typeof bone.markAsSelected === "function") bone.markAsSelected();
    return bone;
  }
  function normalizeAll() {
    const created = [];
    const warnings = [];
    let changed = false;
    for (const segment of allSegments()) {
      const result = normalizeSegment(segment);
      if (result.changed) changed = true;
      if (result.created) created.push(result.created);
      warnings.push(...result.warnings);
    }
    return { changed, created, warnings };
  }
  function editTouchesRig(aspects) {
    if (!aspects) return false;
    if (aspects.outliner) return true;
    if (aspects.groups && aspects.groups.length) return true;
    if (aspects.elements && aspects.elements.some((el) => el instanceof ArmatureBone)) return true;
    return false;
  }
  function installNormalizePass(reportWarnings2) {
    let running = false;
    const listener = Blockbench.on("finish_edit", ({ aspects }) => {
      if (!isMarionetteFormat()) return;
      if (running) return;
      if (!editTouchesRig(aspects)) return;
      running = true;
      try {
        const result = normalizeAll();
        if (result.warnings.length) reportWarnings2(result.warnings);
        if (result.changed || result.created.length) {
          Canvas.updateView({
            elements: result.created,
            element_aspects: { transform: true }
          });
        }
      } finally {
        running = false;
      }
    });
    return () => listener.delete();
  }
  function normalizeSegments(segments, reportWarnings2) {
    const warnings = [];
    const created = [];
    for (const segment of segments) {
      if (!isSegment(segment)) continue;
      const result = normalizeSegment(segment);
      if (result.created) created.push(result.created);
      warnings.push(...result.warnings);
    }
    if (warnings.length && reportWarnings2) reportWarnings2(warnings);
    return created;
  }

  // src/marker.js
  var MARKER_NAME = "marionette_export_origin";
  var MARKER_COLOR = 5086207;
  var geometry = null;
  var material = null;
  function ensureAssets() {
    if (!geometry) {
      geometry = new THREE.TorusGeometry(1.6, 0.22, 6, 16);
      geometry.rotateX(Math.PI / 2);
    }
    if (!material) {
      material = new THREE.MeshBasicMaterial({
        color: MARKER_COLOR,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.9
      });
    }
  }
  function findMarker(sceneObject) {
    return sceneObject.children.find((child) => child.name === MARKER_NAME) || null;
  }
  function syncMarker(bone) {
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
      marker.no_export = true;
      marker.renderOrder = 21;
      sceneObject.add(marker);
    }
    marker.position.set(0, bone.length / 2, 0);
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
  function syncAllMarkers() {
    if (typeof ArmatureBone === "undefined" || !ArmatureBone.all) return;
    for (const bone of ArmatureBone.all) syncMarker(bone);
  }
  function installMarker() {
    const controller = ArmatureBone.preview_controller;
    const onTransform = controller.on("update_transform", ({ element }) => {
      if (!isBone(element)) return;
      pinBoneToJoint(element);
      syncMarker(element);
    });
    const onSetup = controller.on("setup", ({ element }) => {
      if (isBone(element)) syncMarker(element);
    });
    const onProject = Blockbench.on("select_project", () => syncAllMarkers());
    const onFormat = Blockbench.on("convert_format", () => syncAllMarkers());
    syncAllMarkers();
    return () => {
      onTransform.delete();
      onSetup.delete();
      onProject.delete();
      onFormat.delete();
      if (typeof ArmatureBone !== "undefined" && ArmatureBone.all) {
        for (const bone of ArmatureBone.all) {
          const sceneObject = bone.scene_object;
          if (!sceneObject) continue;
          const marker = findMarker(sceneObject);
          if (marker) sceneObject.remove(marker);
        }
      }
      if (geometry) {
        geometry.dispose();
        geometry = null;
      }
      if (material) {
        material.dispose();
        material = null;
      }
    };
  }

  // src/actions.js
  var AVAILABLE = () => isMarionetteFormat() && Modes.edit;
  function warn(messages) {
    Blockbench.showMessageBox({
      title: "Marionette",
      icon: "warning",
      message: messages.join("\n\n")
    });
  }
  function geometryBounds(segment) {
    const points = [];
    for (const element of ownGeometryOf(segment)) {
      if (element instanceof Cube) {
        points.push(...cubeCorners(element));
      } else if (typeof Mesh !== "undefined" && element instanceof Mesh) {
        points.push(...meshVertexPoints(element));
      }
    }
    return boundsOfPoints(points);
  }
  function createSegmentGroup(name, origin, parent) {
    const group = new Group({ name, origin: origin.slice() });
    group.marionette_type = ROLE_SEGMENT;
    const added = group.addTo(parent || "root");
    if (added === void 0) return null;
    group.init();
    group.createUniqueName();
    return group;
  }
  function buildActions() {
    const actions = [];
    actions.push(new Action("marionette_add_limb", {
      name: "Add Marionette Limb",
      description: "Create a limb group to hold a chain of segments",
      icon: "polyline",
      category: "edit",
      condition: AVAILABLE,
      click() {
        Undo.initEdit({ outliner: true, groups: [], selection: true });
        const limb = new Group({ name: "limb" });
        limb.marionette_type = ROLE_LIMB;
        limb.addTo(Group.first_selected || "root");
        limb.init();
        limb.createUniqueName();
        limb.select();
        Undo.finishEdit("Add Marionette limb", { outliner: true, groups: [limb], selection: true });
      }
    }));
    actions.push(new Action("marionette_add_segment", {
      name: "Add Marionette Segment",
      description: "Create a segment group with its bone, chained to the selected segment",
      icon: "line_end_square",
      category: "edit",
      condition: AVAILABLE,
      click() {
        const previous = selectedSegment();
        const limb = selectedLimb();
        const origin = previous ? tipOf(previous) : [0, 0, 0];
        const parent = previous || limb || "root";
        Undo.initEdit({ outliner: true, elements: [], groups: [], selection: true });
        const segment = createSegmentGroup("segment", origin, parent);
        if (!segment) {
          Undo.finishEdit("Add Marionette segment");
          warn(["Could not create the segment group."]);
          return;
        }
        const created = normalizeSegments([segment], warn);
        segment.select();
        Undo.finishEdit("Add Marionette segment", {
          outliner: true,
          elements: created,
          groups: [segment],
          selection: true
        });
        Canvas.updateView({ elements: created, element_aspects: { transform: true } });
      }
    }));
    actions.push(new Action("marionette_fit_bone", {
      name: "Fit Bone to Geometry",
      description: "Move the segment's joint to the back of its geometry and match the bone length to it",
      icon: "straighten",
      category: "edit",
      condition: () => AVAILABLE() && !!selectedSegment(),
      click() {
        const segment = selectedSegment();
        if (!segment) return;
        const bounds = geometryBounds(segment);
        if (!bounds) {
          warn([`Segment "${segment.name}" has no geometry of its own to fit to.`]);
          return;
        }
        const bone = boneOf(segment);
        if (!bone) {
          warn([`Segment "${segment.name}" has no bone.`]);
          return;
        }
        if (segment.rotation[0] || segment.rotation[1] || segment.rotation[2]) {
          warn([
            `Segment "${segment.name}" is rotated. Fit Bone to Geometry moves the pivot, which would swing the geometry around it. Zero the segment's rotation first.`
          ]);
          return;
        }
        const fit = fitBoneToBounds(bounds);
        const oldTip = tipOf(segment);
        const children = childSegmentsOf(segment);
        const attached = children.filter(
          (child) => distanceSquared(child.origin, oldTip) < 1e-6
        );
        const detached = children.filter((child) => !attached.includes(child));
        const applyResnap = attached.length > 0;
        Undo.initEdit({
          outliner: true,
          elements: [bone],
          groups: [segment, ...children]
        });
        segment.origin[0] = fit.origin[0];
        segment.origin[1] = fit.origin[1];
        segment.origin[2] = fit.origin[2];
        bone.length = fit.length;
        if (applyResnap) {
          const newTip = tipOf(segment);
          for (const child of attached) {
            child.origin[0] = newTip[0];
            child.origin[1] = newTip[1];
            child.origin[2] = newTip[2];
          }
        }
        Undo.finishEdit("Fit bone to geometry");
        Canvas.updateView({
          elements: [bone],
          groups: [segment, ...children],
          element_aspects: { transform: true },
          group_aspects: { transform: true }
        });
        if (detached.length) {
          warn([
            `Fitted "${segment.name}" to its geometry. Its bone is now ${fit.length.toFixed(2)} units (${(fit.length / UNITS_PER_BLOCK).toFixed(4)} blocks).`,
            `${detached.length} child segment(s) were not sitting on the old tip, so they were left alone: ${detached.map((c) => c.name).join(", ")}. Re-snap them by hand, or run Fit Bone on them too.`
          ]);
        } else {
          Blockbench.showQuickMessage(
            `Bone: ${fit.length.toFixed(2)} units / ${(fit.length / UNITS_PER_BLOCK).toFixed(4)} blocks`,
            2e3
          );
        }
      }
    }));
    return actions;
  }
  var ADD_ELEMENT_IDS = ["marionette_add_limb", "marionette_add_segment"];
  function installAddElementEntries() {
    const addElement = typeof BarItems !== "undefined" && BarItems.add_element;
    const structure = addElement && addElement.side_menu && addElement.side_menu.structure;
    if (!Array.isArray(structure)) {
      console.warn("[Marionette] BarItems.add_element.side_menu is unavailable; the Add Segment / Add Limb entries were not added to the Add Element menu.");
      return () => {
      };
    }
    for (const id of ADD_ELEMENT_IDS) {
      if (!structure.includes(id)) structure.push(id);
    }
    return () => {
      for (const id of ADD_ELEMENT_IDS) {
        const index = structure.indexOf(id);
        if (index >= 0) structure.splice(index, 1);
      }
    };
  }
  function installActions() {
    const actions = buildActions();
    for (const action of actions) {
      MenuBar.addAction(action, "tools");
      Group.prototype.menu.addAction(action, "#manage");
    }
    const removeAddElementEntries = installAddElementEntries();
    console.log("[Marionette] actions registered:", actions.map((a) => a.id).join(", "));
    return () => {
      removeAddElementEntries();
      for (const action of actions) {
        Group.prototype.menu.removeAction(action);
        MenuBar.removeAction(`tools.${action.id}`);
        action.delete();
      }
    };
  }

  // src/scaling.js
  var SNAPSHOT = "marionette_length_before";
  var warnedAboutShear = false;
  function scaleTargets() {
    if (!isMarionetteFormat()) return [];
    if (typeof ModelScaler === "undefined") return [];
    return ModelScaler.getScaleGroups().filter(isSegment);
  }
  function scaleVector(form) {
    const size = typeof form.scale === "number" ? form.scale : 1;
    const axis = form.axis;
    if (!axis) return [size, size, size];
    return [axis.x ? size : 1, axis.y ? size : 1, axis.z ? size : 1];
  }
  function snapshotLengths() {
    warnedAboutShear = false;
    for (const segment of scaleTargets()) {
      const bone = boneOf(segment);
      if (bone) bone.temp_data[SNAPSHOT] = bone.length;
    }
  }
  function applyLengths(form) {
    const scale2 = scaleVector(form);
    const nonUniform = scale2[0] !== scale2[1] || scale2[1] !== scale2[2];
    const touched = [];
    for (const segment of scaleTargets()) {
      const bone = boneOf(segment);
      if (!bone) continue;
      const before = bone.temp_data[SNAPSHOT];
      if (before === void 0) continue;
      const direction = chainDirectionZ(rotationChainOf(segment));
      bone.length = before * lengthScaleFactor(direction, scale2);
      bone.origin[0] = bone.origin[1] = bone.origin[2] = 0;
      if (nonUniform && !isAxisAligned(direction)) warnAboutShear();
      touched.push(bone);
    }
    refresh(touched);
    return touched;
  }
  function warnAboutShear() {
    if (warnedAboutShear) return;
    warnedAboutShear = true;
    Blockbench.showQuickMessage(
      "Marionette: non-uniform scale on a rotated segment; lengths will follow, but poses do not.",
      4e3
    );
  }
  function restoreLengths() {
    const touched = [];
    for (const segment of scaleTargets()) {
      const bone = boneOf(segment);
      if (!bone || bone.temp_data[SNAPSHOT] === void 0) continue;
      bone.length = bone.temp_data[SNAPSHOT];
      bone.origin[0] = bone.origin[1] = bone.origin[2] = 0;
      touched.push(bone);
    }
    refresh(touched);
    clearSnapshots();
    return touched;
  }
  function clearSnapshots() {
    if (typeof ArmatureBone === "undefined" || !ArmatureBone.all) return;
    for (const bone of ArmatureBone.all) delete bone.temp_data[SNAPSHOT];
  }
  function refresh(bones) {
    for (const bone of bones) {
      if (bone.preview_controller) bone.preview_controller.updateTransform(bone);
    }
  }
  function installScaleHook() {
    if (typeof ModelScaler === "undefined" || !ModelScaler.dialog) {
      console.warn("[Marionette] ModelScaler.dialog is missing; segment lengths will not follow the Scale tool.");
      return () => {
      };
    }
    const dialog = ModelScaler.dialog;
    const original = {
      onOpen: dialog.onOpen,
      onFormChange: dialog.onFormChange,
      onConfirm: dialog.onConfirm,
      onCancel: dialog.onCancel
    };
    function formOf(args) {
      const first = args[0];
      if (first && typeof first === "object" && "scale" in first) return first;
      return dialog.getFormResult();
    }
    dialog.onOpen = function(...args) {
      const result = original.onOpen ? original.onOpen.apply(this, args) : void 0;
      if (isMarionetteFormat()) snapshotLengths();
      return result;
    };
    dialog.onFormChange = function(...args) {
      const result = original.onFormChange ? original.onFormChange.apply(this, args) : void 0;
      if (isMarionetteFormat()) applyLengths(formOf(args));
      return result;
    };
    dialog.onConfirm = function(...args) {
      if (isMarionetteFormat()) applyLengths(formOf(args));
      const result = original.onConfirm ? original.onConfirm.apply(this, args) : void 0;
      clearSnapshots();
      return result;
    };
    dialog.onCancel = function(...args) {
      if (isMarionetteFormat()) restoreLengths();
      return original.onCancel ? original.onCancel.apply(this, args) : void 0;
    };
    return () => {
      Object.assign(dialog, original);
    };
  }

  // src/resize.js
  var SEGMENT_LENGTH_AXIS = 2;
  function remapsAxes(bone) {
    if (!isMarionetteFormat()) return false;
    if (!isSegment(bone.parent)) return false;
    if (typeof Outliner === "undefined" || !Outliner.selected) return false;
    return Outliner.selected.length > 1;
  }
  function installResizeRemap() {
    const originalResize = ArmatureBone.prototype.resize;
    const originalSize = ArmatureBone.prototype.size;
    ArmatureBone.prototype.size = function(axis) {
      if (!remapsAxes(this)) return originalSize.call(this, axis);
      if (typeof axis === "number") {
        return axis === SEGMENT_LENGTH_AXIS ? this.length : this.width;
      }
      return [this.width, this.width, this.length];
    };
    ArmatureBone.prototype.resize = function(move_value, axis_number, invert, ...rest) {
      if (!remapsAxes(this)) {
        return originalResize.call(this, move_value, axis_number, invert, ...rest);
      }
      if (axis_number !== SEGMENT_LENGTH_AXIS) return;
      const old_size = this.temp_data.old_size;
      const previous = Array.isArray(old_size) ? old_size[SEGMENT_LENGTH_AXIS] : old_size ?? this.length;
      this.length = typeof move_value === "function" ? move_value(previous) : previous + move_value * (invert ? -1 : 1);
      if (this.preview_controller) this.preview_controller.updateTransform(this);
    };
    return () => {
      ArmatureBone.prototype.resize = originalResize;
      ArmatureBone.prototype.size = originalSize;
    };
  }

  // src/selection.js
  function isRigGroup(group) {
    return isGroup(group) && getRole(group) !== ROLE_NONE;
  }
  function reselectDescendants(group) {
    let repaired = false;
    group.forEachChild((node) => {
      if (node.selected) return;
      node.markAsSelected();
      repaired = true;
    });
    return repaired;
  }
  function installSelectionFix() {
    const originalSelect = Group.prototype.select;
    Group.prototype.select = function(...args) {
      const result = originalSelect.apply(this, args);
      if (isMarionetteFormat() && this.selected && isRigGroup(this)) {
        if (reselectDescendants(this) && typeof updateSelection === "function") {
          updateSelection();
        }
      }
      return result;
    };
    return () => {
      Group.prototype.select = originalSelect;
    };
  }

  // src/fabrik.js
  var TOLERANCE = 0.01;
  var MAX_ITERATIONS = 100;
  function normalize(v) {
    const d2 = Math.hypot(v[0], v[1], v[2]);
    if (d2 < 1e-4) return [0, 0, 0];
    return [v[0] / d2, v[1] / d2, v[2] / d2];
  }
  function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
  function add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }
  function scale(v, factor) {
    return [v[0] * factor, v[1] * factor, v[2] * factor];
  }
  function distance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }
  function rootPos(part) {
    return subtract(part.position, scale(part.direction, part.length / 2));
  }
  function endPos(part) {
    return add(part.position, scale(part.direction, part.length / 2));
  }
  function setRootPos(part, root) {
    part.position = add(root, scale(part.direction, part.length / 2));
  }
  function setEndPos(part, end) {
    part.position = subtract(end, scale(part.direction, part.length / 2));
  }
  function setDirection(part, vector) {
    part.direction = normalize(vector);
  }
  function createChain(lengths, root, directions) {
    const parts = lengths.map((length, i) => ({
      length,
      direction: directions && directions[i] ? normalize(directions[i]) : [0, 0, 1],
      position: [0, 0, 0]
    }));
    const chain = { parts, root: root.slice(), followRootOnly: false, primeDirection: null };
    layOutFrom(chain, null);
    return chain;
  }
  function layOutFrom(chain, direction) {
    let lastEnd = chain.root;
    for (const part of chain.parts) {
      if (direction) setDirection(part, direction);
      setRootPos(part, lastEnd);
      lastEnd = endPos(part);
    }
  }
  function fabrikForward(chain, target) {
    const { parts } = chain;
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const lastEnd = i === 0 ? chain.root : endPos(parts[i - 1]);
      const nextRoot = i === parts.length - 1 ? target : rootPos(parts[i + 1]);
      setDirection(part, subtract(nextRoot, lastEnd));
      setEndPos(part, nextRoot);
    }
  }
  function fabrikBackward(chain, target) {
    const { parts } = chain;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const lastEnd = i === 0 ? chain.root : endPos(parts[i - 1]);
      let nextRoot;
      if (i === parts.length - 1) {
        nextRoot = chain.followRootOnly ? endPos(part) : target;
      } else {
        nextRoot = rootPos(parts[i + 1]);
      }
      setDirection(part, subtract(nextRoot, lastEnd));
      setRootPos(part, lastEnd);
    }
  }
  function solve(chain, target) {
    if (chain.primeDirection) layOutFrom(chain, chain.primeDirection);
    const totalLength = chain.parts.reduce((sum, part) => sum + part.length, 0);
    const distToTarget = distance(target, chain.root);
    if (distToTarget >= totalLength && !chain.followRootOnly) {
      layOutFrom(chain, subtract(target, chain.root));
      return 0;
    }
    let iterations = 0;
    do {
      if (!chain.followRootOnly) fabrikForward(chain, target);
      fabrikBackward(chain, target);
      iterations++;
    } while (!chain.followRootOnly && distance(target, endPos(chain.parts[chain.parts.length - 1])) > TOLERANCE && iterations < MAX_ITERATIONS);
    return iterations;
  }
  function jointsOf(chain) {
    return chain.parts.map(rootPos);
  }

  // src/simulate.js
  var NO_POSE = /* @__PURE__ */ new Map();
  function isTarget(node) {
    return typeof NullObject !== "undefined" && node instanceof NullObject;
  }
  function modelTransformOf(node, posed = NO_POSE) {
    const ancestors = [];
    let current = node;
    while (isGroup(current) && !posed.has(current)) {
      ancestors.unshift(current);
      current = current.parent;
    }
    const base = posed.get(current) || null;
    let position = base ? base.position : [0, 0, 0];
    let quaternion = base ? base.quaternion : [0, 0, 0, 1];
    let parentOrigin = base ? current.origin : [0, 0, 0];
    for (const group of ancestors) {
      const local = subtract(group.origin, parentOrigin);
      position = add(position, applyQuaternion(quaternion, local));
      quaternion = quaternionMultiply(quaternion, quaternionFromRotation(group.rotation));
      parentOrigin = group.origin;
    }
    return { position, quaternion };
  }
  function findTarget(limb, type) {
    let found = null;
    (function walk(node) {
      if (found || !node.children) return;
      for (const child of node.children) {
        if (found) return;
        if (isLimb(child)) continue;
        if (isTarget(child) && targetTypeOf(child) === type) {
          found = child;
          return;
        }
        walk(child);
      }
    })(limb);
    return found;
  }
  function targetOf(limb) {
    return findTarget(limb, TARGET_FABRIK);
  }
  function primeTargetOf(limb) {
    return findTarget(limb, TARGET_PRIME);
  }
  function targetPosition(target, posed = NO_POSE) {
    const group = target.parent;
    const parent = modelTransformOf(group, posed);
    const local = isGroup(group) ? subtract(target.position, group.origin) : target.position;
    return add(parent.position, applyQuaternion(parent.quaternion, local));
  }
  function targetLocalPosition(group, world) {
    const parent = modelTransformOf(group);
    const local = applyQuaternion(quaternionConjugate(parent.quaternion), subtract(world, parent.position));
    return isGroup(group) ? add(local, group.origin) : local;
  }
  function primeDirectionOf(description, root, posed) {
    if (!description.primeTarget) return null;
    const position = scale(targetPosition(description.primeTarget, posed), 1 / UNITS_PER_BLOCK);
    const direction = normalize(subtract(position, root));
    return direction[0] || direction[1] || direction[2] ? direction : null;
  }
  function partTransformOf(segment, posed = NO_POSE) {
    const transform = modelTransformOf(segment, posed);
    const direction = applyQuaternion(transform.quaternion, [0, 0, 1]);
    return {
      position: add(transform.position, scale(direction, lengthOf(segment) / 2)),
      direction,
      up: partUpOf(segment, posed)
    };
  }
  function partUpOf(segment, posed = NO_POSE) {
    const limb = limbOf(segment);
    if (!limb) return DEFAULT_UP.slice();
    const authored = upVectorOf(limb);
    const parentSegment = parentSegmentOf(limb);
    if (!parentSegment) return authored;
    const parent = modelTransformOf(parentSegment, posed);
    const parentDirection = applyQuaternion(parent.quaternion, [0, 0, 1]);
    return partToWorld(parentDirection, partUpOf(parentSegment, posed), authored);
  }
  function attachmentOffsetOf(limb, parentSegment) {
    const segments = chainOf(limb);
    if (!segments.length) return [0, 0, 0];
    const root = modelTransformOf(segments[0]).position;
    const parent = partTransformOf(parentSegment);
    return worldToPart(parent.direction, parent.up, subtract(root, parent.position));
  }
  function describeLimb(limb) {
    const segments = chainOf(limb).filter((segment) => lengthOf(segment) > 0);
    if (!segments.length) return null;
    const followRootOnly = followsRootOnly(limb);
    const target = targetOf(limb);
    if (!target && !followRootOnly) return null;
    return {
      limb,
      segments,
      target,
      followRootOnly,
      primeTarget: primeTargetOf(limb),
      parentSegment: parentSegmentOf(limb),
      lengths: segments.map(lengthOf)
    };
  }
  function stillMatches(entry, description) {
    if (entry.segments.length !== description.segments.length) return false;
    if (entry.target !== description.target) return false;
    if (entry.followRootOnly !== description.followRootOnly) return false;
    if (entry.primeTarget !== description.primeTarget) return false;
    if (entry.parentSegment !== description.parentSegment) return false;
    return entry.segments.every(
      (segment, i) => segment === description.segments[i] && entry.chain.parts[i].length === description.lengths[i] / UNITS_PER_BLOCK
    );
  }
  function rootOf(description, parts, posed) {
    if (description.followRootOnly && !description.parentSegment && description.target) {
      return scale(targetPosition(description.target, posed), 1 / UNITS_PER_BLOCK);
    }
    if (description.parentSegment) {
      const parent = parts.get(description.parentSegment) || scaleTransform(partTransformOf(description.parentSegment, posed), 1 / UNITS_PER_BLOCK);
      const offset = scale(
        attachmentOffsetOf(description.limb, description.parentSegment),
        1 / UNITS_PER_BLOCK
      );
      return add(parent.position, partToWorld(parent.direction, parent.up, offset));
    }
    return scale(modelTransformOf(description.segments[0], posed).position, 1 / UNITS_PER_BLOCK);
  }
  function upOf(description, parts, posed) {
    const authored = upVectorOf(description.limb);
    if (!description.parentSegment) return authored;
    const parent = parts.get(description.parentSegment) || partTransformOf(description.parentSegment, posed);
    return partToWorld(parent.direction, parent.up, authored);
  }
  function scaleTransform(transform, factor) {
    return { position: scale(transform.position, factor), direction: transform.direction, up: transform.up };
  }
  function buildChain(description, parts, posed) {
    const directions = description.segments.map(
      (segment) => applyQuaternion(modelTransformOf(segment, posed).quaternion, [0, 0, 1])
    );
    return createChain(
      description.lengths.map((length) => length / UNITS_PER_BLOCK),
      rootOf(description, parts, posed),
      directions
    );
  }
  var Simulation = class {
    constructor() {
      this.running = false;
      this.entries = /* @__PURE__ */ new Map();
      this.snapshots = /* @__PURE__ */ new Map();
      this.frame = null;
    }
    start() {
      if (this.running) return;
      this.running = true;
      this.tick = this.tick.bind(this);
      this.frame = requestAnimationFrame(this.tick);
    }
    // always restores even if the loop never started
    // guarding the whole method on 'running' would skip the restore a case that matters (posed the rig then stopped some other way)
    stop() {
      const wasRunning = this.running;
      this.running = false;
      if (this.frame !== null) {
        cancelAnimationFrame(this.frame);
        this.frame = null;
      }
      this.restoreAll();
      this.entries.clear();
      return wasRunning;
    }
    toggle() {
      if (this.running) this.stop();
      else this.start();
      return this.running;
    }
    tick() {
      if (!this.running) return;
      try {
        this.step();
      } catch (err) {
        console.error("[Marionette] simulation stopped after an error:", err);
        this.stop();
        Blockbench.showQuickMessage("Marionette simulation stopped; see the console.", 3e3);
        return;
      }
      this.frame = requestAnimationFrame(this.tick);
    }
    step() {
      if (!isMarionetteFormat()) return;
      const live = /* @__PURE__ */ new Set();
      const parts = /* @__PURE__ */ new Map();
      const posed = /* @__PURE__ */ new Map();
      for (const limb of limbsInAttachOrder()) {
        const description = describeLimb(limb);
        if (!description) continue;
        live.add(limb);
        let entry = this.entries.get(limb);
        if (!entry || !stillMatches(entry, description)) {
          entry = {
            segments: description.segments,
            target: description.target,
            followRootOnly: description.followRootOnly,
            primeTarget: description.primeTarget,
            parentSegment: description.parentSegment,
            chain: buildChain(description, parts, posed)
          };
          this.entries.set(limb, entry);
        }
        entry.chain.followRootOnly = description.followRootOnly;
        entry.chain.root = rootOf(description, parts, posed);
        const target = description.target ? scale(targetPosition(description.target, posed), 1 / UNITS_PER_BLOCK) : entry.chain.root;
        entry.chain.primeDirection = primeDirectionOf(description, entry.chain.root, posed);
        entry.up = upOf(description, parts, posed);
        solve(entry.chain, target);
        this.apply(entry, posed);
        entry.segments.forEach((segment, i) => parts.set(segment, {
          position: entry.chain.parts[i].position,
          direction: entry.chain.parts[i].direction,
          up: entry.up
        }));
      }
      for (const limb of [...this.entries.keys()]) {
        if (!live.has(limb)) {
          this.restoreLimb(limb);
          this.entries.delete(limb);
        }
      }
    }
    // each group's transform has to be expressed in its parent's frame for a nested chain that parent is the segment posed one step earlier,
    // so posed transforms are tracked as we go rather than read back off the scene.
    // posed spans the whole frame, not just this limb: the parent of a nested limb's first segment is the limb group,
    // which is not posed itself but hangs off a segment that is, and composing from rest there is what displaced the whole nested chain
    apply(entry, posed) {
      const joints = jointsOf(entry.chain).map((joint) => scale(joint, UNITS_PER_BLOCK));
      for (let i = 0; i < entry.segments.length; i++) {
        const group = entry.segments[i];
        const sceneObject = group.mesh;
        if (!sceneObject) continue;
        const world = {
          position: joints[i],
          // the part frame, not the shortest rotation onto the direction. the two differ by a roll, and
          // everything parented under a posed segment -- a nested limb, its targets -- rides on this one,
          // while rootOf resolves the attachment in part space. reaching for a target a roll away from
          // where it is drawn is what that mismatch looks like. this is also the frame the renderer uses
          quaternion: partFrame(entry.chain.parts[i].direction, entry.up)
        };
        const parent = modelTransformOf(group.parent, posed);
        const inverse = quaternionConjugate(parent.quaternion);
        const localPosition = applyQuaternion(inverse, subtract(world.position, parent.position));
        const localQuaternion = quaternionMultiply(inverse, world.quaternion);
        this.snapshot(group, sceneObject);
        sceneObject.position.set(localPosition[0], localPosition[1], localPosition[2]);
        sceneObject.quaternion.set(
          localQuaternion[0],
          localQuaternion[1],
          localQuaternion[2],
          localQuaternion[3]
        );
        sceneObject.updateMatrixWorld();
        posed.set(group, world);
      }
    }
    snapshot(group, sceneObject) {
      if (this.snapshots.has(group)) return;
      this.snapshots.set(group, {
        position: [sceneObject.position.x, sceneObject.position.y, sceneObject.position.z],
        quaternion: [
          sceneObject.quaternion.x,
          sceneObject.quaternion.y,
          sceneObject.quaternion.z,
          sceneObject.quaternion.w
        ]
      });
    }
    restoreLimb(limb) {
      const entry = this.entries.get(limb);
      if (!entry) return;
      for (const segment of entry.segments) this.restoreGroup(segment);
    }
    restoreGroup(group) {
      const snapshot = this.snapshots.get(group);
      if (!snapshot) return;
      this.snapshots.delete(group);
      const sceneObject = group.mesh;
      if (sceneObject) {
        sceneObject.position.set(...snapshot.position);
        sceneObject.quaternion.set(...snapshot.quaternion);
        sceneObject.updateMatrixWorld();
      }
    }
    restoreAll() {
      for (const group of [...this.snapshots.keys()]) this.restoreGroup(group);
      this.snapshots.clear();
    }
  };

  // src/rig.js
  function javaIdentifier(name, fallback = "part") {
    let cleaned = String(name || "").replace(/[^A-Za-z0-9_]/g, "_").replace(/^_+/, "");
    if (!cleaned || /^[0-9]/.test(cleaned)) cleaned = `${fallback}_${cleaned}`;
    return cleaned;
  }
  function uniqueNamer() {
    const taken = /* @__PURE__ */ new Set();
    return function unique(name) {
      let candidate = name;
      let n = 1;
      while (taken.has(candidate)) candidate = `${name}${++n}`;
      taken.add(candidate);
      return candidate;
    };
  }
  function cubeData(cube, integerSize) {
    const size = [0, 1, 2].map((axis) => {
      const raw = cube.to[axis] - cube.from[axis];
      return integerSize ? Math.round(raw) : raw;
    });
    return {
      name: cube.name,
      from: cube.from.slice(),
      to: cube.to.slice(),
      size,
      inflate: cube.inflate || 0,
      // texOffs takes ints, and the codec rounds the same way (I() in the modded entity templates)
      uv: (cube.uv_offset || [0, 0]).map(Math.round),
      mirror: !!cube.mirror_uv,
      rotation: (cube.rotation || [0, 0, 0]).slice(),
      origin: (cube.origin || [0, 0, 0]).slice()
    };
  }
  function bucketRotatedCubes(cubes) {
    const plain = [];
    const buckets = [];
    for (const cube of cubes) {
      if (isUnrotated(cube.rotation)) {
        plain.push(cube);
        continue;
      }
      const axes = cube.rotation.filter((r) => r !== 0).length;
      const match = buckets.find((bucket) => {
        if (!sameVector(bucket.rotation, cube.rotation)) return false;
        if (axes > 1) return sameVector(bucket.origin, cube.origin);
        return cube.rotation.every((r, i) => r !== 0 || bucket.origin[i] === cube.origin[i]);
      });
      if (match) {
        match.cubes.push(cube);
      } else {
        buckets.push({
          source: cube.name,
          rotation: cube.rotation.slice(),
          origin: cube.origin.slice(),
          cubes: [cube]
        });
      }
    }
    return { plain, buckets };
  }
  function sameVector(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }
  function buildPart(node, origin, unique, integerSize, options) {
    const directCubes = [];
    const childGroups = [];
    for (const child of node.children || []) {
      if (isBone(child)) continue;
      if (isSegment(child)) continue;
      if (isLimb(child)) continue;
      if (child.export === false) continue;
      if (isGroup(child)) {
        childGroups.push(child);
      } else if (options.isCube(child)) {
        directCubes.push(cubeData(child, integerSize));
      }
    }
    const { plain, buckets } = bucketRotatedCubes(directCubes);
    const part = {
      name: "",
      // caller assigns, it knows whether this is a segment
      var: "",
      origin: origin.slice(),
      rotation: [0, 0, 0],
      cubes: plain,
      children: []
    };
    for (const bucket of buckets) {
      const name = unique(`${javaIdentifier(bucket.source)}_r1`);
      part.children.push({
        name,
        var: name,
        origin: bucket.origin.slice(),
        rotation: bucket.rotation.slice(),
        cubes: bucket.cubes,
        children: []
      });
    }
    for (const group of childGroups) {
      const child = buildPart(group, group.origin, unique, integerSize, options);
      const name = unique(javaIdentifier(group.name));
      child.name = name;
      child.var = name;
      child.rotation = (group.rotation || [0, 0, 0]).slice();
      part.children.push(child);
    }
    return part;
  }
  function segmentBounds(segment, options) {
    const points = [];
    for (const element of ownGeometryOf(segment)) {
      if (options.isCube(element)) points.push(...cubeCorners(element));
      else if (options.isMesh(element)) points.push(...meshVertexPoints(element));
    }
    return boundsOfPoints(points);
  }
  function primeDirectionOf2(limbGroup, firstSegment, parentSegment) {
    const prime = primeTargetOf(limbGroup);
    if (!prime) return null;
    const root = modelTransformOf(firstSegment).position;
    const direction = normalize(subtract(targetPosition(prime), root));
    if (!direction[0] && !direction[1] && !direction[2]) return null;
    if (!parentSegment) return worldDirection(direction);
    const parent = partTransformOf(parentSegment);
    return worldToPart(parent.direction, parent.up, direction);
  }
  function nestingOf(limbGroup) {
    if (isMisnestedLimb(limbGroup)) return { misnested: true, parentSegment: null };
    return { misnested: false, parentSegment: parentSegmentOf(limbGroup) };
  }
  function resolveAttachment(limb, limbGroup, nesting, locationOf) {
    if (nesting.misnested) {
      return [`Limb "${limb.name}" sits directly inside another limb with no segment between them, so there is nothing for it to attach to and it will be rooted on the entity. Move it into one of that limb's segments.`];
    }
    const parentSegment = nesting.parentSegment;
    if (!parentSegment) return [];
    const location = locationOf.get(parentSegment);
    if (!location) {
      return [`Limb "${limb.name}" is nested in segment "${parentSegment.name}", which was not exported, so the limb will be rooted on the entity instead.`];
    }
    const offset = scale(attachmentOffsetOf(limbGroup, parentSegment), 1 / UNITS_PER_BLOCK);
    limb.attachment = {
      limb: location.limb.var,
      partName: location.limb.segments[location.index].part.name,
      partIndex: location.index,
      offset
    };
    if (!losesPerpendicular(parentSegment, offset)) return [];
    const perpendicular = Math.hypot(offset[0], offset[1]);
    return [`Limb "${limb.name}" attaches ${perpendicular.toFixed(3)} blocks off the axis of segment "${parentSegment.name}", which runs along that segment's own up vector. A part's sideways direction is undefined there, so the limb will not root where the editor shows it. Move the attachment onto that segment's axis, or point that limb's up vector somewhere else.`];
  }
  function followRootOnlyWarnings(limb, limbGroup, nesting) {
    if (!limb.followRootOnly) return [];
    const warnings = [];
    if (nesting.parentSegment && targetOf(limbGroup)) {
      warnings.push(`Limb "${limb.name}" follows the root only and is nested in segment "${nesting.parentSegment.name}", so its root comes from that segment and its IK target does nothing, in the editor or in game. Delete the target, or untick "Follow root only".`);
    }
    if (primeTargetOf(limbGroup)) {
      warnings.push(`Limb "${limb.name}" follows the root only and has a prime target. Priming relays the chain straight from the root before every solve, which cancels the trailing the flag is for, so the limb will stay rigid. Delete the prime target, or untick "Follow root only".`);
    }
    return warnings;
  }
  function primeDirectionWarnings(limb, nesting) {
    if (!nesting.parentSegment || !limb.primeDirection) return [];
    if (!losesPerpendicular(nesting.parentSegment, limb.primeDirection)) return [];
    return [`Limb "${limb.name}" is primed across the axis of segment "${nesting.parentSegment.name}", which runs along that segment's own up vector. A part's sideways direction is undefined there, so the bias will swing around as the segment wobbles. Prime it along the segment's axis, or point that limb's up vector somewhere else.`];
  }
  function upVectorWarnings(limb, limbGroup, chain) {
    const up = upVectorOf(limbGroup);
    const direction = partTransformOf(chain[0]).direction;
    const parentSegment = parentSegmentOf(limbGroup);
    const worldUp = parentSegment ? partToWorld(partTransformOf(parentSegment).direction, partUpOf(parentSegment), up) : up;
    if (Math.hypot(...crossOf(direction, worldUp)) > 0.05) return [];
    return [`Limb "${limb.name}" points along its own up vector, so its roll is undefined and will snap as it crosses. Point its up vector somewhere the limb never does.`];
  }
  function exportedUpOf(limbGroup, parentSegment) {
    const up = upVectorOf(limbGroup);
    return parentSegment ? up : worldDirection(up);
  }
  function crossOf(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function losesPerpendicular(parentSegment, vector) {
    if (Math.hypot(vector[0], vector[1]) <= 1e-4) return false;
    const transform = partTransformOf(parentSegment);
    return Math.hypot(...crossOf(transform.direction, transform.up)) < 0.05;
  }
  function collectRig(options = {}) {
    const isCube = options.isCube || ((el) => typeof Cube !== "undefined" && el instanceof Cube);
    const isMesh = options.isMesh || ((el) => typeof Mesh !== "undefined" && el instanceof Mesh);
    const integerSize = options.integerSize !== void 0 ? options.integerSize : typeof Format !== "undefined" && !!Format.integer_size;
    const helpers = { isCube, isMesh };
    const unique = uniqueNamer();
    const warnings = [];
    const limbs = [];
    const segments = [];
    const groupOf = /* @__PURE__ */ new Map();
    const locationOf = /* @__PURE__ */ new Map();
    const nestingFor = /* @__PURE__ */ new Map();
    for (const limbGroup of limbsInAttachOrder()) {
      const chain = chainOf(limbGroup);
      if (!chain.length) {
        warnings.push(`Limb "${limbGroup.name}" has no segments and was skipped.`);
        continue;
      }
      const nesting = nestingOf(limbGroup);
      const limb = {
        name: limbGroup.name,
        var: unique(javaIdentifier(limbGroup.name, "limb")),
        primeDirection: primeDirectionOf2(limbGroup, chain[0], nesting.parentSegment),
        upVector: exportedUpOf(limbGroup, nesting.parentSegment),
        followRootOnly: followsRootOnly(limbGroup),
        attachment: null,
        segments: []
      };
      groupOf.set(limb, limbGroup);
      nestingFor.set(limb, nesting);
      for (const group of chain) {
        const bone = boneOf(group);
        if (!bone) {
          warnings.push(`Segment "${group.name}" has no bone and was skipped.`);
          continue;
        }
        const lengthUnits = lengthOf(group);
        if (lengthUnits <= 0) {
          warnings.push(`Segment "${group.name}" has zero length; its chain will collapse.`);
        }
        const origin = exportOriginOf(group);
        const part = buildPart(group, origin, unique, integerSize, helpers);
        const name = unique(javaIdentifier(group.name, "segment"));
        part.name = name;
        part.var = name;
        const bounds = segmentBounds(group, helpers);
        const segment = {
          source: group.name,
          part,
          lengthUnits,
          lengthBlocks: lengthUnits / UNITS_PER_BLOCK,
          hasGeometry: !!bounds,
          // hitbox dimensions have no blockbench representation, derived from geometry as a starting point (noted in the sidecar). sizeXZ is the segment's cross-section so it comes from the X extent alone, Z extent is the bone's own length axis and feeding that in would give a long segment a hitbox as wide as it is long
          sizeXZ: bounds ? bounds.size[0] / UNITS_PER_BLOCK : lengthUnits / UNITS_PER_BLOCK,
          sizeY: bounds ? bounds.size[1] / UNITS_PER_BLOCK : lengthUnits / UNITS_PER_BLOCK
        };
        locationOf.set(group, { limb, index: limb.segments.length });
        limb.segments.push(segment);
        segments.push(segment);
      }
      if (limb.segments.length) limbs.push(limb);
    }
    for (const limb of limbs) {
      const nesting = nestingFor.get(limb);
      warnings.push(...resolveAttachment(limb, groupOf.get(limb), nesting, locationOf));
      warnings.push(...primeDirectionWarnings(limb, nesting));
      warnings.push(...upVectorWarnings(limb, groupOf.get(limb), chainOf(groupOf.get(limb))));
      warnings.push(...followRootOnlyWarnings(limb, groupOf.get(limb), nesting));
    }
    if (!limbs.length) warnings.push("No limbs with segments were found; nothing to export.");
    const textureWidth = options.textureWidth || typeof Project !== "undefined" && Project.texture_width || 16;
    const textureHeight = options.textureHeight || typeof Project !== "undefined" && Project.texture_height || 16;
    return {
      limbs,
      segments,
      textureWidth,
      textureHeight,
      shadowRadius: options.shadowRadius !== void 0 ? options.shadowRadius : 0.5,
      warnings
    };
  }

  // src/java.js
  var RAD = Math.PI / 180;
  function f(value) {
    const n = Object.is(value, -0) ? 0 : value;
    if (Number.isInteger(n)) return `${n.toFixed(1)}F`;
    return `${parseFloat(n.toFixed(4))}F`;
  }
  function rad(degrees) {
    return f(degrees * RAD);
  }
  function d(value) {
    const n = Object.is(value, -0) ? 0 : value;
    return Number.isInteger(n) ? n.toFixed(1) : String(parseFloat(n.toFixed(6)));
  }
  function cubeOffset(cube, origin) {
    return [
      origin[0] - cube.to[0],
      -cube.from[1] - cube.size[1] + origin[1],
      cube.from[2] - origin[2]
    ];
  }
  function childPose(part, parentOrigin) {
    const offset = [
      -(part.origin[0] - parentOrigin[0]),
      -(part.origin[1] - parentOrigin[1]),
      part.origin[2] - parentOrigin[2]
    ];
    const [rx, ry, rz] = part.rotation || [0, 0, 0];
    if (rx === 0 && ry === 0 && rz === 0) {
      return `PartPose.offset(${offset.map(f).join(", ")})`;
    }
    return `PartPose.offsetAndRotation(${offset.map(f).join(", ")}, ${rad(-rx)}, ${rad(-ry)}, ${rad(rz)})`;
  }
  function cubeListBuilder(cubes, origin, indent) {
    if (!cubes.length) return "CubeListBuilder.create()";
    const pad = "	".repeat(indent);
    const lines = cubes.map((cube) => {
      const [x, y, z] = cubeOffset(cube, origin);
      return `${pad}.texOffs(${cube.uv[0]}, ${cube.uv[1]})` + (cube.mirror ? ".mirror()" : "") + `.addBox(${f(x)}, ${f(y)}, ${f(z)}, ${f(cube.size[0])}, ${f(cube.size[1])}, ${f(cube.size[2])}, new CubeDeformation(${f(cube.inflate || 0)}))` + (cube.mirror ? ".mirror(false)" : "");
    });
    return `CubeListBuilder.create()
${lines.join("\n")}`;
  }
  function emitPart(part, parentVar, parentOrigin, out) {
    const isRoot = parentVar === "partdefinition";
    const pose = isRoot ? "PartPose.offset(0.0F, 24.0F, 0.0F)" : childPose(part, parentOrigin);
    out.push(
      `		PartDefinition ${part.var} = ${parentVar}.addOrReplaceChild("${part.name}", ${cubeListBuilder(part.cubes, part.origin, 4)}, ${pose});`
    );
    for (const child of part.children) {
      out.push("");
      emitPart(child, part.var, part.origin, out);
    }
  }
  function emitModel(rig, names) {
    const body = [];
    for (const segment of rig.segments) {
      emitPart(segment.part, "partdefinition", null, body);
      body.push("");
    }
    const segmentNames = rig.segments.map((s) => `"${s.part.name}"`);
    return `package ${names.package};

import net.jelly.marionette_lib.utility.MarionetteModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.*;

/**
 * Generated by the Marionette Blockbench plugin. Regenerating overwrites this
 * file -- keep hand edits somewhere else.
 *
 * Segment names below are in chain order and are index-aligned with
 * ${names.className}Entity's part list. Reordering one without the other will
 * silently pair the wrong model part with the wrong segment.
 */
public class ${names.className}Model extends MarionetteModel<${names.className}Entity> {

	public static LayerDefinition createBodyLayer() {
		MeshDefinition meshdefinition = new MeshDefinition();
		PartDefinition partdefinition = meshdefinition.getRoot();

${body.join("\n")}
		return LayerDefinition.create(meshdefinition, ${rig.textureWidth}, ${rig.textureHeight});
	}

	public ${names.className}Model(ModelPart root) {
		super(root, new String[] {
${wrapNames(segmentNames)}
		});
	}
}
`.replace(/\t/g, "    ");
  }
  function isDefaultUp(up) {
    return Math.abs(up[0]) < 1e-9 && Math.abs(up[1] - 1) < 1e-9 && Math.abs(up[2]) < 1e-9;
  }
  function hasUpVector(limb) {
    return !!limb.upVector && !isDefaultUp(limb.upVector);
  }
  function wrapNames(names) {
    const lines = [];
    let current = "			";
    for (let i = 0; i < names.length; i++) {
      const piece = names[i] + (i === names.length - 1 ? "" : ",");
      if (current.trim() && (current + " " + piece).length > 96) {
        lines.push(current);
        current = "			";
      }
      current += (current.trim() ? " " : "") + piece;
    }
    if (current.trim()) lines.push(current);
    return lines.join("\n");
  }
  function emitRig(rig, names) {
    const fields = rig.limbs.map(
      (limb) => `	public final Limb<MarionettePart<E>> ${limb.var};`
    );
    const builders = rig.limbs.map((limb) => {
      const calls = runsOf(limb.segments).map(
        (run) => run.count === 1 ? `				.segment(${f(run.sizeXZ)}, ${f(run.sizeY)}, ${f(run.lengthBlocks)})` : `				.segments(${run.count}, ${f(run.sizeXZ)}, ${f(run.sizeY)}, ${f(run.lengthBlocks)})`
      );
      if (limb.followRootOnly) calls.push("				.followRootOnly(true)");
      if (limb.upVector && !isDefaultUp(limb.upVector)) {
        const [x, y, z] = limb.upVector;
        calls.push(`				.rootUpVector(new Vec3(${d(x)}, ${d(y)}, ${d(z)}))`);
      }
      if (limb.primeDirection) {
        const [x, y, z] = limb.primeDirection;
        calls.push(`				.rootPrimeDirection(new Vec3(${d(x)}, ${d(y)}, ${d(z)}))`);
      }
      if (limb.attachment) {
        const { limb: parent, partIndex, offset } = limb.attachment;
        calls.push(`				.attachRoot(${parent}.parts()[${partIndex}], new Vec3(${d(offset[0])}, ${d(offset[1])}, ${d(offset[2])}))`);
      }
      return `		${limb.var} = Limb.builder(owner)
${calls.join("\n")}
				.build();`;
    });
    const limbList = rig.limbs.map((limb) => limb.var).join(", ");
    return `package ${names.package};

import net.jelly.marionette_lib.utility.Limb;
import net.jelly.marionette_lib.utility.MarionettePart;
import net.minecraft.world.entity.Entity;${rig.limbs.some((limb) => limb.primeDirection || limb.attachment || hasUpVector(limb)) ? "\nimport net.minecraft.world.phys.Vec3;" : ""}

import java.util.List;

/**
 * Generated by the Marionette Blockbench plugin. Regenerating overwrites this
 * file, and only this file: the entity class alongside it is yours.
 *
 * The segment dimensions below came from the Blockbench geometry:
 * {@code length} is the bone length in blocks and is exact; {@code sizeXZ} and
 * {@code sizeY} are hitbox sizes guessed from each segment's bounding box, which
 * will likely require tuning.
 *
 * Generic on the owner so this file never names the entity class. Instantiate
 * it as {@code new ${names.className}Rig<>(this)}; the limb types come out fully concrete.
 */
public class ${names.className}Rig<E extends Entity> {

${fields.join("\n")}

	public ${names.className}Rig(E owner) {
${builders.join("\n\n")}
	}

	/**
	 * Declaration order is part order, which the segment name array in
	 * ${names.className}Model must match. Return this from the entity's {@code getLimbs()}.
	 */
	public List<Limb<?>> limbs() {
		return List.of(${limbList});
	}
}
`.replace(/\t/g, "    ");
  }
  function emitEntity(rig, names) {
    const rigType = `${names.className}Rig<${names.className}Entity>`;
    const firstLimb = rig.limbs[0] ? rig.limbs[0].var : "limb";
    return `package ${names.package};

import net.jelly.marionette_lib.utility.Limb;
import net.jelly.marionette_lib.utility.Marionette;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.${names.baseClassImport};
import net.minecraft.world.level.Level;
import net.minecraftforge.entity.PartEntity;

import java.util.List;

/**
 * Generated by the Marionette Blockbench plugin. 
 * This file's java is yours to edit and does not need to 
 * be regenerated unless the number, ordering, or naming of limbs change.
 *
 * Registrations are still yours to make:
 *
 *   DeferredRegister<EntityType<?>>:
 *       EntityType.Builder.of(${names.className}Entity::new, MobCategory.CREATURE).sized(1.0F, 1.0F)
 *
 *   EntityAttributeCreationEvent:
 *       event.put(ModEntities.${names.screamingName}.get(), ${names.className}Entity.createAttributes().build());
 */
public class ${names.className}Entity extends ${names.baseClass} implements Marionette {

	private final ${rigType} rig;

	public ${names.className}Entity(EntityType<? extends ${names.baseClass}> entityType, Level level) {
		super(entityType, level);
		rig = new ${names.className}Rig<>(this);
	}

	public ${rigType} rig() {
		return rig;
	}

	@Override
	public List<Limb<?>> getLimbs() {
		return rig.limbs();
	}

	@Override
	public boolean isMultipartEntity() {
		return true;
	}

	@Override
	public PartEntity<?>[] getParts() {
		return getMarionetteParts();
	}

	@Override
	public void remove(RemovalReason removalReason) {
		super.remove(removalReason);
		removeMarionette(removalReason);
	}

	public static AttributeSupplier.Builder createAttributes() {
		return Mob.createMobAttributes()
				.add(Attributes.MAX_HEALTH, 20D)
				.add(Attributes.MOVEMENT_SPEED, 0.25D);
	}

	@Override
	public void tick() {
		super.tick();

		// Aim each limb before solving, e.g.
		//     rig.${firstLimb}.animator().setFabrikTarget(someWorldPosition);

		tickMarionette();
	}
}
`.replace(/\t/g, "    ");
  }
  function runsOf(segments) {
    const runs = [];
    for (const segment of segments) {
      const last = runs[runs.length - 1];
      if (last && last.sizeXZ === segment.sizeXZ && last.sizeY === segment.sizeY && last.lengthBlocks === segment.lengthBlocks) {
        last.count++;
      } else {
        runs.push({
          count: 1,
          sizeXZ: segment.sizeXZ,
          sizeY: segment.sizeY,
          lengthBlocks: segment.lengthBlocks
        });
      }
    }
    return runs;
  }
  function emitRenderer(rig, names) {
    return `package ${names.package};

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Axis;
import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.renderer.culling.Frustum;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

/**
 * Generated by the Marionette Blockbench plugin. Regenerating overwrites this
 * file. Keep hand edits elsewhere.
 *
 * Like a vanilla modded entity, wo registrations are still yours to make:
 *
 *   EntityRenderersEvent.RegisterLayerDefinitions:
 *       event.registerLayerDefinition(${names.className}Renderer.${names.layerConstant}, ${names.className}Model::createBodyLayer);
 *
 *   EntityRenderersEvent.RegisterRenderers:
 *       event.registerEntityRenderer(ModEntities.${names.screamingName}.get(), ${names.className}Renderer::new);
 */
public class ${names.className}Renderer extends MobRenderer<${names.className}Entity, ${names.className}Model> {

	private static final ResourceLocation TEXTURE =
			new ResourceLocation("${names.modid}:textures/entity/${names.textureName}.png");

	public static final ModelLayerLocation ${names.layerConstant} = new ModelLayerLocation(
			new ResourceLocation("${names.modid}", "${names.layerName}"), "main");

	public ${names.className}Renderer(EntityRendererProvider.Context context) {
		super(context, new ${names.className}Model(context.bakeLayer(${names.layerConstant})), ${f(rig.shadowRadius)});
	}

	@Override
	protected void setupRotations(${names.className}Entity entity, PoseStack poseStack, float ageInTicks, float rotationYaw, float partialTicks) {
		poseStack.mulPose(Axis.YP.rotationDegrees(180));
	}

	@Override
	public boolean shouldRender(${names.className}Entity entity, Frustum camera, double x, double y, double z) {
		if (super.shouldRender(entity, camera, x, y, z)) return true;
		return camera.isVisible(entity.getMarionetteBoundingBoxForCulling(entity));
	}

	@Override
	public ResourceLocation getTextureLocation(${names.className}Entity entity) {
		return TEXTURE;
	}
}
`.replace(/\t/g, "    ");
  }
  function emitSidecar(rig, names) {
    return JSON.stringify({
      format: "marionette-rig",
      format_version: 1,
      generator: names.generator,
      class_name: names.className,
      package: names.package,
      texture: { width: rig.textureWidth, height: rig.textureHeight },
      units_per_block: 16,
      limbs: rig.limbs.map((limb) => ({
        name: limb.name,
        field: limb.var,
        follow_root_only: !!limb.followRootOnly,
        prime_direction: limb.primeDirection,
        prime_direction_space: limb.primeDirection ? limb.attachment ? "part" : "body" : null,
        up_vector: limb.upVector || null,
        up_vector_space: limb.attachment ? "part" : "body",
        attachment: limb.attachment && {
          limb: limb.attachment.limb,
          part_name: limb.attachment.partName,
          part_index: limb.attachment.partIndex,
          offset: limb.attachment.offset
        },
        segments: limb.segments.map((segment) => ({
          part_name: segment.part.name,
          length_units: segment.lengthUnits,
          length_blocks: segment.lengthBlocks,
          size_xz: segment.sizeXZ,
          size_y: segment.sizeY,
          size_source: segment.hasGeometry ? "geometry_bounds" : "default"
        }))
      })),
      part_order: rig.segments.map((s) => s.part.name)
    }, null, "	") + "\n";
  }

  // src/export.js
  var BASE_CLASSES = {
    "PathfinderMob": "PathfinderMob",
    "Mob": "Mob",
    "Monster": "monster.Monster",
    "Animal": "animal.Animal",
    "WaterAnimal": "animal.WaterAnimal",
    "Phantom": "monster.Phantom"
  };
  function snakeCase(name) {
    return String(name).replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  }
  function buildNames(form, generator) {
    const className = javaIdentifier(form.class_name || "Marionette", "Rig");
    const snake = snakeCase(className);
    return {
      className,
      package: (form.package || "com.example.mod.entity").trim(),
      modid: (form.modid || "examplemod").trim(),
      baseClass: form.base_class || "PathfinderMob",
      baseClassImport: BASE_CLASSES[form.base_class] || "PathfinderMob",
      textureName: snake,
      layerName: `${snake}_layer`,
      layerConstant: `${snake.toUpperCase()}_LAYER`,
      screamingName: snake.toUpperCase(),
      generator
    };
  }
  function textureFile(names) {
    if (typeof Texture === "undefined") return null;
    const texture = Texture.getDefault && Texture.getDefault() || (Texture.all || [])[0];
    if (!texture || typeof texture.getDataURL !== "function") return null;
    return { name: `${names.textureName}.png`, content: texture.getDataURL(), savetype: "image" };
  }
  var OUTPUTS = ["model", "rig", "entity", "renderer", "texture", "sidecar"];
  var DEFAULT_SELECTION = {
    model: true,
    rig: true,
    entity: true,
    renderer: true,
    texture: true,
    sidecar: false
  };
  function buildFiles(rig, names, selection = DEFAULT_SELECTION) {
    const files = [];
    const wanted = (key) => selection[key] !== false;
    if (wanted("model")) {
      files.push({ name: `${names.className}Model.java`, content: emitModel(rig, names) });
    }
    if (wanted("rig")) {
      files.push({ name: `${names.className}Rig.java`, content: emitRig(rig, names) });
    }
    if (wanted("entity")) {
      files.push({ name: `${names.className}Entity.java`, content: emitEntity(rig, names) });
    }
    if (wanted("renderer")) {
      files.push({ name: `${names.className}Renderer.java`, content: emitRenderer(rig, names) });
    }
    if (wanted("sidecar")) {
      files.push({
        name: `${snakeCase(names.className)}.marionette.json`,
        content: emitSidecar(rig, names)
      });
    }
    if (wanted("texture")) {
      const texture = textureFile(names);
      if (texture) files.push(texture);
    }
    return files;
  }
  var TYPE_NAMES = { java: "Java Source", json: "JSON", png: "PNG" };
  function reportWarnings(warnings) {
    if (!warnings.length) return;
    Blockbench.showMessageBox({
      title: "Marionette export",
      icon: "warning",
      message: warnings.join("\n\n")
    });
  }
  function writeFiles(files, names) {
    const isDesktop = typeof Blockbench.pickDirectory === "function" && Blockbench.isApp;
    if (isDesktop) {
      const directory = Blockbench.pickDirectory({
        resource_id: "marionette_java_export",
        title: "Export Marionette Java to..."
      });
      if (!directory) return false;
      for (const file of files) {
        Blockbench.writeFile(`${directory}${PathModule.sep}${file.name}`, {
          content: file.content,
          savetype: file.savetype || "text"
        });
      }
      Blockbench.showQuickMessage(`Exported ${files.length} files to ${directory}`, 3e3);
      return true;
    }
    for (const file of files) {
      Blockbench.export({
        type: TYPE_NAMES[file.name.split(".").pop()] || "Java Source",
        extensions: [file.name.split(".").pop()],
        name: file.name,
        content: file.content,
        savetype: file.savetype || "text",
        resource_id: "marionette_java_export"
      });
    }
    return true;
  }
  function runExport(form) {
    const rig = collectRig();
    reportWarnings(rig.warnings);
    if (!rig.segments.length) return false;
    const names = buildNames(form, `Marionette Blockbench plugin ${PLUGIN_VERSION}`);
    const files = buildFiles(rig, names, selectionOf(form));
    if (!files.length) {
      Blockbench.showQuickMessage("Nothing selected to export.", 2500);
      return false;
    }
    return writeFiles(files, names);
  }
  function selectionOf(form) {
    const selection = {};
    for (const key of OUTPUTS) {
      const value = form[`export_${key}`];
      selection[key] = value === void 0 ? DEFAULT_SELECTION[key] : !!value;
    }
    return selection;
  }
  function buildExportAction() {
    return new Action("marionette_export_java", {
      name: "Export Marionette Java",
      description: "Write the model, entity and renderer classes plus a JSON sidecar",
      icon: "code",
      category: "file",
      condition: () => isMarionetteFormat(),
      click() {
        const dialog = new Dialog({
          id: "marionette_export",
          title: "Export Marionette Java",
          form: {
            class_name: {
              label: "Class name",
              type: "text",
              value: javaIdentifier(Project.name || "Marionette", "Rig"),
              description: "Produces <Name>Model, <Name>Entity and <Name>Renderer"
            },
            package: {
              label: "Package",
              type: "text",
              value: "com.example.mod.entity"
            },
            modid: {
              label: "Mod id",
              type: "text",
              value: "examplemod",
              description: "Used for the texture and model layer ResourceLocations"
            },
            base_class: {
              label: "Entity base class",
              type: "select",
              default: "PathfinderMob",
              options: Object.fromEntries(Object.keys(BASE_CLASSES).map((k) => [k, k]))
            },
            files_header: { type: "info", text: "Files to write. Every ticked one is overwritten without asking." },
            export_model: { label: "Model", type: "checkbox", value: true },
            export_rig: { label: "Rig", type: "checkbox", value: true },
            export_entity: {
              label: "Entity",
              type: "checkbox",
              value: true,
              description: "The one file that is yours. Untick it once there is behaviour in it worth keeping; the rig is a separate file, so rig changes still land."
            },
            export_renderer: { label: "Renderer", type: "checkbox", value: true },
            export_texture: { label: "Texture", type: "checkbox", value: true },
            export_sidecar: {
              label: "JSON sidecar",
              type: "checkbox",
              value: false,
              description: "Lengths, hitbox sizes and attachments as data. Nothing reads it back; it is for diffing and tooling."
            }
          },
          onConfirm(form) {
            dialog.hide();
            try {
              runExport(form);
            } catch (err) {
              console.error("[Marionette] export failed:", err);
              Blockbench.showMessageBox({
                title: "Marionette export",
                icon: "error",
                message: `Export failed.

${err && err.message}`
              });
            }
          }
        });
        dialog.show();
      }
    });
  }
  function installExport() {
    const action = buildExportAction();
    MenuBar.addAction(action, "file.export");
    MenuBar.addAction(action, "tools");
    return () => {
      MenuBar.removeAction(`file.export.${action.id}`);
      MenuBar.removeAction(`tools.${action.id}`);
      action.delete();
    };
  }

  // src/simulate_actions.js
  var AVAILABLE2 = () => isMarionetteFormat() && Modes.edit;
  function restTip(limb) {
    const segments = chainOf(limb);
    if (!segments.length) return null;
    const last = segments[segments.length - 1];
    const transform = modelTransformOf(last);
    const direction = applyQuaternion(transform.quaternion, [0, 0, 1]);
    const length = lengthOf(last);
    return [
      transform.position[0] + direction[0] * length,
      transform.position[1] + direction[1] * length,
      transform.position[2] + direction[2] * length
    ];
  }
  function defaultTargetPosition(limb) {
    const segments = chainOf(limb);
    if (followsRootOnly(limb)) {
      return segments.length ? targetLocalPosition(limb, modelTransformOf(segments[0]).position) : [0, 0, 0];
    }
    const tip = restTip(limb);
    return tip ? targetLocalPosition(limb, tip) : [0, 0, 0];
  }
  function defaultPrimePosition(limb) {
    const segments = chainOf(limb);
    const tip = restTip(limb);
    if (!tip) return [0, 0, 0];
    const root = modelTransformOf(segments[0]).position;
    return targetLocalPosition(limb, [
      (root[0] + tip[0]) / 2,
      (root[1] + tip[1]) / 2 + 8,
      (root[2] + tip[2]) / 2
    ]);
  }
  function addTargetTo(limb, { name, position, type, existing }) {
    if (existing) {
      Blockbench.showQuickMessage(`"${limb.name}" already has a ${name}.`, 2e3);
      existing.select();
      return null;
    }
    Undo.initEdit({ outliner: true, elements: [], selection: true });
    const target = new NullObject({ name: `${limb.name}_${name.replace(" ", "_")}` });
    const added = target.addTo(limb);
    if (added === void 0) {
      Undo.finishEdit(`Add Marionette ${name}`, { outliner: true });
      Blockbench.showMessageBox({
        title: "Marionette",
        icon: "error",
        message: `Could not add a ${name} to that limb.`
      });
      return null;
    }
    target.init();
    if (type) target.marionette_target = type;
    target.position.splice(0, 3, ...position);
    target.createUniqueName();
    target.select();
    Undo.finishEdit(`Add Marionette ${name}`, {
      outliner: true,
      elements: [target],
      selection: true
    });
    if (target.preview_controller) target.preview_controller.updateTransform(target);
    return target;
  }
  function buildSimulationActions(simulation) {
    const addTarget = new Action("marionette_add_target", {
      name: "Add Marionette Target",
      description: "Add an IK target to the selected limb for the simulation to reach, or a root handle for it to trail behind when it follows the root only",
      icon: "ads_click",
      category: "edit",
      condition: () => AVAILABLE2() && !!selectedLimb(),
      click() {
        const limb = selectedLimb();
        if (!limb) return;
        addTargetTo(limb, {
          // the same stored marionette_target either way, only what it drives differs
          name: followsRootOnly(limb) ? "root" : "target",
          position: defaultTargetPosition(limb),
          existing: targetOf(limb)
        });
      }
    });
    const addPrimeTarget = new Action("marionette_add_prime_target", {
      name: "Add Marionette Prime Target",
      description: "Add a prime target biasing which way the selected limb folds",
      icon: "turn_sharp_right",
      category: "edit",
      condition: () => AVAILABLE2() && !!selectedLimb(),
      click() {
        const limb = selectedLimb();
        if (!limb) return;
        addTargetTo(limb, {
          name: "prime target",
          position: defaultPrimePosition(limb),
          type: TARGET_PRIME,
          existing: primeTargetOf(limb)
        });
      }
    });
    const toggle = new Action("marionette_toggle_simulation", {
      name: "Simulate Marionette Rig",
      description: "Solve every limb with a target toward it, the way the library will at runtime",
      icon: "animation",
      category: "edit",
      condition: AVAILABLE2,
      click() {
        const running = simulation.toggle();
        Blockbench.showQuickMessage(
          running ? "Marionette simulation on. Drag a target to pose its limb." : "Marionette simulation off; the authored pose has been restored.",
          2500
        );
      }
    });
    return [addTarget, addPrimeTarget, toggle];
  }
  function installSimulation() {
    const simulation = new Simulation();
    const actions = buildSimulationActions(simulation);
    for (const action of actions) {
      MenuBar.addAction(action, "tools");
      Group.prototype.menu.addAction(action, "#manage");
    }
    const onFormat = Blockbench.on("convert_format", () => simulation.stop());
    const onProject = Blockbench.on("select_project", () => simulation.stop());
    return () => {
      onFormat.delete();
      onProject.delete();
      simulation.stop();
      for (const action of actions) {
        Group.prototype.menu.removeAction(action);
        MenuBar.removeAction(`tools.${action.id}`);
        action.delete();
      }
    };
  }

  // src/nesting.js
  var prompted = /* @__PURE__ */ new WeakSet();
  function misnestedLimbs() {
    const found = [];
    for (const limb of allLimbs()) {
      if (isMisnestedLimb(limb)) found.push(limb);
      else prompted.delete(limb);
    }
    return found;
  }
  function nearestSegment(limb, segments) {
    const chain = chainOf(limb);
    if (!chain.length || !segments.length) return segments[0] || null;
    const root = modelTransformOf(chain[0]).position;
    let best = segments[0];
    let bestDistance = Infinity;
    for (const segment of segments) {
      const distance2 = distanceSquared(root, modelTransformOf(segment).position);
      if (distance2 < bestDistance) {
        bestDistance = distance2;
        best = segment;
      }
    }
    return best;
  }
  function attachLimbTo(limb, segment) {
    Undo.initEdit({ outliner: true, groups: [limb, segment] });
    const moved = limb.addTo(segment);
    if (moved === void 0) {
      Undo.finishEdit("Nest Marionette limb");
      Blockbench.showMessageBox({
        title: "Marionette",
        icon: "error",
        message: `Could not move "${limb.name}" into "${segment.name}".`
      });
      return null;
    }
    Undo.finishEdit("Nest Marionette limb", { outliner: true, groups: [limb, segment] });
    Canvas.updateView({ groups: [limb, segment], group_aspects: { transform: true } });
    return limb;
  }
  function buildPrompt(limb) {
    const enclosing = enclosingLimbOf(limb);
    const segments = enclosing ? chainOf(enclosing) : [];
    if (!segments.length) {
      Blockbench.showMessageBox({
        title: "Marionette",
        icon: "warning",
        message: `"${limb.name}" is nested directly inside "${enclosing ? enclosing.name : "another limb"}", which has no segments to attach it to. Add a segment there first, then move "${limb.name}" into it.`
      });
      return null;
    }
    const options = {};
    for (const segment of segments) options[segment.uuid] = segment.name;
    const suggested = nearestSegment(limb, segments);
    return new Dialog({
      id: "marionette_nest_limb",
      title: "Marionette",
      form: {
        info: {
          type: "info",
          text: `"${limb.name}" sits directly inside "${enclosing.name}". A limb attaches to a segment, not to another limb, so pick the segment it hangs off. Its root offset is then measured in that segment's own frame.`
        },
        segment: {
          label: "Attach to segment",
          type: "select",
          options,
          default: suggested && suggested.uuid
        }
      },
      onConfirm(form) {
        const segment = segments.find((candidate) => candidate.uuid === form.segment);
        if (segment) attachLimbTo(limb, segment);
        this.hide();
      }
    });
  }
  function installNesting() {
    let pending = null;
    function review() {
      if (!isMarionetteFormat()) return;
      for (const limb of misnestedLimbs()) {
        if (prompted.has(limb)) continue;
        prompted.add(limb);
        const dialog = buildPrompt(limb);
        if (dialog) dialog.show();
        return;
      }
    }
    const listener = Blockbench.on("finish_edit", () => {
      if (pending !== null) return;
      pending = setTimeout(() => {
        pending = null;
        review();
      }, 0);
    });
    return () => {
      if (pending !== null) clearTimeout(pending);
      listener.delete();
    };
  }

  // src/ik.js
  var STOCK_IK_PROPERTIES = ["ik_target", "ik_source", "ik_pole", "lock_ik_target_rotation"];
  function hiddenInPanel(original) {
    return (instance) => Condition(original, instance) && (!!instance || !isMarionetteFormat());
  }
  function installIkFieldHiding() {
    const patched = [];
    for (const name of STOCK_IK_PROPERTIES) {
      const properties = typeof NullObject !== "undefined" && NullObject.properties;
      const property = properties && properties[name];
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

  // src/index.js
  (function() {
    let teardowns = [];
    function reportWarnings2(messages) {
      console.warn("[Marionette]", messages.join(" "));
      Blockbench.showMessageBox({
        title: "Marionette",
        icon: "warning",
        message: messages.join("\n\n")
      });
    }
    BBPlugin.register("marionette", {
      title: "Marionette",
      author: "JellyCarbonara",
      description: "Authoring format for the Marionette procedural animation library: segment and limb rigging with visual length handles, and a Java exporter that does the pose-zeroing and origin-centering by hand no longer required.",
      icon: "polyline",
      version: PLUGIN_VERSION,
      variant: "both",
      // gates Plugin.fetchAbout, which is the only thing that reads about.md. loaded from file it
      // looks for one beside the js, so build.mjs copies it into dist/
      new_repository_format: true,
      tags: ["Minecraft: Java Edition", "Rigging", "Animation"],
      onload() {
        const step = (label, install) => {
          try {
            const teardown = install();
            if (typeof teardown === "function") teardowns.push(teardown);
            return true;
          } catch (err) {
            console.error(`[Marionette] failed to install ${label}:`, err);
            Blockbench.showMessageBox({
              title: "Marionette",
              icon: "error",
              message: `Marionette failed to install its ${label}.

${err && err.message}

The rest of the plugin is still loaded. Please report this with the full error from the developer console (Help > Developer > Toggle DevTools).`
            });
            return false;
          }
        };
        step("model format", () => installFormat().teardown);
        step("export origin marker", installMarker);
        step("invariant pass", () => installNormalizePass(reportWarnings2));
        step("actions", installActions);
        step("scale hook", installScaleHook);
        step("resize remap", installResizeRemap);
        step("selection repair", installSelectionFix);
        step("Java exporter", installExport);
        step("simulation mode", installSimulation);
        step("nesting prompt", installNesting);
        step("Blockbench IK field hiding", installIkFieldHiding);
        step("bone visibility toggle", installBoneVisibility);
        console.log("[Marionette] loaded; format registered as", FORMAT_ID);
      },
      onunload() {
        for (const teardown of teardowns.reverse()) {
          try {
            teardown();
          } catch (err) {
            console.error("[Marionette] teardown step failed:", err);
          }
        }
        teardowns = [];
      }
    });
  })();
})();

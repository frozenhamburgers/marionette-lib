# Marionette Blockbench plugin

Authoring format for the [Marionette](https://github.com/frozenhamburgers/marionette-lib) procedural animation library
(Minecraft Forge 1.20.1). Verified against **Blockbench v5.1.6**.

Rig a limb as a chain of segments, watch the real FABRIK solver run in the
viewport, and export the entity, model and renderer classes ready to drop into
your mod.

```sh
npm install
npm run build     # -> dist/marionette.js
```

Install with Blockbench → **File → Plugins → Load Plugin from File** → pick
`dist/marionette.js`.

Usage docs for authors and artists are in the [wiki](../../../wiki).

# cubic_hero_chronicles
A PoC-type HTML5/JS quest game (in Russian language) to test from-scratch development of a JS game based on entity-component and coroutine oriented programming, along with its own node.js powered toolset

Toolchain prerequisites: node.js 10+
Install: `npm install` from the root folder
The chain sequence:

1. `res_gfx.js` specifies the graphics (backed by images in `res/*.png`).
The graphics that should be used in Tiled have additional specification
piece `{editor:...}` which specifies the object ID, as per
`l12_spec_map_items.js`, and the offset from the graphics top left corner
in Tiled to the object's logical pivot point (usually to center for small
passable objects, or to actual (unpadded) top left corner for the larger
objects).

2. `node tools/update_editor_gfx.js` creates the standalone images for
Tiled based on the editor-enabled graphics in `res_gfx.js` (respecting the
rotates and flips) and update the `tileset.gen/tileset.json` (the tileset
to plug into Tiled) and `tileset.gen/graph_id_reg.json`.

NOTE!!! Do not edit or delete the `graph_id_reg.json`, this must be only
done by the `update_editor_gfx.js` - otherwise the tile IDs in tileset.json
will mess up and become incorrectly mapped to the IDs in the map (see below).
Any other files under `tileset.gen` can be deleted, but the `graph_id_reg.json`
MUST be preserved, unless you are creating the map from scratch.

3. Tiled can be used to edit map - `src/hero_chronicle_map.json`. In order
to open it correctly, you must add tilesets `src/maptile.tsx` (for map tiles)
and `tileset.gen/tileset.json` (for map items).

4. After any map edits, `tools/compile_map.js` must be invoked to update the
compiled map resource.

5. `res_sfx.js` can be used to specify the SFXes, but it won't work directly
due to how fucking CORS works for sound resources. You will have to invoke
`tools/compile_res_sfx.js` to update the `res_sfx.gen.js` which is the one
actually linked.

There is similar tool `tools/compile_res_gfx.js` to produce `res_gfx.gen.js`
that can be linked instead of `res_gfx.js`, but `res_gfx.js` can be used as is
for dev/debug purposes.

5. The "debug" build is `test.html` and all script files linked via it. It
can be open in the browser right away and refreshed to see any changes (to
code, map, gfx or sfx) in effect. Keep steps 4 and 5 for map and sfx ones to
be properly updated.

6. `tools/assemble_release.js` compiles and assembles all resources into single
standalone file named `release.html`.

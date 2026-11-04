# Venture 3D Studio — Mission 2

The concept image is a separate 2D reference. The coach is a real animated GLB with 72 editable mesh parts. An additional editable leaf/hambone/dumbbell emblem is provided. Both are stylized procedural interpretations, not exact image reconstructions.

## Use the studio

1. Open the studio, drag to orbit, scroll to zoom and right-drag to pan. Front, side, top and isometric buttons frame the model. Perspective switches to orthographic.
2. Choose a component in Scene objects or click it in the viewport. Select whole model changes the complete model. Move, Rotate and Resize show handles; the inspector provides numerical entries and approximate dimensions.
3. Choose a color, finish, roughness, metallic value or opacity. Image textures work on meshes with UV coordinates, including the box and editable templates. The initial coach meshes mostly lack UV coordinates; the studio reports this explicitly. Add a box for a textured badge. Uploaded images remain separate references unless explicitly applied as a texture.
4. Save project writes a browser-local IndexedDB copy. Edits also autosave after 2.5 seconds. Download editable backup creates a portable JSON with geometry, textures, references, animations and project settings. Restore project opens it. Browser storage does not transfer between devices and may be cleared.
5. Confirm model validates geometry, exports a binary GLB, independently reimports it, creates a SHA-256 checksum, saves a confirmed snapshot and offers **Venture_3D_Confirmed_Handoff.zip**. Download the ZIP and carry the complete package into Mission 3. Restore last confirmed design returns to the saved confirmed snapshot.

The separate `viewer.html` loads `confirmed/model.glb` with a fresh Three.js loader, independent scene and camera. It also accepts another exported GLB.

## Handoff contents and stable schema

- `model.glb`: actual geometry, supported materials, embedded textures, and animation clips.
- `model-manifest.json`: schema `1.0.0`; integer handoff version; project/model names; type; ISO confirmation time; axis-aligned dimensions and units; preferred camera and environment; description; optional hotspot array; relative file names; SHA-256 checksum and byte count.
- `project.json`: editable snapshot with application identifier, schema version, metadata, environment, camera, separate reference data URLs, Three.js object JSON, animation clips, initial component transforms and animation time.
- `preview.png`: current camera and pose, with opaque background and without editing handles, axes or grid.
- `README.txt`: Mission 3 integration instructions, orientation and scale conversion.

Model coordinates use the project unit (initial coach: 180 cm tall). Y points up and +Z is front. A meter-based integration must multiply cm coordinates by 0.01, inches by 0.0254, or meters by 1. The manifest records the units explicitly. Unit changes convert geometry numerically to preserve physical size. The animation preview can differ from the GLB rest pose; clips are preserved in the export.

Animated joints use rigid parent-child transforms. Playback can override edits to those joints. Edit body meshes or leave playback paused for static design. Very large imports are limited to 50 MB. Uploaded GLBs must contain their textures; external URLs and Draco/KTX compressed imports are not supported. Arbitrary browser-native image-to-3D reconstruction is not implemented. Undo keeps the most recent 12 changes in memory; a portable backup is the durable way to retain older versions. Confirming never publishes or modifies the original venture website.

## Development and deployment

Pinned dependencies: Three.js 0.180.0, fflate 0.8.2 and Vite 6.1.0. This uses direct Three.js modules and browser-native controls to keep the editing application small; React is not required.

Use Node 22+, `corepack pnpm install --frozen-lockfile --ignore-scripts`, then `pnpm dev` or `pnpm build`. Vite's relative production base supports `/Creative-Website-/venture-studio/` without absolute asset paths. Build output goes to `dist/`. `viewer.html` is a second build entry. In local development only, confirming also writes a ZIP into `confirmed/` for artifact verification. The local endpoint does not exist in the production bundle.

The repository retains the existing venture pages unchanged. Studio source is in `mission-2-studio/`; production assets are served from `public/venture-studio/`, copied through the original website build. The deployment workflow rebuilds the studio before building the original website.

No paid services, account setup or API keys are required. Fonts can fall back to system fonts when offline; core scripts and 3D assets are bundled.

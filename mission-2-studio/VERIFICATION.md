# Mission 2 verification

Verified in the local studio and separate Three.js viewer on November 3, 2026 (America/New_York).

- Initial concept PNG appears as a separate reference; initial coach opens as 72 editable mesh parts with one animation clip.
- Added a second reference through the file chooser; both remained separate from geometry. Removed the test reference for the final handoff.
- Selected the athletic shirt from the object list; changed color, material preset and numeric X scale. The dimensions changed from 56.3 cm to 70.4 cm in width when X scale changed from 1 to 1.25. Reloading retained the edits.
- A texture attempt on a coach mesh without UVs produced a specific error. Added a box, applied a PNG texture through the file chooser, saved and reloaded. The restored model exported with two embedded image sources (original label plus uploaded texture). The test box was removed from the final design by reopening the original coach.
- Opened all seven templates with mesh counts 5, 4, 5, 10, 4, 10 and 5. Tested Undo and Redo between templates.
- Tested front and side camera presets and perspective/orthographic switching. OrbitControls provides orbit, wheel zoom and right-drag pan; visual gizmos and numerical transforms are wired to the selected component.
- Exported the scene, independently parsed its binary GLB with GLTFLoader, and reimported the resulting file through the studio's import control.
- Restored `project.json` through Restore project, including the independent concept reference.
- Confirmed the final design and inspected the ZIP: exactly model.glb, model-manifest.json, project.json, preview.png and README.txt. ZIP CRC checks passed. SHA-256 matches the manifest. Buffer bounds, mesh/material references and GLB length passed checks. The final model has 72 meshes and one animation clip.
- Khronos glTF validator: zero errors, zero warnings; one informational note about the 512×640 embedded label image. The image uses supported texture settings.
- Loaded the confirmed GLB in viewer.html, independent of the editing scene. Verified 72 parts and one clip; animation playback and materials rendered. Adjusted camera clipping planes to eliminate depth artifacts at the model's scale.
- Production Vite build succeeds with relative asset paths and separate studio/viewer entries. The root repository's existing CI also validates and rebuilds the studio before the venture website build.

The in-app browser's automation did not return a download event for the blob download link. The identical generated ZIP was saved through the local development artifact endpoint and verified on disk. The deployed browser download uses a standard Blob URL and download link; core editing and export require no server upload.

Limits are documented in README.md: stylized geometry rather than automatic reconstruction; rigid coach joints; textures require UVs; browser-local storage needs portable backups; compressed/external-asset GLBs are unsupported. No claim is made that arbitrary concept images can be accurately reconstructed in the browser.

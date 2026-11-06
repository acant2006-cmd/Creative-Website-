# Mission 3 — Threshold Fit interactive coach

Updated website: https://acant2006-cmd.github.io/Creative-Website-/

## What changed

The original hero was a scroll-controlled doorway video rather than a static product illustration. It is preserved and enhanced with an interactive coach beside the existing copy. The original type, forest-green/lime identity, text, links, sample-day planner, FAQ, $14.99 membership pricing, pricing page and Mission 2 studio remain in place. Only two lines were added to App.tsx; the viewer and responsive styles are isolated in CoachHero.tsx and coach.css.

The authoritative asset is **Threshold Fit lifting coach**, confirmed handoff version 3, November 4, 2026 at 2:36 PM America/New_York. Its SHA-256 is `ae3de9273220c71f7a36eb4cf9a69a02db90fdf9f40b9078d363e809f4ae5442`. This handoff has a later confirmation timestamp than the differently numbered older Desktop copy. The raw GLB is unchanged: 72 meshes, one curl animation, one embedded image, 5,534,028 bytes. Model coordinates remain centimeters, Y-up and +Z front. The camera uses the manifest direction and target, with distance adapted to each viewport; studio lighting is matched and the transparent background preserves the original hero composition.

Visitors can drag or touch to rotate, use zoom buttons, choose a side/front view, reset the view and optionally play/pause the existing curl animation. The focused model also accepts arrow keys, plus/minus and Home. Mouse-wheel zoom is intentionally disabled so the doorway scroll journey continues to work. Touch drags inside the model rotate it; visitors can scroll on the surrounding page.

Animation is off by default. The entrance transition is disabled under prefers-reduced-motion, and enabling that preference stops active curl playback. Explicitly choosing Play remains available. The 3D modules are dynamically imported, device pixel ratio is capped at 1.5, shadow resolution is 1024, and rendering pauses out of view or when the tab is hidden. WebGL initialization, model loading and context-loss failures reveal the confirmed preview image with the label “Static model preview.” A manual Static preview control is also provided at ordinary screen sizes.

## Verification — November 6, 2026

- ZIP CRC check passed; all five required files were present. Manifest schema, timestamp, dimensions, camera, project scene and PNG signature were readable. SHA-256 and model byte count matched. All GLB images and buffers are embedded.
- Khronos glTF validator: zero errors, zero warnings; one informational image-size note.
- TypeScript check and Vite production build passed. Vite reports a large Three.js chunk; it is dynamically loaded. No new runtime service is required.
- Browser-tested the production build under `/Creative-Website-/`, including desktop 1440×900, portrait 390×844 and 375×667, and landscape 844×390.
- Visually verified model framing, materials, shadows and text readability. Drag rotation, zoom controls, alternate view, reset and the confirmed animated curl were exercised. No runtime warnings/errors were logged on the final interactive page.
- Exercised static-preview selection and return to 3D. Separately built a temporary QA variant that throws at WebGL construction; it displayed the real preview and static label. Restored normal source and rebuilt before publication. No forced failure remains in the source or production bundle.
- Opened the mobile navigation drawer, navigated to the sample day, changed goal/time/meal selections, checked a step and followed the membership link. Pricing remained $14.99. The original scroll journey also continued to respond.
- Reduced-motion behavior was inspected in source; the browser tool does not expose OS preference emulation. Physical touch devices and every browser/GPU combination were not individually tested.
- `node scripts/validate-coach.mjs` now runs in the existing Pages workflow and rejects checksum or embedded-asset failures before publication.

Screenshots: [desktop](desktop.jpg), [mobile](mobile.jpg), [simulated unavailable WebGL](fallback.jpg).

## Source, recovery and updates

History is preserved. `backup/pre-mission-3-2026-11-06` retains the original website at `fb80d11`; `codex/mission-3-interactive-coach` contains the integration. The existing Pages workflow and base path are retained, with the additional model-integrity check.

For a new design, open `/venture-studio/`, restore the handoff's project.json, make edits, click Confirm model and keep the complete new ZIP. Supply that ZIP for another Mission 3 update. Validate it, replace only public/coach/model.glb, model-manifest.json, preview.png and README.txt, run the integrity check, type check and build, review framing, then publish. The portable editable project stays in the confirmed ZIP rather than being required by the customer-facing viewer.

The published model is a stylized brand mascot with rigid-joint animation, not a working AI coaching service or exact anatomical reconstruction. Existing concept disclosures are preserved. Publication is verified separately in the delivery status accompanying this report.

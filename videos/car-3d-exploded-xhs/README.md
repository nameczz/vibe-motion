# Code Exploded — Xiaohongshu cut

This is a separate 3:4 social cut of the reversible Three.js exploded-car prototype. The source model, runtime, and animation are local. Every visible assembly and camera move follows deterministic transforms calculated from HyperFrames `hf-seek` time.

The car material is art-directed in code against `assets/art-direction/premium-midnight-studio-reference-v1.png`: liquid midnight blue-black clearcoat, dark titanium secondary panels, smoked glass, dark machined wheels, amber brake pads, a local PMREM studio environment, and fixed area softboxes plus moving cyan/orange edge lights. There is no HUD or decorative background graphic; the car fills the frame. The original technical demo remains unchanged.

## Preview and validation

```bash
npm run dev -- --port 3022
npm run check -- --snapshots --at 0,0.6,1.05,1.72,2.2,3.3,3.9,5.5
```

Do not render until the preview is approved.

## Gesture prototype

Open `gesture.html` through the local preview server. After camera permission is granted, one open palm expands the car, one closed fist collapses it, and two-hand distance continuously controls the exploded state. Horizontal pointer dragging and the space bar remain available as camera-free fallbacks.

The gesture page uses MediaPipe Tasks Vision 1.0.1 and its standard gesture-recognizer model at runtime. Camera frames are processed in the browser; the page does not upload or retain them.

Model: Khronos Group glTF Sample Assets, `CarConcept.glb`. License and upstream notes are retained in `assets/`.

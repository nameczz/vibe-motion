# Gesture-controlled HTML

Use this mode when the user wants a webcam-driven product demo rather than a rendered transition.

## Architecture

Keep the 3D renderer independent from the recognizer. Expose a narrow controller such as:

```js
setExplodeProgress(progress, orbit)
```

`progress` is clamped to `0..1`. `orbit` is optional and usually clamped to `-1..1`. Send controller values with a function call, custom event, or `postMessage` when the recognizer and renderer live in separate frames.

## Recommended mapping

- `Open_Palm` → target progress `1`.
- `Closed_Fist` → target progress `0`.
- Two-hand palm distance → continuous progress.
- Palm horizontal position → restrained camera orbit.
- Thumb-to-index distance → optional continuous one-hand fallback.

Smooth the target instead of applying classifier output directly:

```js
current += (target - current) * 0.1;
```

Use a small dead zone or confidence threshold to avoid flicker. Retain the last stable state when no hand is found.

## Browser implementation

MediaPipe Tasks Vision Gesture Recognizer provides landmarks plus canned categories including `Open_Palm` and `Closed_Fist`. Use video or live-stream mode and monotonically increasing timestamps. Limit recognition to roughly 20–30 fps while rendering at display rate.

Provide an explicit user click before camera access, visible loading and permission-failure states, a small mirrored camera preview with landmark overlay when useful, pointer drag and keyboard fallback, and responsive scaling so a portrait stage remains usable in a landscape browser.

Camera frames should remain in the browser. Disclose any third-party runtime/model downloads and telemetry behavior. Never claim live-camera verification when permission was not granted during testing.

## Verification

Test HTML loading, model loading, full expand, full collapse, intermediate progress, no-hand hold, responsive layout, permission denial, and pointer fallback. Permission acceptance is a user action unless explicitly authorized.

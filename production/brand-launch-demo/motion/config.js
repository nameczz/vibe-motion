export const DEFAULT_LAYOUT_PARAMS = Object.freeze({
  videoWidth: 1920,
  videoHeight: 1080,
});

export const DEFAULT_ANIMATION_PARAMS = Object.freeze({
  durationSeconds: 15,
});

export const DEFAULT_MOTION_PROPS = Object.freeze({
  ...DEFAULT_LAYOUT_PARAMS,
  ...DEFAULT_ANIMATION_PARAMS,
});

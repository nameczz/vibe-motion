export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const lerp = (start: number, end: number, progress: number) =>
  start + (end - start) * progress;

export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => {
  const progress = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return lerp(outMin, outMax, progress);
};

export const easeInCubic = (t: number) => t * t * t;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const smoothstep = (t: number) => t * t * (3 - 2 * t);

export const nearlyEqual = (a: number, b: number, epsilon = 1e-6) =>
  Math.abs(a - b) <= epsilon;

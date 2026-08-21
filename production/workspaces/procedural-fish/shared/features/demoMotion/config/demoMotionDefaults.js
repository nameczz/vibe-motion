const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
};

const toInt = (value, fallback, min, max) =>
  Math.round(clamp(toNumber(value, fallback), min, max));

export const DEFAULT_DEMO_MOTION_PROPS = Object.freeze({
  renderMode: "school",
  videoWidth: 1920,
  videoHeight: 1080,
  speed: 1,
  orbitRadius: 160,
  fishScale: 0.66,
  maxStep: 16,
});

export const DEMO_MOTION_PARAM_FIELDS = Object.freeze([
  {
    key: "renderMode",
    label: "renderMode",
    control: "select",
    options: ["school", "fishVMorph"],
  },
  {
    key: "videoWidth",
    label: "videoWidth",
    control: "select",
    options: [480, 720, 1080, 1280, 1920],
  },
  {
    key: "videoHeight",
    label: "videoHeight",
    control: "select",
    options: [480, 720, 1080],
  },
  {
    key: "speed",
    label: "speed",
    control: "number",
    min: 0.2,
    max: 4,
    step: 0.1,
  },
  {
    key: "orbitRadius",
    label: "orbitRadius",
    control: "number",
    min: 20,
    max: 800,
    step: 1,
  },
  {
    key: "fishScale",
    label: "fishScale",
    control: "number",
    min: 0.2,
    max: 1.5,
    step: 0.01,
  },
  {
    key: "maxStep",
    label: "maxStep",
    control: "number",
    min: 1,
    max: 60,
    step: 1,
  },
]);

export const normalizeDemoMotionParamValue = ({ key, rawValue, currentValue } = {}) => {
  switch (key) {
    case "renderMode":
      return rawValue === "fishVMorph" ? "fishVMorph" : "school";
    case "videoWidth":
      return toInt(rawValue, DEFAULT_DEMO_MOTION_PROPS.videoWidth, 480, 1920);
    case "videoHeight":
      return toInt(rawValue, DEFAULT_DEMO_MOTION_PROPS.videoHeight, 480, 1080);
    case "speed":
      return clamp(toNumber(rawValue, DEFAULT_DEMO_MOTION_PROPS.speed), 0.2, 4);
    case "orbitRadius":
      return toInt(rawValue, DEFAULT_DEMO_MOTION_PROPS.orbitRadius, 20, 800);
    case "fishScale":
      return clamp(toNumber(rawValue, DEFAULT_DEMO_MOTION_PROPS.fishScale), 0.2, 1.5);
    case "maxStep":
      return toInt(rawValue, DEFAULT_DEMO_MOTION_PROPS.maxStep, 1, 60);
    default:
      return currentValue ?? rawValue;
  }
};

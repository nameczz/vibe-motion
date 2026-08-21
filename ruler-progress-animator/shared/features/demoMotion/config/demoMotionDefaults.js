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
  videoWidth: 1080,
  videoHeight: 1080,
  minPercent: 0,
  maxPercent: 100,
  phaseOneTargetPercent: 66,
  phaseThreeTargetPercent: 88,
  labelText: "vibe-motion",
  phaseOneDurationSeconds: 3.75,
  phaseTwoPauseSeconds: 0.45,
  phaseThreeDurationSeconds: 1.8,
  phaseOneEasePower: 3,
  majorTickValues: Object.freeze([0, 20, 40, 60, 80, 100]),
  milestoneLabels: Object.freeze([]),
  milestoneDurationSeconds: 6,
});

export const DEMO_MOTION_PARAM_FIELDS = Object.freeze([
  {
    key: "phaseOneTargetPercent",
    label: "phaseOneTargetPercent",
    control: "number",
    min: 0,
    max: 100,
    step: 1,
    section: "primary",
  },
  {
    key: "phaseThreeTargetPercent",
    label: "phaseThreeTargetPercent",
    control: "number",
    min: 0,
    max: 100,
    step: 1,
    section: "primary",
  },
  {
    key: "labelText",
    label: "labelText",
    control: "text",
    section: "primary",
  },
  {
    key: "phaseOneDurationSeconds",
    label: "phaseOneDurationSeconds",
    control: "number",
    min: 0.05,
    max: 30,
    step: 0.05,
    section: "primary",
  },
  {
    key: "phaseTwoPauseSeconds",
    label: "phaseTwoPauseSeconds",
    control: "number",
    min: 0,
    max: 10,
    step: 0.05,
    section: "primary",
  },
  {
    key: "phaseThreeDurationSeconds",
    label: "phaseThreeDurationSeconds",
    control: "number",
    min: 0.05,
    max: 30,
    step: 0.05,
    section: "primary",
  },
  {
    key: "videoWidth",
    label: "videoWidth",
    control: "number",
    min: 256,
    max: 3840,
    step: 1,
  },
  {
    key: "videoHeight",
    label: "videoHeight",
    control: "number",
    min: 256,
    max: 3840,
    step: 1,
  },
]);

export const normalizeDemoMotionParamValue = ({ key, rawValue, currentValue } = {}) => {
  switch (key) {
    case "phaseOneTargetPercent":
      return toInt(rawValue, DEFAULT_DEMO_MOTION_PROPS.phaseOneTargetPercent, 0, 100);
    case "phaseThreeTargetPercent":
      return toInt(rawValue, DEFAULT_DEMO_MOTION_PROPS.phaseThreeTargetPercent, 0, 100);
    case "labelText":
      return typeof rawValue === "string"
        ? rawValue
        : rawValue == null
          ? DEFAULT_DEMO_MOTION_PROPS.labelText
          : String(rawValue);
    case "phaseOneDurationSeconds":
      return clamp(toNumber(rawValue, DEFAULT_DEMO_MOTION_PROPS.phaseOneDurationSeconds), 0.05, 30);
    case "phaseTwoPauseSeconds":
      return clamp(
        toNumber(rawValue, DEFAULT_DEMO_MOTION_PROPS.phaseTwoPauseSeconds),
        0,
        10
      );
    case "phaseThreeDurationSeconds":
      return clamp(
        toNumber(rawValue, DEFAULT_DEMO_MOTION_PROPS.phaseThreeDurationSeconds),
        0.05,
        30
      );
    case "videoWidth":
      return toInt(rawValue, DEFAULT_DEMO_MOTION_PROPS.videoWidth, 256, 3840);
    case "videoHeight":
      return toInt(rawValue, DEFAULT_DEMO_MOTION_PROPS.videoHeight, 256, 3840);
    default:
      return currentValue ?? rawValue;
  }
};

import { SCREEN_HEIGHT, SCREEN_WIDTH, clamp } from "../scenes/chatMotionData.js";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
};

const toInt = (value, fallback, min, max) =>
  Math.round(clamp(toNumber(value, fallback), min, max));

export const DEFAULT_TEMPLATE_LAYOUT_PARAMS = Object.freeze({
  videoWidth: SCREEN_WIDTH,
  videoHeight: SCREEN_HEIGHT,
});

export const DEFAULT_DEMO_MOTION_ANIMATION_PARAMS = Object.freeze({});

export const DEFAULT_DEMO_MOTION_PLUGIN_PARAMS = Object.freeze({
  ...DEFAULT_TEMPLATE_LAYOUT_PARAMS,
  ...DEFAULT_DEMO_MOTION_ANIMATION_PARAMS,
});

export const DEFAULT_DEMO_MOTION_PROPS = DEFAULT_DEMO_MOTION_PLUGIN_PARAMS;

export const DEMO_MOTION_PARAM_FIELDS = Object.freeze([
  {
    key: "videoWidth",
    label: "videoWidth",
    control: "select",
    section: "layout",
    options: [390, 480, 540, 720, 1080, 1280, 1920],
  },
  {
    key: "videoHeight",
    label: "videoHeight",
    control: "select",
    section: "layout",
    options: [791, 844, 960, 1080, 1280, 1600],
  },
]);

export const normalizeDemoMotionParamValue = ({ key, rawValue, currentValue } = {}) => {
  switch (key) {
    case "videoWidth":
      return toInt(rawValue, DEFAULT_DEMO_MOTION_PLUGIN_PARAMS.videoWidth, 320, 1920);
    case "videoHeight":
      return toInt(rawValue, DEFAULT_DEMO_MOTION_PLUGIN_PARAMS.videoHeight, 480, 1600);
    default:
      return currentValue ?? rawValue;
  }
};

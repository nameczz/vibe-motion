import { DEFAULT_DEMO_MOTION_PLUGIN_PARAMS } from "../config/demoMotionDefaults.js";
import {
  CHAT_ITEMS,
  DEFAULT_FPS,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  buildTimeline,
  clamp,
  getScrollOffset,
  getVisibleEntries,
} from "./chatMotionData.js";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
};

const toInt = (value, fallback, min, max) =>
  Math.round(clamp(toNumber(value, fallback), min, max));

const toPositiveFrames = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.round(parsed));
};

const toFrame = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.floor(parsed));
};

export const resolveDemoMotionSceneContext = (pluginParams = {}) => {
  const videoWidth = toInt(
    pluginParams.videoWidth,
    DEFAULT_DEMO_MOTION_PLUGIN_PARAMS.videoWidth,
    320,
    1920
  );
  const videoHeight = toInt(
    pluginParams.videoHeight,
    DEFAULT_DEMO_MOTION_PLUGIN_PARAMS.videoHeight,
    480,
    1600
  );

  return {
    items: CHAT_ITEMS,
    layout: {
      videoWidth,
      videoHeight,
    },
  };
};

export const getDemoMotionDurationInFrames = ({ fps, sceneContext, pluginParams } = {}) => {
  const resolvedContext = sceneContext ?? resolveDemoMotionSceneContext(pluginParams ?? {});
  const resolvedFps = toPositiveFrames(fps, DEFAULT_FPS);
  return buildTimeline(resolvedContext.items, resolvedFps).durationInFrames;
};

export const buildDemoMotionSceneProps = ({
  frame = 0,
  fps,
  loop = false,
  sceneContext,
  pluginParams,
} = {}) => {
  const resolvedContext = sceneContext ?? resolveDemoMotionSceneContext(pluginParams ?? {});
  const resolvedFps = toPositiveFrames(fps, DEFAULT_FPS);
  const timeline = buildTimeline(resolvedContext.items, resolvedFps);

  const rawFrame = toFrame(frame, 0);
  const boundedFrame = loop
    ? rawFrame % timeline.durationInFrames
    : Math.min(rawFrame, timeline.durationInFrames - 1);
  const visibleEntries = getVisibleEntries({
    items: resolvedContext.items,
    currentFrame: boundedFrame,
    slotsByIndex: timeline.slotsByIndex,
  });
  const scrollOffset = getScrollOffset({
    visibleEntries,
    currentFrame: boundedFrame,
    slotsByIndex: timeline.slotsByIndex,
  });

  return {
    ...resolvedContext,
    durationInFrames: timeline.durationInFrames,
    currentFrame: boundedFrame,
    fps: resolvedFps,
    visibleEntries,
    slotsByIndex: timeline.slotsByIndex,
    scrollOffset,
    baseLayout: {
      videoWidth: SCREEN_WIDTH,
      videoHeight: SCREEN_HEIGHT,
    },
  };
};

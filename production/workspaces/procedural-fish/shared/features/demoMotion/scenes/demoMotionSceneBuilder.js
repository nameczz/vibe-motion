import { DEFAULT_DEMO_MOTION_PROPS } from "../config/demoMotionDefaults.js";
import { FISH_V_MORPH_DURATION_SECONDS } from "./fishVMorphRenderer.js";

const TAU = Math.PI * 2;
const BASE_LOOP_SECONDS = 3;

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
    DEFAULT_DEMO_MOTION_PROPS.videoWidth,
    480,
    1920
  );
  const videoHeight = toInt(
    pluginParams.videoHeight,
    DEFAULT_DEMO_MOTION_PROPS.videoHeight,
    480,
    1080
  );

  return {
    renderMode:
      pluginParams.renderMode === "fishVMorph" ? "fishVMorph" : "school",
    speed: clamp(toNumber(pluginParams.speed, DEFAULT_DEMO_MOTION_PROPS.speed), 0.2, 4),
    orbitRadius: toInt(
      pluginParams.orbitRadius,
      DEFAULT_DEMO_MOTION_PROPS.orbitRadius,
      20,
      800
    ),
    fishScale: clamp(
      toNumber(pluginParams.fishScale, DEFAULT_DEMO_MOTION_PROPS.fishScale),
      0.2,
      1.5
    ),
    maxStep: toInt(pluginParams.maxStep, DEFAULT_DEMO_MOTION_PROPS.maxStep, 1, 60),
    layout: {
      videoWidth,
      videoHeight,
    },
  };
};

export const getDemoMotionDurationInFrames = ({ fps, sceneContext, pluginParams } = {}) => {
  const resolvedContext = sceneContext ?? resolveDemoMotionSceneContext(pluginParams ?? {});
  const resolvedFps = toPositiveFrames(fps, 30);
  if (resolvedContext.renderMode === "fishVMorph") {
    return toPositiveFrames(FISH_V_MORPH_DURATION_SECONDS * resolvedFps, resolvedFps);
  }

  const baseFrames = toPositiveFrames(BASE_LOOP_SECONDS * resolvedFps, resolvedFps);
  return toPositiveFrames(baseFrames / resolvedContext.speed, 1);
};

export const buildDemoMotionSceneProps = ({
  frame = 0,
  fps,
  loop = false,
  sceneContext,
  pluginParams,
} = {}) => {
  const resolvedContext = sceneContext ?? resolveDemoMotionSceneContext(pluginParams ?? {});
  const durationInFrames = getDemoMotionDurationInFrames({
    fps,
    sceneContext: resolvedContext,
  });

  const rawFrame = toFrame(frame, 0);
  const boundedFrame = loop
    ? rawFrame % durationInFrames
    : Math.min(rawFrame, durationInFrames - 1);

  const minEdge = Math.max(
    1,
    Math.min(resolvedContext.layout.videoWidth, resolvedContext.layout.videoHeight)
  );
  const orbitRatio = clamp(resolvedContext.orbitRadius / minEdge, 0.05, 0.48);
  const angularSpeed = durationInFrames <= 0 ? 0 : TAU / durationInFrames;

  return {
    ...resolvedContext,
    durationInFrames,
    frame: boundedFrame,
    orbitRatio,
    angularSpeed,
    cycleFrames: durationInFrames,
  };
};

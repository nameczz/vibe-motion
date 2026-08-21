import { DEFAULT_DEMO_MOTION_PROPS } from "../config/demoMotionDefaults.js";

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

const toString = (value, fallback) => {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return fallback;
  }

  return String(value);
};

const toPositiveFrames = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.round(parsed));
};

const toProgress01 = (frame, frameCount) => {
  if (frameCount <= 1) {
    return 1;
  }
  return clamp(frame / (frameCount - 1), 0, 1);
};

const easeOutPow = (t, power) => 1 - (1 - clamp(t, 0, 1)) ** power;
const smoothstep = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const PHASE_THREE_EASE_POWER = 3;
const PHASE_THREE_MOVE_PORTION = 2 / 3;
const MILESTONE_HOLD_WEIGHT = 0.55;
const MILESTONE_MOVE_WEIGHT = 1;

const normalizeMilestoneLabels = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((label) => (typeof label === "string" ? label.trim() : String(label ?? "").trim()))
    .filter((label) => label.length > 0);
};

const normalizeHexColor = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : null;
};

const normalizeMilestoneColors = (value, expectedCount) => {
  if (!Array.isArray(value) || value.length !== expectedCount) {
    return [];
  }

  const colors = value.map(normalizeHexColor);
  return colors.every(Boolean) ? colors : [];
};

const resolveMilestoneValues = ({ count, minPercent, maxPercent }) => {
  if (count <= 1) {
    return [minPercent];
  }

  return Array.from(
    { length: count },
    (_, index) => minPercent + ((maxPercent - minPercent) * index) / (count - 1)
  );
};

const resolveMilestoneMotionForProgress = ({ progress, milestoneValues }) => {
  const finalIndex = Math.max(0, milestoneValues.length - 1);
  const totalWeight =
    milestoneValues.length * MILESTONE_HOLD_WEIGHT + finalIndex * MILESTONE_MOVE_WEIGHT;
  let remainingWeight = clamp(progress, 0, 1) * totalWeight;

  for (let index = 0; index <= finalIndex; index += 1) {
    if (remainingWeight <= MILESTONE_HOLD_WEIGHT || index === finalIndex) {
      return {
        activeMilestoneIndex: index,
        handleLeftPercent: milestoneValues[index],
      };
    }

    remainingWeight -= MILESTONE_HOLD_WEIGHT;
    const moveProgress = clamp(remainingWeight / MILESTONE_MOVE_WEIGHT, 0, 1);
    if (moveProgress < 1) {
      const easedProgress = smoothstep(moveProgress);
      return {
        activeMilestoneIndex: moveProgress < 0.5 ? index : index + 1,
        handleLeftPercent:
          milestoneValues[index] +
          (milestoneValues[index + 1] - milestoneValues[index]) * easedProgress,
      };
    }

    remainingWeight -= MILESTONE_MOVE_WEIGHT;
  }

  return {
    activeMilestoneIndex: finalIndex,
    handleLeftPercent: milestoneValues[finalIndex],
  };
};

const resolvePhaseThreeMoveFrames = (phaseThreeFrames) =>
  Math.max(1, Math.round(Math.max(1, phaseThreeFrames) * PHASE_THREE_MOVE_PORTION));

const resolveParamWithLegacyFallback = ({ modernValue, legacyValue, defaultValue }) => {
  const modern = Number(modernValue);
  const legacy = Number(legacyValue);
  const hasModern = Number.isFinite(modern);
  const hasLegacy = Number.isFinite(legacy);

  if (hasModern && (!hasLegacy || modern !== defaultValue)) {
    return modern;
  }

  if (hasLegacy) {
    return legacy;
  }

  return defaultValue;
};

const resolveStringParamWithLegacyFallback = ({ modernValue, legacyValue, defaultValue }) => {
  const hasModern = typeof modernValue === "string";
  const hasLegacy = typeof legacyValue === "string";

  if (hasModern && (!hasLegacy || modernValue !== defaultValue)) {
    return modernValue;
  }

  if (hasLegacy) {
    return legacyValue;
  }

  if (hasModern) {
    return modernValue;
  }

  return defaultValue;
};

const resolvePhaseTimingFrames = ({ fps, sceneContext }) => {
  const resolvedFps = toPositiveFrames(fps, 30);
  const phaseOneFrames = toPositiveFrames(
    sceneContext.phaseOneDurationSeconds * resolvedFps,
    resolvedFps
  );
  const phaseTwoPauseFrames = Math.max(0, Math.round(sceneContext.phaseTwoPauseSeconds * resolvedFps));
  const phaseThreeFrames = toPositiveFrames(
    sceneContext.phaseThreeDurationSeconds * resolvedFps,
    resolvedFps
  );
  const durationInFrames = Math.max(1, phaseOneFrames + phaseTwoPauseFrames + phaseThreeFrames);

  return {
    resolvedFps,
    phaseOneFrames,
    phaseTwoPauseFrames,
    phaseThreeFrames,
    durationInFrames,
  };
};

const resolveHandleLeftPercentForFrame = ({
  frame,
  phaseOneFrames,
  phaseTwoPauseFrames,
  phaseThreeFrames,
  startPercent,
  phaseOneTargetPercent,
  phaseThreeTargetPercent,
  phaseOneEasePower,
}) => {
  const safeFrame = Math.max(0, Math.round(Number(frame) || 0));
  const phaseOneEndFrame = phaseOneFrames - 1;
  const phaseTwoPauseEndFrame = phaseOneFrames + phaseTwoPauseFrames - 1;

  if (safeFrame <= phaseOneEndFrame) {
    const phaseOneProgress = toProgress01(safeFrame, phaseOneFrames);
    const eased = easeOutPow(phaseOneProgress, phaseOneEasePower);
    return startPercent + (phaseOneTargetPercent - startPercent) * eased;
  }

  if (safeFrame <= phaseTwoPauseEndFrame) {
    return phaseOneTargetPercent;
  }

  const phaseThreeFrame = safeFrame - (phaseTwoPauseEndFrame + 1);
  const phaseThreeMoveFrames = resolvePhaseThreeMoveFrames(phaseThreeFrames);
  if (phaseThreeFrame >= phaseThreeMoveFrames) {
    return phaseThreeTargetPercent;
  }

  const phaseProgress = toProgress01(phaseThreeFrame, phaseThreeMoveFrames);
  const eased = easeOutPow(phaseProgress, PHASE_THREE_EASE_POWER);
  return phaseOneTargetPercent + (phaseThreeTargetPercent - phaseOneTargetPercent) * eased;
};

export const resolveDemoMotionSceneContext = (pluginParams = {}) => {
  const videoWidth = toInt(pluginParams.videoWidth, DEFAULT_DEMO_MOTION_PROPS.videoWidth, 256, 3840);
  const videoHeight = toInt(
    pluginParams.videoHeight,
    DEFAULT_DEMO_MOTION_PROPS.videoHeight,
    256,
    3840
  );
  const phaseOneDurationSeconds = clamp(
    toNumber(
      pluginParams.phaseOneDurationSeconds,
      DEFAULT_DEMO_MOTION_PROPS.phaseOneDurationSeconds
    ),
    0.05,
    30
  );
  const phaseTwoPauseSeconds = clamp(
    resolveParamWithLegacyFallback({
      modernValue: pluginParams.phaseTwoPauseSeconds,
      legacyValue: pluginParams.pauseSeconds,
      defaultValue: DEFAULT_DEMO_MOTION_PROPS.phaseTwoPauseSeconds,
    }),
    0,
    10
  );
  const phaseThreeDurationSeconds = clamp(
    resolveParamWithLegacyFallback({
      modernValue: pluginParams.phaseThreeDurationSeconds,
      legacyValue: pluginParams.phaseTwoDurationSeconds,
      defaultValue: DEFAULT_DEMO_MOTION_PROPS.phaseThreeDurationSeconds,
    }),
    0.05,
    30
  );
  const milestoneLabels = normalizeMilestoneLabels(pluginParams.milestoneLabels);
  const milestoneColors = normalizeMilestoneColors(
    pluginParams.milestoneColors,
    milestoneLabels.length
  );
  const milestoneTickLabelColor = normalizeHexColor(pluginParams.milestoneTickLabelColor);
  const milestoneDurationSeconds = clamp(
    toNumber(
      pluginParams.milestoneDurationSeconds,
      DEFAULT_DEMO_MOTION_PROPS.milestoneDurationSeconds
    ),
    0.1,
    60
  );
  const milestoneValues = resolveMilestoneValues({
    count: milestoneLabels.length,
    minPercent: DEFAULT_DEMO_MOTION_PROPS.minPercent,
    maxPercent: DEFAULT_DEMO_MOTION_PROPS.maxPercent,
  });

  return {
    minPercent: DEFAULT_DEMO_MOTION_PROPS.minPercent,
    maxPercent: DEFAULT_DEMO_MOTION_PROPS.maxPercent,
    phaseOneTargetPercent: clamp(
      toNumber(
        pluginParams.phaseOneTargetPercent,
        DEFAULT_DEMO_MOTION_PROPS.phaseOneTargetPercent
      ),
      DEFAULT_DEMO_MOTION_PROPS.minPercent,
      DEFAULT_DEMO_MOTION_PROPS.maxPercent
    ),
    phaseThreeTargetPercent: clamp(
      toNumber(
        pluginParams.phaseThreeTargetPercent,
        DEFAULT_DEMO_MOTION_PROPS.phaseThreeTargetPercent
      ),
      DEFAULT_DEMO_MOTION_PROPS.minPercent,
      DEFAULT_DEMO_MOTION_PROPS.maxPercent
    ),
    labelText: toString(
      resolveStringParamWithLegacyFallback({
        modernValue: pluginParams.labelText,
        legacyValue: pluginParams.seedanceLabelText,
        defaultValue: DEFAULT_DEMO_MOTION_PROPS.labelText,
      }),
      DEFAULT_DEMO_MOTION_PROPS.labelText
    ),
    phaseOneDurationSeconds,
    phaseTwoPauseSeconds,
    // Backward-compatible alias for any code that still expects the old key.
    pauseSeconds: phaseTwoPauseSeconds,
    phaseThreeDurationSeconds,
    // Backward-compatible alias for any code that still expects the old key.
    phaseTwoDurationSeconds: phaseThreeDurationSeconds,
    phaseOneEasePower: DEFAULT_DEMO_MOTION_PROPS.phaseOneEasePower,
    milestoneLabels,
    milestoneColors,
    milestoneTickLabelColor,
    milestoneDurationSeconds,
    milestoneValues,
    majorTickValues:
      milestoneLabels.length >= 2
        ? milestoneValues
        : DEFAULT_DEMO_MOTION_PROPS.majorTickValues,
    durationSeconds:
      milestoneLabels.length >= 2
        ? milestoneDurationSeconds
        : phaseOneDurationSeconds + phaseTwoPauseSeconds + phaseThreeDurationSeconds,
    layout: {
      videoWidth,
      videoHeight,
    },
  };
};

export const getDemoMotionDurationInFrames = ({ fps, sceneContext, pluginParams } = {}) => {
  const resolvedContext = sceneContext ?? resolveDemoMotionSceneContext(pluginParams ?? {});
  if (resolvedContext.milestoneLabels.length >= 2) {
    return toPositiveFrames(
      resolvedContext.milestoneDurationSeconds * toPositiveFrames(fps, 30),
      toPositiveFrames(fps, 30)
    );
  }

  return resolvePhaseTimingFrames({
    fps,
    sceneContext: resolvedContext,
  }).durationInFrames;
};

export const buildDemoMotionSceneProps = ({
  frame,
  fps,
  sceneContext,
  pluginParams,
} = {}) => {
  const resolvedContext = sceneContext ?? resolveDemoMotionSceneContext(pluginParams ?? {});
  const durationInFrames = getDemoMotionDurationInFrames({
    fps,
    sceneContext: resolvedContext,
  });
  const { phaseOneFrames, phaseTwoPauseFrames, phaseThreeFrames } = resolvePhaseTimingFrames({
    fps,
    sceneContext: resolvedContext,
  });
  const safeFrame = clamp(Math.round(Number(frame) || 0), 0, Math.max(0, durationInFrames - 1));
  const progress = durationInFrames <= 1 ? 0 : safeFrame / Math.max(1, durationInFrames - 1);

  if (resolvedContext.milestoneLabels.length >= 2) {
    const milestoneMotion = resolveMilestoneMotionForProgress({
      progress,
      milestoneValues: resolvedContext.milestoneValues,
    });

    return {
      ...resolvedContext,
      durationInFrames,
      frame: safeFrame,
      progress,
      phaseOneProgress: 1,
      phaseThreeProgress: 0,
      phaseThreeMoveProgress: 0,
      cameraReengageProgress: 0,
      cameraTrackedHandleLeftPercent: milestoneMotion.handleLeftPercent,
      ...milestoneMotion,
    };
  }

  const startPercent = resolvedContext.minPercent;
  const endPercent = resolvedContext.maxPercent;
  const phaseOneTargetPercent = clamp(
    toNumber(
      resolvedContext.phaseOneTargetPercent,
      DEFAULT_DEMO_MOTION_PROPS.phaseOneTargetPercent
    ),
    startPercent,
    endPercent
  );
  const phaseThreeTargetPercent = clamp(
    toNumber(
      resolvedContext.phaseThreeTargetPercent,
      DEFAULT_DEMO_MOTION_PROPS.phaseThreeTargetPercent
    ),
    startPercent,
    endPercent
  );

  const phaseOneEndFrame = phaseOneFrames - 1;
  const phaseTwoPauseEndFrame = phaseOneFrames + phaseTwoPauseFrames - 1;
  const phaseThreeStartFrame = phaseTwoPauseEndFrame + 1;
  const phaseThreeMoveFrames = resolvePhaseThreeMoveFrames(phaseThreeFrames);
  const phaseOneProgress = safeFrame <= phaseOneEndFrame ? toProgress01(safeFrame, phaseOneFrames) : 1;
  const phaseThreeProgress =
    safeFrame < phaseThreeStartFrame
      ? 0
      : clamp(
          (safeFrame - phaseThreeStartFrame) / Math.max(1, Math.max(1, phaseThreeFrames) - 1),
          0,
          1
        );
  const phaseThreeMoveProgress =
    safeFrame < phaseThreeStartFrame
      ? 0
      : clamp(
          (safeFrame - phaseThreeStartFrame) / Math.max(1, phaseThreeMoveFrames - 1),
          0,
          1
        );

  const handleLeftPercent = resolveHandleLeftPercentForFrame({
    frame: safeFrame,
    phaseOneFrames,
    phaseTwoPauseFrames,
    phaseThreeFrames,
    startPercent,
    phaseOneTargetPercent,
    phaseThreeTargetPercent,
    phaseOneEasePower: resolvedContext.phaseOneEasePower,
  });

  const phaseThreeStartFrameForCamera = phaseTwoPauseEndFrame + 1;
  const cameraMotionStartFrame =
    phaseTwoPauseFrames > 0
      ? phaseOneFrames + Math.floor((phaseTwoPauseFrames * 2) / 3)
      : phaseThreeStartFrameForCamera;
  const rawCameraMotionEndFrame =
    phaseThreeStartFrameForCamera + Math.floor((Math.max(1, phaseThreeFrames) - 1) * PHASE_THREE_MOVE_PORTION);
  const cameraMotionEndFrame = Math.max(cameraMotionStartFrame, rawCameraMotionEndFrame);
  const cameraTrackedFrame = clamp(safeFrame, cameraMotionStartFrame, cameraMotionEndFrame);
  const cameraReengageProgress =
    cameraMotionEndFrame <= cameraMotionStartFrame
      ? safeFrame >= cameraMotionEndFrame
        ? 1
        : 0
      : clamp(
          (safeFrame - cameraMotionStartFrame) / (cameraMotionEndFrame - cameraMotionStartFrame),
          0,
          1
        );
  const cameraTrackedHandleLeftPercent = resolveHandleLeftPercentForFrame({
    frame: cameraTrackedFrame,
    phaseOneFrames,
    phaseTwoPauseFrames,
    phaseThreeFrames,
    startPercent,
    phaseOneTargetPercent,
    phaseThreeTargetPercent,
    phaseOneEasePower: resolvedContext.phaseOneEasePower,
  });

  return {
    ...resolvedContext,
    durationInFrames,
    frame: safeFrame,
    progress,
    phaseOneProgress,
    phaseThreeProgress,
    phaseThreeMoveProgress,
    cameraReengageProgress,
    cameraTrackedHandleLeftPercent,
    handleLeftPercent: clamp(handleLeftPercent, startPercent, endPercent),
  };
};

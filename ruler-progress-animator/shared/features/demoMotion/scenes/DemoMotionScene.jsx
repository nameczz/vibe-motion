import React, { useEffect, useMemo } from "react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, ratio) => start + (end - start) * clamp(ratio, 0, 1);

const toPercent = (value, min, max) => {
  if (max <= min) {
    return 50;
  }
  return ((value - min) / (max - min)) * 100;
};

const hexToRgb = (hex) => {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((x) => `${x}${x}`).join("") : normalized;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

const mixHex = (startHex, endHex, ratio) => {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  const t = clamp(ratio, 0, 1);
  const toHex = (channel) => Math.round(channel).toString(16).padStart(2, "0");

  return `#${toHex(start.r + (end.r - start.r) * t)}${toHex(start.g + (end.g - start.g) * t)}${toHex(
    start.b + (end.b - start.b) * t
  )}`;
};

const COOL_COLOR = "#1d4ed8";
const PHASE_ONE_TARGET_COLOR = "#dd6c67";
const PHASE_TWO_TARGET_COLOR = "#ff3b1f";
const PHASE_TWO_PEAK_COLOR = "#ff2a12";
const PHASE_TWO_RED_BOOST_START = 0.78;
const PHASE_TWO_RED_BOOST_GAMMA = 1.9;
const smoothstep = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const toAnchoredColor = (ratio, anchorRatio) => {
  const safeRatio = clamp(ratio, 0, 1);
  const safeAnchorRatio = clamp(anchorRatio, 0.05, 0.95);

  if (safeRatio <= safeAnchorRatio) {
    const t = safeRatio / safeAnchorRatio;
    return mixHex(COOL_COLOR, PHASE_ONE_TARGET_COLOR, smoothstep(t));
  }

  const tRaw = clamp((safeRatio - safeAnchorRatio) / (1 - safeAnchorRatio), 0, 1);
  const t = tRaw ** PHASE_TWO_RED_BOOST_GAMMA;
  const boostT = clamp(
    (tRaw - PHASE_TWO_RED_BOOST_START) / Math.max(0.0001, 1 - PHASE_TWO_RED_BOOST_START),
    0,
    1
  );
  const boostedWarm = mixHex(PHASE_TWO_TARGET_COLOR, PHASE_TWO_PEAK_COLOR, smoothstep(boostT));
  return mixHex(PHASE_ONE_TARGET_COLOR, boostedWarm, t);
};

const toPaletteColor = (ratio, colors) => {
  if (!Array.isArray(colors) || colors.length < 2) {
    return null;
  }

  const palettePosition = clamp(ratio, 0, 1) * (colors.length - 1);
  const startIndex = Math.min(Math.floor(palettePosition), colors.length - 2);
  const segmentProgress = palettePosition - startIndex;
  return mixHex(colors[startIndex], colors[startIndex + 1], smoothstep(segmentProgress));
};

const TICK_STEP = 2;
const CAMERA_START_SCALE = 1.34;
const CAMERA_MAX_TRACK_X = 460;
const CAMERA_REENGAGE_END_SCALE = 1.18;
const CAMERA_PHASE_THREE_TRACK_LEFT_OFFSET = 2;
const LABEL_FONT_SIZE_PX = 60;
const LABEL_LETTER_SPACING_EM = -0.02;
const LABEL_ASCII_CHAR_WIDTH_EM = 0.6;
const LABEL_WIDE_CHAR_WIDTH_EM = 1;
const RULER_MAX_WIDTH_PX = 920;
const STAGE_HORIZONTAL_PADDING_RATIO = 0.08;

const estimateLabelCharacterWidthPx = (character) => {
  const codePoint = character.codePointAt(0) ?? 0;
  const isAscii = codePoint <= 0x7f;
  const widthEm = isAscii ? LABEL_ASCII_CHAR_WIDTH_EM : LABEL_WIDE_CHAR_WIDTH_EM;
  return LABEL_FONT_SIZE_PX * widthEm;
};

const truncateLabelToWidth = (text, maxWidthPx) => {
  if (typeof text !== "string" || text.length === 0 || maxWidthPx <= 0) {
    return "";
  }

  const letterSpacingPx = LABEL_FONT_SIZE_PX * LABEL_LETTER_SPACING_EM;
  let width = 0;
  let index = 0;
  let output = "";

  for (const character of text) {
    const characterWidth = estimateLabelCharacterWidthPx(character);
    const nextWidth = width + (index === 0 ? 0 : letterSpacingPx) + characterWidth;
    if (nextWidth > maxWidthPx) {
      break;
    }
    output += character;
    width = nextWidth;
    index += 1;
  }

  return output;
};

export const DemoMotionScene = ({
  minPercent,
  maxPercent,
  majorTickValues,
  milestoneLabels,
  milestoneColors,
  milestoneTickLabelColor,
  activeMilestoneIndex,
  layout,
  labelText,
  handleLeftPercent,
  cameraTrackedHandleLeftPercent,
  cameraReengageProgress,
  phaseOneTargetPercent,
  phaseOneProgress,
  phaseThreeProgress,
  phaseThreeMoveProgress,
  progress,
  onAutoLayoutReady,
}) => {
  useEffect(() => {
    onAutoLayoutReady?.();
  }, [onAutoLayoutReady]);

  const ticks = useMemo(() => {
    const result = [];
    for (let value = minPercent; value <= maxPercent; value += TICK_STEP) {
      result.push(value);
    }
    return result;
  }, [maxPercent, minPercent]);

  const majorTickSet = useMemo(
    () => new Set(Array.isArray(majorTickValues) ? majorTickValues : []),
    [majorTickValues]
  );
  const safeMajorTickValues = Array.isArray(majorTickValues) ? majorTickValues : [];
  const safeMilestoneLabels = Array.isArray(milestoneLabels) ? milestoneLabels : [];
  const safeMilestoneColors = Array.isArray(milestoneColors) ? milestoneColors : [];
  const milestoneMode = safeMilestoneLabels.length >= 2;
  const safeActiveMilestoneIndex = clamp(
    Math.round(Number(activeMilestoneIndex) || 0),
    0,
    Math.max(0, safeMilestoneLabels.length - 1)
  );
  const safeHandleLeft = clamp(handleLeftPercent ?? 50, minPercent, maxPercent);
  const safeTrackedHandleLeft = clamp(
    cameraTrackedHandleLeftPercent ?? safeHandleLeft,
    minPercent,
    maxPercent
  );
  const safePhaseOneProgress = clamp(phaseOneProgress ?? 1, 0, 1);
  const safePhaseThreeProgress = clamp(phaseThreeProgress ?? 0, 0, 1);
  const safePhaseThreeMoveProgress = clamp(phaseThreeMoveProgress ?? safePhaseThreeProgress, 0, 1);
  const safeCameraReengageProgress = clamp(cameraReengageProgress ?? 0, 0, 1);
  const cameraPullbackT = smoothstep(safePhaseOneProgress);
  const cameraReengageT = smoothstep(safeCameraReengageProgress);
  const cameraScale = milestoneMode
    ? 1
    : lerp(CAMERA_START_SCALE, 1, cameraPullbackT)
      * lerp(1, CAMERA_REENGAGE_END_SCALE, cameraReengageT);
  const cameraFollowWeight = 1 - cameraPullbackT;
  const handleRatio = clamp(toPercent(safeHandleLeft, minPercent, maxPercent) / 100, 0, 1);
  const phaseThreeCameraOffsetWeight = smoothstep(safePhaseThreeMoveProgress);
  const trackedCameraTargetPercent = clamp(
    safeTrackedHandleLeft - CAMERA_PHASE_THREE_TRACK_LEFT_OFFSET * phaseThreeCameraOffsetWeight,
    minPercent,
    maxPercent
  );
  const trackedHandleRatio = clamp(toPercent(trackedCameraTargetPercent, minPercent, maxPercent) / 100, 0, 1);
  const phaseOneAnchorRatio = clamp(
    toPercent(phaseOneTargetPercent ?? 66, minPercent, maxPercent) / 100,
    0,
    1
  );
  const phaseOneAnchorPercent = clamp(phaseOneTargetPercent ?? 66, minPercent, maxPercent);
  const phaseOneAnchorLeft = toPercent(phaseOneAnchorPercent, minPercent, maxPercent);
  const leftBoundaryPercentValue = clamp(0, minPercent, maxPercent);
  const seedanceLabelCenterPercentValue =
    leftBoundaryPercentValue + (phaseOneAnchorPercent - leftBoundaryPercentValue) * 0.5;
  const seedanceLabelLeft = toPercent(seedanceLabelCenterPercentValue, minPercent, maxPercent);
  const seedanceSegmentPercent = Math.max(
    0,
    phaseOneAnchorLeft - toPercent(leftBoundaryPercentValue, minPercent, maxPercent)
  );
  const resolvedLayoutWidth = clamp(Number(layout?.videoWidth) || 1080, 256, 3840);
  const rulerWidthPx = Math.min(
    RULER_MAX_WIDTH_PX,
    resolvedLayoutWidth * (1 - STAGE_HORIZONTAL_PADDING_RATIO * 2)
  );
  const seedanceLabelAvailableWidthPx = (rulerWidthPx * seedanceSegmentPercent) / 100;
  const visibleLabelText = truncateLabelToWidth(
    typeof labelText === "string" ? labelText : "vibe-motion",
    seedanceLabelAvailableWidthPx
  );
  const seedanceRevealBoundary = toPercent(safeHandleLeft, minPercent, maxPercent);
  const seedanceRevealClipPath = `inset(0 ${100 - seedanceRevealBoundary}% 0 0)`;
  const cameraTranslateX = milestoneMode
    ? 0
    : (0.5 - handleRatio) * CAMERA_MAX_TRACK_X * 2 * cameraFollowWeight
      + (0.5 - trackedHandleRatio) * CAMERA_MAX_TRACK_X * 2 * cameraReengageT;
  const safeProgress = clamp(progress ?? 0, 0, 1);
  const currentPercent = Math.round(safeHandleLeft);
  const currentHandleLabel = milestoneMode
    ? safeMilestoneLabels[safeActiveMilestoneIndex]
    : `${currentPercent}%`;
  const paletteColor = milestoneMode
    ? toPaletteColor(handleRatio, safeMilestoneColors)
    : null;
  const currentPercentColor = paletteColor ?? toAnchoredColor(handleRatio, phaseOneAnchorRatio);
  const rulerTopColor = milestoneMode
    ? mixHex(currentPercentColor, "#080a0f", 0.58)
    : mixHex(currentPercentColor, "#000000", 0.3);
  const rulerBottomColor = milestoneMode
    ? mixHex(currentPercentColor, "#10121a", 0.68)
    : mixHex(currentPercentColor, "#0f172a", 0.12);
  const handleTopColor = milestoneMode
    ? mixHex(currentPercentColor, "#ffffff", 0.06)
    : mixHex(currentPercentColor, "#000000", 0.22);
  const handleBottomColor = milestoneMode
    ? mixHex(currentPercentColor, "#080a0f", 0.1)
    : mixHex(currentPercentColor, "#0f172a", 0.16);
  const tickColor = milestoneMode ? "rgba(255,247,232,0.58)" : "rgba(0,0,0,0.78)";
  const tickLabelColor = milestoneMode
    ? milestoneTickLabelColor ?? "#f4ebdd"
    : "rgba(0,0,0,0.92)";
  const phaseAnchorReveal = smoothstep(clamp(safePhaseThreeProgress / 0.2, 0, 1));
  const cursorDistanceToAnchor = Math.abs(toPercent(safeHandleLeft, minPercent, maxPercent) - phaseOneAnchorLeft);
  const overlapT = clamp(1 - cursorDistanceToAnchor / 8, 0, 1) * phaseAnchorReveal;
  const overlapRelease = smoothstep(safePhaseThreeMoveProgress);
  const overlapWeight = overlapT * (1 - overlapRelease * 0.15);
  const cursorAvoidDirection = safeHandleLeft >= phaseOneAnchorPercent ? 1 : -1;
  const cursorLabelShiftX = lerp(0, 34 * cursorAvoidDirection, overlapWeight);
  const cursorLabelShiftY = lerp(0, -6, overlapWeight);
  const phase = safeProgress * Math.PI * 2;
  const tiltRotateY = lerp(20, 0, safePhaseOneProgress);
  const tiltRotateX = Math.cos(phase + Math.PI * 0.1) * 4.25;
  const tiltTranslateY = Math.sin(phase * 2 - Math.PI * 0.25) * 3.5;
  const tiltScale = 1 + Math.cos(phase) * 0.006;
  const tiltShadow = `drop-shadow(0 ${20 + Math.abs(tiltRotateX) * 1.3}px ${
    24 + Math.abs(tiltRotateY) * 1.8
  }px rgba(15,23,42,0.18))`;
  const sheenAngle = 112 + tiltRotateY * 2.2;

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div
        className="absolute inset-0 flex items-center justify-center px-[8%] py-[8%]"
        style={{
          transform: `translate3d(${cameraTranslateX}px, 0, 0) scale(${cameraScale})`,
          transformOrigin: "50% 50%",
        }}
      >
        <div className="w-full max-w-[920px]">
          <div className="pb-15" style={{ perspective: 1100 }}>
            <div
              className="relative origin-center"
              style={{
                transformStyle: "preserve-3d",
                transform: `translateY(${tiltTranslateY}px) rotateX(${tiltRotateX}deg) rotateY(${tiltRotateY}deg) scale(${tiltScale})`,
                filter: tiltShadow,
              }}
            >
              <div
                className="relative h-[90px] rounded-[24px] px-10 shadow-[0_0_0_0.66px_rgba(0,0,0,0.09),0_12px_25px_rgba(0,0,0,0.08),0_4px_10px_rgba(0,0,0,0.03)]"
                style={{
                  background: `linear-gradient(180deg, ${rulerTopColor} 0%, ${rulerBottomColor} 100%)`,
                  boxShadow:
                    "inset 0 0 0 5px rgba(0,0,0,0.92), 0 0 0 0.66px rgba(0,0,0,0.1), 0 12px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 rounded-[24px]"
                  style={{
                    background: `linear-gradient(${sheenAngle}deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 34%, rgba(0,0,0,0) 60%)`,
                    mixBlendMode: "screen",
                  }}
                />

                <div className="absolute inset-x-10 bottom-[10px] top-[10px]">
                  {ticks.map((value, index) => {
                    const left = toPercent(value, minPercent, maxPercent);
                    const isMajor = majorTickSet.has(value);
                    const longTick = isMajor || index % 4 === 0;

                    return (
                      <div
                        key={value}
                        className="absolute bottom-0 w-[2px] rounded-full"
                        style={{
                          left: `${left}%`,
                          height: longTick ? 21 : 14,
                          transform: "translateX(-50%)",
                          backgroundColor: tickColor,
                        }}
                      />
                    );
                  })}

                </div>

                {!milestoneMode ? (
                  <div
                    className="absolute bottom-[10px] top-[10px] w-[4px]"
                    style={{
                      left: `${phaseOneAnchorLeft}%`,
                      opacity: phaseAnchorReveal,
                      transform: `translateX(-50%) scaleY(${lerp(0.3, 1, phaseAnchorReveal)})`,
                      transformOrigin: "50% 100%",
                      background:
                        "repeating-linear-gradient(180deg, rgba(0,0,0,0.98) 0 7px, rgba(0,0,0,0.22) 7px 12px)",
                      boxShadow: "0 0 0.5px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.8)",
                    }}
                  />
                ) : null}

                <div
                  className="absolute top-1/2 h-[96px] w-[28px] -translate-y-1/2"
                  style={{
                    left: `calc(${toPercent(safeHandleLeft, minPercent, maxPercent)}% - 14px)`,
                    zIndex: 20,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-[10px] shadow-[inset_0_0_0_3px_black,0_0_0_0.66px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.08),0_3px_8px_2px_rgba(0,0,0,0.08)]"
                    style={{
                      background: `linear-gradient(180deg, ${handleTopColor} 0%, ${handleBottomColor} 100%)`,
                    }}
                  />
                  <div
                    className="absolute bottom-[calc(100%+12px)] left-1/2 whitespace-nowrap text-[60px] font-black tracking-[-0.02em]"
                    style={{
                      zIndex: 30,
                      color: currentPercentColor,
                      textShadow: milestoneMode
                        ? "0 2px 7px rgba(0,0,0,0.92), 0 0 18px rgba(0,0,0,0.5)"
                        : "0 2px 6px rgba(15,23,42,0.38)",
                      transform: `translateX(calc(-50% + ${cursorLabelShiftX}px)) translateY(${cursorLabelShiftY}px)`,
                      transformOrigin: "center bottom",
                    }}
                  >
                    {currentHandleLabel}
                  </div>
                </div>

                {!milestoneMode ? (
                  <div
                    className="pointer-events-none absolute bottom-[calc(100%+12px)] whitespace-nowrap text-[60px] font-black tracking-[-0.02em]"
                    style={{
                      left: `${phaseOneAnchorLeft}%`,
                      opacity: phaseAnchorReveal,
                      color: "rgba(0,0,0,0.98)",
                      textShadow: "0 2px 6px rgba(15,23,42,0.45), 0 0 8px rgba(0,0,0,0.35)",
                      transform: `translateX(-50%) translateY(${10 - phaseAnchorReveal * 10}px) scale(${lerp(0.92, 1, phaseAnchorReveal)})`,
                      transformOrigin: "center bottom",
                    }}
                  >
                    {Math.round(phaseOneAnchorPercent)}%
                  </div>
                ) : null}

                {!milestoneMode ? (
                  <div
                    className="pointer-events-none absolute bottom-[calc(100%+12px)] left-0 right-0 h-[72px]"
                    style={{
                      zIndex: 10,
                      clipPath: seedanceRevealClipPath,
                    }}
                  >
                    <div
                      className="absolute whitespace-nowrap text-[60px] font-black tracking-[-0.02em]"
                      style={{
                        left: `${seedanceLabelLeft}%`,
                        color: "black",
                        textShadow: "0 2px 6px rgba(15,23,42,0.38)",
                        transform: "translateX(-50%)",
                        transformOrigin: "center bottom",
                      }}
                    >
                      {visibleLabelText}
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className="relative mt-4 h-7 text-[21px] font-semibold tracking-[-0.015em]"
                style={{
                  color: tickLabelColor,
                  textShadow: milestoneMode
                    ? "0 2px 6px rgba(0,0,0,0.95)"
                    : "0 1px 4px rgba(15,23,42,0.5)",
                }}
              >
                {safeMajorTickValues.map((value, index) => (
                  <div
                    key={`${value}-${safeMilestoneLabels[index] ?? "percent"}`}
                    className="absolute whitespace-nowrap"
                    style={{
                      left: `${toPercent(value, minPercent, maxPercent)}%`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    {milestoneMode
                      ? safeMilestoneLabels[index]
                      : `${Math.round(toPercent(value, minPercent, maxPercent))}%`}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

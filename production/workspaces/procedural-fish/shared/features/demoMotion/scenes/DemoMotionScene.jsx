import React, { useEffect, useRef } from "react";
import {
  remotionSingleFileFish,
  renderFishFrameToCanvas2D,
} from "../../../../remotionSingleFile.js";
import { renderFishVMorphFrameToCanvas2D } from "./fishVMorphRenderer.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const DemoMotionScene = ({
  frame = 0,
  renderMode = "school",
  cycleFrames,
  orbitRatio = 0.25,
  angularSpeed = 0,
  fishScale = remotionSingleFileFish.defaults.scale,
  maxStep = remotionSingleFileFish.defaults.maxStep,
  layout,
  onAutoLayoutReady,
}) => {
  const canvasRef = useRef(null);
  const videoWidth = Math.max(1, Math.round(layout?.videoWidth ?? 480));
  const videoHeight = Math.max(1, Math.round(layout?.videoHeight ?? 480));

  useEffect(() => {
    onAutoLayoutReady?.();
  }, [onAutoLayoutReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (canvas.width !== videoWidth) {
      canvas.width = videoWidth;
    }
    if (canvas.height !== videoHeight) {
      canvas.height = videoHeight;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    if (renderMode === "fishVMorph") {
      renderFishVMorphFrameToCanvas2D(context, {
        frame,
        width: videoWidth,
        height: videoHeight,
        clear: true,
      });
    } else {
      renderFishFrameToCanvas2D(context, {
        frame,
        width: videoWidth,
        height: videoHeight,
        orbitRatio: clamp(toNumber(orbitRatio, 0.25), 0.05, 0.48),
        angularSpeed: Math.max(0, toNumber(angularSpeed, 0)),
        scale: clamp(
          toNumber(fishScale, remotionSingleFileFish.defaults.scale),
          0.2,
          1.5
        ),
        maxStep: clamp(
          toNumber(maxStep, remotionSingleFileFish.defaults.maxStep),
          1,
          60
        ),
        cycleFrames: Math.max(1, Math.round(toNumber(cycleFrames, 1))),
        clear: true,
        drawOrbitGuide: false,
      });
    }
  }, [
    angularSpeed,
    cycleFrames,
    fishScale,
    frame,
    maxStep,
    orbitRatio,
    renderMode,
    videoHeight,
    videoWidth,
  ]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <canvas
        ref={canvasRef}
        width={videoWidth}
        height={videoHeight}
        className="h-full w-full"
        style={{ backgroundColor: "transparent", display: "block" }}
      />
    </div>
  );
};

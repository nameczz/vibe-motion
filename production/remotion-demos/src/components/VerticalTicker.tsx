import React from "react";
import {AbsoluteFill, Img, useCurrentFrame, useVideoConfig} from "remotion";
import {clamp, easeInOutCubic} from "../utils/easing";

export interface TickerColumnData {
  items: string[];
  durationInSeconds: number;
  direction: -1 | 1;
  phaseOffsetFrames?: number;
}

export interface VerticalTickerProps {
  columns: TickerColumnData[];
  backgroundColor?: string;
}

export const VerticalTicker: React.FC<VerticalTickerProps> = ({
  columns = [],
  backgroundColor = "#000",
}) => {
  return (
    <AbsoluteFill style={{backgroundColor, overflow: "hidden"}}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.09), transparent 35%), linear-gradient(180deg, rgba(7,10,18,0.2), rgba(1,2,5,0.95))",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 12%, transparent 88%, rgba(255,255,255,0.1) 100%)",
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          gap: 36,
          padding: "70px 64px 90px",
          transform: "perspective(1200px) rotateX(18deg)",
          transformOrigin: "center center",
        }}
      >
        {columns.map((column, index) => (
          <TickerColumn key={index} columnIndex={index} {...column} />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 220,
          background:
            "linear-gradient(to bottom, rgba(2,4,10,0.98), rgba(2,4,10,0))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 240,
          background:
            "linear-gradient(to top, rgba(2,4,10,0.98), rgba(2,4,10,0))",
        }}
      />
    </AbsoluteFill>
  );
};

const TickerColumn: React.FC<TickerColumnData & {columnIndex: number}> = ({
  items,
  durationInSeconds,
  direction,
  phaseOffsetFrames = 0,
  columnIndex,
}) => {
  const frame = useCurrentFrame();
  const {fps, height} = useVideoConfig();

  const totalFramesForLoop = durationInSeconds * fps;
  const progress =
    ((frame + phaseOffsetFrames) % totalFramesForLoop) / totalFramesForLoop;
  const translateY = direction === -1 ? progress * -50 : -50 + progress * 50;
  const lateralDrift = Math.sin((frame + columnIndex * 31) / (fps * 1.7)) * 20;
  const depthScale = clamp(1 - columnIndex * 0.05, 0.88, 1);
  const verticalLift = easeInOutCubic(
    clamp(Math.sin((frame + columnIndex * 17) / (fps * 2)) * 0.5 + 0.5, 0, 1),
  );

  return (
    <div
      style={{
        width: 420,
        height: height - 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `translate3d(${(columnIndex - 1) * 16 + lateralDrift}px, ${verticalLift * 6}px, 0) scale(${depthScale})`,
        filter: `drop-shadow(0 24px 36px rgba(0,0,0,0.5))`,
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          transform: `translateY(${translateY}%)`,
          willChange: "transform",
        }}
      >
        {[...items, ...items].map((src, index) => (
          <div
            key={`${columnIndex}-${index}`}
            style={{
              position: "relative",
              width: "100%",
              height: 520,
              borderRadius: 28,
              overflow: "hidden",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

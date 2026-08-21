import React from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {
  clamp,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  lerp,
  smoothstep,
} from "../utils/easing";

const FONT_STACK =
  "Inter, \"Space Grotesk\", \"Avenir Next\", Arial, sans-serif";

const FRAME_BOUNDS = {
  anticipation: {start: 0, end: 36},
  arc: {start: 32, end: 116},
  impact: {start: 116, end: 146},
  followThrough: {start: 146, end: 176},
};

const progress = (frame: number, start: number, end: number) =>
  clamp((frame - start) / Math.max(1, end - start), 0, 1);

const phaseOffset = (frame: number, start: number, end: number) =>
  frame < start ? 0 : frame > end ? 1 : (frame - start) / Math.max(1, end - start);

const clamp01 = (value: number) => clamp(value, 0, 1);

const shotStart = {x: 180, y: 744};
const shotApex = {x: 890, y: 214};
const shotRim = {x: 1460, y: 460};

export const DisneyAnimationRuleSkill: React.FC = () => {
  const frame = useCurrentFrame();
  const {height, fps} = useVideoConfig();

  const anticipation = phaseOffset(frame, FRAME_BOUNDS.anticipation.start, FRAME_BOUNDS.anticipation.end);
  const arc = phaseOffset(frame, FRAME_BOUNDS.arc.start, FRAME_BOUNDS.arc.end);
  const impact = phaseOffset(frame, FRAME_BOUNDS.impact.start, FRAME_BOUNDS.impact.end);
  const followThrough = phaseOffset(frame, FRAME_BOUNDS.followThrough.start, FRAME_BOUNDS.followThrough.end);

  const settle = clamp01((frame - FRAME_BOUNDS.followThrough.end) / (fps * 0.4));

  const anticipationEase = easeOutCubic(anticipation);
  const arcEase = easeInOutCubic(arc);
  const impactEase = smoothstep(impact);
  const followEase = easeInCubic(followThrough);
  const settleEase = easeOutCubic(settle);

  const arcT = clamp01(arcEase);
  const arcX = lerp(shotStart.x, shotRim.x, arcT);
  const arcY = lerp(shotStart.y, shotRim.y, arcT) - Math.sin(Math.PI * arcT) * 310;

  const settleY = lerp(shotRim.y, shotRim.y + 36, settleEase);
  const settleScale = 0.9 + Math.sin(settleEase * Math.PI * 1.8) * 0.02;

  const ballScaleX = 1 + (easeInOutCubic(progress(frame, FRAME_BOUNDS.impact.start - 4, FRAME_BOUNDS.impact.end)) * 0.22 - easeInOutCubic(progress(frame, FRAME_BOUNDS.followThrough.start, FRAME_BOUNDS.followThrough.end + 16)) * 0.4);
  const ballScaleY = 1 + (1 - easeOutCubic(progress(frame, FRAME_BOUNDS.anticipation.start, FRAME_BOUNDS.arc.end))) * 0.08 + -impactEase * 0.38;

  const arcPath = useArcPath(frame);
  const ballPosition = {
    x: frame > FRAME_BOUNDS.arc.end ? shotRim.x : arcX,
    y: frame > FRAME_BOUNDS.arc.end ? settleY : arcY,
  };

  const arcVisibility = Math.min(1, anticipation * 0.9 + arc * 0.4);

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12), transparent 38%), linear-gradient(180deg, #05080f 0%, #0a111a 42%, #05070a 100%)",
        overflow: "hidden",
        fontFamily: FONT_STACK,
        color: "white",
      }}
    >
      <CourtGrid />

      <SvgFloor height={height} arcPath={arcPath} arcVisibility={arcVisibility} />

      <div
        style={{
          position: "absolute",
          left: 84,
          top: 44,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          color: "rgba(246, 250, 255, 0.78)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 13,
        }}
      >
        <div style={{opacity: anticipation * 0.8 + 0.2}}>basketball launch study</div>
        <div style={{fontWeight: 700, letterSpacing: "0.08em", fontSize: 46, lineHeight: 0.95, color: "#f7fbff", textTransform: "none", maxWidth: 640}}>
          ARCADE ARC SHOT
        </div>
        <div style={{maxWidth: 560, lineHeight: 1.35, color: "rgba(255,255,255,0.82)", fontSize: 22}}>
          A basketball sequence with anticipation, curved travel, squash at impact, and controlled follow-through.
        </div>
      </div>

      <CourtGhost
        anticipation={anticipation}
        anticipationEase={anticipationEase}
        arc={arc}
        impact={impact}
        followThrough={followThrough}
        settle={settle}
        settleEase={settleEase}
      />

      <Hoop frame={frame} impact={impact} impactEase={impactEase} followEase={followEase} />

      <ShotBall
        x={ballPosition.x}
        y={ballPosition.y}
        scaleX={ballScaleX}
        scaleY={ballScaleY}
        anticipation={anticipation}
        impact={impact}
        settle={settle}
        settleScale={settleScale}
      />

      <ImpactText impact={impact} followThrough={followThrough} settle={settle} />
    </AbsoluteFill>
  );
};

const useArcPath = (frame: number) => {
  const lift = Math.sin(clamp01(progress(frame, FRAME_BOUNDS.arc.start, FRAME_BOUNDS.arc.end)) * Math.PI) * 280;
  const t = clamp01(progress(frame, FRAME_BOUNDS.anticipation.start, FRAME_BOUNDS.arc.end));
  const controlX = lerp(shotStart.x + 360, shotRim.x - 360, t);
  const controlY = Math.max(140, shotStart.y - 390 - lift);
  return `M ${shotStart.x} ${shotStart.y} Q ${controlX} ${controlY} ${shotRim.x} ${shotRim.y}`;
};

const CourtGrid: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "110px 90px",
        opacity: 0.16,
      }}
    />
  );
};

const SvgFloor: React.FC<{height: number; arcPath: string; arcVisibility: number}> = ({
  height,
  arcPath,
  arcVisibility,
}) => {
  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={height} style={{position: "absolute", inset: 0}}>
      <defs>
        <linearGradient id="arcGradient" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="45%" stopColor="rgba(112,230,255,0.65)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.95)" />
        </linearGradient>
      </defs>
      <path
        d="M 70 1080 L 1820 1080"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={2}
      />
      <path
        d="M 620 1080 C 690 680 980 620 960 560 C 940 500 1140 490 1458 470"
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d={arcPath}
        fill="none"
        stroke="url(#arcGradient)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray="20 20"
        opacity={arcVisibility}
      />
    </svg>
  );
};

const CourtGhost: React.FC<{
  anticipation: number;
  anticipationEase: number;
  arc: number;
  impact: number;
  followThrough: number;
  settle: number;
  settleEase: number;
}> = ({anticipation, anticipationEase, arc, impact, followThrough, settle, settleEase}) => {
  const bodyLift = Math.sin(anticipation * Math.PI) * 8;
  const hipShift = easeInOutCubic(arc) * 36;
  const followBend = followThrough * 22;
  const settleOffset = settle * 8;

  return (
    <div
      style={{
        position: "absolute",
        left: 250,
        top: 560,
        width: 220,
        height: 220,
        transform: `translate(${hipShift}px, ${-bodyLift - settleOffset}px) rotate(${(-8 + followBend * 0.8).toFixed(2)}deg)`,
        opacity: clamp01(anticipation + arc),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 30,
          top: 58,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.9), rgba(180,209,235,0.8) 52%, rgba(130,170,200,0.52))",
          transform: `scale(${0.9 + anticipationEase * 0.2})`,
          boxShadow: "0 10px 22px rgba(0,0,0,0.4)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 48,
          top: 108,
          width: 130,
          height: 86,
          borderRadius: 44,
          background: "linear-gradient(160deg, rgba(255,255,255,0.74), rgba(210,224,255,0.5))",
          transform: `skew(-4deg) scale(${1 + 0.02 * impact}, ${1 - impact * 0.13})`,
          boxShadow: "inset -8px -8px 0 rgba(255,255,255,0.05), inset 0 0 0 2px rgba(255,255,255,0.22)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 116,
          width: 112,
          height: 14,
          borderRadius: 8,
          background:
            impact > 0.2
              ? "rgba(255,255,255,0.18)"
              : `rgba(255,255,255,${0.06 + settleEase * 0.12})`,
          transform: `scaleX(${1.06 - impact * 0.1}) rotate(${10 * (1 - arc)}deg)`,
        }}
      />
    </div>
  );
};

const Hoop: React.FC<{frame: number; impact: number; impactEase: number; followEase: number}> = ({
  frame,
  impact,
  impactEase,
  followEase,
}) => {
  const pulse = 1 + smoothstep(impact) * 0.26;
  const settleDrift = Math.sin(frame / 5) * (1 - impact) * 1.2;

  return (
    <div
      style={{
        position: "absolute",
        left: 1368 + Math.sin(frame / 12) * 1.5 + settleDrift,
        top: 418 + Math.sin(frame / 14) * 1.1,
        width: 290,
        height: 210,
        transform: `translateY(${-14 + followEase * -4}px) scale(${clamp01(pulse * (1 - followEase * 0.1))})`,
      }}
    >
      <svg viewBox="0 0 300 210" width="100%" height="100%">
        <path
          d="M 22 74 C 22 48 40 30 68 22 C 102 12 150 10 184 28 C 214 42 236 66 236 96"
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={18}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 236 100 L 236 182 C 236 201 252 208 262 200 L 262 120"
          fill="none"
          stroke="rgba(255, 197, 130, 0.95)"
          strokeWidth={10}
          strokeLinecap="round"
          transform={`scale(${1 - impact * 0.05},${1 + impact * 0.04})`}
        />
        <path
          d="M 36 104 C 86 84 122 88 170 112"
          fill="none"
          stroke={`rgba(255, 255, 255, ${0.34 + impact * 0.42})`}
          strokeWidth={10}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 74,
          top: 126,
          width: 124,
          height: 2,
          background: impact > 0.4 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.1)",
          boxShadow: impact > 0.5 ? "0 0 18px rgba(255,255,255,0.45)" : "none",
          transform: `scaleX(${0.28 + impact * 1.18})`,
          transformOrigin: "left center",
        }}
      />
    </div>
  );
};

const ShotBall: React.FC<{
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  anticipation: number;
  impact: number;
  settle: number;
  settleScale: number;
}> = ({x, y, scaleX, scaleY, anticipation, impact, settle, settleScale}) => {
  const wobble = Math.sin((impact * 30 + settle * 18) * Math.PI) * 1.8;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 84,
        height: 84,
        borderRadius: "50%",
        transform: `translate(-50%, -50%) scale(${scaleX * (1 + settle * 0.03)}, ${scaleY * settleScale}) rotate(${(-anticipation * 12 + impact * 6 - wobble).toFixed(2)}deg)`,
        opacity: clamp01(anticipation + settle),
        filter: `drop-shadow(0 18px 22px rgba(0,0,0,0.38))`,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 180 180">
        <defs>
          <radialGradient id="ball" cx="30%" cy="25%" r="82%">
            <stop offset="0%" stopColor="#fff4d0" />
            <stop offset="48%" stopColor="#ff8f30" />
            <stop offset="100%" stopColor="#8f2a09" />
          </radialGradient>
          <linearGradient id="stripe" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r="80" fill="url(#ball)" />
        <path d="M 40 90 C 70 46 110 46 140 90" stroke="url(#stripe)" strokeWidth={20} strokeLinecap="round" />
        <ellipse cx="90" cy="96" rx="58" ry="22" fill="rgba(255,255,255,0.16)" />
        <circle cx="72" cy="78" r="4" fill="#151515" />
        <circle cx="108" cy="78" r="4" fill="#151515" />
        <path
          d="M 70 104 Q 90 112 110 104"
          stroke="rgba(20,20,20,0.42)"
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

const ImpactText: React.FC<{impact: number; followThrough: number; settle: number}> = ({impact, followThrough, settle}) => {
  const impactTextOpacity = easeInCubic(impact);
  const followOpacity = easeOutCubic(followThrough);
  const settleOpacity = easeOutCubic(settle);

  return (
    <div
      style={{
        position: "absolute",
        right: 64,
        top: 80,
        textAlign: "right",
        color: "#ecfbff",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        letterSpacing: "0.15em",
      }}
    >
      <div
        style={{
          fontSize: 14,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.6)",
          opacity: lerp(0.2, 1, impactTextOpacity),
        }}
      >
        anticipation
      </div>
      <div
        style={{
          fontSize: 18,
          opacity: clamp01(lerp(0, 0.98, followThrough)),
          color: "rgba(255,242,212,0.98)",
          marginTop: 6,
        }}
      >
        release
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 36,
          lineHeight: 1,
          color: "rgba(255,255,255,0.95)",
          opacity: impactTextOpacity * 0.6 + 0.4,
          transform: `translateY(${(1 - impactTextOpacity) * 14}px)`,
          transition: "opacity 120ms linear",
        }}
      >
        ARC
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 36,
          lineHeight: 1,
          opacity: followOpacity * 0.86,
          transform: `translateY(${(1 - followOpacity) * 12}px)`,
        }}
      >
        THE
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 36,
          lineHeight: 1,
          opacity: settleOpacity,
          color: "#87ffe9",
          textShadow: settleOpacity > 0.18 ? "0 0 30px rgba(135,255,233,0.42)" : "none",
        }}
      >
        THEORY
      </div>
    </div>
  );
};

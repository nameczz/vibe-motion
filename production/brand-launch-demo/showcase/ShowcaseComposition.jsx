import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  INTRO_FRAMES,
  OUTRO_FRAMES,
  OUTRO_START,
  SEGMENTS,
  SEGMENT_TIMINGS,
} from "./data.js";

const FONT = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const range = (frame, start, end) => clamp((frame - start) / Math.max(1, end - start));
const smooth = (value) => value * value * (3 - 2 * value);

const BrandField = ({children, progress = 0}) => (
  <AbsoluteFill
    style={{
      background: "#050509",
      color: "#f7f8ff",
      fontFamily: FONT,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: -180,
        background: `radial-gradient(circle at ${28 + progress * 20}% 34%, rgba(49,196,255,.3), transparent 25%), radial-gradient(circle at 74% ${62 - progress * 16}%, rgba(152,79,255,.3), transparent 28%)`,
        filter: "blur(36px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.18,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        transform: `translateY(${progress * 36}px)`,
      }}
    />
    {children}
  </AbsoluteFill>
);

const BrandLockup = ({outro = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 16, stiffness: 115, mass: 0.8}});
  const exit = outro ? 1 : 1 - smooth(range(frame, INTRO_FRAMES - 13, INTRO_FRAMES));
  const opacity = clamp(enter * exit);
  return (
    <BrandField progress={range(frame, 0, outro ? OUTRO_FRAMES : INTRO_FRAMES)}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          opacity,
          transform: `scale(${0.9 + enter * 0.1}) translateY(${(1 - enter) * 24}px)`,
        }}
      >
        <div style={{display: "flex", alignItems: "center", gap: 34}}>
          <Img
            src={staticFile("brand/vibe-motion-org-avatar.png")}
            style={{
              width: 154,
              height: 154,
              objectFit: "contain",
              boxShadow: "0 28px 90px rgba(74,178,255,.4)",
            }}
          />
          <div>
            <div style={{fontSize: 70, fontWeight: 770, letterSpacing: "-.055em"}}>
              VIBE MOTION
            </div>
            <div style={{marginTop: 12, fontSize: 23, letterSpacing: ".22em", color: "#b9c4d6"}}>
              {outro ? "PROMPT → CODE → MOTION" : "SKILLS SHOWCASE"}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 62,
          textAlign: "center",
          fontSize: 14,
          letterSpacing: ".28em",
          color: "rgba(255,255,255,.48)",
          opacity,
        }}
      >
        {outro ? "github.com/vibe-motion" : "12 MOTION STUDIES · 01 COLLECTION"}
      </div>
    </BrandField>
  );
};

const IntroSubtitle = ({children, startFrame, endFrame}) => {
  const frame = useCurrentFrame();
  const enter = smooth(range(frame, startFrame, startFrame + 9));
  const exit = 1 - smooth(range(frame, endFrame - 10, endFrame));
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 46,
        transform: `translateX(-50%) translateY(${(1 - enter) * 12}px)`,
        padding: "14px 24px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.2)",
        background: "rgba(3,5,10,.82)",
        boxShadow: "0 18px 60px rgba(0,0,0,.38)",
        color: "#f7f8ff",
        fontSize: 25,
        fontWeight: 650,
        letterSpacing: ".015em",
        whiteSpace: "nowrap",
        opacity: enter * exit,
      }}
    >
      {children}
    </div>
  );
};

const CapabilityCard = ({segment, index, frame}) => {
  const column = index < 6 ? 0 : 1;
  const row = column === 0 ? index : index - 6;
  const enterStart = 38 + index * 5;
  const enter = smooth(range(frame, enterStart, enterStart + 14));
  const highlightFrame = 120 + index * 8;
  const highlight = clamp(1 - Math.abs(frame - highlightFrame) / 22);
  const left = column === 0 ? 238 : 998;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 208 + row * 86,
        width: 684,
        height: 70,
        display: "grid",
        gridTemplateColumns: "54px 1fr auto",
        alignItems: "center",
        gap: 14,
        padding: "0 18px 0 10px",
        borderRadius: 14,
        border: `1px solid rgba(255,255,255,${0.15 + highlight * 0.28})`,
        background: `linear-gradient(100deg,rgba(8,13,23,${0.82 + highlight * 0.1}),rgba(15,11,29,.76))`,
        boxShadow: `0 18px ${30 + highlight * 34}px rgba(39,142,255,${highlight * 0.18})`,
        opacity: enter,
        transform: `translateX(${(1 - enter) * (column === 0 ? -34 : 34)}px) scale(${0.97 + enter * 0.03})`,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          display: "grid",
          placeItems: "center",
          borderRadius: 11,
          background: "linear-gradient(145deg,#51dfff,#9c65ff)",
          color: "#061019",
          fontSize: 17,
          fontWeight: 900,
        }}
      >
        {segment.displayNumber}
      </div>
      <div style={{minWidth: 0}}>
        <div
          style={{
            overflow: "hidden",
            color: "#f7f8ff",
            fontSize: 19,
            fontWeight: 760,
            letterSpacing: "-.02em",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {segment.slug}
        </div>
        <div style={{marginTop: 4, color: "#8999ae", fontSize: 13}}>
          {segment.effectSummary}
        </div>
      </div>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: highlight > 0.25 ? "#51dfff" : "rgba(255,255,255,.26)",
          boxShadow: highlight > 0.25 ? "0 0 20px #51dfff" : "none",
        }}
      />
    </div>
  );
};

const IntroCapabilityMatrix = () => {
  const frame = useCurrentFrame();
  const titleEnter = smooth(range(frame, 4, 20));
  return (
    <BrandField progress={range(frame, 0, INTRO_FRAMES)}>
      <div
        style={{
          position: "absolute",
          left: 78,
          top: 62,
          display: "flex",
          alignItems: "center",
          gap: 22,
          opacity: titleEnter,
          transform: `translateY(${(1 - titleEnter) * -18}px)`,
        }}
      >
        <Img
          src={staticFile("brand/vibe-motion-org-avatar.png")}
          style={{width: 76, height: 76, objectFit: "contain", boxShadow: "0 20px 55px rgba(74,178,255,.34)"}}
        />
        <div>
          <div style={{fontSize: 42, fontWeight: 800, letterSpacing: "-.045em"}}>
            VIBE MOTION
          </div>
          <div style={{marginTop: 6, color: "#90a1b7", fontSize: 14, letterSpacing: ".24em"}}>
            能力矩阵 / 12 个 SKILLS
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 196,
          bottom: 276,
          width: 1,
          background: "linear-gradient(transparent,rgba(81,223,255,.36),rgba(156,101,255,.4),transparent)",
          opacity: smooth(range(frame, 28, 62)),
        }}
      />
      {SEGMENTS.map((segment, index) => (
        <CapabilityCard key={segment.number} segment={segment} index={index} frame={frame} />
      ))}
      <IntroSubtitle startFrame={18} endFrame={82}>
        Vibe Motion 是一个动效 Skill 库。
      </IntroSubtitle>
      <IntroSubtitle startFrame={90} endFrame={190}>
        我把这些 Skill 串成了一支短片，方便看看它们各自的效果。
      </IntroSubtitle>
    </BrandField>
  );
};

const PromptClip = ({segment}) => {
  return (
    <AbsoluteFill style={{backgroundColor: "#050509"}}>
      <OffthreadVideo
        src={staticFile(segment.invocationVideoPath)}
        muted
        pauseWhenBuffering={false}
        playbackRate={segment.invocationFrames / segment.promptFrames}
        style={{width: "100%", height: "100%", objectFit: "contain"}}
      />
    </AbsoluteFill>
  );
};

const SkillLabel = ({segment, frame}) => {
  const enter = smooth(range(frame, 7, 17));
  const exit = 1 - smooth(
    range(frame, segment.durationInFrames - 12, segment.durationInFrames - 2),
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 46,
        top: 40,
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "11px 17px 11px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.28)",
        background: "rgba(3,5,10,.66)",
        boxShadow: "0 12px 38px rgba(0,0,0,.3)",
        backdropFilter: "blur(16px)",
        color: "white",
        fontFamily: FONT,
        fontSize: 16,
        letterSpacing: ".045em",
        opacity: enter * exit,
        transform: `translateX(${(1 - enter) * -20}px)`,
      }}
    >
      <span style={{display: "grid", placeItems: "center", width: 31, height: 31, borderRadius: 99, background: "linear-gradient(145deg,#51dfff,#9c65ff)", color: "#071018", fontWeight: 850}}>
        {segment.displayNumber}
      </span>
      <span style={{fontWeight: 700}}>{segment.slug}</span>
      <span style={{color: "rgba(255,255,255,.58)"}}>· SKILL</span>
    </div>
  );
};

const EffectClip = ({segment}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: "#050509", fontFamily: FONT}}>
      <AbsoluteFill
        style={{
          display: "grid",
          placeItems: "center",
        }}
      >
        <OffthreadVideo
          src={staticFile(segment.videoPath)}
          muted
          pauseWhenBuffering={false}
          style={{width: "100%", height: "100%", objectFit: "contain"}}
        />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "linear-gradient(180deg,transparent 70%,rgba(3,5,10,.16))",
        }}
      />
      <SkillLabel segment={segment} frame={frame} />
      <div style={{position: "absolute", left: 46, right: 46, bottom: 26, height: 2, background: "rgba(255,255,255,.13)"}}>
        <div style={{height: "100%", width: `${range(frame, 0, segment.durationInFrames - 1) * 100}%`, background: "linear-gradient(90deg,#54ddff,#9b63ff)"}} />
      </div>
    </AbsoluteFill>
  );
};

export const ShowcaseComposition = () => (
  <AbsoluteFill style={{backgroundColor: "#050509"}}>
    <Sequence from={0} durationInFrames={INTRO_FRAMES} name="Brand intro">
      <IntroCapabilityMatrix />
    </Sequence>
    {SEGMENT_TIMINGS.map((segment) => (
      <React.Fragment key={segment.number}>
        <Sequence
          from={segment.promptStart}
          durationInFrames={segment.promptFrames}
          name={`${segment.number} prompt`}
        >
          <PromptClip segment={segment} />
        </Sequence>
        <Sequence
          from={segment.effectStart}
          durationInFrames={segment.durationInFrames}
          name={`${segment.number} ${segment.name}`}
        >
          <EffectClip segment={segment} />
        </Sequence>
      </React.Fragment>
    ))}
    <Sequence from={OUTRO_START} durationInFrames={OUTRO_FRAMES} name="Brand outro">
      <BrandLockup outro />
    </Sequence>
  </AbsoluteFill>
);

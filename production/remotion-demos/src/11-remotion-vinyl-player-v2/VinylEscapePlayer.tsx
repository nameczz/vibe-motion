import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

const phase = (
  frame: number,
  input: [number, number],
  output: [number, number] = [0, 1],
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

const albumArt = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#ff7a3d"/>
        <stop offset="0.48" stop-color="#ff3a82"/>
        <stop offset="1" stop-color="#6b45ff"/>
      </linearGradient>
      <filter id="b"><feGaussianBlur stdDeviation="18"/></filter>
    </defs>
    <rect width="400" height="400" rx="200" fill="#10101a"/>
    <circle cx="210" cy="185" r="145" fill="url(#g)" opacity=".95"/>
    <circle cx="132" cy="105" r="90" fill="#ffd85e" opacity=".55" filter="url(#b)"/>
    <path d="M52 245 C110 172 170 314 232 226 S340 162 380 214" fill="none" stroke="#fff7df" stroke-width="18" stroke-linecap="round" opacity=".9"/>
    <path d="M62 278 C128 212 178 344 244 256 S344 210 382 250" fill="none" stroke="#fff7df" stroke-width="7" stroke-linecap="round" opacity=".65"/>
    <circle cx="200" cy="200" r="18" fill="#111018"/>
  </svg>
`)}`;

const waveformPoints = (row: number, frame: number) => {
  const points: string[] = [];
  for (let x = 0; x <= 1920; x += 18) {
    const envelope = Math.sin((x / 1920) * Math.PI);
    const amplitude = (42 + row * 15) * envelope;
    const y =
      540 +
      (row - 2) * 68 +
      Math.sin(x * 0.021 + frame * 0.15 + row * 1.4) * amplitude +
      Math.sin(x * 0.009 - frame * 0.09) * amplitude * 0.3;
    points.push(`${x},${y.toFixed(1)}`);
  }
  return points.join(" ");
};

const Disc: React.FC<{
  size: number;
  rotation: number;
  escapeProgress: number;
}> = ({size, rotation, escapeProgress}) => {
  const highlight = mix(0.12, 0.32, escapeProgress);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background:
          "repeating-radial-gradient(circle at center, #0a0b10 0px, #0a0b10 5px, #252633 6px, #0d0e14 8px)",
        boxShadow: `0 45px 90px rgba(0,0,0,${mix(0.46, 0.75, escapeProgress)}), inset 0 0 42px #000, 0 0 ${mix(0, 54, escapeProgress)}px rgba(255,72,152,.35)`,
        transform: `rotate(${rotation}deg)`,
        willChange: "transform",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: "50%",
          background: `conic-gradient(from 20deg, transparent 0deg, rgba(255,255,255,${highlight}) 16deg, transparent 43deg, transparent 178deg, rgba(255,89,173,${highlight}) 208deg, transparent 245deg)`,
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: size * 0.31,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: "0 0 0 3px rgba(255,255,255,.08), 0 8px 22px rgba(0,0,0,.6)",
        }}
      >
        <Img src={albumArt} style={{width: "100%", height: "100%"}} />
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: size * 0.035,
          height: size * 0.035,
          borderRadius: "50%",
          background: "#d8d3c7",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,.55)",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
};

const Tonearm: React.FC<{lift: number}> = ({lift}) => (
  <div
    style={{
      position: "absolute",
      left: 1044,
      top: 258,
      width: 310,
      height: 430,
      transformOrigin: "245px 55px",
      transform: `rotate(${mix(0, 23, lift)}deg)`,
      zIndex: 8,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 214,
        top: 20,
        width: 88,
        height: 88,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, #a6a2a0, #3b3b42 50%, #15151a 72%)",
        border: "8px solid #28282d",
        boxShadow: "0 12px 24px rgba(0,0,0,.45)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 114,
        top: 61,
        width: 170,
        height: 18,
        borderRadius: 12,
        transformOrigin: "right center",
        transform: "rotate(67deg)",
        background: "linear-gradient(180deg, #ded7c9, #827d76 48%, #45434a)",
        boxShadow: "0 7px 11px rgba(0,0,0,.35)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 92,
        top: 235,
        width: 42,
        height: 74,
        borderRadius: "8px 8px 16px 16px",
        transform: "rotate(-21deg)",
        background: "linear-gradient(90deg, #ec6550, #802c36)",
        boxShadow: "0 8px 16px rgba(0,0,0,.5)",
      }}
    />
  </div>
);

const PlayerDeck: React.FC<{
  lift: number;
  frame: number;
  progress: number;
  discHidden: boolean;
  discRotation: number;
}> = ({lift, frame, progress, discHidden, discRotation}) => {
  const marqueeRaw = ((frame % 180) / 180) * -50;
  const marquee = mix(marqueeRaw, 0, phase(frame, [145, 175]));

  return (
    <div
      style={{
        position: "absolute",
        left: 280,
        top: 230,
        width: 1360,
        height: 640,
        borderRadius: 48,
        background:
          "linear-gradient(145deg, rgba(255,255,255,.14), transparent 24%), linear-gradient(180deg, #353239, #17171d 76%)",
        border: "2px solid rgba(255,255,255,.12)",
        boxShadow: "0 65px 95px rgba(0,0,0,.57), inset 0 2px 1px rgba(255,255,255,.13)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 52,
          width: 600,
          height: 536,
          borderRadius: 32,
          background: "linear-gradient(145deg, #17171c, #0d0d11)",
          border: "1px solid rgba(255,255,255,.07)",
          boxShadow: "inset 0 15px 35px rgba(0,0,0,.6)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 78,
            top: 46,
            opacity: discHidden ? 0.12 : 1,
          }}
        >
          <Disc size={440} rotation={discRotation} escapeProgress={0} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 294,
            top: 262,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#c9c4bb",
            boxShadow: "0 5px 7px rgba(0,0,0,.65)",
          }}
        />
      </div>

      <Tonearm lift={lift} />

      <div
        style={{
          position: "absolute",
          left: 760,
          top: 112,
          width: 475,
          color: "#f8f4ea",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{fontSize: 15, letterSpacing: 5, color: "#ff805d", fontWeight: 800}}>
          VINYL ESCAPE · SIDE A
        </div>
        <div
          style={{
            marginTop: 20,
            width: "100%",
            overflow: "hidden",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "max-content",
              whiteSpace: "nowrap",
              transform: `translateX(${marquee}%)`,
            }}
          >
            {[0, 1].map((index) => (
              <div key={index} style={{fontSize: 52, fontWeight: 730, letterSpacing: -2, paddingRight: 62}}>
                RUNAWAY GROOVE
              </div>
            ))}
          </div>
        </div>
        <div style={{fontSize: 20, color: "#aaa6ab", marginTop: 8}}>
          Vibe Motion Orchestra · 33⅓ RPM
        </div>

        <div style={{marginTop: 58}}>
          <div
            style={{
              height: 7,
              borderRadius: 8,
              background: "rgba(255,255,255,.13)",
              overflow: "visible",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                borderRadius: 8,
                background: "linear-gradient(90deg, #ff7b45, #ff4f9f, #8b5bff)",
                boxShadow: "0 0 18px rgba(255,72,147,.55)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -7,
                  top: -5,
                  width: 17,
                  height: 17,
                  borderRadius: "50%",
                  background: "white",
                  boxShadow: "0 0 14px rgba(255,255,255,.8)",
                }}
              />
            </div>
          </div>
          <div style={{display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 15, color: "#817f85", fontVariantNumeric: "tabular-nums"}}>
            <span>00:{String(Math.floor(progress * 6)).padStart(2, "0")}</span>
            <span>00:06</span>
          </div>
        </div>

        <div style={{display: "flex", alignItems: "center", gap: 34, marginTop: 58}}>
          <ControlIcon label="↶" />
          <ControlIcon label="◀" />
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: "#f6f0e5",
              color: "#111116",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 27,
              boxShadow: "0 13px 32px rgba(0,0,0,.35)",
            }}
          >
            Ⅱ
          </div>
          <ControlIcon label="▶" />
          <ControlIcon label="∞" active />
        </div>
      </div>
    </div>
  );
};

const ControlIcon: React.FC<{label: string; active?: boolean}> = ({label, active}) => (
  <div
    style={{
      width: 38,
      textAlign: "center",
      fontSize: 25,
      color: active ? "#ff6c7f" : "#8e8a90",
      fontFamily: "ui-monospace, monospace",
    }}
  >
    {label}
  </div>
);

export const VinylEscapePlayer: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const liftOut = phase(frame, [34, 66]);
  const cruise = phase(frame, [66, 105]);
  const linger = phase(frame, [105, 126]);
  const returnHome = phase(frame, [126, 166]);
  const escape = clamp(liftOut - returnHome, 0, 1);
  const settle = spring({
    frame: frame - 154,
    fps,
    config: {damping: 13, stiffness: 130, mass: 0.8},
    durationInFrames: 26,
  });

  const deckX = 578;
  const deckY = 328;
  const targetX = mix(1140, 1490, cruise);
  const targetY = 450 + Math.sin(linger * Math.PI) * 62;
  const flyingX = mix(deckX, targetX, liftOut);
  const flyingY = mix(deckY, targetY, liftOut);
  const discX = mix(flyingX, deckX, returnHome);
  const discY = mix(flyingY, deckY, returnHome);
  const discScale = mix(1, mix(1.35, 1.05, cruise), escape);
  const tiltY = mix(0, mix(-18, 58, cruise), escape);
  const tiltX = mix(0, mix(7, -5, cruise), escape);
  const bounceY = frame > 154 ? (1 - settle) * -34 : 0;
  const discRotation = (frame / (fps * 1.35)) * 360;
  const waveOpacity = clamp(phase(frame, [58, 78]) - phase(frame, [122, 151]), 0, 1);
  const glowPulse = 0.6 + Math.sin(frame * 0.16) * 0.18;
  const progress = clamp(frame / (durationInFrames - 1), 0, 1);
  const lift = clamp(phase(frame, [27, 45]) - phase(frame, [145, 163]), 0, 1);

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background:
          "radial-gradient(circle at 77% 40%, rgba(119,63,255,.22), transparent 27%), radial-gradient(circle at 24% 70%, rgba(255,100,55,.15), transparent 28%), linear-gradient(150deg, #17121e 0%, #09090f 58%, #06070b 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.22,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "linear-gradient(180deg, transparent, black 50%, transparent)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 92,
          top: 78,
          color: "rgba(255,255,255,.72)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 18,
          letterSpacing: 4,
        }}
      >
        VM—011 / ANALOG MOTION STUDY
      </div>

      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        style={{position: "absolute", inset: 0, opacity: waveOpacity, filter: `drop-shadow(0 0 14px rgba(255,72,163,${glowPulse}))`}}
      >
        {[0, 1, 2, 3, 4].map((row) => (
          <polyline
            key={row}
            points={waveformPoints(row, frame)}
            fill="none"
            stroke={row % 2 === 0 ? "#ff4d9d" : "#8a61ff"}
            strokeWidth={row === 2 ? 7 : 3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={1 - Math.abs(row - 2) * 0.14}
            strokeDasharray={`${mix(14, 120, cruise)} ${mix(24, 16, cruise)}`}
            strokeDashoffset={-frame * (3 + row * 0.55)}
          />
        ))}
      </svg>

      <div
        style={{
          transform: `translateY(${mix(0, 24, escape)}px) scale(${mix(1, 0.965, escape)})`,
          opacity: mix(1, 0.58, escape),
          filter: `blur(${mix(0, 1.5, escape)}px)`,
        }}
      >
        <PlayerDeck
          lift={lift}
          frame={frame}
          progress={progress}
          discHidden={escape > 0.04}
          discRotation={discRotation}
        />
      </div>

      {escape > 0.002 && (
        <div
          style={{
            position: "absolute",
            left: discX,
            top: discY + bounceY,
            transformOrigin: "center center",
            transform: `translate(-50%, -50%) perspective(1100px) rotateY(${tiltY}deg) rotateX(${tiltX}deg) scale(${discScale})`,
            zIndex: 20,
            willChange: "transform",
          }}
        >
          <Disc size={440} rotation={discRotation + cruise * 260} escapeProgress={escape} />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          right: 86,
          bottom: 58,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          color: "rgba(255,255,255,.42)",
          fontSize: 15,
          letterSpacing: 3,
        }}
      >
        GROOVE STATUS / {escape > 0.1 ? "UNBOUND" : "LOCKED"}
      </div>
    </AbsoluteFill>
  );
};

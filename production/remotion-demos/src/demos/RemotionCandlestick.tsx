import React, {useEffect, useMemo, useRef} from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import candles from "../data/candlestick.json";
import {clamp, easeInCubic, easeOutCubic, lerp, mapRange} from "../utils/easing";

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const data = candles as Candle[];

export const RemotionCandlestick: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const metrics = useMemo(() => {
    const low = Math.min(...data.map((item) => item.low));
    const high = Math.max(...data.map((item) => item.high));
    const maxVolume = Math.max(...data.map((item) => item.volume));
    const finalClose = data[data.length - 1]?.close ?? 0;
    const firstOpen = data[0]?.open ?? 0;
    const changePct = firstOpen ? ((finalClose - firstOpen) / firstOpen) * 100 : 0;
    return {low, high, maxVolume, finalClose, firstOpen, changePct};
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const dpr = 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.scale(dpr, dpr);
    drawTerminalChart(context, width, height, frame, fps, metrics);
  }, [frame, fps, height, metrics, width]);

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 18%, rgba(47,255,173,0.08), transparent 28%), linear-gradient(180deg, #04110d 0%, #020705 100%)",
        overflow: "hidden",
      }}
    >
      <GridOverlay />
      <Header frame={frame} fps={fps} />
      <div
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          top: 132,
          bottom: 56,
          borderRadius: 28,
          overflow: "hidden",
          border: "1px solid rgba(112,255,172,0.16)",
          boxShadow: "0 26px 80px rgba(0,0,0,0.52)",
          background: "rgba(2,7,5,0.82)",
        }}
      >
        <canvas ref={canvasRef} style={{width: "100%", height: "100%", display: "block"}} />
      </div>
      <Footer metrics={metrics} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

const GridOverlay: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(101,255,181,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(101,255,181,0.05) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage: "linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,1))",
        opacity: 0.28,
      }}
    />
  );
};

const Header: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 56,
        top: 44,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 18,
          letterSpacing: 4,
          color: "rgba(149,255,199,0.68)",
          textTransform: "uppercase",
        }}
      >
        remotion-candlestick
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderRadius: 999,
          background: "rgba(5,15,11,0.7)",
          border: "1px solid rgba(112,255,172,0.12)",
          width: "fit-content",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#60ffab",
            boxShadow: "0 0 18px rgba(96,255,171,0.9)",
          }}
        />
        <span
          style={{
            color: "#e9fff4",
            fontSize: 28,
            fontWeight: 700,
            fontFamily: "Inter, Arial, sans-serif",
          }}
        >
          Synthetic market tape
        </span>
        <span
          style={{
            color: "rgba(233,255,244,0.7)",
            fontSize: 16,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          frame {frame}/{fps * 6}
        </span>
      </div>
    </div>
  );
};

const Footer: React.FC<{metrics: {changePct: number; finalClose: number; firstOpen: number}; frame: number; fps: number}> = ({metrics, frame, fps}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        right: 64,
        bottom: 44,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          width: 760,
        }}
      >
        <Stat label="Open" value={metrics.firstOpen.toFixed(2)} />
        <Stat label="Close" value={metrics.finalClose.toFixed(2)} />
        <Stat label="Change" value={`${metrics.changePct >= 0 ? "+" : ""}${metrics.changePct.toFixed(2)}%`} />
      </div>
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 18,
          background: "rgba(5,15,11,0.72)",
          border: "1px solid rgba(112,255,172,0.14)",
          color: "rgba(233,255,244,0.78)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 16,
        }}
      >
        fixed OHLC sample, no live feed · {Math.min(100, Math.round((frame / (fps * 6)) * 100))}% complete
      </div>
    </div>
  );
};

const Stat: React.FC<{label: string; value: string}> = ({label, value}) => {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 18,
        background: "rgba(7,18,13,0.82)",
        border: "1px solid rgba(112,255,172,0.1)",
      }}
    >
      <div
        style={{
          color: "rgba(233,255,244,0.62)",
          fontSize: 13,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#eefef8",
          fontSize: 28,
          fontFamily: "Inter, Arial, sans-serif",
          fontWeight: 700,
          marginTop: 8,
        }}
      >
        {value}
      </div>
    </div>
  );
};

function drawTerminalChart(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  fps: number,
  metrics: {low: number; high: number; maxVolume: number},
) {
  context.clearRect(0, 0, width, height);

  const padLeft = 88;
  const padRight = 60;
  const padTop = 40;
  const padBottom = 108;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const chartBottom = padTop + chartHeight;
  const chartTop = padTop;

  const bg = context.createLinearGradient(0, chartTop, 0, chartBottom);
  bg.addColorStop(0, "rgba(4,18,13,0.86)");
  bg.addColorStop(1, "rgba(2,7,5,0.94)");
  context.fillStyle = bg;
  context.fillRect(padLeft, chartTop, chartWidth, chartHeight);

  context.save();
  context.strokeStyle = "rgba(115,255,185,0.08)";
  context.lineWidth = 1;
  context.setLineDash([6, 10]);
  for (let i = 0; i < 6; i += 1) {
    const y = chartTop + (chartHeight / 5) * i;
    context.beginPath();
    context.moveTo(padLeft, y);
    context.lineTo(width - padRight, y);
    context.stroke();
  }
  context.setLineDash([]);
  context.restore();

  const visibleCount = data.length;
  const gap = 14;
  const candleWidth = (chartWidth - gap * (visibleCount + 1)) / visibleCount;
  const baseline = chartBottom - 42;
  const priceRange = metrics.high - metrics.low;
  const convertPrice = (price: number) => {
    const normalized = (price - metrics.low) / priceRange;
    return lerp(baseline, chartTop + 38, normalized);
  };
  const progress = clamp(frame / (fps * 6), 0, 1);

  // Draw the forming path first, then the candles on top.
  context.save();
  context.strokeStyle = "rgba(96,255,171,0.18)";
  context.lineWidth = 3;
  context.beginPath();
  data.forEach((item, index) => {
    const x = padLeft + gap + index * (candleWidth + gap) + candleWidth / 2;
    const targetCloseY = convertPrice(item.close);
    const targetPoint = clamp((progress * visibleCount - index) / 1.1, 0, 1);
    const eased = easeOutCubic(targetPoint);
    const y = lerp(baseline, targetCloseY, eased);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
  context.restore();

  data.forEach((item, index) => {
    const x = padLeft + gap + index * (candleWidth + gap);
    const centerX = x + candleWidth / 2;
    const candleProgress = clamp((frame - index * 3) / 16, 0, 1);
    const wickProgress = easeOutCubic(candleProgress);
    const bodyProgress = easeOutCubic(clamp((frame - index * 3 - 4) / 12, 0, 1));
    const lowY = convertPrice(item.low);
    const highY = convertPrice(item.high);
    const openY = convertPrice(item.open);
    const closeY = convertPrice(item.close);
    const targetTop = Math.min(openY, closeY);
    const targetBottom = Math.max(openY, closeY);
    const currentHigh = lerp(baseline, highY, wickProgress);
    const currentLow = lerp(baseline, lowY, wickProgress);
    const currentTop = lerp(baseline, targetTop, bodyProgress);
    const currentBottom = lerp(baseline, targetBottom, bodyProgress);
    const bullish = item.close >= item.open;
    const bodyColor = bullish ? "#60ffab" : "#ff6f86";
    const bodyFill = bullish ? "rgba(96,255,171,0.24)" : "rgba(255,111,134,0.24)";
    const bodyTop = Math.min(currentTop, currentBottom);
    const bodyHeight = Math.max(5, Math.abs(currentBottom - currentTop));

    context.save();
    context.strokeStyle = bodyColor;
    context.fillStyle = bodyFill;
    context.lineWidth = 3;

    context.beginPath();
    context.moveTo(centerX, currentHigh);
    context.lineTo(centerX, currentLow);
    context.stroke();

    context.fillRect(x, bodyTop, candleWidth, bodyHeight);
    context.strokeRect(x, bodyTop, candleWidth, bodyHeight);

    const volumeHeight = mapRange(item.volume, 0, metrics.maxVolume, 18, 92);
    const volumeProgress = easeInCubic(clamp((frame - index * 3) / 20, 0, 1));
    const volumeY = chartBottom - 34;
    context.fillStyle = bullish ? "rgba(96,255,171,0.3)" : "rgba(255,111,134,0.3)";
    context.fillRect(x + candleWidth * 0.12, volumeY - volumeHeight * volumeProgress, candleWidth * 0.76, volumeHeight * volumeProgress);

    if (index === data.length - 1) {
      const priceLineY = closeY;
      context.save();
      context.strokeStyle = "rgba(96,255,171,0.85)";
      context.lineWidth = 2;
      context.setLineDash([14, 12]);
      context.beginPath();
      context.moveTo(padLeft, priceLineY);
      context.lineTo(width - padRight, priceLineY);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = "rgba(96,255,171,0.96)";
      context.fillRect(width - padRight - 150, priceLineY - 18, 136, 36);
      context.fillStyle = "#02120b";
      context.font = "700 18px Inter, Arial, sans-serif";
      context.fillText(item.close.toFixed(2), width - padRight - 132, priceLineY + 6);
      context.restore();
    }

    context.restore();
  });

  context.save();
  context.fillStyle = "rgba(233,255,244,0.64)";
  context.font = "14px ui-monospace, SFMono-Regular, Menlo, monospace";
  for (let i = 0; i < 6; i += 1) {
    const y = chartBottom - (chartHeight / 5) * i;
    const value = lerp(metrics.low, metrics.high, i / 5);
    context.fillText(value.toFixed(2), 18, y + 4);
  }
  context.restore();
}

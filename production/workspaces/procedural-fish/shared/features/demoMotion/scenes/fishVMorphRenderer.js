const TAU = Math.PI * 2;
const PARTICLE_COUNT = 180;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const smoothstep = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (value) => 1 - (1 - clamp(value, 0, 1)) ** 3;

const seeded = (index, salt = 0) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
};

const fishCenterAtFrame = (frame, width, height) => {
  const entrance = easeOutCubic(frame / 75);
  return {
    x: lerp(-width * 0.16, width * 0.47, entrance),
    y:
      height * 0.5 +
      Math.sin(frame * 0.075) * height * 0.055 * (1 - smoothstep(frame / 90)),
  };
};

const fishHalfWidth = (t, scale) => {
  const body = Math.sin(Math.PI * clamp(t, 0, 1)) ** 0.72;
  return (10 + body * 92 + t * t * 42) * scale;
};

const fishCenterline = (localX, frame, scale) => {
  const t = clamp((localX / scale + 290) / 470, 0, 1);
  const tailInfluence = (1 - t) ** 1.7;
  return Math.sin(frame * 0.22 - t * 6.2) * 35 * tailInfluence * scale;
};

const fishPoint = ({ index, frame, width, height, scale }) => {
  const center = fishCenterAtFrame(frame, width, height);
  const t = seeded(index, 1) ** 0.9;
  const localX = lerp(-290, 180, t) * scale;
  const halfWidth = fishHalfWidth(t, scale);
  const vertical = (seeded(index, 2) * 2 - 1) * halfWidth;
  const scaleFan = index % 12 === 0;
  const finLift = scaleFan
    ? (seeded(index, 3) > 0.5 ? 1 : -1) * (34 + seeded(index, 4) * 36) * scale
    : 0;

  return {
    x: center.x + localX,
    y: center.y + fishCenterline(localX, frame, scale) + vertical + finLift,
  };
};

const vGeometry = (width, height) => {
  const centerX = width * 0.5;
  const topY = height * 0.27;
  const apexY = height * 0.72;
  const halfSpan = Math.min(width * 0.118, height * 0.215);
  return {
    left: { x: centerX - halfSpan, y: topY },
    apex: { x: centerX, y: apexY },
    right: { x: centerX + halfSpan, y: topY },
    strokeWidth: Math.min(width, height) * 0.062,
  };
};

const vParticleTarget = (index, width, height) => {
  const geometry = vGeometry(width, height);
  const onLeft = index < PARTICLE_COUNT / 2;
  const branchIndex = onLeft ? index : index - PARTICLE_COUNT / 2;
  const branchCount = PARTICLE_COUNT / 2;
  const t = clamp((branchIndex + seeded(index, 9) * 0.7) / (branchCount - 0.3), 0, 1);
  const start = onLeft ? geometry.left : geometry.right;
  const end = geometry.apex;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const thickness = geometry.strokeWidth * 0.43;
  const lateral = (seeded(index, 10) * 2 - 1) * thickness;

  return {
    x: lerp(start.x, end.x, t) + normalX * lateral,
    y: lerp(start.y, end.y, t) + normalY * lateral,
  };
};

const drawFishBody = (ctx, { frame, width, height, scale, opacity }) => {
  if (opacity <= 0) {
    return;
  }

  const center = fishCenterAtFrame(frame, width, height);
  const samples = 30;
  const upper = [];
  const lower = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const localX = lerp(-290, 180, t) * scale;
    const centerY = fishCenterline(localX, frame, scale);
    const halfWidth = fishHalfWidth(t, scale);
    upper.push({ x: center.x + localX, y: center.y + centerY - halfWidth });
    lower.push({ x: center.x + localX, y: center.y + centerY + halfWidth });
  }

  const tailX = center.x - 278 * scale;
  const tailY = center.y + fishCenterline(-278 * scale, frame, scale);
  const tailWave = Math.sin(frame * 0.22) * 28 * scale;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowBlur = 36 * scale;
  ctx.shadowColor = "rgba(58, 225, 255, 0.48)";

  const finGradient = ctx.createLinearGradient(0, tailY - 130 * scale, 0, tailY + 130 * scale);
  finGradient.addColorStop(0, "rgba(230, 251, 255, 0.58)");
  finGradient.addColorStop(1, "rgba(43, 184, 232, 0.18)");
  ctx.fillStyle = finGradient;
  ctx.strokeStyle = "rgba(226, 252, 255, 0.42)";
  ctx.lineWidth = 2.5 * scale;

  ctx.beginPath();
  ctx.moveTo(tailX + 25 * scale, tailY);
  ctx.quadraticCurveTo(
    tailX - 72 * scale,
    tailY - 116 * scale + tailWave,
    tailX - 120 * scale,
    tailY - 78 * scale + tailWave
  );
  ctx.quadraticCurveTo(tailX - 62 * scale, tailY, tailX + 25 * scale, tailY);
  ctx.quadraticCurveTo(
    tailX - 70 * scale,
    tailY + 116 * scale + tailWave,
    tailX - 120 * scale,
    tailY + 78 * scale + tailWave
  );
  ctx.quadraticCurveTo(tailX - 58 * scale, tailY, tailX + 25 * scale, tailY);
  ctx.fill();
  ctx.stroke();

  const bodyGradient = ctx.createLinearGradient(
    center.x - 280 * scale,
    center.y,
    center.x + 190 * scale,
    center.y
  );
  bodyGradient.addColorStop(0, "rgba(36, 154, 214, 0.46)");
  bodyGradient.addColorStop(0.44, "rgba(55, 218, 245, 0.84)");
  bodyGradient.addColorStop(0.82, "rgba(203, 247, 255, 0.94)");
  bodyGradient.addColorStop(1, "rgba(255, 255, 246, 0.98)");
  ctx.fillStyle = bodyGradient;
  ctx.strokeStyle = "rgba(235, 254, 255, 0.68)";
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(upper[0].x, upper[0].y);
  for (const point of upper.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  for (const point of [...lower].reverse()) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = opacity * 0.48;
  ctx.fillStyle = "rgba(221, 250, 255, 0.74)";
  ctx.beginPath();
  ctx.ellipse(
    center.x - 35 * scale,
    center.y - 48 * scale,
    92 * scale,
    28 * scale,
    -0.55,
    0,
    TAU
  );
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    center.x - 52 * scale,
    center.y + 55 * scale,
    76 * scale,
    23 * scale,
    0.55,
    0,
    TAU
  );
  ctx.fill();

  ctx.globalAlpha = opacity * 0.86;
  ctx.shadowBlur = 12 * scale;
  ctx.fillStyle = "rgba(5, 69, 96, 0.92)";
  ctx.beginPath();
  ctx.arc(center.x + 126 * scale, center.y - 28 * scale, 7.5 * scale, 0, TAU);
  ctx.fill();
  ctx.restore();
};

const drawScaleTexture = (ctx, { frame, width, height, scale, opacity }) => {
  if (opacity <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = opacity * 0.34;
  ctx.strokeStyle = "rgba(240, 255, 255, 0.9)";
  ctx.lineWidth = Math.max(0.8, scale);
  for (let index = 0; index < 54; index += 1) {
    const point = fishPoint({ index: index + 500, frame, width, height, scale });
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, 8 * scale, 4 * scale, -0.08, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
};

const drawParticle = (ctx, { index, x, y, opacity, gather, scale }) => {
  if (opacity <= 0) {
    return;
  }

  const size = lerp(5.8, 3.8, gather) * scale * (0.72 + seeded(index, 12) * 0.62);
  const hue = seeded(index, 13);
  const fill =
    hue > 0.78
      ? "rgba(255, 255, 246, 0.95)"
      : hue > 0.36
        ? "rgba(129, 238, 255, 0.92)"
        : "rgba(38, 183, 238, 0.88)";

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.rotate((seeded(index, 14) - 0.5) * 1.2 * (1 - gather));
  ctx.shadowBlur = (12 + seeded(index, 15) * 14) * scale;
  ctx.shadowColor = "rgba(83, 225, 255, 0.78)";
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 1.65, size * 0.68, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
};

const drawV = (ctx, { width, height, opacity }) => {
  if (opacity <= 0) {
    return;
  }

  const geometry = vGeometry(width, height);
  const gradient = ctx.createLinearGradient(
    geometry.left.x,
    geometry.left.y,
    geometry.right.x,
    geometry.apex.y
  );
  gradient.addColorStop(0, "rgba(35, 176, 232, 0.9)");
  gradient.addColorStop(0.48, "rgba(89, 231, 255, 0.94)");
  gradient.addColorStop(1, "rgba(244, 255, 252, 0.98)");

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = geometry.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = Math.min(width, height) * 0.045;
  ctx.shadowColor = "rgba(50, 217, 255, 0.58)";
  ctx.beginPath();
  ctx.moveTo(geometry.left.x, geometry.left.y);
  ctx.lineTo(geometry.apex.x, geometry.apex.y);
  ctx.lineTo(geometry.right.x, geometry.right.y);
  ctx.stroke();
  ctx.restore();
};

const drawHighlight = (ctx, { frame, width, height, opacity }) => {
  const progress = smoothstep((frame - 158) / 20);
  if (progress <= 0 || progress >= 1 || opacity <= 0) {
    return;
  }

  const geometry = vGeometry(width, height);
  const streakX = lerp(geometry.left.x - geometry.strokeWidth, geometry.right.x, progress);
  const streakWidth = geometry.strokeWidth * 1.45;
  const highlight = ctx.createLinearGradient(
    streakX - streakWidth,
    0,
    streakX + streakWidth,
    0
  );
  highlight.addColorStop(0, "rgba(255,255,255,0)");
  highlight.addColorStop(0.5, "rgba(255,255,255,0.98)");
  highlight.addColorStop(1, "rgba(255,255,255,0)");

  ctx.save();
  ctx.globalAlpha = opacity * Math.sin(progress * Math.PI) * 0.78;
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = highlight;
  ctx.shadowBlur = geometry.strokeWidth;
  ctx.shadowColor = "rgba(255,255,255,0.9)";
  ctx.fillRect(
    streakX - streakWidth,
    geometry.left.y - geometry.strokeWidth,
    streakWidth * 2,
    geometry.apex.y - geometry.left.y + geometry.strokeWidth * 2
  );
  ctx.restore();
};

export const FISH_V_MORPH_DURATION_SECONDS = 7;

export const renderFishVMorphFrameToCanvas2D = (
  ctx,
  { frame, width, height, clear = true }
) => {
  if (!ctx || typeof ctx.clearRect !== "function") {
    throw new Error("renderFishVMorphFrameToCanvas2D: invalid 2D context");
  }

  if (clear) {
    ctx.clearRect(0, 0, width, height);
  }

  const minEdge = Math.min(width, height);
  const sceneScale = minEdge / 1080;
  const dissolve = smoothstep((frame - 75) / 40);
  const gather = smoothstep((frame - 108) / 48);
  const solidify = smoothstep((frame - 150) / 30);
  const fishOpacity = 1 - dissolve;

  drawFishBody(ctx, {
    frame,
    width,
    height,
    scale: sceneScale,
    opacity: fishOpacity,
  });
  drawScaleTexture(ctx, {
    frame,
    width,
    height,
    scale: sceneScale,
    opacity: fishOpacity,
  });

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const reveal = smoothstep(
      (dissolve - seeded(index, 20) * 0.72) / Math.max(0.001, 0.28)
    );
    const source = fishPoint({
      index,
      frame: Math.min(frame, 115),
      width,
      height,
      scale: sceneScale,
    });
    const scatterProgress = smoothstep((frame - 75) / 45);
    const scatter = {
      x:
        source.x +
        scatterProgress * (80 + seeded(index, 21) * 245) * sceneScale,
      y:
        source.y +
        scatterProgress * (seeded(index, 22) * 2 - 1) * 180 * sceneScale +
        Math.sin(frame * 0.1 + index) * 8 * sceneScale,
    };
    const target = vParticleTarget(index, width, height);
    const x = lerp(scatter.x, target.x, gather);
    const y = lerp(scatter.y, target.y, gather);
    const particleOpacity = reveal * (1 - solidify * 0.78);

    drawParticle(ctx, {
      index,
      x,
      y,
      opacity: particleOpacity,
      gather,
      scale: sceneScale,
    });
  }

  const logoOpacity = lerp(0.12, 1, solidify) * smoothstep((frame - 142) / 18);
  drawV(ctx, { width, height, opacity: logoOpacity });
  drawHighlight(ctx, { frame, width, height, opacity: logoOpacity });

  return {
    particleCount: PARTICLE_COUNT,
    dissolve,
    gather,
    solidify,
    logoOpacity,
  };
};

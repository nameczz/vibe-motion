// Standalone single-file fish orbit animation toolkit.
// Copy this file into a Remotion project and use it directly.

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const DEFAULT_ORBIT_RATIO = 0.25;
const DEFAULT_ANGULAR_SPEED = 0.015;
const DEFAULT_SCALE = 1 / 1.5;
const DEFAULT_MAX_STEP = 16;
const DEFAULT_CONVERGENCE_CYCLES = 12;
const MAX_CONVERGENCE_CYCLES = 48;
const CYCLE_CONVERGENCE_EPSILON = 0.001;

const fishCycleCache = new Map();

function vec(x = 0, y = 0) {
  return { x, y };
}

function copyVec(v) {
  return vec(v.x, v.y);
}

function addVec(a, b) {
  return vec(a.x + b.x, a.y + b.y);
}

function subVec(a, b) {
  return vec(a.x - b.x, a.y - b.y);
}

function scaleVec(v, scalar) {
  return vec(v.x * scalar, v.y * scalar);
}

function magSq(v) {
  return v.x * v.x + v.y * v.y;
}

function mag(v) {
  return Math.sqrt(magSq(v));
}

function heading(v) {
  return Math.atan2(v.y, v.x);
}

function setMag(v, length) {
  const size = mag(v);
  if (size < 1e-8) {
    return vec(0, 0);
  }

  return scaleVec(v, length / size);
}

function simplifyAngle(angle) {
  let normalized = angle;
  while (normalized >= TAU) {
    normalized -= TAU;
  }

  while (normalized < 0) {
    normalized += TAU;
  }

  return normalized;
}

function relativeAngleDiff(angle, anchor) {
  const shifted = simplifyAngle(angle + Math.PI - anchor);
  return Math.PI - shifted;
}

function constrainAngle(angle, anchor, constraint) {
  if (Math.abs(relativeAngleDiff(angle, anchor)) <= constraint) {
    return simplifyAngle(angle);
  }

  if (relativeAngleDiff(angle, anchor) > constraint) {
    return simplifyAngle(anchor - constraint);
  }

  return simplifyAngle(anchor + constraint);
}

class Chain {
  constructor(origin, jointCount, linkSize, angleConstraint = TAU, initialAngle = 0) {
    this.linkSize = linkSize;
    this.angleConstraint = angleConstraint;
    this.joints = [copyVec(origin)];
    this.angles = [initialAngle];

    for (let i = 1; i < jointCount; i += 1) {
      const linkVec = setMag(
        vec(Math.cos(initialAngle), Math.sin(initialAngle)),
        this.linkSize
      );
      this.joints.push(subVec(this.joints[i - 1], linkVec));
      this.angles.push(initialAngle);
    }
  }

  resolve(pos) {
    const headDelta = subVec(pos, this.joints[0]);
    if (magSq(headDelta) > 1e-6) {
      this.angles[0] = heading(headDelta);
    }
    this.joints[0] = copyVec(pos);

    for (let i = 1; i < this.joints.length; i += 1) {
      const curAngle = heading(subVec(this.joints[i - 1], this.joints[i]));
      this.angles[i] = constrainAngle(curAngle, this.angles[i - 1], this.angleConstraint);

      const linkVec = setMag(vec(Math.cos(this.angles[i]), Math.sin(this.angles[i])), this.linkSize);
      this.joints[i] = subVec(this.joints[i - 1], linkVec);
    }
  }
}

class FishModel {
  constructor(origin, scale = DEFAULT_SCALE, initialHeading = 0) {
    this.scale = scale;
    this.spine = new Chain(
      origin,
      12,
      64 * this.scale,
      Math.PI / 8,
      initialHeading
    );
    this.bodyWidth = [68, 81, 84, 83, 77, 64, 51, 38, 32, 19].map((value) => value * this.scale);
  }

  scaleValue(value) {
    return value * this.scale;
  }

  resolve(target, { maxStep = DEFAULT_MAX_STEP } = {}) {
    const headPos = this.spine.joints[0];
    const toTarget = subVec(target, headPos);
    const distance = mag(toTarget);
    if (distance < 1e-4) {
      return;
    }

    const step = Math.min(maxStep, distance);
    const targetPos = addVec(headPos, setMag(toTarget, step));
    this.spine.resolve(targetPos);
  }

  getBodyPoint(i, angleOffset, lengthOffset = 0) {
    const radius = this.bodyWidth[i] + lengthOffset;
    return vec(
      this.spine.joints[i].x + Math.cos(this.spine.angles[i] + angleOffset) * radius,
      this.spine.joints[i].y + Math.sin(this.spine.angles[i] + angleOffset) * radius
    );
  }
}

function getSceneCenter(width, height) {
  return vec(width / 2, height / 2);
}

function getOrbitRadius(width, height, orbitRatio = DEFAULT_ORBIT_RATIO) {
  return Math.min(width, height) * orbitRatio;
}

function getOrbitTargetAtFrame(frame, center, radius, angularSpeed = DEFAULT_ANGULAR_SPEED) {
  const safeFrame = Math.max(0, Math.floor(frame));
  const angle = (safeFrame * angularSpeed) % TAU;
  return vec(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius);
}

function toSerializableFishState(fish) {
  return {
    scale: fish.scale,
    bodyWidth: [...fish.bodyWidth],
    joints: fish.spine.joints.map((joint) => vec(joint.x, joint.y)),
    angles: [...fish.spine.angles]
  };
}

function createFishFromSerializableState(state) {
  const serializable = state ?? {};
  const fish = {
    scale: serializable.scale ?? DEFAULT_SCALE,
    bodyWidth: [...(serializable.bodyWidth ?? [])],
    spine: {
      joints: (serializable.joints ?? []).map((joint) => vec(joint.x, joint.y)),
      angles: [...(serializable.angles ?? [])]
    },
    scaleValue(value) {
      return value * this.scale;
    },
    getBodyPoint(i, angleOffset, lengthOffset = 0) {
      const radius = this.bodyWidth[i] + lengthOffset;
      return vec(
        this.spine.joints[i].x + Math.cos(this.spine.angles[i] + angleOffset) * radius,
        this.spine.joints[i].y + Math.sin(this.spine.angles[i] + angleOffset) * radius
      );
    }
  };

  return fish;
}

function normalizeCycleFrames(cycleFrames, angularSpeed) {
  if (Number.isFinite(cycleFrames) && cycleFrames > 0) {
    return Math.max(1, Math.round(cycleFrames));
  }

  const safeSpeed = Math.abs(Number(angularSpeed));
  if (!Number.isFinite(safeSpeed) || safeSpeed < 1e-6) {
    return 1;
  }

  return Math.max(1, Math.round(TAU / safeSpeed));
}

function normalizeConvergenceCycles(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_CONVERGENCE_CYCLES;
  }
  return Math.max(1, Math.min(MAX_CONVERGENCE_CYCLES, Math.round(value)));
}

function stateDistance(a, b) {
  if (!a || !b) {
    return Number.POSITIVE_INFINITY;
  }

  const jointsA = a.joints ?? [];
  const jointsB = b.joints ?? [];
  const anglesA = a.angles ?? [];
  const anglesB = b.angles ?? [];
  const count = Math.min(jointsA.length, jointsB.length, anglesA.length, anglesB.length);
  if (count === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;
  for (let i = 0; i < count; i += 1) {
    const dx = jointsA[i].x - jointsB[i].x;
    const dy = jointsA[i].y - jointsB[i].y;
    const da = relativeAngleDiff(anglesA[i], anglesB[i]);
    sum += dx * dx + dy * dy + da * da;
  }

  return Math.sqrt(sum / count);
}

function toCacheNumberKey(value) {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return value.toFixed(6);
}

function getFishCycleCacheKey({
  width,
  height,
  scale,
  orbitRatio,
  angularSpeed,
  maxStep,
  cycleFrames,
  convergenceCycles
}) {
  return [
    toCacheNumberKey(width),
    toCacheNumberKey(height),
    toCacheNumberKey(scale),
    toCacheNumberKey(orbitRatio),
    toCacheNumberKey(angularSpeed),
    toCacheNumberKey(maxStep),
    toCacheNumberKey(cycleFrames),
    toCacheNumberKey(convergenceCycles)
  ].join("|");
}

function buildSeamlessFishCycle({
  width,
  height,
  scale,
  orbitRatio,
  angularSpeed,
  maxStep,
  cycleFrames,
  convergenceCycles
}) {
  const center = getSceneCenter(width, height);
  const orbitRadius = getOrbitRadius(width, height, orbitRatio);
  const initialTarget = getOrbitTargetAtFrame(0, center, orbitRadius, angularSpeed);
  const secondTarget = getOrbitTargetAtFrame(1, center, orbitRadius, angularSpeed);
  const initialVelocity = subVec(secondTarget, initialTarget);
  const initialHeading = magSq(initialVelocity) > 1e-8 ? heading(initialVelocity) : 0;
  const fish = new FishModel(initialTarget, scale, initialHeading);

  const resolvedCycleFrames = Math.max(1, cycleFrames);
  let cycleStartState = toSerializableFishState(fish);
  let totalSteps = 0;
  const cyclesToRun = Math.max(1, convergenceCycles);

  for (let cycleIndex = 0; cycleIndex < cyclesToRun; cycleIndex += 1) {
    for (let step = 1; step <= resolvedCycleFrames; step += 1) {
      totalSteps += 1;
      const target = getOrbitTargetAtFrame(totalSteps, center, orbitRadius, angularSpeed);
      fish.resolve(target, { maxStep });
    }

    const nextCycleState = toSerializableFishState(fish);
    if (stateDistance(cycleStartState, nextCycleState) <= CYCLE_CONVERGENCE_EPSILON) {
      cycleStartState = nextCycleState;
      break;
    }
    cycleStartState = nextCycleState;
  }

  const states = new Array(resolvedCycleFrames);
  states[0] = cycleStartState;

  for (let phase = 1; phase < resolvedCycleFrames; phase += 1) {
    totalSteps += 1;
    const target = getOrbitTargetAtFrame(totalSteps, center, orbitRadius, angularSpeed);
    fish.resolve(target, { maxStep });
    states[phase] = toSerializableFishState(fish);
  }

  return {
    center,
    orbitRadius,
    angularSpeed,
    cycleFrames: resolvedCycleFrames,
    states
  };
}

function getSeamlessFishCycle({
  width,
  height,
  scale,
  orbitRatio,
  angularSpeed,
  maxStep,
  cycleFrames,
  convergenceCycles
}) {
  const cacheKey = getFishCycleCacheKey({
    width,
    height,
    scale,
    orbitRatio,
    angularSpeed,
    maxStep,
    cycleFrames,
    convergenceCycles
  });

  if (fishCycleCache.has(cacheKey)) {
    return fishCycleCache.get(cacheKey);
  }

  const built = buildSeamlessFishCycle({
    width,
    height,
    scale,
    orbitRatio,
    angularSpeed,
    maxStep,
    cycleFrames,
    convergenceCycles
  });
  fishCycleCache.set(cacheKey, built);
  return built;
}

function sampleFishStateAtFrame({
  frame,
  width,
  height,
  scale = DEFAULT_SCALE,
  orbitRatio = DEFAULT_ORBIT_RATIO,
  angularSpeed = DEFAULT_ANGULAR_SPEED,
  maxStep = DEFAULT_MAX_STEP,
  cycleFrames,
  convergenceCycles = DEFAULT_CONVERGENCE_CYCLES
}) {
  const safeFrame = Math.max(0, Math.floor(frame));
  const resolvedCycleFrames = normalizeCycleFrames(cycleFrames, angularSpeed);
  const resolvedAngularSpeed =
    Number.isFinite(cycleFrames) && cycleFrames > 0
      ? TAU / resolvedCycleFrames
      : angularSpeed;
  const phaseFrame =
    resolvedCycleFrames <= 1 ? 0 : safeFrame % resolvedCycleFrames;
  const cycle = getSeamlessFishCycle({
    width,
    height,
    scale,
    orbitRatio,
    angularSpeed: resolvedAngularSpeed,
    maxStep,
    cycleFrames: resolvedCycleFrames,
    convergenceCycles: normalizeConvergenceCycles(convergenceCycles)
  });
  const serializable = cycle.states[phaseFrame];
  const fish = createFishFromSerializableState(serializable);
  const target = getOrbitTargetAtFrame(
    phaseFrame,
    cycle.center,
    cycle.orbitRadius,
    cycle.angularSpeed
  );

  return {
    fish,
    serializable,
    center: cycle.center,
    orbitRadius: cycle.orbitRadius,
    target,
    phaseFrame,
    cycleFrames: cycle.cycleFrames
  };
}

function drawRotatedEllipse(ctx, cx, cy, rx, ry, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSmoothPath(ctx, points, { closed = false } = {}) {
  if (!points || points.length === 0) {
    return;
  }

  if (points.length === 1) {
    ctx.moveTo(points[0].x, points[0].y);
    return;
  }

  if (!closed) {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = i === 0 ? points[0] : points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i + 2 < points.length ? points[i + 2] : points[i + 1];

      const cp1 = vec(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6);
      const cp2 = vec(p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6);

      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
    }
    return;
  }

  const n = points.length;
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i % n];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cp1 = vec(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6);
    const cp2 = vec(p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6);

    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
  }

  ctx.closePath();
}

function lerpValue(from, to, amount) {
  return from + (to - from) * amount;
}

function mixVec(a, b, amount) {
  return vec(lerpValue(a.x, b.x, amount), lerpValue(a.y, b.y, amount));
}

function subtractVec(a, b) {
  return vec(a.x - b.x, a.y - b.y);
}

function normalizeVec(v) {
  const length = mag(v);
  if (length < 1e-6) {
    return vec(0, 0);
  }

  return vec(v.x / length, v.y / length);
}

function buildSchoolAnchor(frame, width, height, index, total) {
  const progress = clamp(frame / 89, 0, 1);
  const formation = smoothstep(clamp(frame / 30, 0, 1));
  const scatter = smoothstep(clamp((frame - 48) / 30, 0, 1));
  const drift = smoothstep(clamp((frame - 76) / 13, 0, 1));
  const apex = vec(width * 0.62, height * 0.47);
  const upperTip = vec(width * 0.18, height * 0.24);
  const lowerTip = vec(width * 0.18, height * 0.72);
  const laneIndex = index <= Math.floor(total / 2) ? index : index - Math.floor(total / 2);
  const laneT = total <= 1 ? 0.5 : laneIndex / Math.max(1, Math.floor(total / 2));
  const upperAnchor = mixVec(upperTip, apex, laneT);
  const lowerAnchor = mixVec(lowerTip, apex, laneT);
  const isLeader = index === Math.floor(total / 2);
  const baseAnchor = isLeader ? apex : index < Math.floor(total / 2) ? upperAnchor : lowerAnchor;
  const start = isLeader
    ? vec(width * 0.08, height * 0.5)
    : index < Math.floor(total / 2)
      ? vec(-width * 0.08, lerpValue(height * 0.1, height * 0.34, laneT))
      : vec(-width * 0.08, lerpValue(height * 0.9, height * 0.66, laneT));
  const gather = mixVec(start, baseAnchor, formation);
  const scatterVector = isLeader
    ? vec(width * 0.16, -height * 0.06)
    : index < Math.floor(total / 2)
      ? vec(width * 0.26 + laneT * width * 0.12, -height * (0.18 + laneT * 0.14))
      : vec(width * 0.28 + laneT * width * 0.12, height * (0.16 + laneT * 0.14));
  const scatterTarget = addVec(baseAnchor, scatterVector);
  const scatterPos = mixVec(gather, scatterTarget, scatter);
  const driftOffset = isLeader
    ? vec(width * 0.06, -height * 0.02)
    : index < Math.floor(total / 2)
      ? vec(width * (0.12 + laneT * 0.06), -height * (0.06 + laneT * 0.02))
      : vec(width * (0.12 + laneT * 0.06), height * (0.06 + laneT * 0.02));
  const driftTarget = addVec(scatterTarget, driftOffset);
  const settlePos = mixVec(scatterPos, driftTarget, drift);

  const nextFrame = frame + 1;
  const nextFormation = smoothstep(clamp(nextFrame / 30, 0, 1));
  const nextScatter = smoothstep(clamp((nextFrame - 48) / 30, 0, 1));
  const nextDrift = smoothstep(clamp((nextFrame - 76) / 13, 0, 1));
  const nextGather = mixVec(start, baseAnchor, nextFormation);
  const nextScatterPos = mixVec(nextGather, scatterTarget, nextScatter);
  const nextSettlePos = mixVec(nextScatterPos, driftTarget, nextDrift);
  const velocity = subtractVec(nextSettlePos, settlePos);
  const fishHeading = magSq(velocity) > 1e-6 ? heading(velocity) : isLeader ? 0 : index < Math.floor(total / 2) ? -0.2 : 0.2;
  const depth = clamp(0.28 + (1 - laneT) * 0.32 + (isLeader ? 0.12 : 0), 0, 1);
  const scale = lerpValue(0.52, 0.86, depth) * (0.92 + progress * 0.06);

  return {
    position: settlePos,
    heading: fishHeading,
    scale,
    depth,
    formation,
    scatter,
    drift,
    index,
    isLeader,
  };
}

function drawOrbitGuideToCanvas2D(ctx, center, orbitRadius, options = {}) {
  const {
    strokeStyle = 'rgba(220,230,255,0.43)',
    lineWidth = 2
  } = options;

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.beginPath();
  ctx.arc(center.x, center.y, orbitRadius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawFishToCanvas2D(ctx, fishModel, options = {}) {
  const {
    bodyFill = 'rgba(120, 230, 255, 0.52)',
    finFill = 'rgba(255, 255, 255, 0.2)',
    strokeStyle = 'rgba(255,255,255,0.16)',
    strokeWidth = 2.6,
    glowColor = 'rgba(112, 230, 255, 0.3)',
  } = options;

  const j = fishModel.spine.joints;
  const a = fishModel.spine.angles;
  const s = (value) => fishModel.scaleValue(value);

  const headToMid1 = relativeAngleDiff(a[0], a[6]);
  const headToMid2 = relativeAngleDiff(a[0], a[7]);
  const headToTail = headToMid1 + relativeAngleDiff(a[6], a[11]);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = s(strokeWidth);

  ctx.shadowBlur = s(28);
  ctx.shadowColor = glowColor;
  ctx.fillStyle = finFill;
  drawRotatedEllipse(ctx, fishModel.getBodyPoint(3, Math.PI / 3).x, fishModel.getBodyPoint(3, Math.PI / 3).y, s(80), s(32), a[2] - Math.PI / 4);
  drawRotatedEllipse(ctx, fishModel.getBodyPoint(3, -Math.PI / 3).x, fishModel.getBodyPoint(3, -Math.PI / 3).y, s(80), s(32), a[2] + Math.PI / 4);
  drawRotatedEllipse(ctx, fishModel.getBodyPoint(7, Math.PI / 2).x, fishModel.getBodyPoint(7, Math.PI / 2).y, s(48), s(16), a[6] - Math.PI / 4);
  drawRotatedEllipse(ctx, fishModel.getBodyPoint(7, -Math.PI / 2).x, fishModel.getBodyPoint(7, -Math.PI / 2).y, s(48), s(16), a[6] + Math.PI / 4);

  const tailPoints = [];
  for (let i = 8; i < 12; i += 1) {
    const tailWidth = s(1.5) * headToTail * (i - 8) * (i - 8);
    tailPoints.push(vec(j[i].x + Math.cos(a[i] - Math.PI / 2) * tailWidth, j[i].y + Math.sin(a[i] - Math.PI / 2) * tailWidth));
  }
  for (let i = 11; i >= 8; i -= 1) {
    const tailWidth = Math.max(s(-13), Math.min(s(13), headToTail * s(6)));
    tailPoints.push(vec(j[i].x + Math.cos(a[i] + Math.PI / 2) * tailWidth, j[i].y + Math.sin(a[i] + Math.PI / 2) * tailWidth));
  }

  ctx.beginPath();
  drawSmoothPath(ctx, tailPoints, { closed: true });
  ctx.fill();
  ctx.stroke();

  const bodyPoints = [];
  for (let i = 0; i < 10; i += 1) {
    bodyPoints.push(fishModel.getBodyPoint(i, Math.PI / 2));
  }
  bodyPoints.push(fishModel.getBodyPoint(9, Math.PI));
  for (let i = 9; i >= 0; i -= 1) {
    bodyPoints.push(fishModel.getBodyPoint(i, -Math.PI / 2));
  }
  bodyPoints.push(fishModel.getBodyPoint(0, -Math.PI / 6));
  bodyPoints.push(fishModel.getBodyPoint(0, 0, s(4)));
  bodyPoints.push(fishModel.getBodyPoint(0, Math.PI / 6));
  for (let i = 0; i < 3; i += 1) {
    bodyPoints.push(fishModel.getBodyPoint(i, Math.PI / 2));
  }

  const bodyGradient = ctx.createLinearGradient(j[0].x, j[0].y, j[11].x, j[11].y);
  bodyGradient.addColorStop(0, 'rgba(255, 245, 220, 0.86)');
  bodyGradient.addColorStop(0.22, bodyFill);
  bodyGradient.addColorStop(1, 'rgba(45, 145, 215, 0.22)');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  drawSmoothPath(ctx, bodyPoints, { closed: true });
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = s(16);
  ctx.shadowColor = 'rgba(255, 255, 255, 0.18)';
  ctx.fillStyle = finFill;
  ctx.beginPath();
  ctx.moveTo(j[4].x, j[4].y);
  ctx.bezierCurveTo(j[5].x, j[5].y, j[6].x, j[6].y, j[7].x, j[7].y);
  ctx.bezierCurveTo(
    j[6].x + Math.cos(a[6] + Math.PI / 2) * headToMid2 * s(16),
    j[6].y + Math.sin(a[6] + Math.PI / 2) * headToMid2 * s(16),
    j[5].x + Math.cos(a[5] + Math.PI / 2) * headToMid1 * s(16),
    j[5].y + Math.sin(a[5] + Math.PI / 2) * headToMid1 * s(16),
    j[4].x,
    j[4].y
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = s(10);
  ctx.shadowColor = 'rgba(255,255,255,0.24)';
  ctx.fillStyle = 'rgba(255,255,255,0.74)';
  const eyeLeft = fishModel.getBodyPoint(0, Math.PI / 2, s(-18));
  const eyeRight = fishModel.getBodyPoint(0, -Math.PI / 2, s(-18));

  ctx.beginPath();
  ctx.arc(eyeLeft.x, eyeLeft.y, s(12), 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(eyeRight.x, eyeRight.y, s(12), 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function renderFishFrameToCanvas2D(ctx, {
  frame,
  width,
  height,
  scale = DEFAULT_SCALE,
  clear = true,
  drawOrbitGuide = true,
  orbitStyle,
  fishStyle
}) {
  if (!ctx || typeof ctx.beginPath !== 'function') {
    throw new Error('renderFishFrameToCanvas2D: invalid 2D context');
  }

  const schoolCount = 11;
  const school = [];
  for (let index = 0; index < schoolCount; index += 1) {
    const anchor = buildSchoolAnchor(frame, width, height, index, schoolCount);
    const fish = new FishModel(anchor.position, scale * anchor.scale, anchor.heading);
    school.push({
      fish,
      ...anchor,
    });
  }

  if (clear) {
    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, '#07131f');
    background.addColorStop(0.44, '#091b2d');
    background.addColorStop(1, '#02060b');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const halo = ctx.createRadialGradient(width * 0.52, height * 0.48, 40, width * 0.52, height * 0.48, Math.min(width, height) * 0.48);
    halo.addColorStop(0, 'rgba(96, 235, 255, 0.16)');
    halo.addColorStop(0.34, 'rgba(77, 152, 255, 0.08)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    const floorGlow = ctx.createRadialGradient(width * 0.58, height * 0.84, 60, width * 0.58, height * 0.84, width * 0.64);
    floorGlow.addColorStop(0, 'rgba(255, 213, 141, 0.18)');
    floorGlow.addColorStop(0.4, 'rgba(112, 230, 255, 0.06)');
    floorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = Math.max(1.5, width * 0.001);
    ctx.beginPath();
    ctx.moveTo(width * 0.16, height * 0.2);
    ctx.quadraticCurveTo(width * 0.38, height * 0.35, width * 0.61, height * 0.47);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * 0.16, height * 0.74);
    ctx.quadraticCurveTo(width * 0.38, height * 0.6, width * 0.61, height * 0.47);
    ctx.stroke();
    ctx.restore();

    const particles = 28;
    for (let index = 0; index < particles; index += 1) {
      const px = width * 0.12 + (index / particles) * width * 0.78;
      const py = height * 0.18 + Math.sin((frame + index * 17) / 18) * height * 0.05 + (index % 4) * 22;
      const size = 2 + (index % 5) * 0.8;
      ctx.save();
      ctx.globalAlpha = 0.08 + (index % 3) * 0.03;
      ctx.fillStyle = index % 2 === 0 ? 'rgba(112, 230, 255, 0.62)' : 'rgba(255, 179, 71, 0.52)';
      ctx.beginPath();
      ctx.arc(px, py, size, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  if (drawOrbitGuide) {
    drawOrbitGuideToCanvas2D(ctx, vec(width * 0.62, height * 0.47), Math.min(width, height) * 0.18, orbitStyle);
  }

  const upperArm = school.filter((entry) => entry.index < Math.floor(schoolCount / 2));
  const lowerArm = school.filter((entry) => entry.index > Math.floor(schoolCount / 2));

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = Math.max(2, width * 0.0024);
  ctx.strokeStyle = 'rgba(112, 230, 255, 0.24)';
  ctx.shadowBlur = Math.max(18, width * 0.015);
  ctx.shadowColor = 'rgba(112, 230, 255, 0.24)';
  ctx.beginPath();
  drawSmoothPath(ctx, upperArm.map((entry) => entry.position), { closed: false });
  ctx.stroke();
  ctx.beginPath();
  drawSmoothPath(ctx, lowerArm.map((entry) => entry.position), { closed: false });
  ctx.stroke();
  ctx.restore();

  const sorted = [...school].sort((a, b) => a.depth - b.depth);
  for (const entry of sorted) {
    const laneAlpha = clamp(0.28 + entry.depth * 0.52, 0.18, 0.96);
    ctx.save();
    ctx.globalAlpha = laneAlpha;
    ctx.translate(entry.position.x, entry.position.y);
    ctx.rotate(entry.heading);
    ctx.translate(-entry.position.x, -entry.position.y);
    drawFishToCanvas2D(ctx, entry.fish, {
      ...(fishStyle || {}),
      bodyFill: entry.isLeader
        ? 'rgba(255, 228, 167, 0.56)'
        : entry.index < Math.floor(schoolCount / 2)
          ? 'rgba(98, 224, 255, 0.42)'
          : 'rgba(140, 204, 255, 0.34)',
      finFill: entry.isLeader
        ? 'rgba(255, 244, 208, 0.32)'
        : 'rgba(255, 255, 255, 0.14)',
      strokeStyle: 'rgba(255,255,255,0.14)',
      strokeWidth: 2.2,
      glowColor: entry.isLeader ? 'rgba(255, 214, 133, 0.34)' : 'rgba(112, 230, 255, 0.28)',
    });
    ctx.restore();
  }

  return {
    school,
    width,
    height,
  };
}

export const remotionSingleFileFish = {
  defaults: {
    orbitRatio: DEFAULT_ORBIT_RATIO,
    angularSpeed: DEFAULT_ANGULAR_SPEED,
    scale: DEFAULT_SCALE,
    maxStep: DEFAULT_MAX_STEP
  },
  TAU,
  Chain,
  FishModel,
  vec,
  simplifyAngle,
  relativeAngleDiff,
  constrainAngle,
  getSceneCenter,
  getOrbitRadius,
  getOrbitTargetAtFrame,
  sampleFishStateAtFrame,
  drawOrbitGuideToCanvas2D,
  drawFishToCanvas2D,
  renderFishFrameToCanvas2D
};

export {
  sampleFishStateAtFrame,
  drawOrbitGuideToCanvas2D,
  drawFishToCanvas2D,
  renderFishFrameToCanvas2D
};

export default remotionSingleFileFish;

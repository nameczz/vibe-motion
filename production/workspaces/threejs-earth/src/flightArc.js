import * as THREE from "three";

import { EARTH_RADIUS, latLonToVector3 } from "./geo.js";

const DEFAULT_SURFACE_RADIUS = EARTH_RADIUS + 0.024;
const DEFAULT_PEAK_ALTITUDE = 0.34;
const DEFAULT_SEGMENTS = 220;
const DEFAULT_TUBE_RADIUS = 0.0065;
const DEFAULT_RADIAL_SEGMENTS = 10;
const DEFAULT_STYLE = "solid";
const DEFAULT_DASH_LENGTH = 0.04;
const DEFAULT_GAP_LENGTH = 0.024;
const DEFAULT_END_RADIUS_RATIO = 1;
const DEFAULT_TAPER_POWER = 1;
const EPSILON = 0.000001;

export function createFlightArc({
  start,
  end,
  surfaceRadius = DEFAULT_SURFACE_RADIUS,
  peakAltitude = DEFAULT_PEAK_ALTITUDE,
  segments = DEFAULT_SEGMENTS,
  tubeRadius = DEFAULT_TUBE_RADIUS,
  color = 0xffffff,
  opacity = 0.96,
  style = DEFAULT_STYLE,
  dashLength = DEFAULT_DASH_LENGTH,
  gapLength = DEFAULT_GAP_LENGTH,
  endRadiusRatio = DEFAULT_END_RADIUS_RATIO,
  taperPower = DEFAULT_TAPER_POWER,
  name = `${formatLocationName(start)} to ${formatLocationName(end)} flight arc`,
} = {}) {
  if (!start || !end) {
    throw new Error("createFlightArc requires start and end locations.");
  }

  const arcStyle = normalizeStyle(style);
  const points = createArcPoints({
    start,
    end,
    surfaceRadius,
    peakAltitude,
    segments,
  });
  const curve = new THREE.CatmullRomCurve3(points);
  curve.arcLengthDivisions = Math.max(200, segments * 4);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  });
  const { object, pieces } =
    arcStyle === "dashed"
      ? createDashedArcObject({
          curve,
          segments,
          tubeRadius,
          material,
          dashLength,
          gapLength,
          endRadiusRatio,
          taperPower,
          name,
        })
      : createSolidArcObject({
          curve,
          segments,
          tubeRadius,
          endRadiusRatio,
          taperPower,
          material,
          name,
        });

  function setAnimationTime(_seconds = 0, progress = 1) {
    const easedProgress = easeInOutCubic(THREE.MathUtils.clamp(progress, 0, 1));

    pieces.forEach((piece) => {
      setPieceAnimationProgress(piece, easedProgress);
    });
  }

  setAnimationTime(0, 0);

  return {
    object,
    arc: object,
    setAnimationTime,
  };
}

function createSolidArcObject({
  curve,
  segments,
  tubeRadius,
  endRadiusRatio,
  taperPower,
  material,
  name,
}) {
  const geometry = createVariableRadiusTubeGeometry({
    curve,
    segments,
    radius: tubeRadius,
    radialSegments: DEFAULT_RADIAL_SEGMENTS,
    startProgress: 0,
    endProgress: 1,
    endRadiusRatio,
    taperPower,
  });
  const arc = new THREE.Mesh(geometry, material);
  arc.name = name;
  arc.renderOrder = 19;
  geometry.setDrawRange(0, 0);

  return {
    object: arc,
    pieces: [
      createAnimatedPiece({
        object: arc,
        geometry,
        segmentCount: segments,
        startProgress: 0,
        endProgress: 1,
      }),
    ],
  };
}

function createDashedArcObject({
  curve,
  segments,
  tubeRadius,
  material,
  dashLength,
  gapLength,
  endRadiusRatio,
  taperPower,
  name,
}) {
  const group = new THREE.Group();
  const pieces = [];
  const spans = createDashSpans({ dashLength, gapLength });

  group.name = name;

  spans.forEach((span, index) => {
    const spanSegmentCount = Math.max(
      2,
      Math.ceil(segments * (span.end - span.start))
    );
    const spanCurve = createCurveSpan(
      curve,
      span.start,
      span.end,
      spanSegmentCount
    );
    const geometry = createVariableRadiusTubeGeometry({
      curve: spanCurve,
      segments: spanSegmentCount,
      radius: tubeRadius,
      radialSegments: DEFAULT_RADIAL_SEGMENTS,
      startProgress: span.start,
      endProgress: span.end,
      endRadiusRatio,
      taperPower,
    });
    const dash = new THREE.Mesh(geometry, material);

    dash.name = `${name} dash ${index + 1}`;
    dash.renderOrder = 19;
    geometry.setDrawRange(0, 0);
    group.add(dash);
    pieces.push(
      createAnimatedPiece({
        object: dash,
        geometry,
        segmentCount: spanSegmentCount,
        startProgress: span.start,
        endProgress: span.end,
      })
    );
  });

  return {
    object: group,
    pieces,
  };
}

function createVariableRadiusTubeGeometry({
  curve,
  segments,
  radius,
  radialSegments,
  startProgress,
  endProgress,
  endRadiusRatio,
  taperPower,
}) {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const point = new THREE.Vector3();
  const ringNormal = new THREE.Vector3();
  const vertex = new THREE.Vector3();

  for (let segmentIndex = 0; segmentIndex <= segments; segmentIndex += 1) {
    const localProgress = segmentIndex / segments;
    const routeProgress = THREE.MathUtils.lerp(
      startProgress,
      endProgress,
      localProgress
    );
    const sectionRadius = getTaperedRadius({
      radius,
      progress: routeProgress,
      endRadiusRatio,
      taperPower,
    });

    point.copy(curve.getPointAt(localProgress));

    for (let radialIndex = 0; radialIndex <= radialSegments; radialIndex += 1) {
      const angle = (radialIndex / radialSegments) * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = -Math.cos(angle);

      ringNormal
        .copy(frames.normals[segmentIndex])
        .multiplyScalar(cos)
        .addScaledVector(frames.binormals[segmentIndex], sin)
        .normalize();
      vertex.copy(point).addScaledVector(ringNormal, sectionRadius);

      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(ringNormal.x, ringNormal.y, ringNormal.z);
      uvs.push(localProgress, radialIndex / radialSegments);
    }
  }

  for (let segmentIndex = 1; segmentIndex <= segments; segmentIndex += 1) {
    for (let radialIndex = 1; radialIndex <= radialSegments; radialIndex += 1) {
      const a =
        (radialSegments + 1) * (segmentIndex - 1) + (radialIndex - 1);
      const b = (radialSegments + 1) * segmentIndex + (radialIndex - 1);
      const c = (radialSegments + 1) * segmentIndex + radialIndex;
      const d = (radialSegments + 1) * (segmentIndex - 1) + radialIndex;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingSphere();

  return geometry;
}

function getTaperedRadius({
  radius,
  progress,
  endRadiusRatio,
  taperPower,
}) {
  const safeEndRadiusRatio = THREE.MathUtils.clamp(endRadiusRatio, 0.05, 1);
  const safeTaperPower = Math.max(EPSILON, taperPower);
  const middleAmount = Math.pow(
    Math.max(0, Math.sin(Math.PI * progress)),
    safeTaperPower
  );

  return radius * THREE.MathUtils.lerp(safeEndRadiusRatio, 1, middleAmount);
}

function createAnimatedPiece({
  object,
  geometry,
  segmentCount,
  startProgress,
  endProgress,
}) {
  const maxDrawCount = geometry.index
    ? geometry.index.count
    : geometry.attributes.position.count;

  return {
    object,
    geometry,
    segmentCount,
    startProgress,
    endProgress,
    maxDrawCount,
    drawCountPerSegment: maxDrawCount / segmentCount,
  };
}

function setPieceAnimationProgress(piece, progress) {
  const localProgress = THREE.MathUtils.clamp(
    (progress - piece.startProgress)
      / (piece.endProgress - piece.startProgress),
    0,
    1
  );
  const visibleSegmentCount =
    localProgress <= 0
      ? 0
      : Math.max(1, Math.ceil(localProgress * piece.segmentCount));
  const drawCount = Math.min(
    piece.maxDrawCount,
    Math.ceil(visibleSegmentCount * piece.drawCountPerSegment)
  );

  piece.object.visible = drawCount > 0;
  piece.geometry.setDrawRange(0, drawCount);
}

function createDashSpans({ dashLength, gapLength }) {
  const safeDashLength = Math.max(EPSILON, dashLength);
  const safeGapLength = Math.max(0, gapLength);
  const cycleLength = safeDashLength + safeGapLength;
  const spans = [];

  for (let start = 0; start < 1 - EPSILON; start += cycleLength) {
    const end = Math.min(1, start + safeDashLength);

    if (end - start > EPSILON) {
      spans.push({ start, end });
    }
  }

  return spans.length > 0 ? spans : [{ start: 0, end: 1 }];
}

function createCurveSpan(curve, startProgress, endProgress, segmentCount) {
  const points = [];

  for (let index = 0; index <= segmentCount; index += 1) {
    const progress = THREE.MathUtils.lerp(
      startProgress,
      endProgress,
      index / segmentCount
    );

    points.push(curve.getPointAt(progress));
  }

  return new THREE.CatmullRomCurve3(points);
}

function createArcPoints({
  start,
  end,
  surfaceRadius,
  peakAltitude,
  segments,
}) {
  const startNormal = latLonToVector3(
    start.latitude,
    start.longitude,
    1
  ).normalize();
  const endNormal = latLonToVector3(end.latitude, end.longitude, 1).normalize();
  const points = [];
  const rotationAxis = new THREE.Vector3();
  const fallbackAxis = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const altitude = Math.sin(Math.PI * progress) * peakAltitude;

    slerpUnitVectors(
      normal,
      startNormal,
      endNormal,
      progress,
      rotationAxis,
      fallbackAxis
    );
    points.push(normal.clone().multiplyScalar(surfaceRadius + altitude));
  }

  return points;
}

function slerpUnitVectors(target, from, to, amount, axis, fallbackAxis) {
  const angle = from.angleTo(to);

  if (angle < EPSILON) {
    return target.copy(from);
  }

  if (Math.PI - angle < EPSILON) {
    fallbackAxis.set(1, 0, 0);

    if (Math.abs(from.dot(fallbackAxis)) > 0.999) {
      fallbackAxis.set(0, 1, 0);
    }

    axis.crossVectors(from, fallbackAxis).normalize();
  } else {
    axis.crossVectors(from, to).normalize();
  }

  return target.copy(from).applyAxisAngle(axis, angle * amount).normalize();
}

function easeInOutCubic(value) {
  const amount = THREE.MathUtils.clamp(value, 0, 1);
  return amount < 0.5
    ? 4 * amount * amount * amount
    : 1 - Math.pow(-2 * amount + 2, 3) / 2;
}

function normalizeStyle(style) {
  if (style === "solid" || style === "dashed") {
    return style;
  }

  throw new Error(`Unsupported flight arc style: ${style}`);
}

function formatLocationName(location) {
  return location?.label || `${location?.latitude},${location?.longitude}`;
}

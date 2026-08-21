import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

import { createEarth } from "./src/earth.js";
import { createFlightArc } from "./src/flightArc.js";
import { createLocationCircleMarker, latLonToVector3 } from "./src/geo.js";
import getStarfield from "./src/getStarfield.js";
import { createSceneLighting } from "./src/lighting.js";
import { createSceneControls } from "./src/sceneControls.js";
import { createCameraIntroAnimation } from "./src/cameraIntroAnimation.js";
import { ACTIVE_ROUTE } from "./src/routeConfig.js";

const app = getRequiredElement("#app");
const previewShell = getRequiredElement("#preview-shell");
const scene = new THREE.Scene();
const route = ACTIVE_ROUTE;
const RENDER_FPS = 30;
const EXPORT_WIDTH = 2048;
const EXPORT_HEIGHT = 1152;
const EXPORT_ASPECT_RATIO = EXPORT_WIDTH / EXPORT_HEIGHT;
const EXPORT_RENDER_SCALES = new Set([1, 2]);
const DEFAULT_EXPORT_RENDER_SCALE = 1;
const ZIP_VERSION_NEEDED = 20;
const ZIP_STORE_METHOD = 0;
const MIN_CAMERA_DISTANCE = 1.35;
const STAR_ROTATION_SPEED_PER_FRAME = 0.00008;
const CAMERA_INTRO_DURATION_MS = 1500;
const ROUTE_CAMERA_TRANSITION_DURATION_MS = route.camera.transitionDurationMs;
const LOCATION_CAMERA_DISTANCE = route.camera.locationDistance;
const LOCATION_CAMERA_ZOOM_OUT_DISTANCE = route.camera.zoomOutDistance;
const ROUTE_CAMERA_START_MS = CAMERA_INTRO_DURATION_MS;
const TIMELINE_DURATION_MS =
  ROUTE_CAMERA_START_MS + ROUTE_CAMERA_TRANSITION_DURATION_MS;
const RENDER_TIMELINE_TOTAL_FRAMES = Math.ceil(
  (TIMELINE_DURATION_MS / 1000) * RENDER_FPS
) + 1;
const query = new URLSearchParams(window.location.search);
const renderOptions = readRenderOptions(query);

applyRenderLayout();

function getRequiredElement(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

function createLoadingPromise(manager) {
  return new Promise((resolve) => {
    let hasStartedLoading = false;

    manager.onStart = () => {
      hasStartedLoading = true;
    };
    manager.onLoad = () => {
      resolve();
    };

    queueMicrotask(() => {
      if (!hasStartedLoading) {
        resolve();
      }
    });
  });
}

const loadingManager = new THREE.LoadingManager();
const sceneAssetsLoaded = createLoadingPromise(loadingManager);
const camera = new THREE.PerspectiveCamera(
  40,
  EXPORT_ASPECT_RATIO,
  0.1,
  1000
);
camera.position.z = 5;
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.className = "webgl-canvas scene-canvas";
previewShell.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.minDistance = MIN_CAMERA_DISTANCE;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enabled = false;
controls.update();

const earth = createEarth({ loadingManager });
scene.add(earth.group);

const locationMarkers = [route.start, route.end].map((location) =>
  createLocationCircleMarker({
    ...location,
    color: location.color ?? route.marker?.color ?? 0xffffff,
  })
);
earth.group.add(...locationMarkers);

const activeRouteArc = createFlightArc({
  start: route.start,
  end: route.end,
  ...route.arc,
  name: `${route.name} flight arc`,
});
earth.group.add(activeRouteArc.object);

const stars = getStarfield({ numStars: 2000, loadingManager });
scene.add(stars);

const lighting = createSceneLighting({
  lightsMaterial: earth.materials.lights,
  cloudsMaterial: earth.materials.clouds,
  rimMaterial: earth.materials.fresnel,
  camera,
});
scene.add(...lighting.lights);

let freeCameraEnabled = false;

const cameraControlsPanel = createSceneControls({
  camera,
  isFreeCameraEnabled: () => freeCameraEnabled,
  onToggleFreeCamera: setFreeCameraEnabled,
});

const cameraIntroAnimation = createCameraIntroAnimation({
  camera,
  controls,
  globe: earth.group,
  ...route.start,
  duration: CAMERA_INTRO_DURATION_MS,
  endDistance: LOCATION_CAMERA_DISTANCE,
});
const activeRouteMidpointLocal = latLonToVector3(
  route.camera.midpoint.latitude,
  route.camera.midpoint.longitude,
  1
);
function getActiveRouteMidpointWorldPosition(target) {
  target.copy(activeRouteMidpointLocal);
  earth.group.updateWorldMatrix(true, false);
  earth.group.localToWorld(target);
  return target;
}
const activeRouteCameraTransition = createFocusCameraTransition({
  camera,
  controls,
  globe: earth.group,
  getStartFocusWorldPosition: (target) =>
    getLocationWorldPosition(route.start, target),
  getEndFocusWorldPosition: (target) =>
    getLocationWorldPosition(route.end, target),
  getMidFocusWorldPosition: getActiveRouteMidpointWorldPosition,
  duration: ROUTE_CAMERA_TRANSITION_DURATION_MS,
  startDistance: LOCATION_CAMERA_DISTANCE,
  endDistance: LOCATION_CAMERA_DISTANCE,
  zoomOutDistance: LOCATION_CAMERA_ZOOM_OUT_DISTANCE,
});

function getLocationWorldPosition(location, target) {
  target.copy(latLonToVector3(location.latitude, location.longitude, 1));
  earth.group.updateWorldMatrix(true, false);
  earth.group.localToWorld(target);
  return target;
}

const crc32Table = createCrc32Table();
let renderControls = null;
let currentRenderFrame = 0;
let timelinePlaying = false;
let timelineStartTime = null;
let hasIntroStarted = false;
let isSceneReady = false;

resizeRenderers();
renderControls = bindRenderControls();
installSceneExportBridge();
setTimelineStateForTime(0);
renderScene();
syncRenderControls();

function startIntroAfterFirstReadyFrame() {
  if (renderOptions.isExportMode) {
    setRenderFrame(0, { playing: false });
    return;
  }

  requestAnimationFrame(() => {
    hasIntroStarted = false;
    timelineStartTime = null;
    currentRenderFrame = 0;
    timelinePlaying = false;
    setTimelineStateForTime(0);
    renderScene();
    syncRenderControls();

    requestAnimationFrame((now) => {
      hasIntroStarted = true;
      timelineStartTime = null;
      timelinePlaying = true;
      cameraIntroAnimation.start(now);
    });
  });
}

const sceneReadyPromise = sceneAssetsLoaded.then(() => {
  isSceneReady = true;
  syncRenderControls();
  startIntroAfterFirstReadyFrame();
});

function clampFrame(frame) {
  if (!Number.isFinite(frame)) {
    return 0;
  }

  return THREE.MathUtils.clamp(
    Math.round(frame),
    0,
    RENDER_TIMELINE_TOTAL_FRAMES - 1
  );
}

function readRenderOptions(params) {
  const exportMode = params.get("exportMode");
  const renderScale = Number(params.get("renderScale"));

  return {
    isExportMode:
      exportMode === "composite" || exportMode === "composite-transparent",
    renderScale: Number.isFinite(renderScale)
      ? THREE.MathUtils.clamp(renderScale, 1, 16)
      : DEFAULT_EXPORT_RENDER_SCALE,
  };
}

function createFocusCameraTransition({
  camera,
  controls,
  globe,
  getStartFocusWorldPosition,
  getEndFocusWorldPosition,
  getMidFocusWorldPosition,
  duration,
  baseDistance,
  startDistance = baseDistance,
  endDistance = baseDistance,
  zoomOutDistance = 0,
} = {}) {
  if (!camera || !globe) {
    throw new Error("createFocusCameraTransition requires camera and globe.");
  }

  const useMidpoint = typeof getMidFocusWorldPosition === "function";
  const globeCenter = new THREE.Vector3();
  const startFocus = new THREE.Vector3();
  const endFocus = new THREE.Vector3();
  const midFocus = new THREE.Vector3();
  const lookFocus = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const startDirection = new THREE.Vector3();
  const endDirection = new THREE.Vector3();
  const midDirection = new THREE.Vector3();
  const currentDirection = new THREE.Vector3();
  const bezierLeg1 = new THREE.Vector3();
  const bezierLeg2 = new THREE.Vector3();
  const rotationAxis = new THREE.Vector3();
  const fallbackAxis = new THREE.Vector3();
  const rotationAxis2 = new THREE.Vector3();
  const fallbackAxis2 = new THREE.Vector3();

  function resolveFocus(getFocusWorldPosition, target) {
    const resolvedPosition = getFocusWorldPosition?.(target);

    if (resolvedPosition && resolvedPosition !== target) {
      target.copy(resolvedPosition);
    }

    return target;
  }

  function resolveDirections() {
    globe.getWorldPosition(globeCenter);
    resolveFocus(getStartFocusWorldPosition, startFocus);
    resolveFocus(getEndFocusWorldPosition, endFocus);

    startDirection.copy(startFocus).sub(globeCenter);
    if (startDirection.lengthSq() < 0.000001) {
      startDirection.set(0, 0, 1);
    } else {
      startDirection.normalize();
    }

    endDirection.copy(endFocus).sub(globeCenter);
    if (endDirection.lengthSq() < 0.000001) {
      endDirection.copy(startDirection);
    } else {
      endDirection.normalize();
    }

    if (useMidpoint) {
      resolveFocus(getMidFocusWorldPosition, midFocus);
      midDirection.copy(midFocus).sub(globeCenter);
      if (midDirection.lengthSq() < 0.000001) {
        midDirection.copy(startDirection).add(endDirection).normalize();
      } else {
        midDirection.normalize();
      }
    }
  }

  function seek(progress) {
    const amount = THREE.MathUtils.clamp(progress, 0, 1);
    const easedAmount = easeInOutCubic(amount);
    const distance =
      THREE.MathUtils.lerp(startDistance, endDistance, easedAmount) +
      Math.sin(Math.PI * easedAmount) * zoomOutDistance;
    const focusBlend = easeInOutCubic(
      THREE.MathUtils.clamp((amount - 0.08) / 0.92, 0, 1)
    );

    resolveDirections();
    if (useMidpoint) {
      // Spherical quadratic Bezier (de Casteljau) — pulls the camera arc
      // toward midDirection without forcing it to pass through exactly.
      slerpUnitVectors(
        bezierLeg1,
        startDirection,
        midDirection,
        easedAmount,
        rotationAxis,
        fallbackAxis
      );
      slerpUnitVectors(
        bezierLeg2,
        midDirection,
        endDirection,
        easedAmount,
        rotationAxis2,
        fallbackAxis2
      );
      slerpUnitVectors(
        currentDirection,
        bezierLeg1,
        bezierLeg2,
        easedAmount,
        rotationAxis,
        fallbackAxis
      );
    } else {
      slerpUnitVectors(
        currentDirection,
        startDirection,
        endDirection,
        easedAmount,
        rotationAxis,
        fallbackAxis
      );
    }

    lookFocus.copy(startFocus).lerp(endFocus, easedAmount);
    lookTarget.copy(globeCenter).lerp(lookFocus, focusBlend);

    camera.position.copy(globeCenter).addScaledVector(currentDirection, distance);
    camera.lookAt(lookTarget);

    if (controls) {
      controls.target.copy(lookTarget);
    }
  }

  return {
    seek,
    get duration() {
      return duration;
    },
  };
}

function easeInOutCubic(value) {
  const amount = THREE.MathUtils.clamp(value, 0, 1);
  return amount < 0.5
    ? 4 * amount * amount * amount
    : 1 - Math.pow(-2 * amount + 2, 3) / 2;
}

function slerpUnitVectors(target, from, to, amount, axis, fallbackAxis) {
  const angle = from.angleTo(to);

  if (angle < 0.000001) {
    return target.copy(from);
  }

  if (Math.PI - angle < 0.000001) {
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

function applyRenderLayout() {
  if (!renderOptions.isExportMode) {
    return;
  }

  app.classList.add("app-export");
  document.body.classList.add("is-export-mode");
  previewShell.style.width =
    `${Math.round(EXPORT_WIDTH * renderOptions.renderScale)}px`;
  previewShell.style.height =
    `${Math.round(EXPORT_HEIGHT * renderOptions.renderScale)}px`;
}

function readPreviewSize() {
  return {
    width: Math.max(1, Math.round(previewShell.clientWidth || EXPORT_WIDTH)),
    height: Math.max(1, Math.round(previewShell.clientHeight || EXPORT_HEIGHT)),
  };
}

function resizeRenderersTo({ width, height, pixelRatio }) {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
}

function resizeRenderers() {
  const { width, height } = readPreviewSize();
  resizeRenderersTo({
    width,
    height,
    pixelRatio: renderOptions.isExportMode
      ? 1
      : Math.min(window.devicePixelRatio || 1, 2),
  });
}

function renderScene() {
  lighting.update();
  if (freeCameraEnabled) {
    controls.update();
  }
  cameraControlsPanel.update();
  renderer.render(scene, camera);
}

function setRenderFrame(frame, { playing = false } = {}) {
  if (freeCameraEnabled) {
    setFreeCameraEnabled(false);
  }

  currentRenderFrame = clampFrame(frame);
  timelinePlaying = Boolean(playing);
  cameraIntroAnimation.stop();

  const timeMs = (currentRenderFrame / RENDER_FPS) * 1000;
  setTimelineStateForTime(timeMs);
  renderScene();
  syncRenderControls();
}

function syncLiveFrame(now) {
  if (!hasIntroStarted || !timelinePlaying) {
    return null;
  }

  if (timelineStartTime === null) {
    timelineStartTime = now;
    currentRenderFrame = 0;
    syncRenderControls();
    return 0;
  }

  const elapsedMs = Math.max(0, now - timelineStartTime);
  currentRenderFrame = clampFrame((elapsedMs / 1000) * RENDER_FPS);
  if (elapsedMs >= TIMELINE_DURATION_MS) {
    timelinePlaying = false;
  }
  syncRenderControls();
  return Math.min(elapsedMs, TIMELINE_DURATION_MS);
}

function setTimelineStateForTime(timeMs) {
  const clampedTimeMs = THREE.MathUtils.clamp(timeMs, 0, TIMELINE_DURATION_MS);
  const timeSeconds = clampedTimeMs / 1000;
  const routeProgress =
    clampedTimeMs < ROUTE_CAMERA_START_MS
      ? 0
      : (clampedTimeMs - ROUTE_CAMERA_START_MS)
        / ROUTE_CAMERA_TRANSITION_DURATION_MS;

  setTimelineCameraForTime(clampedTimeMs);
  activeRouteArc.setAnimationTime(timeSeconds, routeProgress);
  earth.setAnimationTime(timeSeconds);
  stars.rotation.y = -STAR_ROTATION_SPEED_PER_FRAME * 60 * timeSeconds;
}

function setTimelineCameraForTime(timeMs) {
  if (timeMs < ROUTE_CAMERA_START_MS) {
    cameraIntroAnimation.seek(timeMs / CAMERA_INTRO_DURATION_MS);
    return;
  }

  activeRouteCameraTransition.seek(
    (timeMs - ROUTE_CAMERA_START_MS) / ROUTE_CAMERA_TRANSITION_DURATION_MS
  );
}

function animate(now) {
  requestAnimationFrame(animate);

  if (renderOptions.isExportMode) {
    return;
  }

  if (freeCameraEnabled) {
    renderScene();
    return;
  }

  if (!timelinePlaying) {
    return;
  }

  const timelineTimeMs = syncLiveFrame(now);
  if (timelineTimeMs === null) {
    return;
  }

  setTimelineStateForTime(timelineTimeMs);
  renderScene();
}

animate();

function handleWindowResize() {
  resizeRenderers();
  if (!timelinePlaying) {
    setRenderFrame(currentRenderFrame, { playing: false });
  }
}

window.addEventListener("resize", handleWindowResize, false);

function setFreeCameraEnabled(enabled) {
  const nextEnabled = Boolean(enabled);
  if (freeCameraEnabled === nextEnabled) {
    return;
  }

  freeCameraEnabled = nextEnabled;
  if (freeCameraEnabled) {
    timelinePlaying = false;
    cameraIntroAnimation.stop();
    controls.enabled = true;
    controls.update();
  } else {
    controls.enabled = false;
    controls.screenSpacePanning = false;
    setRenderFrame(currentRenderFrame, { playing: false });
    return;
  }

  renderScene();
  syncRenderControls();
}

function setFreeCameraPanning(enabled) {
  if (!freeCameraEnabled) {
    return;
  }

  controls.screenSpacePanning = Boolean(enabled);
  controls.mouseButtons.LEFT = enabled ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
}

function isEditingText(element) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element?.isContentEditable
  );
}

function syncFreeCameraPan(event, panning) {
  if (!freeCameraEnabled || event.code !== "Space" || isEditingText(event.target)) {
    return;
  }

  event.preventDefault();
  setFreeCameraPanning(panning);
}

window.addEventListener("keydown", (event) => {
  if (!event.repeat) {
    syncFreeCameraPan(event, true);
  }
});
window.addEventListener("keyup", (event) => syncFreeCameraPan(event, false));
window.addEventListener("blur", () => setFreeCameraPanning(false));

function bindRenderControls() {
  const frameInput = document.querySelector("#render-frame");
  const frameRange = document.querySelector("#render-frame-range");
  const frameCount = document.querySelector("#render-frame-count");
  const exportFrameButton = document.querySelector("#export-frame");
  const exportSequenceButton = document.querySelector("#export-sequence");
  const exportScaleSelect = document.querySelector("#export-scale");
  const exportStatus = document.querySelector("#export-status");

  if (!frameInput || !frameRange || !frameCount) {
    return null;
  }

  const controls = {
    frameInput,
    frameRange,
    frameCount,
    exportFrameButton,
    exportSequenceButton,
    exportScaleSelect,
    exportStatus,
  };

  exportScaleSelect.value = String(DEFAULT_EXPORT_RENDER_SCALE);
  frameInput.addEventListener("change", () => {
    setRenderFrame(Number(frameInput.value), { playing: false });
  });
  frameRange.addEventListener("input", () => {
    setRenderFrame(Number(frameRange.value), { playing: false });
  });
  exportFrameButton.addEventListener("click", () => {
    void exportCurrentFrame();
  });
  exportSequenceButton.addEventListener("click", () => {
    void exportSequence();
  });

  return controls;
}

function syncRenderControls() {
  if (!renderControls) {
    return;
  }

  const maxFrame = RENDER_TIMELINE_TOTAL_FRAMES - 1;
  renderControls.frameInput.max = String(maxFrame);
  renderControls.frameInput.value = String(currentRenderFrame);
  renderControls.frameRange.max = String(maxFrame);
  renderControls.frameRange.value = String(currentRenderFrame);
  renderControls.frameCount.value =
    `${currentRenderFrame + 1} / ${RENDER_TIMELINE_TOTAL_FRAMES}`;
  setExportButtonsDisabled(!isSceneReady);
}

function setExportButtonsDisabled(disabled) {
  if (!renderControls) {
    return;
  }

  renderControls.exportFrameButton.disabled =
    disabled || renderOptions.isExportMode;
  renderControls.exportSequenceButton.disabled =
    disabled || renderOptions.isExportMode;
}

function readExportRenderScale() {
  const value = Number(renderControls?.exportScaleSelect?.value);
  return EXPORT_RENDER_SCALES.has(value) ? value : DEFAULT_EXPORT_RENDER_SCALE;
}

function readExportSize(renderScale) {
  return {
    width: Math.round(EXPORT_WIDTH * renderScale),
    height: Math.round(EXPORT_HEIGHT * renderScale),
  };
}

async function exportCurrentFrame() {
  if (!renderControls?.exportStatus) {
    return;
  }

  const renderScale = readExportRenderScale();
  const exportSize = readExportSize(renderScale);
  const filename = `earth-frame-${String(currentRenderFrame).padStart(4, "0")}.png`;
  const status = renderControls.exportStatus;

  setExportButtonsDisabled(true);
  status.textContent =
    `Exporting ${exportSize.width}x${exportSize.height} frame `
    + `${currentRenderFrame + 1}/${RENDER_TIMELINE_TOTAL_FRAMES}...`;

  try {
    const blob = await renderFixedSizePngBlob({
      frame: currentRenderFrame,
      renderScale,
    });
    downloadBlob(blob, filename);
    status.textContent = `PNG exported at ${exportSize.width}x${exportSize.height}.`;
  } catch (error) {
    status.textContent = `Export failed: ${error.message}`;
  } finally {
    setExportButtonsDisabled(false);
  }
}

async function exportSequence() {
  if (!renderControls?.exportStatus) {
    return;
  }

  const renderScale = readExportRenderScale();
  const exportSize = readExportSize(renderScale);
  const status = renderControls.exportStatus;
  const filename =
    `earth-frames-${String(RENDER_TIMELINE_TOTAL_FRAMES).padStart(4, "0")}.zip`;

  setExportButtonsDisabled(true);
  status.textContent =
    `Exporting ${RENDER_TIMELINE_TOTAL_FRAMES} frames at `
    + `${exportSize.width}x${exportSize.height}...`;

  try {
    const blob = await renderFixedSizeZipBlob({
      startFrame: 0,
      endFrame: RENDER_TIMELINE_TOTAL_FRAMES - 1,
      renderScale,
      onFrame: (frame) => {
        status.textContent =
          `Exporting ${exportSize.width}x${exportSize.height} frame `
          + `${frame + 1}/${RENDER_TIMELINE_TOTAL_FRAMES}...`;
      },
    });
    downloadBlob(blob, filename);
    status.textContent = `ZIP exported at ${exportSize.width}x${exportSize.height}.`;
  } catch (error) {
    status.textContent = `Export failed: ${error.message}`;
  } finally {
    setExportButtonsDisabled(false);
  }
}

async function renderFixedSizePngBlob({ frame, renderScale }) {
  return await withFixedSizeRenderer(renderScale, async () => {
    await sceneReadyPromise;
    setRenderFrame(frame, { playing: false });
    await waitForAnimationFrames(2);
    return await previewShellToPngBlob();
  });
}

async function renderFixedSizeZipBlob({
  startFrame,
  endFrame,
  renderScale,
  onFrame,
}) {
  return await withFixedSizeRenderer(renderScale, async () => {
    await sceneReadyPromise;
    const entries = [];
    const clampedStartFrame = clampFrame(startFrame);
    const clampedEndFrame = Math.max(clampedStartFrame, clampFrame(endFrame));

    for (let frame = clampedStartFrame; frame <= clampedEndFrame; frame += 1) {
      onFrame?.(frame);
      setRenderFrame(frame, { playing: false });
      await waitForAnimationFrames(2);

      const blob = await previewShellToPngBlob();
      entries.push({
        name: formatFrameFileName(frame),
        data: new Uint8Array(await blob.arrayBuffer()),
      });
    }

    return createStoredZipBlob(entries);
  });
}

async function withFixedSizeRenderer(renderScale, task) {
  const { width, height } = readExportSize(renderScale);
  const previousPixelRatio = renderer.getPixelRatio();
  const previousFrame = currentRenderFrame;
  const previousWidth = previewShell.style.width;
  const previousHeight = previewShell.style.height;

  timelinePlaying = false;
  previewShell.style.width = `${width}px`;
  previewShell.style.height = `${height}px`;
  resizeRenderersTo({ width, height, pixelRatio: 1 });

  try {
    return await task();
  } finally {
    previewShell.style.width = previousWidth;
    previewShell.style.height = previousHeight;
    resizeRenderers();
    setRenderFrame(previousFrame, { playing: false });
    timelinePlaying = false;
    renderer.setPixelRatio(previousPixelRatio);
    syncRenderControls();
  }
}

async function previewShellToPngBlob() {
  const { width, height } = readPreviewSize();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.drawImage(renderer.domElement, 0, 0, width, height);

  return await canvasToBlob(canvas, "image/png");
}

function formatFrameFileName(frame) {
  return `frame-${String(frame).padStart(4, "0")}.png`;
}

function createStoredZipBlob(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let centralSize = 0;

  for (const entry of entries) {
    if (entry.data.length > 0xffffffff) {
      throw new Error("A ZIP entry is too large for browser export.");
    }

    const nameBytes = encoder.encode(entry.name);
    const crc = computeCrc32(entry.data);
    const localHeader = createZipLocalHeader({ nameBytes, data: entry.data, crc });
    const centralHeader = createZipCentralHeader({
      nameBytes,
      data: entry.data,
      crc,
      localHeaderOffset: offset,
    });

    localParts.push(localHeader, entry.data);
    centralParts.push(centralHeader);
    offset += localHeader.length + entry.data.length;
    centralSize += centralHeader.length;

    if (offset > 0xffffffff || centralSize > 0xffffffff) {
      throw new Error("ZIP is too large for browser export.");
    }
  }

  const centralOffset = offset;
  const endRecord = createZipEndRecord({
    entryCount: entries.length,
    centralSize,
    centralOffset,
  });

  return new Blob([...localParts, ...centralParts, endRecord], {
    type: "application/zip",
  });
}

function createZipLocalHeader({ nameBytes, data, crc }) {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, ZIP_VERSION_NEEDED, true);
  view.setUint16(8, ZIP_STORE_METHOD, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, nameBytes.length, true);
  header.set(nameBytes, 30);
  return header;
}

function createZipCentralHeader({ nameBytes, data, crc, localHeaderOffset }) {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, ZIP_VERSION_NEEDED, true);
  view.setUint16(6, ZIP_VERSION_NEEDED, true);
  view.setUint16(10, ZIP_STORE_METHOD, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, data.length, true);
  view.setUint32(24, data.length, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint32(42, localHeaderOffset, true);
  header.set(nameBytes, 46);
  return header;
}

function createZipEndRecord({ entryCount, centralSize, centralOffset }) {
  if (entryCount > 0xffff) {
    throw new Error("ZIP has too many files.");
  }

  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return record;
}

function computeCrc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrc32Table() {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Canvas export failed."));
    }, type);
  });
}

function downloadBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}

function installSceneExportBridge() {
  window.__SCENE_3D_EXPORT__ = {
    isReady: () => isSceneReady,
    getCurrentFrame: () => currentRenderFrame,
    getTotalFrames: () => RENDER_TIMELINE_TOTAL_FRAMES,
    getSize: () => ({
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
      aspectRatio: EXPORT_ASPECT_RATIO,
      fps: RENDER_FPS,
    }),
    setFrame: async (frame) => {
      await sceneReadyPromise;
      setRenderFrame(frame, { playing: false });
      await waitForAnimationFrames(2);
      return currentRenderFrame;
    },
  };
}

function waitForAnimationFrames(frameCount = 1) {
  return new Promise((resolve) => {
    let remaining = Math.max(1, frameCount);
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

export { camera, controls, earth };

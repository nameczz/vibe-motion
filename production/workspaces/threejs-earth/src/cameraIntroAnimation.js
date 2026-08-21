import * as THREE from "three";

import { getWorldPositionForLatLon } from "./geo.js";

const DEFAULT_DURATION_MS = 1500;
const DEFAULT_END_DISTANCE = 1.656;
const EPSILON = 0.000001;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp01(value) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function slerpUnitVectors(target, from, to, t, axis, fallbackAxis) {
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

  return target.copy(from).applyAxisAngle(axis, angle * t).normalize();
}

export function createCameraIntroAnimation({
  camera,
  controls,
  globe,
  latitude,
  longitude,
  getFocusWorldPosition,
  duration = DEFAULT_DURATION_MS,
  endDistance = DEFAULT_END_DISTANCE,
} = {}) {
  if (!camera || !globe) {
    throw new Error("createCameraIntroAnimation requires camera and globe.");
  }

  const globeCenter = new THREE.Vector3();
  const locationWorldPosition = new THREE.Vector3();
  const focusWorldPosition = new THREE.Vector3();
  const finalFocusWorldPosition = new THREE.Vector3();
  const startDirection = new THREE.Vector3();
  const endDirection = new THREE.Vector3();
  const currentDirection = new THREE.Vector3();
  const rotationAxis = new THREE.Vector3();
  const fallbackAxis = new THREE.Vector3();
  const initialCameraPosition = camera.position.clone();

  let startTime = 0;
  let startDistance = 0;
  let isRunning = false;
  let initialControlsEnabled = controls ? controls.enabled : true;

  function captureStartState(now) {
    globe.getWorldPosition(globeCenter);
    startDirection.copy(camera.position).sub(globeCenter);
    startDistance = startDirection.length();

    if (startDistance < 0.000001) {
      startDirection.set(0, 0, 1);
      startDistance = 5;
    } else {
      startDirection.normalize();
    }

    finalFocusWorldPosition.copy(getFinalFocusWorldPosition());
    endDirection.copy(finalFocusWorldPosition).sub(globeCenter);

    if (endDirection.lengthSq() < EPSILON) {
      endDirection.copy(startDirection);
    } else {
      endDirection.normalize();
    }

    if (controls) {
      initialControlsEnabled = controls.enabled;
      controls.enabled = false;
    }

    startTime = now;
    isRunning = true;
  }

  function captureInitialTimelineState() {
    globe.getWorldPosition(globeCenter);
    startDirection.copy(initialCameraPosition).sub(globeCenter);
    startDistance = startDirection.length();

    if (startDistance < 0.000001) {
      startDirection.set(0, 0, 1);
      startDistance = 5;
    } else {
      startDirection.normalize();
    }

    finalFocusWorldPosition.copy(getFinalFocusWorldPosition());
    endDirection.copy(finalFocusWorldPosition).sub(globeCenter);

    if (endDirection.lengthSq() < EPSILON) {
      endDirection.copy(startDirection);
    } else {
      endDirection.normalize();
    }
  }

  function getFinalFocusWorldPosition() {
    if (getFocusWorldPosition) {
      const resolvedPosition = getFocusWorldPosition(focusWorldPosition);

      if (resolvedPosition && resolvedPosition !== focusWorldPosition) {
        focusWorldPosition.copy(resolvedPosition);
      }

      return focusWorldPosition;
    }

    return locationWorldPosition.copy(
      getWorldPositionForLatLon({
        globe,
        latitude,
        longitude,
      })
    );
  }

  function setCameraForProgress(progress) {
    globe.getWorldPosition(globeCenter);

    const motionT = easeInOutCubic(progress);
    const distance = THREE.MathUtils.lerp(startDistance, endDistance, motionT);

    slerpUnitVectors(
      currentDirection,
      startDirection,
      endDirection,
      motionT,
      rotationAxis,
      fallbackAxis
    );
    if (currentDirection.lengthSq() < EPSILON) {
      currentDirection.copy(endDirection);
    }
    currentDirection.normalize();

    camera.position.copy(globeCenter).addScaledVector(currentDirection, distance);
    camera.lookAt(globeCenter);

    if (controls) {
      controls.target.copy(globeCenter);
    }
  }

  function finish() {
    setCameraForProgress(1);
    isRunning = false;

    if (controls) {
      controls.target.copy(globeCenter);
      controls.update();
      controls.enabled = initialControlsEnabled;
    }
  }

  return {
    start(now = performance.now()) {
      if (isRunning) {
        return;
      }

      captureStartState(now);
      setCameraForProgress(0);
    },
    update(now = performance.now()) {
      if (!isRunning) {
        return;
      }

      const progress = clamp01((now - startTime) / duration);
      if (progress >= 1) {
        finish();
        return;
      }

      setCameraForProgress(progress);
    },
    seek(progress) {
      captureInitialTimelineState();
      setCameraForProgress(clamp01(progress));
      isRunning = false;
    },
    stop() {
      isRunning = false;
      if (controls) {
        controls.enabled = initialControlsEnabled;
      }
    },
    get duration() {
      return duration;
    },
    get isRunning() {
      return isRunning;
    },
  };
}

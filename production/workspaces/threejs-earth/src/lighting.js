import * as THREE from "three";

const LIGHTING_MODE_CAMERA = "camera";
const LIGHTING_MODE_MANUAL = "manual";

export function createSceneLighting({
  lightsMaterial,
  cloudsMaterial,
  rimMaterial,
  camera,
}) {
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
  const moonLight = new THREE.DirectionalLight(0x8fb2ff, 0.25);
  const sunDirection = new THREE.Vector3();
  const cameraWorldPosition = new THREE.Vector3();

  const sunState = {
    mode: LIGHTING_MODE_CAMERA,
    azimuth: -53,
    elevation: 11,
    distance: 5,
  };
  const cloudState = {
    opacity: cloudsMaterial.uniforms.opacity.value,
  };
  const moonState = {
    intensity: moonLight.intensity,
  };
  const nightState = {
    intensity: lightsMaterial.uniforms.opacity.value,
  };

  function getManualSunDirection() {
    const azimuth = THREE.MathUtils.degToRad(sunState.azimuth);
    const elevation = THREE.MathUtils.degToRad(sunState.elevation);
    const horizontalDistance = Math.cos(elevation);

    return sunDirection
      .set(
        Math.sin(azimuth) * horizontalDistance,
        Math.sin(elevation),
        Math.cos(azimuth) * horizontalDistance
      )
      .normalize();
  }

  function getCameraSunDirection() {
    if (!camera) {
      return getManualSunDirection();
    }

    camera.getWorldPosition(cameraWorldPosition);
    if (cameraWorldPosition.lengthSq() === 0) {
      return getManualSunDirection();
    }

    return sunDirection.copy(cameraWorldPosition).normalize();
  }

  function updateSunLight() {
    const direction =
      sunState.mode === LIGHTING_MODE_MANUAL
        ? getManualSunDirection()
        : getCameraSunDirection();

    sunLight.position.copy(direction).multiplyScalar(sunState.distance);
    sunLight.updateMatrixWorld();

    moonLight.position.copy(direction).multiplyScalar(-sunState.distance);
    moonLight.updateMatrixWorld();

    lightsMaterial.uniforms.sunDirection.value.copy(direction);
    cloudsMaterial.uniforms.sunDirection.value.copy(direction);
    rimMaterial?.uniforms?.sunDirection?.value.copy(direction);
  }

  function applyLightingState() {
    cloudsMaterial.uniforms.opacity.value = cloudState.opacity;
    moonLight.intensity = moonState.intensity;
    lightsMaterial.uniforms.opacity.value = nightState.intensity;
    updateSunLight();
  }

  applyLightingState();

  return {
    lights: [sunLight, moonLight],
    states: {
      sun: sunState,
      clouds: cloudState,
      moon: moonState,
      night: nightState,
    },
    applyLightingState,
    update: updateSunLight,
  };
}

import * as THREE from "three";

import { getFresnelMat, getGithubGlowMat } from "./getFresnelMat.js";

const EARTH_TEXTURE_PATH = "./textures/solar-system-scope/";
const INITIAL_EARTH_ROTATION_Y = THREE.MathUtils.degToRad(-170);
const EARTH_ROTATION_SPEED = 0.0007 / 3;
const CLOUD_ROTATION_SPEED = EARTH_ROTATION_SPEED * 1.08;
const CLOUD_DRIFT_SPEED = CLOUD_ROTATION_SPEED - EARTH_ROTATION_SPEED;
const CLOUD_LAYER_SCALE = 1.001;
const FRESNEL_RIM_SCALE = 1.012;
const GITHUB_GLOBE_RIM_SCALE = 1.04;

function loadEarthTextures({
  texturePath = EARTH_TEXTURE_PATH,
  loadingManager,
} = {}) {
  const loader = new THREE.TextureLoader(loadingManager);
  const dayTexture = loader.load(`${texturePath}8k_earth_daymap.jpg`);
  dayTexture.colorSpace = THREE.SRGBColorSpace;

  const nightTexture = loader.load(`${texturePath}8k_earth_nightmap.jpg`);
  nightTexture.colorSpace = THREE.SRGBColorSpace;

  const cloudTexture = loader.load(`${texturePath}8k_earth_clouds.jpg`);
  cloudTexture.colorSpace = THREE.SRGBColorSpace;

  return {
    dayTexture,
    nightTexture,
    cloudTexture,
    cloudAlphaTexture: loader.load(`${texturePath}8k_earth_clouds_alpha.png`),
    normalTexture: loader.load(`${texturePath}8k_earth_normal_map.png`),
    specularTexture: loader.load(`${texturePath}8k_earth_specular_map.png`),
  };
}

function createNightLightsMaterial(nightTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      nightMap: { value: nightTexture },
      sunDirection: { value: new THREE.Vector3() },
      opacity: { value: 1.5 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D nightMap;
      uniform vec3 sunDirection;
      uniform float opacity;

      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vec4 cityLights = texture2D(nightMap, vUv);
        float sunAmount = dot(normalize(vWorldNormal), normalize(sunDirection));
        float nightAmount = 1.0 - smoothstep(-0.12, 0.18, sunAmount);
        gl_FragColor = vec4(cityLights.rgb * nightAmount, cityLights.a * nightAmount * opacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

function createCloudsMaterial(cloudTexture, cloudAlphaTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      cloudMap: { value: cloudTexture },
      cloudAlphaMap: { value: cloudAlphaTexture },
      sunDirection: { value: new THREE.Vector3() },
      opacity: { value: 0.75 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D cloudMap;
      uniform sampler2D cloudAlphaMap;
      uniform vec3 sunDirection;
      uniform float opacity;

      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vec3 cloudColor = texture2D(cloudMap, vUv).rgb;
        float cloudAlpha = texture2D(cloudAlphaMap, vUv).r;
        float sunAmount = dot(normalize(vWorldNormal), normalize(sunDirection));
        float dayAmount = smoothstep(-0.06, 0.16, sunAmount);

        gl_FragColor = vec4(cloudColor, cloudAlpha * dayAmount * opacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function createEarth({ loadingManager } = {}) {
  const textures = loadEarthTextures({ loadingManager });
  const geometry = new THREE.SphereGeometry(1, 128, 64);
  const group = new THREE.Group();
  group.name = "Earth globe";
  group.rotation.y = INITIAL_EARTH_ROTATION_Y;

  const earthMaterial = new THREE.MeshPhongMaterial({
    map: textures.dayTexture,
    specularMap: textures.specularTexture,
    normalMap: textures.normalTexture,
    normalScale: new THREE.Vector2(0.7, 0.7),
  });
  const earthMesh = new THREE.Mesh(geometry, earthMaterial);
  group.add(earthMesh);

  const lightsMaterial = createNightLightsMaterial(textures.nightTexture);
  const lightsMesh = new THREE.Mesh(geometry, lightsMaterial);
  lightsMesh.scale.setScalar(1.0015);
  group.add(lightsMesh);

  const cloudsMaterial = createCloudsMaterial(
    textures.cloudTexture,
    textures.cloudAlphaTexture
  );
  const cloudsMesh = new THREE.Mesh(geometry, cloudsMaterial);
  cloudsMesh.scale.setScalar(CLOUD_LAYER_SCALE);
  group.add(cloudsMesh);

  const fresnelMaterial = getFresnelMat();
  fresnelMaterial.depthWrite = false;
  const fresnelMesh = new THREE.Mesh(geometry, fresnelMaterial);
  fresnelMesh.scale.setScalar(FRESNEL_RIM_SCALE);
  group.add(fresnelMesh);

  const githubGlowMaterial = getGithubGlowMat({
    color: "#4fb8ff",
    coefficient: 0.18,
    power: 4.8,
    intensity: 0.38,
    backside: true,
  });
  const glowMesh = new THREE.Mesh(geometry, githubGlowMaterial);
  glowMesh.scale.setScalar(GITHUB_GLOBE_RIM_SCALE);
  group.add(glowMesh);

  return {
    group,
    meshes: {
      earth: earthMesh,
      lights: lightsMesh,
      clouds: cloudsMesh,
      fresnel: fresnelMesh,
      glow: glowMesh,
    },
    materials: {
      lights: lightsMaterial,
      clouds: cloudsMaterial,
      fresnel: fresnelMaterial,
      glow: githubGlowMaterial,
    },
    setAnimationTime(seconds) {
      cloudsMesh.rotation.y = seconds * 60 * CLOUD_DRIFT_SPEED;
    },
    update() {
      cloudsMesh.rotation.y += CLOUD_DRIFT_SPEED;
    },
  };
}

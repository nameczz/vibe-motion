import * as THREE from "three";

function getFresnelMat({
  rimHex = 0x7fd8ff,
  twilightHex = 0xff9b5c,
  facingHex = 0x000000,
  intensity = 0.95,
  fresnelPower = 2.7,
} = {}) {
  const uniforms = {
    rimColor: { value: new THREE.Color(rimHex) },
    twilightColor: { value: new THREE.Color(twilightHex) },
    facingColor: { value: new THREE.Color(facingHex) },
    sunDirection: { value: new THREE.Vector3(0, 0, 1) },
    intensity: { value: intensity },
    fresnelPower: { value: fresnelPower },
  };
  const vs = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * mvPosition;
  }
  `;
  const fs = `
  uniform vec3 rimColor;
  uniform vec3 twilightColor;
  uniform vec3 facingColor;
  uniform vec3 sunDirection;
  uniform float intensity;
  uniform float fresnelPower;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 lightDirection = normalize(sunDirection);

    float viewDot = max(dot(normal, viewDirection), 0.0);
    float viewRim = pow(1.0 - viewDot, fresnelPower);
    viewRim = smoothstep(0.08, 0.95, viewRim);

    float sunAmount = dot(normal, lightDirection);
    float litScatter = smoothstep(-0.28, 0.52, sunAmount);
    float terminatorScatter =
      smoothstep(-0.24, 0.04, sunAmount) *
      (1.0 - smoothstep(0.18, 0.62, sunAmount));
    float nightFloor = 0.08 * (1.0 - litScatter);

    float alpha = viewRim * (nightFloor + litScatter * 0.82 + terminatorScatter * 0.26);
    alpha = clamp(alpha * intensity, 0.0, 1.0);

    vec3 scatterColor = rimColor;
    scatterColor = mix(scatterColor, twilightColor, terminatorScatter * 0.28);
    vec3 color = mix(facingColor, scatterColor, alpha);

    gl_FragColor = vec4(color, alpha);
  }
  `;
  const fresnelMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vs,
    fragmentShader: fs,
    transparent: true,
    blending: THREE.AdditiveBlending,
  });
  return fresnelMat;
}

function getGithubGlowMat({
  color = "#4fb8ff",
  coefficient = 0.18,
  power = 4.8,
  intensity = 0.38,
  backside = true,
} = {}) {
  const uniforms = {
    color: { value: new THREE.Color(color) },
    coefficient: { value: coefficient },
    power: { value: power },
    intensity: { value: intensity },
  };
  const vs = `
  varying vec3 vVertexWorldPosition;
  varying vec3 vVertexNormal;

  void main() {
    vVertexNormal = normalize(normalMatrix * normal);
    vVertexWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `;
  const fs = `
  uniform vec3 color;
  uniform float coefficient;
  uniform float power;
  uniform float intensity;

  varying vec3 vVertexWorldPosition;
  varying vec3 vVertexNormal;

  void main() {
    vec3 worldCameraToVertex = vVertexWorldPosition - cameraPosition;
    vec3 viewCameraToVertex = (viewMatrix * vec4(worldCameraToVertex, 0.0)).xyz;
    viewCameraToVertex = normalize(viewCameraToVertex);
    float rim = pow(max(coefficient + dot(vVertexNormal, viewCameraToVertex), 0.0), power);
    rim = clamp(rim * intensity, 0.0, 1.0);

    gl_FragColor = vec4(color, rim);
  }
  `;
  const fresnelMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vs,
    fragmentShader: fs,
    transparent: true,
    depthWrite: false,
    side: backside ? THREE.BackSide : THREE.FrontSide,
    blending: THREE.AdditiveBlending,
  });
  return fresnelMat;
}

export { getFresnelMat, getGithubGlowMat };

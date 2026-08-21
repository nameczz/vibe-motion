import * as THREE from "three";

export const EARTH_RADIUS = 1;
const LABEL_FONT_SIZE = 64;
const LABEL_HEIGHT = 0.075;
const LABEL_GAP = 0.018;
const LABEL_SURFACE_OFFSET = 0.02;
const LABEL_TEXTURE_PADDING_X = 24;
const LABEL_TEXTURE_PADDING_Y = 16;

export function latLonToVector3(latitude, longitude, radius = EARTH_RADIUS) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  const cosLat = Math.cos(lat);

  return new THREE.Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon)
  );
}

export function getWorldPositionForLatLon({
  globe,
  latitude,
  longitude,
  radius = EARTH_RADIUS,
}) {
  const localPosition = latLonToVector3(latitude, longitude, radius);
  globe.updateWorldMatrix(true, false);

  return globe.localToWorld(localPosition);
}

export function createLocationCircleMarker({
  latitude,
  longitude,
  radius = 1.012,
  color = 0xffd24a,
  innerRadius = 0.007,
  outerRadius = 0.011,
  opacity = 0.96,
  label = "",
} = {}) {
  const normal = latLonToVector3(latitude, longitude, 1).normalize();
  const marker = new THREE.Group();
  marker.name = "Location circle marker";
  marker.position.copy(normal).multiplyScalar(radius);
  marker.userData.location = { latitude, longitude };

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(innerRadius, outerRadius, 64),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    })
  );
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  ring.renderOrder = 20;
  marker.add(ring);

  if (label) {
    const labelSprite = createLocationLabelSprite(label);
    const labelOffset = createLabelOffset(normal, outerRadius, labelSprite.scale.x);
    labelSprite.position.copy(labelOffset);
    marker.add(labelSprite);
  }

  return marker;
}

function createLocationLabelSprite(text) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const font =
    `700 ${LABEL_FONT_SIZE}px "PingFang SC", "Hiragino Sans GB", system-ui, `
    + `-apple-system, BlinkMacSystemFont, `
    + `"Segoe UI", sans-serif`;

  context.font = font;
  const metrics = context.measureText(text);
  canvas.width = Math.ceil(metrics.width + LABEL_TEXTURE_PADDING_X * 2);
  canvas.height = LABEL_FONT_SIZE + LABEL_TEXTURE_PADDING_Y * 2;

  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(0, 0, 0, 0.42)";
  context.fillText(text, canvas.width / 2 + 2, canvas.height / 2 + 2);
  context.fillStyle = "#ffffff";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    })
  );
  const aspectRatio = canvas.width / canvas.height;
  sprite.scale.set(LABEL_HEIGHT * aspectRatio, LABEL_HEIGHT, 1);
  sprite.renderOrder = 21;

  return sprite;
}

function createLabelOffset(normal, outerRadius, labelWidth) {
  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(up, normal);

  if (tangent.lengthSq() < 0.000001) {
    tangent.set(1, 0, 0);
  } else {
    tangent.normalize();
  }

  return tangent
    .multiplyScalar(outerRadius + LABEL_GAP + labelWidth / 2)
    .addScaledVector(normal, LABEL_SURFACE_OFFSET);
}

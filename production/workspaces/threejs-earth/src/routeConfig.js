// Update this object to swap the route without touching scene wiring.
export const ACTIVE_ROUTE = {
  name: "Shanghai to Cape Verde",
  start: {
    label: "上海",
    latitude: 31.2304,
    longitude: 121.4737,
    color: 0x56e8ff,
  },
  end: {
    label: "佛得角",
    latitude: 14.9331,
    longitude: -23.5133,
    color: 0xa78bfa,
  },
  marker: {
    color: 0xffffff,
  },
  arc: {
    color: 0x7ee8ff,
    style: "solid",
    peakAltitude: 0.5,
    tubeRadius: 0.0042,
    endRadiusRatio: 0.7,
    taperPower: 0.82,
  },
  camera: {
    midpoint: {
      latitude: 54.2854,
      longitude: 38.0312,
    },
    transitionDurationMs: 4500,
    locationDistance: 1.92,
    zoomOutDistance: 1.28,
  },
};

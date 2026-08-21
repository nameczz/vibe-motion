import React from "react";
import {VerticalTicker} from "../components/VerticalTicker";
import {createTickerCardDataUri} from "../utils/art";

const leftCards = [
  createTickerCardDataUri({
    title: "Signal Stack",
    subtitle: "layered motion cards",
    accent: "#4b7bff",
    accent2: "#142243",
    badge: "TICKER A",
    metric: "01",
  }),
  createTickerCardDataUri({
    title: "Depth Cue",
    subtitle: "foreground movement",
    accent: "#ff8a4c",
    accent2: "#461d13",
    badge: "TICKER A",
    metric: "02",
  }),
  createTickerCardDataUri({
    title: "Loop Seed",
    subtitle: "deterministic scroll",
    accent: "#73f1c0",
    accent2: "#103028",
    badge: "TICKER A",
    metric: "03",
  }),
  createTickerCardDataUri({
    title: "Card Field",
    subtitle: "perspective stack",
    accent: "#d164ff",
    accent2: "#38174a",
    badge: "TICKER A",
    metric: "04",
  }),
];

const centerCards = [
  createTickerCardDataUri({
    title: "Vertical Flow",
    subtitle: "slow center lane",
    accent: "#ffd45a",
    accent2: "#533815",
    badge: "TICKER B",
    metric: "05",
  }),
  createTickerCardDataUri({
    title: "Midline",
    subtitle: "parallax motion",
    accent: "#73a9ff",
    accent2: "#1d335f",
    badge: "TICKER B",
    metric: "06",
  }),
  createTickerCardDataUri({
    title: "Refraction",
    subtitle: "angled depth stack",
    accent: "#ff6d94",
    accent2: "#4d182f",
    badge: "TICKER B",
    metric: "07",
  }),
  createTickerCardDataUri({
    title: "Loop Core",
    subtitle: "consistent cadence",
    accent: "#52e09a",
    accent2: "#154231",
    badge: "TICKER B",
    metric: "08",
  }),
];

const rightCards = [
  createTickerCardDataUri({
    title: "Depth Lane",
    subtitle: "accelerated drift",
    accent: "#53d2ff",
    accent2: "#10344b",
    badge: "TICKER C",
    metric: "09",
  }),
  createTickerCardDataUri({
    title: "Far Field",
    subtitle: "receding perspective",
    accent: "#ffb547",
    accent2: "#4a2b10",
    badge: "TICKER C",
    metric: "10",
  }),
  createTickerCardDataUri({
    title: "Repeat Axis",
    subtitle: "column cycle",
    accent: "#86ff7e",
    accent2: "#164122",
    badge: "TICKER C",
    metric: "11",
  }),
  createTickerCardDataUri({
    title: "Final Lane",
    subtitle: "closing loop",
    accent: "#f16eff",
    accent2: "#401749",
    badge: "TICKER C",
    metric: "12",
  }),
];

export const Remotion3DTicker: React.FC = () => {
  return (
    <VerticalTicker
      backgroundColor="#05070d"
      columns={[
        {
          items: leftCards,
          durationInSeconds: 6,
          direction: -1,
          phaseOffsetFrames: 0,
        },
        {
          items: centerCards,
          durationInSeconds: 6,
          direction: 1,
          phaseOffsetFrames: 16,
        },
        {
          items: rightCards,
          durationInSeconds: 6,
          direction: -1,
          phaseOffsetFrames: 32,
        },
      ]}
    />
  );
};

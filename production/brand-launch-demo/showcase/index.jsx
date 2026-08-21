import "../remotion/styles.css";
import React from "react";
import {Composition, registerRoot} from "remotion";
import {ShowcaseComposition} from "./ShowcaseComposition.jsx";
import {
  SHOWCASE_DURATION_IN_FRAMES,
  SHOWCASE_FPS,
  SHOWCASE_HEIGHT,
  SHOWCASE_WIDTH,
} from "./data.js";

const ShowcaseRoot = () => (
  <Composition
    id="VibeMotionSkillsShowcase"
    component={ShowcaseComposition}
    durationInFrames={SHOWCASE_DURATION_IN_FRAMES}
    fps={SHOWCASE_FPS}
    width={SHOWCASE_WIDTH}
    height={SHOWCASE_HEIGHT}
  />
);

registerRoot(ShowcaseRoot);

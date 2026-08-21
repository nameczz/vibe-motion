#!/usr/bin/env node

import {writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {
  INTRO_FRAMES,
  OUTRO_START,
  OUTRO_FRAMES,
  SEGMENT_TIMINGS,
  SHOWCASE_DURATION_IN_FRAMES,
  SHOWCASE_FPS,
} from "../data.js";

const showcaseRoot = resolve(import.meta.dirname, "..");
const timelinePath = resolve(showcaseRoot, "timeline.json");

const shots = [
  {
    id: "brand-intro",
    startFrame: 0,
    endFrame: INTRO_FRAMES,
    visualOwner: "official Vibe Motion GitHub organization avatar",
  },
  ...SEGMENT_TIMINGS.flatMap((segment) => [
    {
      id: `${segment.displayNumber}-invocation`,
      startFrame: segment.promptStart,
      endFrame: segment.effectStart,
      visualOwner: `actual claude-typer remote render for ${segment.slug}`,
    },
    {
      id: `${segment.displayNumber}-effect`,
      startFrame: segment.effectStart,
      endFrame: segment.effectEnd,
      visualOwner:
        segment.number === "12"
          ? "approved 2160x2160 Liang progression meme contained without cropping, with persistent skill subtitle"
          : `complete ${segment.slug} animation with persistent skill subtitle`,
    },
  ]),
  {
    id: "brand-outro",
    startFrame: OUTRO_START,
    endFrame: OUTRO_START + OUTRO_FRAMES,
    visualOwner: "official Vibe Motion avatar and repository URL",
  },
];

const timeline = {
  fps: SHOWCASE_FPS,
  durationSeconds: SHOWCASE_DURATION_IN_FRAMES / SHOWCASE_FPS,
  allowCustomDuration: true,
  maxOverlapFrames: 0,
  shots,
};

writeFileSync(timelinePath, `${JSON.stringify(timeline, null, 2)}\n`, "utf8");
console.log(`[showcase] wrote ${shots.length} timeline shots: ${timelinePath}`);

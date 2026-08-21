#!/usr/bin/env node

import {mkdirSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {OUTRO_START, SEGMENT_TIMINGS} from "../data.js";

const projectRoot = resolve(import.meta.dirname, "../..");
const inputPath = resolve(
  projectRoot,
  process.argv[2] || "out/VibeMotionSkillsShowcase-v4-claude-typer-visual.mp4",
);
const outputPath = resolve(
  projectRoot,
  process.argv[3] || "out/VibeMotionSkillsShowcase-v4-claude-typer-visual-contact-sheet.png",
);
mkdirSync(dirname(outputPath), {recursive: true});

const sampleFrames = [
  260,
  ...SEGMENT_TIMINGS.flatMap((segment) => [
    segment.promptStart + segment.promptFrames - 3,
    segment.effectStart + Math.min(24, Math.floor(segment.durationInFrames / 2)),
  ]),
  OUTRO_START + 30,
];
if (sampleFrames.length !== 26) {
  throw new Error(`Expected one sample for each of 26 timeline shots; found ${sampleFrames.length}`);
}
const selectExpression = sampleFrames.map((frame) => `eq(n\\,${frame})`).join("+");

const result = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    inputPath,
    "-vf",
    `select='${selectExpression}',setpts=N/FRAME_RATE/TB,scale=400:225:flags=lanczos,tile=7x4:padding=0:margin=0`,
    "-frames:v",
    "1",
    "-update",
    "1",
    outputPath,
  ],
  {stdio: "inherit"},
);
if (result.error || result.status !== 0) {
  throw result.error ?? new Error(`ffmpeg exited with ${result.status}`);
}
console.log(`[showcase] contact sheet (26 timeline shot samples): ${outputPath}`);

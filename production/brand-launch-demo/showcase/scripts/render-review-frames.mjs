#!/usr/bin/env node

import {mkdirSync, rmSync} from "node:fs";
import {resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {
  ensureSharedBrowserExecutable,
  runLocalRemotionCli,
} from "../../scripts/remotion-browser-executable.mjs";
import {INTRO_FRAMES} from "../data.js";

const projectRoot = resolve(import.meta.dirname, "../..");
const outputDirectory = resolve(projectRoot, "out/showcase-v4-claude-typer-review");
rmSync(outputDirectory, {recursive: true, force: true});
mkdirSync(outputDirectory, {recursive: true});

const samples = [
  {name: "01-intro-title-and-line-1", frame: 30},
  {name: "02-intro-matrix-and-line-2", frame: 120},
  {name: "03-intro-full-matrix", frame: 190},
  {name: "04-intro-settle-without-summary", frame: 260},
  {name: "05-intro-final-hold", frame: INTRO_FRAMES - 8},
  {name: "06-first-claude-typer-invocation", frame: INTRO_FRAMES + 34},
];

const browserExecutable = await ensureSharedBrowserExecutable({
  logPrefix: "[showcase][browser]",
});

for (const sample of samples) {
  const outputPath = resolve(outputDirectory, `${sample.name}-f${sample.frame}.png`);
  const args = [
    "still",
    "showcase/index.jsx",
    "VibeMotionSkillsShowcase",
    outputPath,
    "--frame",
    String(sample.frame),
    "--overwrite",
  ];
  if (browserExecutable) args.push("--browser-executable", browserExecutable);
  const result = runLocalRemotionCli({args, stdio: "inherit", env: process.env});
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`Remotion still failed at frame ${sample.frame}`);
  }
}

const sheetPath = resolve(outputDirectory, "review-contact-sheet.png");
const sheet = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-framerate",
    "1",
    "-pattern_type",
    "glob",
    "-i",
    resolve(outputDirectory, "0*.png"),
    "-vf",
    "scale=480:270:flags=lanczos,tile=6x1",
    "-frames:v",
    "1",
    "-update",
    "1",
    sheetPath,
  ],
  {stdio: "inherit"},
);
if (sheet.error || sheet.status !== 0) {
  throw sheet.error ?? new Error("Unable to assemble review contact sheet");
}
console.log(`[showcase] review contact sheet: ${sheetPath}`);

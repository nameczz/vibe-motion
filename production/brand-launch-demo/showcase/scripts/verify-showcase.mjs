#!/usr/bin/env node

import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {SEGMENTS, SHOWCASE_DURATION_IN_FRAMES} from "../data.js";

const projectRoot = resolve(import.meta.dirname, "../..");
const outputPath = resolve(
  projectRoot,
  process.argv[2] || "out/VibeMotionSkillsShowcase-v4-claude-typer-visual.mp4",
);

const fail = (message) => {
  throw new Error(`[showcase][verify] ${message}`);
};
const probe = (path) => {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", path],
    {encoding: "utf8"},
  );
  if (result.error || result.status !== 0) fail(`ffprobe failed for ${path}`);
  return JSON.parse(result.stdout);
};
const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

if (!existsSync(outputPath)) fail(`missing output ${outputPath}`);
const media = probe(outputPath);
const video = media.streams.find((stream) => stream.codec_type === "video");
const audio = media.streams.find((stream) => stream.codec_type === "audio");
if (!video || video.codec_name !== "h264") fail("expected H.264 video");
if (video.width !== 1920 || video.height !== 1080) fail("expected 1920x1080");
if (video.avg_frame_rate !== "30/1") fail(`expected 30fps, got ${video.avg_frame_rate}`);
if (Number(video.nb_read_frames ?? video.nb_frames) !== SHOWCASE_DURATION_IN_FRAMES) {
  fail(`expected ${SHOWCASE_DURATION_IN_FRAMES} frames, got ${video.nb_read_frames ?? video.nb_frames}`);
}
if (audio) fail("visual master must not contain audio; final audio is handled separately");

for (const segment of SEGMENTS) {
  const stage = resolve(projectRoot, "public/showcase/segments", segment.number);
  const promptVideo = probe(resolve(stage, "prompt.mp4")).streams.find((item) => item.codec_type === "video");
  const effectVideo = probe(resolve(stage, "animation.mp4")).streams.find((item) => item.codec_type === "video");
  if (Number(promptVideo?.nb_read_frames ?? promptVideo?.nb_frames) !== segment.promptFrames) {
    fail(`${segment.number} prompt frame mismatch`);
  }
  if (Number(effectVideo?.nb_read_frames ?? effectVideo?.nb_frames) !== segment.durationInFrames) {
    fail(`${segment.number} effect frame mismatch`);
  }

  const invocationPath = resolve(
    projectRoot,
    "public/showcase/v4-invocations",
    `${segment.displayNumber}-${segment.slug}.mov`,
  );
  const invocationVideo = probe(invocationPath).streams.find(
    (item) => item.codec_type === "video",
  );
  if (
    invocationVideo?.codec_name !== "prores" ||
    !String(invocationVideo?.pix_fmt).startsWith("yuva444p") ||
    invocationVideo?.width !== 1920 ||
    invocationVideo?.height !== 1080 ||
    invocationVideo?.avg_frame_rate !== "30/1" ||
    Number(invocationVideo?.nb_read_frames ?? invocationVideo?.nb_frames) !==
      segment.invocationFrames
  ) {
    fail(`${segment.displayNumber} claude-typer invocation media mismatch`);
  }
}

const locked07 = resolve(
  projectRoot,
  "../skills-showcase-v3/07-printed-curtain-render/animation.mp4",
);
if (sha256(locked07) !== "9aa89e4b571721db10a1d3da2e18157bc501f6a1ac650b78e1f81662f02f7d78") {
  fail("07 source is not the user-locked printed curtain version");
}

for (const excluded of ["02", "03", "04"]) {
  if (existsSync(resolve(projectRoot, "public/showcase/segments", excluded))) {
    fail(`excluded segment ${excluded} must not be staged`);
  }
}

const approved12 = resolve(
  projectRoot,
  "public/showcase/segments/12/animation.mp4",
);
const approved12Media = probe(approved12).streams.find(
  (stream) => stream.codec_type === "video",
);
if (sha256(approved12) !== "209feffe6a87680f209e2c301c199dc76013157bd4e8cb835f4db3951380905d") {
  fail("12 source is not the approved monochrome-blue Liang meme");
}
if (
  approved12Media?.width !== 2160 ||
  approved12Media?.height !== 2160 ||
  Number(approved12Media?.nb_read_frames ?? approved12Media?.nb_frames) !== 180
) {
  fail("12 staged effect must be 2160x2160 with 180 frames");
}

console.log(
  `[showcase][verify] passed: 1920x1080, 30fps, ${SHOWCASE_DURATION_IN_FRAMES} frames, H.264 visual-only, 10-second intro, 12 claude-typer invocation/effect pairs; source 03 removed and 02/04 excluded.`,
);

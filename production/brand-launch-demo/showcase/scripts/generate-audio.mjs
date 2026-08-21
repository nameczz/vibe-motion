#!/usr/bin/env node

import {mkdirSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {SHOWCASE_DURATION_IN_FRAMES, SHOWCASE_FPS} from "../data.js";

const projectRoot = resolve(import.meta.dirname, "../..");
const outputPath = resolve(
  projectRoot,
  process.argv[2] || "public/showcase/audio/future-pulse.m4a",
);
const duration = SHOWCASE_DURATION_IN_FRAMES / SHOWCASE_FPS;
const whooshTimes = [0.18, 0.38, 0.58, 0.78, 0.95].map(
  (position) => Math.round(duration * position * 1000),
);

mkdirSync(dirname(outputPath), {recursive: true});

const inputs = [
  "sine=frequency=55:sample_rate=48000",
  "sine=frequency=110:sample_rate=48000",
  "sine=frequency=164.81:sample_rate=48000",
  "anoisesrc=color=pink:amplitude=0.08:sample_rate=48000:seed=41001",
  ...Array.from(
    {length: 5},
    (_, index) =>
      `anoisesrc=color=white:amplitude=0.16:sample_rate=48000:duration=0.7:seed=${41002 + index}`,
  ),
];

const filter = [
  `[0:a]volume=0.10,lowpass=f=180,afade=t=in:st=0:d=2[bed]`,
  `[1:a]tremolo=f=1.833333:d=0.72,volume=0.07,lowpass=f=620[pulse]`,
  `[2:a]tremolo=f=0.458333:d=0.52,volume=0.025,lowpass=f=1400[air]`,
  `[3:a]highpass=f=220,lowpass=f=1600,volume=0.018[noise]`,
  ...whooshTimes.map(
    (delay, index) =>
      `[${index + 4}:a]highpass=f=850,lowpass=f=6800,afade=t=in:st=0:d=0.10,afade=t=out:st=0.18:d=0.52,adelay=${delay}|${delay},volume=0.16[w${index + 1}]`,
  ),
  `[bed][pulse][air][noise][w1][w2][w3][w4][w5]amix=inputs=9:duration=longest:normalize=0,highpass=f=32,lowpass=f=11000,afade=t=out:st=${(duration - 2.5).toFixed(6)}:d=2.5,loudnorm=I=-19:LRA=7:TP=-2[out]`,
].join(";");

const args = ["-y"];
for (const input of inputs) {
  args.push("-f", "lavfi", "-i", input);
}
args.push(
  "-filter_complex",
  filter,
  "-map",
  "[out]",
  "-t",
  duration.toFixed(9),
  "-ac",
  "2",
  "-ar",
  "48000",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  outputPath,
);

const result = spawnSync("ffmpeg", args, {stdio: "inherit"});
if (result.error || result.status !== 0) {
  throw result.error ?? new Error(`ffmpeg exited with ${result.status}`);
}

console.log(`[showcase] generated original 110 BPM soundtrack: ${outputPath}`);

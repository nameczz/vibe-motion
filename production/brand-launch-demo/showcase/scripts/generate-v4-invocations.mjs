#!/usr/bin/env node

import {createHash} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {resolve} from "node:path";
import {homedir} from "node:os";
import {spawnSync} from "node:child_process";
import {SEGMENTS} from "../data.js";

const projectRoot = resolve(import.meta.dirname, "../..");
const outputDirectory = resolve(projectRoot, "public/showcase/v4-invocations");
const manifestPath = resolve(outputDirectory, "manifest.json");
const skillScript = resolve(
  process.env.CLAUDE_TYPER_SCRIPT ??
    resolve(homedir(), ".codex/skills/claude-typer/scripts/render_claude_typer.py"),
);
const wrapperScript = resolve(import.meta.dirname, "render-claude-typer-v4.py");
const serveUrl = "https://www.laosunwendao.com";
const runnerPrefix =
  "npx -y -p @remotion/cli@4.0.440 -p @remotion/tailwind-v4@4.0.440 remotion";
const npmCache = "/tmp/vibe-motion-claude-typer-npm-cache";
const settings = Object.freeze({
  composition: "Typer30fps",
  typingSpeedMs: 30,
  model: "Vibe Motion",
  videoWidth: 1920,
  videoHeight: 1080,
  claudeWidth: 1500,
  fps: 30,
  codec: "prores",
  proresProfile: "4444",
  requestedPixelFormat: "yuva444p10le",
  imageFormat: "png",
  scale: 1,
  timeoutMs: 300000,
  concurrency: 1,
});

const pythonCandidates = [
  "/usr/local/bin/python3",
  "/opt/homebrew/bin/python3",
  "/usr/bin/python3",
];
const python = pythonCandidates.find((candidate) => existsSync(candidate));
if (!python) {
  throw new Error("claude-typer requires python3, but no supported executable was found");
}
if (!existsSync(skillScript)) {
  throw new Error(`claude-typer skill script is missing: ${skillScript}`);
}
if (!existsSync(wrapperScript)) {
  throw new Error(`claude-typer v4 wrapper is missing: ${wrapperScript}`);
}

mkdirSync(outputDirectory, {recursive: true});
mkdirSync(npmCache, {recursive: true});

const sha256 = (filePath) =>
  createHash("sha256").update(readFileSync(filePath)).digest("hex");

const probe = (filePath) => {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type,codec_name,pix_fmt,width,height,r_frame_rate,nb_frames:format=duration,size",
      "-of",
      "json",
      filePath,
    ],
    {encoding: "utf8"},
  );
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`ffprobe failed for ${filePath}`);
  }
  const media = JSON.parse(result.stdout);
  const video = media.streams?.find((stream) => stream.codec_type === "video");
  const audio = media.streams?.filter((stream) => stream.codec_type === "audio") ?? [];
  if (
    !video ||
    video.codec_name !== "prores" ||
    !String(video.pix_fmt).startsWith("yuva444p") ||
    video.width !== settings.videoWidth ||
    video.height !== settings.videoHeight ||
    video.r_frame_rate !== "30/1" ||
    !Number.isInteger(Number(video.nb_frames))
  ) {
    throw new Error(`claude-typer produced unsupported media: ${filePath}`);
  }
  return {
    durationSeconds: Number(media.format?.duration),
    sizeBytes: Number(media.format?.size),
    frameCount: Number(video.nb_frames),
    fps: 30,
    width: video.width,
    height: video.height,
    codec: video.codec_name,
    pixelFormat: video.pix_fmt,
    audioStreamCount: audio.length,
    audioCodec: audio[0]?.codec_name ?? null,
  };
};

let previous = null;
try {
  previous = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  previous = null;
}
const previousSettingsMatch =
  JSON.stringify(previous?.settings) === JSON.stringify(settings);

const assets = [];
for (const segment of SEGMENTS) {
  const prompt = `调用 ${segment.slug}：${segment.effectSummary}`;
  const fileName = `${segment.displayNumber}-${segment.slug}.mov`;
  const outputPath = resolve(outputDirectory, fileName);
  const previousAsset = previous?.assets?.find(
    (asset) =>
      previousSettingsMatch &&
      asset.sourceNumber === segment.number &&
      asset.displayNumber === segment.displayNumber &&
      asset.prompt === prompt &&
      asset.file === fileName,
  );

  let media = null;
  let checksum = null;
  if (previousAsset && existsSync(outputPath)) {
    checksum = sha256(outputPath);
    if (checksum === previousAsset.sha256) {
      media = probe(outputPath);
      if (JSON.stringify(media) !== JSON.stringify(previousAsset.media)) {
        media = null;
      }
    }
  }

  if (!media) {
    const temporaryPath = `${outputPath}.tmp.mov`;
    rmSync(temporaryPath, {force: true});
    const args = [
      wrapperScript,
      prompt,
      "--model",
      settings.model,
      "--runner-prefix",
      runnerPrefix,
      "--output-file",
      temporaryPath,
      "--video-width",
      String(settings.videoWidth),
      "--video-height",
      String(settings.videoHeight),
      "--claude-width",
      String(settings.claudeWidth),
      "--scale",
      String(settings.scale),
      "--timeout-ms",
      String(settings.timeoutMs),
      "--concurrency",
      String(settings.concurrency),
    ];
    console.log(`[v4][claude-typer] rendering ${segment.displayNumber} ${segment.slug}`);
    const result = spawnSync(python, args, {
      cwd: projectRoot,
      stdio: "inherit",
      env: {...process.env, npm_config_cache: npmCache},
    });
    if (result.error || result.status !== 0) {
      rmSync(temporaryPath, {force: true});
      throw result.error ?? new Error(
        `claude-typer failed for ${segment.slug} with exit code ${result.status}`,
      );
    }
    media = probe(temporaryPath);
    checksum = sha256(temporaryPath);
    renameSync(temporaryPath, outputPath);
  } else {
    console.log(`[v4][claude-typer] verified existing ${segment.displayNumber} ${segment.slug}`);
  }

  assets.push({
    displayNumber: segment.displayNumber,
    sourceNumber: segment.number,
    slug: segment.slug,
    effectSummary: segment.effectSummary,
    prompt,
    file: fileName,
    sha256: checksum,
    media,
  });
}

const manifest = {
  schemaVersion: 1,
  version: "v4-claude-typer",
  generatedBy: skillScript,
  invokedVia: wrapperScript,
  serveUrl,
  runnerPrefix,
  settings,
  assetCount: assets.length,
  assets,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`[v4][claude-typer] wrote ${assets.length} generated invocation assets: ${manifestPath}`);

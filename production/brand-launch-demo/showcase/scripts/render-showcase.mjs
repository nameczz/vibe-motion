#!/usr/bin/env node

import {mkdirSync, renameSync, rmSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {homedir} from "node:os";
import {spawnSync} from "node:child_process";
import {SHOWCASE_DURATION_IN_FRAMES} from "../data.js";
import {
  ensureSharedBrowserExecutable,
  runLocalRemotionCli,
} from "../../scripts/remotion-browser-executable.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const outputPath = resolve(
  projectRoot,
  process.argv[2] || "out/VibeMotionSkillsShowcase-v4-claude-typer-visual.mp4",
);
mkdirSync(dirname(outputPath), {recursive: true});
const remotionOutputPath = `${outputPath}.remotion.tmp.mp4`;
const brandLaunchSkillDirectory = resolve(
  process.env.BRAND_LAUNCH_VIDEO_STAR_SKILL_DIR ??
    resolve(homedir(), ".codex/skills/brand-launch-video-star"),
);

const runNode = (script, args = []) => {
  const result = spawnSync(process.execPath, [resolve(projectRoot, script), ...args], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`${script} exited with ${result.status}`);
  }
};

const cleanupTemporaryOutputs = () => {
  rmSync(remotionOutputPath, {force: true});
};

runNode("showcase/scripts/prepare-showcase.mjs");
runNode("showcase/scripts/prepare-showcase.mjs", ["--check"]);
runNode("showcase/scripts/generate-v4-invocations.mjs");
runNode("showcase/scripts/write-asset-manifest.mjs");
runNode("showcase/scripts/write-timeline.mjs");
runNode(resolve(brandLaunchSkillDirectory, "scripts/validate-assets.mjs"), [
  resolve(projectRoot, "showcase/asset-manifest.json"),
]);
runNode(resolve(brandLaunchSkillDirectory, "scripts/validate-timeline.mjs"), [
  resolve(projectRoot, "showcase/timeline.json"),
]);

cleanupTemporaryOutputs();

try {
  const browserExecutable = await ensureSharedBrowserExecutable({
    logPrefix: "[showcase][browser]",
  });
  const args = [
    "render",
    "showcase/index.jsx",
    "VibeMotionSkillsShowcase",
    remotionOutputPath,
    "--codec",
    "h264",
    "--pixel-format",
    "yuv420p",
    "--crf",
    "17",
    "--muted",
    "--overwrite",
  ];
  if (browserExecutable) {
    args.push("--browser-executable", browserExecutable);
  }

  console.log(
    `[showcase] rendering ${SHOWCASE_DURATION_IN_FRAMES} frames -> ${remotionOutputPath}`,
  );
  const result = runLocalRemotionCli({args, stdio: "inherit", env: process.env});
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`Remotion exited with ${result.status}`);
  }

  // Validate the complete visual master before replacing an existing v4 draft.
  runNode("showcase/scripts/verify-showcase.mjs", [remotionOutputPath]);
  renameSync(remotionOutputPath, outputPath);
  runNode("showcase/scripts/verify-showcase.mjs", [outputPath]);
  console.log(`[showcase] visual master complete: ${outputPath}`);
} finally {
  cleanupTemporaryOutputs();
}

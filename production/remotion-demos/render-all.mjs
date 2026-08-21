import {existsSync, mkdirSync, rmSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const outputDir = resolve(repoRoot, "production", "effects");

mkdirSync(outputDir, {recursive: true});

const renders = [
  {
    compositionId: "disney-animation-rule-skill",
    output: resolve(outputDir, "04-disney-animation-rule-skill.mp4"),
  },
  {
    compositionId: "remotion-3d-ticker",
    output: resolve(outputDir, "09-remotion-3d-ticker.mp4"),
  },
  {
    compositionId: "remotion-candlestick",
    output: resolve(outputDir, "10-remotion-candlestick.mp4"),
  },
  {
    compositionId: "remotion-vinyl-player",
    output: resolve(outputDir, "11-remotion-vinyl-player.mp4"),
  },
];

const assertSuccess = (result, label) => {
  if (result.status !== 0) {
    const stderr = result.stderr?.toString() ?? "";
    const stdout = result.stdout?.toString() ?? "";
    throw new Error(`${label} failed\n${stdout}\n${stderr}`.trim());
  }
};

const probe = (file) => {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      file,
    ],
    {encoding: "utf8"},
  );
  assertSuccess(result, `ffprobe ${file}`);
  const parsed = JSON.parse(result.stdout);
  const videoStream = parsed.streams?.find((stream) => stream.codec_type === "video");
  const audioStream = parsed.streams?.find((stream) => stream.codec_type === "audio");
  if (!videoStream) {
    throw new Error(`No video stream in ${file}`);
  }
  const width = Number(videoStream.width);
  const height = Number(videoStream.height);
  const rate = String(videoStream.avg_frame_rate || videoStream.r_frame_rate || "");
  const duration = Number(parsed.format?.duration ?? videoStream.duration ?? 0);
  if (width !== 1920 || height !== 1080) {
    throw new Error(`Unexpected dimensions for ${file}: ${width}x${height}`);
  }
  if (rate !== "30/1" && rate !== "30") {
    throw new Error(`Unexpected frame rate for ${file}: ${rate}`);
  }
  if (duration < 5 || duration > 7.5) {
    throw new Error(`Unexpected duration for ${file}: ${duration}`);
  }
  if (audioStream) {
    throw new Error(`Unexpected audio stream in ${file}`);
  }
  return {width, height, rate, duration};
};

for (const item of renders) {
  if (existsSync(item.output)) {
    rmSync(item.output);
  }

  const render = spawnSync(
    "npx",
    [
      "remotion",
      "render",
      "src/index.tsx",
      item.compositionId,
      item.output,
      "--codec=h264",
      "--pixel-format=yuv420p",
      "--muted",
    ],
    {
      cwd: here,
      stdio: "inherit",
      env: {
        ...process.env,
        CI: "1",
      },
    },
  );

  assertSuccess(render, `render ${item.compositionId}`);
  const info = probe(item.output);
  console.log(
    `${item.compositionId}: ${info.width}x${info.height} ${info.rate} ${info.duration.toFixed(2)}s -> ${item.output}`,
  );
}

console.log("All renders completed and verified.");

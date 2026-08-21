#!/usr/bin/env node

import {createHash} from "node:crypto";
import {execFile} from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {promisify} from "node:util";
import {fileURLToPath} from "node:url";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const showcaseDirectory = path.resolve(scriptDirectory, "..");
const projectDirectory = path.resolve(showcaseDirectory, "..");
const workspaceDirectory = path.resolve(projectDirectory, "../..");
const manifestPath = path.join(showcaseDirectory, "source-manifest.json");
const outputDirectory = path.join(
  projectDirectory,
  "public",
  "showcase",
  "segments",
);

const EXPECTED_IDS = ["01", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15"];
const EXCLUDED_DIRECTORIES = [
  "02-brand-launch-video-star",
  "03-claude-typer",
  "04-disney-animation-rule-skill",
];
const GENERATED_INDEX_FILE = "manifest.json";
const BRAND_BACKGROUND = "0x050509";
const EXPECTED_PROMPT_FRAMES = [66, 70, 71, 67, 61, 63, 61, 59, 70, 62, 56, 59];
const EXPECTED_EFFECT_FRAMES = [150, 180, 180, 180, 210, 180, 180, 180, 180, 160, 181, 147];

const usage = `Usage: node showcase/scripts/prepare-showcase.mjs [--check]

Without arguments, stages the 12 selected showcase segments.
With --check, performs a read-only byte-for-byte verification of the sources and staging.`;

const parseArguments = () => {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.includes("--help") || argumentsList.includes("-h")) {
    console.log(usage);
    process.exit(0);
  }

  const unknownArguments = argumentsList.filter((argument) => argument !== "--check");
  if (unknownArguments.length > 0 || argumentsList.length > 1) {
    throw new Error(`Unknown arguments: ${argumentsList.join(" ")}\n${usage}`);
  }

  return {check: argumentsList[0] === "--check"};
};

const readJson = async (filePath, label) => {
  let contents;
  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`${label} is missing or unreadable: ${filePath}`, {cause: error});
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${filePath}`, {cause: error});
  }
};

const assertFile = async (filePath, label) => {
  try {
    await access(filePath);
  } catch (error) {
    throw new Error(`${label} is missing or unreadable: ${filePath}`, {cause: error});
  }
};

const sha256 = async (filePath) => {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
};

const sha256Buffer = (contents) =>
  createHash("sha256").update(contents).digest("hex");

const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

const ratioToNumber = (ratio) => {
  const [numerator, denominator] = String(ratio).split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    throw new Error(`ffprobe returned an invalid frame rate: ${ratio}`);
  }
  return numerator / denominator;
};

const probeVideo = async (filePath) => {
  let stdout;
  try {
    ({stdout} = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type,codec_name,pix_fmt,width,height,r_frame_rate,nb_frames:format=duration",
      "-of",
      "json",
      filePath,
    ]));
  } catch (error) {
    throw new Error(`ffprobe could not inspect video: ${filePath}`, {cause: error});
  }

  const result = JSON.parse(stdout);
  const videoStream = result.streams?.find((stream) => stream.codec_type === "video");
  if (!videoStream) {
    throw new Error(`No video stream found: ${filePath}`);
  }

  const durationSeconds = Number(result.format?.duration);
  const frameCount = Number(videoStream.nb_frames);
  if (!Number.isFinite(durationSeconds) || !Number.isInteger(frameCount)) {
    throw new Error(`ffprobe returned incomplete duration/frame metadata: ${filePath}`);
  }

  return {
    durationSeconds,
    frameCount,
    fps: ratioToNumber(videoStream.r_frame_rate),
    width: videoStream.width,
    height: videoStream.height,
    codec: videoStream.codec_name,
    pixelFormat: videoStream.pix_fmt,
    audioStreamCount: result.streams.filter((stream) => stream.codec_type === "audio")
      .length,
  };
};

const validateManifest = (manifest) => {
  if (manifest.schemaVersion !== 1) {
    throw new Error("source-manifest.json must use schemaVersion 1");
  }
  if (typeof manifest.sourceRoot !== "string" || manifest.sourceRoot.length === 0) {
    throw new Error("source-manifest.json must declare sourceRoot");
  }
  if (typeof manifest.promptList !== "string" || manifest.promptList.length === 0) {
    throw new Error("source-manifest.json must declare promptList");
  }
  if (
    !Array.isArray(manifest.excluded) ||
    JSON.stringify(manifest.excluded) !== JSON.stringify(EXCLUDED_DIRECTORIES)
  ) {
    throw new Error(
      `source-manifest.json must exclude exactly ${EXCLUDED_DIRECTORIES.join(", ")}`,
    );
  }
  if (!Array.isArray(manifest.segments)) {
    throw new Error("source-manifest.json must declare segments");
  }

  const actualIds = manifest.segments.map((segment) => segment.id);
  if (JSON.stringify(actualIds) !== JSON.stringify(EXPECTED_IDS)) {
    throw new Error(
      `source-manifest.json must list exactly these ordered ids: ${EXPECTED_IDS.join(", ")}`,
    );
  }

  for (const [index, segment] of manifest.segments.entries()) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(segment.skill ?? "")) {
      throw new Error(`Segment ${segment.id} has an invalid skill slug`);
    }
    if (typeof segment.promptClip !== "string" || segment.promptClip.length === 0) {
      throw new Error(`Segment ${segment.id} must declare promptClip`);
    }
    if (segment.promptFrames !== EXPECTED_PROMPT_FRAMES[index]) {
      throw new Error(
        `Segment ${segment.id} promptFrames must be ${EXPECTED_PROMPT_FRAMES[index]}`,
      );
    }
    if (segment.effectFrames !== EXPECTED_EFFECT_FRAMES[index]) {
      throw new Error(
        `Segment ${segment.id} effectFrames must be ${EXPECTED_EFFECT_FRAMES[index]}`,
      );
    }
    if (segment.id === "12") {
      if (
        typeof segment.effectClip !== "string" ||
        typeof segment.effectSha256 !== "string" ||
        typeof segment.promptText !== "string" ||
        segment.effectWidth !== 2160 ||
        segment.effectHeight !== 2160
      ) {
        throw new Error(
          "Segment 12 must declare its approved prompt override and 2160x2160 effect source",
        );
      }
    } else if (
      segment.effectClip !== undefined ||
      segment.effectSha256 !== undefined ||
      segment.promptText !== undefined
    ) {
      throw new Error(`Only segment 12 may use custom prompt/effect sources; found one on ${segment.id}`);
    }
  }
};

const declaredHash = (deliverable, fileName) => {
  if (typeof deliverable.sha256 === "string" && fileName === "animation.mp4") {
    return deliverable.sha256;
  }
  if (deliverable.sha256 && typeof deliverable.sha256[fileName] === "string") {
    return deliverable.sha256[fileName];
  }
  return null;
};

const relativeToProject = (filePath) =>
  path.relative(projectDirectory, filePath).split(path.sep).join("/");

const assertMedia = (
  media,
  expectedFrames,
  label,
  expectedEncoding = null,
  expectedDimensions = {width: 1920, height: 1080},
) => {
  if (
    media.frameCount !== expectedFrames ||
    media.fps !== 30 ||
    media.width !== expectedDimensions.width ||
    media.height !== expectedDimensions.height
  ) {
    throw new Error(
      `${label} must be ${expectedDimensions.width}x${expectedDimensions.height} at 30fps with ${expectedFrames} frames; found ${media.width}x${media.height} at ${media.fps}fps with ${media.frameCount} frames`,
    );
  }
  if (
    expectedEncoding &&
    (media.codec !== expectedEncoding.codec ||
      media.pixelFormat !== expectedEncoding.pixelFormat ||
      media.audioStreamCount !== 0)
  ) {
    throw new Error(
      `${label} must be ${expectedEncoding.codec}/${expectedEncoding.pixelFormat} without audio; found ${media.codec}/${media.pixelFormat} with ${media.audioStreamCount} audio streams`,
    );
  }
};

const loadSegment = async (entry, sourceRoot, promptRecord, promptListPath) => {
  const directory = `${entry.id}-${entry.skill}`;
  const isCustom = typeof entry.effectClip === "string";
  const sourceDirectory = path.join(sourceRoot, directory);
  const animationPath = isCustom
    ? path.resolve(showcaseDirectory, entry.effectClip)
    : path.join(sourceDirectory, "animation.mp4");
  const deliverablePath = isCustom ? null : path.join(sourceDirectory, "deliverable.json");
  const promptClipPath = path.resolve(showcaseDirectory, entry.promptClip);

  await assertFile(animationPath, `Segment ${entry.id} animation`);
  await assertFile(promptClipPath, `Segment ${entry.id} prompt clip`);
  if (deliverablePath) {
    await assertFile(deliverablePath, `Segment ${entry.id} deliverable metadata`);
  }

  const promptContents = Buffer.from(`${promptRecord.prompt}\n`, "utf8");
  const sourceDeliverable = deliverablePath
    ? await readJson(deliverablePath, `Segment ${entry.id} deliverable metadata`)
    : null;

  if (sourceDeliverable && sourceDeliverable.skill !== entry.skill) {
    throw new Error(
      `Segment ${entry.id} skill mismatch: manifest=${entry.skill}, deliverable=${sourceDeliverable.skill}`,
    );
  }

  const [animationHash, effectMedia, promptClipHash, promptClipMedia] = await Promise.all([
    sha256(animationPath),
    probeVideo(animationPath),
    sha256(promptClipPath),
    probeVideo(promptClipPath),
  ]);
  assertMedia(
    effectMedia,
    entry.effectFrames,
    `Segment ${entry.id} effect`,
    isCustom ? {codec: "h264", pixelFormat: "yuv420p"} : null,
    {
      width: entry.effectWidth ?? 1920,
      height: entry.effectHeight ?? 1080,
    },
  );
  assertMedia(promptClipMedia, entry.promptFrames, `Segment ${entry.id} prompt source`);
  const promptHash = sha256Buffer(promptContents);
  const expectedAnimationHash = sourceDeliverable
    ? declaredHash(sourceDeliverable, "animation.mp4")
    : null;

  if (expectedAnimationHash && expectedAnimationHash !== animationHash) {
    throw new Error(
      `Segment ${entry.id} animation hash does not match deliverable.json: ${animationPath}`,
    );
  }
  if (entry.effectSha256 && entry.effectSha256 !== animationHash) {
    throw new Error(
      `Segment ${entry.id} animation hash does not match source-manifest.json: ${animationPath}`,
    );
  }
  const source = isCustom
    ? {
        kind: "approved-custom-source",
        animation: relativeToProject(animationPath),
      }
    : {
        kind: "skills-showcase-v3",
        directory: relativeToProject(sourceDirectory),
        animation: relativeToProject(animationPath),
        deliverable: relativeToProject(deliverablePath),
      };
  source.promptDefinition = entry.promptText
    ? "showcase/source-manifest.json"
    : relativeToProject(promptListPath);
  source.promptClip = {
    path: relativeToProject(promptClipPath),
    sha256: promptClipHash,
    frameCount: promptClipMedia.frameCount,
  };

  const baseMetadata = {
    schemaVersion: 1,
    id: entry.id,
    directory,
    skill: entry.skill,
    animationFile: "animation.mp4",
    promptVideoFile: "prompt.mp4",
    promptFile: "prompt.txt",
    source,
    branding: {
      background: "#050509",
      alphaComposite: true,
      effectFit: "contain",
    },
    media: {
      effect: effectMedia,
    },
    sha256: {
      "animation.mp4": animationHash,
      "prompt.txt": promptHash,
    },
    sourceDeliverable,
  };

  return {
    ...entry,
    directory,
    animationPath,
    promptClipPath,
    promptContents,
    baseMetadata,
  };
};

const scanSourceDirectories = async (sourceRoot) => {
  let entries;
  try {
    entries = await readdir(sourceRoot, {withFileTypes: true});
  } catch (error) {
    throw new Error(`Showcase source root is missing or unreadable: ${sourceRoot}`, {
      cause: error,
    });
  }

  return new Set(
    entries
      .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
      .map((entry) => entry.name),
  );
};

const loadInputs = async () => {
  const manifest = await readJson(manifestPath, "Source manifest");
  validateManifest(manifest);
  const sourceRoot = path.resolve(showcaseDirectory, manifest.sourceRoot);
  const promptListPath = path.resolve(showcaseDirectory, manifest.promptList);
  const promptList = await readJson(promptListPath, "Prompt list");
  if (!Array.isArray(promptList)) {
    throw new Error(`Prompt list must be an array: ${promptListPath}`);
  }
  const sourceDirectories = await scanSourceDirectories(sourceRoot);

  for (const entry of manifest.segments) {
    if (entry.effectClip) {
      continue;
    }
    const expectedDirectory = `${entry.id}-${entry.skill}`;
    if (!sourceDirectories.has(expectedDirectory)) {
      throw new Error(
        `Segment ${entry.id} source directory is missing from ${sourceRoot}: ${expectedDirectory}`,
      );
    }
  }

  const segments = [];
  for (const entry of manifest.segments) {
    const listedPromptRecord = promptList.find((item) => item.index === Number(entry.id));
    const promptRecord = entry.promptText
      ? {skill: entry.skill, prompt: entry.promptText}
      : listedPromptRecord;
    if (!promptRecord || promptRecord.skill !== entry.skill || !promptRecord.prompt) {
      throw new Error(`Prompt source has no matching prompt for segment ${entry.id}-${entry.skill}`);
    }
    const manifestPromptClip = path.resolve(showcaseDirectory, entry.promptClip);
    if (!entry.promptText) {
      const listedPromptClip = path.resolve(workspaceDirectory, listedPromptRecord.prompt_clip);
      if (listedPromptClip !== manifestPromptClip) {
        throw new Error(`Segment ${entry.id} prompt clip differs from skills_prompt_list.json`);
      }
    }
    segments.push(await loadSegment(entry, sourceRoot, promptRecord, promptListPath));
  }

  return {manifest, segments};
};

const buildIndex = (manifest, segments) => ({
    schemaVersion: 1,
    segmentCount: segments.length,
    excluded: manifest.excluded,
    segments: segments.map((segment) => ({
      id: segment.id,
      directory: segment.directory,
      skill: segment.skill,
      animationFile: `${segment.id}/animation.mp4`,
      promptVideoFile: `${segment.id}/prompt.mp4`,
      promptFile: `${segment.id}/prompt.txt`,
      metadataFile: `${segment.id}/metadata.json`,
      media: segment.metadata.media,
      sha256: segment.metadata.sha256,
    })),
  });

const removeIfPresent = async (filePath) => {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const replaceFile = async (destination, writeTemporaryFile) => {
  const extension = path.extname(destination);
  const temporaryPath = `${destination}.tmp-${process.pid}${extension}`;
  await removeIfPresent(temporaryPath);
  try {
    await writeTemporaryFile(temporaryPath);
    await rename(temporaryPath, destination);
  } finally {
    await removeIfPresent(temporaryPath);
  }
};

const copyIfChanged = async (source, destination, expectedHash) => {
  try {
    if ((await sha256(destination)) === expectedHash) {
      return false;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await replaceFile(destination, (temporaryPath) => copyFile(source, temporaryPath));
  return true;
};

const writeIfChanged = async (destination, contents) => {
  try {
    if ((await readFile(destination)).equals(Buffer.from(contents))) {
      return false;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await replaceFile(destination, (temporaryPath) => writeFile(temporaryPath, contents));
  return true;
};

const transcodePrompt = async (source, destination, frameCount) => {
  await replaceFile(destination, async (temporaryPath) => {
    try {
      await execFileAsync(
        "ffmpeg",
        [
          "-y",
          "-v",
          "error",
          "-i",
          source,
          "-filter_complex",
          `color=c=${BRAND_BACKGROUND}:s=1920x1080:r=30[bg];[0:v]setpts=PTS-STARTPTS[fg];[bg][fg]overlay=shortest=1:format=auto,format=yuv420p[out]`,
          "-map",
          "[out]",
          "-frames:v",
          String(frameCount),
          "-an",
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-crf",
          "18",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "-map_metadata",
          "-1",
          "-metadata",
          "creation_time=1970-01-01T00:00:00Z",
          temporaryPath,
        ],
        {maxBuffer: 10 * 1024 * 1024},
      );
    } catch (error) {
      throw new Error(`ffmpeg could not brand prompt clip: ${source}`, {cause: error});
    }
  });
};

const finalizeMetadata = (segment, promptVideoHash, promptVideoMedia) => ({
  ...segment.baseMetadata,
  media: {
    ...segment.baseMetadata.media,
    prompt: promptVideoMedia,
  },
  sha256: {
    ...segment.baseMetadata.sha256,
    "prompt.mp4": promptVideoHash,
  },
});

const inspectStagedPrompt = async (segment, promptVideoPath) => {
  const [hash, media] = await Promise.all([
    sha256(promptVideoPath),
    probeVideo(promptVideoPath),
  ]);
  assertMedia(media, segment.promptFrames, `Segment ${segment.id} staged prompt`, {
    codec: "h264",
    pixelFormat: "yuv420p",
  });
  return {hash, media};
};

const canReusePrompt = async (segment, promptVideoPath, metadataPath) => {
  try {
    const existingMetadata = await readJson(
      metadataPath,
      `Segment ${segment.id} staged metadata`,
    );
    if (
      existingMetadata.source?.promptClip?.sha256 !==
      segment.baseMetadata.source.promptClip.sha256
    ) {
      return false;
    }
    const staged = await inspectStagedPrompt(segment, promptVideoPath);
    return existingMetadata.sha256?.["prompt.mp4"] === staged.hash;
  } catch {
    return false;
  }
};

const prepare = async ({manifest, segments}) => {
  await mkdir(outputDirectory, {recursive: true});
  for (const excluded of ["02", "03", "04"]) {
    await rm(path.join(outputDirectory, excluded), {recursive: true, force: true});
  }
  let changedFiles = 0;
  const stagedSegments = [];

  for (const segment of segments) {
    const destinationDirectory = path.join(outputDirectory, segment.id);
    const promptVideoPath = path.join(destinationDirectory, "prompt.mp4");
    const metadataPath = path.join(destinationDirectory, "metadata.json");
    await mkdir(destinationDirectory, {recursive: true});
    changedFiles += Number(
      await copyIfChanged(
        segment.animationPath,
        path.join(destinationDirectory, "animation.mp4"),
        segment.baseMetadata.sha256["animation.mp4"],
      ),
    );
    changedFiles += Number(
      await writeIfChanged(
        path.join(destinationDirectory, "prompt.txt"),
        segment.promptContents,
      ),
    );

    if (!(await canReusePrompt(segment, promptVideoPath, metadataPath))) {
      await transcodePrompt(segment.promptClipPath, promptVideoPath, segment.promptFrames);
      changedFiles += 1;
    }
    const stagedPrompt = await inspectStagedPrompt(segment, promptVideoPath);
    const metadata = finalizeMetadata(segment, stagedPrompt.hash, stagedPrompt.media);
    changedFiles += Number(
      await writeIfChanged(
        metadataPath,
        stableJson(metadata),
      ),
    );
    stagedSegments.push({...segment, metadata});
  }

  const index = buildIndex(manifest, stagedSegments);
  changedFiles += Number(
    await writeIfChanged(path.join(outputDirectory, GENERATED_INDEX_FILE), stableJson(index)),
  );
  console.log(
    `Prepared ${segments.length} showcase segments in ${outputDirectory} (${changedFiles} files changed).`,
  );
};

const verifyFileHash = async (filePath, expectedHash, label) => {
  await assertFile(filePath, label);
  const actualHash = await sha256(filePath);
  if (actualHash !== expectedHash) {
    throw new Error(`${label} differs from its source: ${filePath}`);
  }
};

const check = async ({manifest, segments}) => {
  let outputEntries;
  try {
    outputEntries = await readdir(outputDirectory, {withFileTypes: true});
  } catch (error) {
    throw new Error(`Staging directory is missing; run prepare first: ${outputDirectory}`, {
      cause: error,
    });
  }

  const stagedIds = outputEntries
    .filter((entry) => entry.isDirectory() && /^\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (JSON.stringify(stagedIds) !== JSON.stringify(EXPECTED_IDS)) {
    throw new Error(
      `Staging must contain exactly ids ${EXPECTED_IDS.join(", ")}; found ${stagedIds.join(", ") || "none"}`,
    );
  }

  const stagedSegments = [];
  for (const segment of segments) {
    const destinationDirectory = path.join(outputDirectory, segment.id);
    const segmentFiles = (await readdir(destinationDirectory)).sort();
    const expectedFiles = ["animation.mp4", "metadata.json", "prompt.mp4", "prompt.txt"];
    if (JSON.stringify(segmentFiles) !== JSON.stringify(expectedFiles)) {
      throw new Error(
        `Segment ${segment.id} staging must contain exactly ${expectedFiles.join(", ")}; found ${segmentFiles.join(", ")}`,
      );
    }
    await verifyFileHash(
      path.join(destinationDirectory, "animation.mp4"),
      segment.baseMetadata.sha256["animation.mp4"],
      `Segment ${segment.id} staged animation`,
    );
    await verifyFileHash(
      path.join(destinationDirectory, "prompt.txt"),
      segment.baseMetadata.sha256["prompt.txt"],
      `Segment ${segment.id} staged prompt`,
    );

    const stagedPrompt = await inspectStagedPrompt(
      segment,
      path.join(destinationDirectory, "prompt.mp4"),
    );
    const metadata = finalizeMetadata(segment, stagedPrompt.hash, stagedPrompt.media);
    const actualMetadata = await readFile(
      path.join(destinationDirectory, "metadata.json"),
      "utf8",
    );
    if (actualMetadata !== stableJson(metadata)) {
      throw new Error(`Segment ${segment.id} staged metadata is stale or modified`);
    }
    stagedSegments.push({...segment, metadata});
  }

  const index = buildIndex(manifest, stagedSegments);
  const actualIndex = await readFile(path.join(outputDirectory, GENERATED_INDEX_FILE), "utf8");
  if (actualIndex !== stableJson(index)) {
    throw new Error(`Staged ${GENERATED_INDEX_FILE} is stale or modified`);
  }

  console.log(
    `Verified ${segments.length} showcase segments; ${EXCLUDED_DIRECTORIES.join(" and ")} are not staged.`,
  );
};

const main = async () => {
  const options = parseArguments();
  const inputs = await loadInputs();
  if (options.check) {
    await check(inputs);
  } else {
    await prepare(inputs);
  }
};

main().catch((error) => {
  console.error(`[prepare-showcase] ${error.message}`);
  process.exitCode = 1;
});

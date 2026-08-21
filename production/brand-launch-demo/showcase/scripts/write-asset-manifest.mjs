#!/usr/bin/env node

import {createHash} from "node:crypto";
import {existsSync, readFileSync, writeFileSync} from "node:fs";
import {relative, resolve} from "node:path";
import {SEGMENTS} from "../data.js";

const showcaseRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(showcaseRoot, "..");
const manifestPath = resolve(showcaseRoot, "asset-manifest.json");

const checksum = (absolutePath) =>
  `sha256:${createHash("sha256").update(readFileSync(absolutePath)).digest("hex")}`;

const makeAsset = ({
  id,
  role,
  absolutePath,
  sourceUrl,
  verifiedAgainst,
  rightsNote,
  sourceType = "user-provided-original",
  generation = null,
}) => {
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing staged asset: ${absolutePath}`);
  }
  return {
    id,
    role,
    localPath: relative(showcaseRoot, absolutePath),
    sourceUrl,
    sourceType,
    verifiedAgainst,
    rightsNote,
    authenticity: "verified",
    checksum: checksum(absolutePath),
    ...(generation ? {generation} : {}),
  };
};

const assets = [
  {
    id: "vibe-motion-org-avatar",
    role: "logo",
    localPath: "../public/brand/vibe-motion-org-avatar.png",
    sourceUrl: "https://avatars.githubusercontent.com/u/268959773?s=200&v=4",
    sourceType: "official-repository",
    verifiedAgainst: "https://github.com/vibe-motion",
    rightsNote: "Exact avatar downloaded from the official Vibe Motion GitHub organization endpoint; confirm publication rights.",
    authenticity: "verified",
    checksum: checksum(resolve(projectRoot, "public/brand/vibe-motion-org-avatar.png")),
  },
];

const invocationManifestPath = resolve(
  projectRoot,
  "public/showcase/v4-invocations/manifest.json",
);
if (!existsSync(invocationManifestPath)) {
  throw new Error(
    `Missing v4 invocation manifest; run showcase/scripts/generate-v4-invocations.mjs first: ${invocationManifestPath}`,
  );
}
const invocationManifest = JSON.parse(readFileSync(invocationManifestPath, "utf8"));
if (
  invocationManifest.version !== "v4-claude-typer" ||
  invocationManifest.assetCount !== SEGMENTS.length
) {
  throw new Error("v4 invocation manifest does not match the current segment count");
}

for (const segment of SEGMENTS) {
  const stageDirectory = resolve(projectRoot, "public/showcase/segments", segment.number);
  const invocation = invocationManifest.assets.find(
    (asset) =>
      asset.sourceNumber === segment.number &&
      asset.displayNumber === segment.displayNumber &&
      asset.slug === segment.slug,
  );
  if (!invocation) {
    throw new Error(`Missing generated claude-typer provenance for ${segment.slug}`);
  }
  const invocationPath = resolve(
    projectRoot,
    "public/showcase/v4-invocations",
    invocation.file,
  );
  if (checksum(invocationPath) !== `sha256:${invocation.sha256}`) {
    throw new Error(`Generated claude-typer checksum mismatch: ${invocationPath}`);
  }
  assets.push(
    makeAsset({
      id: `invocation-${segment.displayNumber}`,
      role: "claude-typer generated skill invocation",
      absolutePath: invocationPath,
      sourceUrl: invocationManifest.serveUrl,
      sourceType: "official-website",
      verifiedAgainst: invocationManifest.serveUrl,
      rightsNote: "Generated from the remote claude-typer composition; confirm publication rights for the remote composition before external release.",
      generation: {
        skillScript: invocationManifest.generatedBy,
        invokedVia: invocationManifest.invokedVia,
        composition: invocationManifest.settings.composition,
        prompt: invocation.prompt,
        typingSpeedMs: invocationManifest.settings.typingSpeedMs,
        model: invocationManifest.settings.model,
        runnerPrefix: invocationManifest.runnerPrefix,
        sourceNumber: invocation.sourceNumber,
        displayNumber: invocation.displayNumber,
      },
    }),
    makeAsset({
      id: `effect-${segment.number}`,
      role: "original skill animation",
      absolutePath: resolve(stageDirectory, "animation.mp4"),
      sourceUrl:
        segment.number === "12"
          ? "user-provided://ruler-progress-animator/out/liang-wenfeng-meme-monochrome-blue-preview.mp4"
          : `user-provided://production/skills-showcase-v3/${segment.number}-${segment.slug}/animation.mp4`,
      verifiedAgainst:
        segment.number === "12"
          ? "User-approved monochrome-blue Liang meme; SHA-256 and 2160x2160/180-frame media contract verified."
          : "Byte-identical staging copy of the corresponding user-approved skills-showcase-v3 animation.",
      rightsNote: "User workspace asset; publication rights remain with the user.",
    }),
  );
}

const manifest = {
  project: "Vibe Motion Skills Showcase",
  accessedAt: "2026-08-21",
  version: "v4-claude-typer-visual",
  assets,
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`[showcase] wrote ${assets.length} assets with SHA-256: ${manifestPath}`);

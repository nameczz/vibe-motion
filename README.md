# Vibe Motion Lab

A working collection of motion-design studies built with Remotion, Three.js,
SVG, Canvas, and small browser demos. It includes reusable source scenes,
prompt records, and the assembly project for the Vibe Motion skills showcase.

## What's here

- `production/html-demos/` — standalone HTML/SVG/Canvas studies.
- `production/remotion-demos/` — Remotion examples such as candlesticks,
  Disney-style motion principles, a 3D ticker, and a vinyl player.
- `production/workspaces/` — larger isolated sources for 3D Chladni,
  procedural fish, Three.js earth, and WeChat-style motion.
- `production/brand-launch-demo/` — the multi-scene showcase assembly.
- `production/skills-showcase-v3/` — prompt records and local rendered inputs
  for individual showcase segments (rendered media is intentionally ignored).
- `ruler-progress-animator/` — a standalone Remotion/Vite ruler animation.
- `references/` — source links and notes only; downloaded reference videos are
  intentionally not published.

Each Node project manages its own dependencies. There is no root package
manager workspace.

## Run a demo

Static HTML studies can be served from the repository root:

```bash
python3 -m http.server 8000
```

Then open a file below `production/html-demos/` through
`http://localhost:8000/`. For the Remotion collection:

```bash
cd production/remotion-demos
npm ci
npm run render
```

For the showcase studio:

```bash
cd production/brand-launch-demo
pnpm install --frozen-lockfile
pnpm run dev
```

Some production scripts call separately installed Codex skills. They default
to `~/.codex/skills`; use `CLAUDE_TYPER_SCRIPT` and
`BRAND_LAUNCH_VIDEO_STAR_SKILL_DIR` to override those locations.

## Media and generated files

Rendered video, audio, contact sheets, frame sequences, staging manifests,
caches, and local reference media stay on the creator's machine and are ignored
by Git. The repository keeps the source projects and the manifests needed to
rebuild the current v4 showcase from those local rendered inputs.

## Licensing and attribution

This repository does **not** apply one blanket license to every directory.
Bundled projects retain their own license files, and files without an explicit
license are not automatically covered by an open-source grant. See
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) before reusing code, artwork,
textures, logos, or screenshots.

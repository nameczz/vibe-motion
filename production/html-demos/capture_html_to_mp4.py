#!/usr/bin/env python3
"""Capture HTML effect pages into 1920x1080 MP4 files.

The script supports two capture modes:

* seek: load the page once, pause all Web Animations, and sample their currentTime
  at fixed timestamps. This is the deterministic path for HTML that uses CSS or
  WAAPI animations.
* pointer: load the page in real time and sweep the pointer across the viewport
  while recording fixed-rate frames. This is the fallback for canvas simulations
  that respond to mouse movement, such as the printed-curtain effect.

The capture is intentionally simple: it screenshots the browser viewport directly,
then encodes the resulting PNG sequence with ffmpeg into an H.264 MP4.
"""

from __future__ import annotations

import argparse
import math
import os
import shutil
import subprocess
import tempfile
import threading
import time
from dataclasses import dataclass
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Iterable
from urllib.parse import quote


@dataclass(frozen=True)
class ServedPage:
    base_dir: Path
    url: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Capture a local HTML effect into MP4.")
    parser.add_argument("input", type=Path, help="HTML file or directory containing index.html.")
    parser.add_argument("--out", type=Path, required=True, help="Output MP4 path.")
    parser.add_argument("--mode", choices=("seek", "pointer"), default="seek")
    parser.add_argument("--duration-ms", type=int, default=6000, help="Total recording duration.")
    parser.add_argument("--fps", type=int, default=30, help="Capture framerate.")
    parser.add_argument("--viewport", default="1920x1080", help="Browser viewport, WxH.")
    parser.add_argument("--scale", type=float, default=1.0, help="Device scale factor.")
    parser.add_argument("--selector", default=None, help="Optional element selector to screenshot instead of the full viewport.")
    parser.add_argument("--pointer-path", choices=("sweep", "orbit", "zigzag"), default="sweep")
    parser.add_argument("--frames-dir", type=Path, default=None, help="Optional frame directory to keep.")
    parser.add_argument("--keep-frames", action="store_true", help="Do not delete the temporary frames directory.")
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg", help="ffmpeg binary path.")
    return parser.parse_args()


def parse_viewport(value: str) -> tuple[int, int]:
    width, sep, height = value.partition("x")
    if not sep:
        raise SystemExit(f"Invalid viewport: {value!r}; expected WxH")
    return int(width), int(height)


def serve_path(path: Path) -> tuple[ThreadingHTTPServer, ServedPage]:
    root = path if path.is_dir() else path.parent
    target = path.name if path.is_file() else "index.html"

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(root), **kwargs)

        def log_message(self, format: str, *args) -> None:  # noqa: A003 - stdlib signature
            return

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/{quote(target)}"
    return server, ServedPage(base_dir=root, url=url)


def ensure_playwright():
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
    except Exception as exc:  # pragma: no cover - install hint
        raise SystemExit(
            "Playwright is not available. Install it with:\n"
            "  python3 -m pip install playwright\n"
            "  python3 -m playwright install chromium"
        ) from exc


def compute_times(duration_ms: int, fps: int) -> list[int]:
    frames = max(1, int(round(duration_ms / 1000 * fps)))
    step_ms = 1000.0 / fps
    return [int(round(i * step_ms)) for i in range(frames)]


def build_seek_url(url: str, initial_seek_ms: int | None = None) -> str:
    if initial_seek_ms is None:
        return url
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}t={initial_seek_ms}"


def wait_for_ready(page) -> None:
    try:
        page.wait_for_function(
            "() => window.__p2mReady === true || window.__effectReady === true || document.readyState === 'complete'",
            timeout=8000,
        )
    except Exception:
        pass


def pause_and_seek(page, seek_ms: int) -> None:
    page.evaluate(
        """async (ms) => {
          const animations = document.getAnimations ? document.getAnimations({subtree: true}) : [];
          for (const animation of animations) {
            try {
              animation.pause();
              animation.currentTime = ms;
            } catch (err) {
              // Ignore animations that cannot be controlled.
            }
          }
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
        }""",
        seek_ms,
    )


def capture_seek(page, frames_dir: Path, duration_ms: int, fps: int, selector: str | None) -> list[Path]:
    times = compute_times(duration_ms, fps)
    frames: list[Path] = []
    for index, seek_ms in enumerate(times):
        pause_and_seek(page, seek_ms)
        frame_path = frames_dir / f"frame_{index:06d}.png"
        if selector:
            page.locator(selector).screenshot(path=str(frame_path))
        else:
            page.screenshot(path=str(frame_path))
        frames.append(frame_path)
        print(f"frame {index + 1}/{len(times)} @ {seek_ms}ms -> {frame_path}")
    return frames


def pointer_position(index: int, total: int, viewport: tuple[int, int], style: str) -> tuple[int, int]:
    w, h = viewport
    phase = 0.0 if total <= 1 else index / (total - 1)
    if style == "orbit":
        angle = phase * math.tau
        x = w * 0.5 + math.cos(angle * 1.25) * w * 0.22
        y = h * 0.5 + math.sin(angle * 0.95) * h * 0.18
    elif style == "zigzag":
        x = w * (0.15 + 0.7 * phase)
        y = h * (0.22 + 0.52 * (0.5 + 0.5 * math.sin(phase * math.tau * 3.0)))
    else:
        sweep = 0.5 - 0.5 * math.cos(phase * math.tau)
        x = w * (0.12 + 0.76 * sweep)
        y = h * (0.46 + 0.14 * math.sin(phase * math.tau * 2.0))
    return int(round(x)), int(round(y))


def capture_pointer(page, frames_dir: Path, duration_ms: int, fps: int, viewport: tuple[int, int], style: str) -> list[Path]:
    times = compute_times(duration_ms, fps)
    frames: list[Path] = []
    delay_ms = max(1, int(round(1000 / fps)))
    for index, _ in enumerate(times):
        x, y = pointer_position(index, len(times), viewport, style)
        page.mouse.move(x, y)
        frame_path = frames_dir / f"frame_{index:06d}.png"
        page.screenshot(path=str(frame_path))
        frames.append(frame_path)
        page.wait_for_timeout(delay_ms)
        print(f"frame {index + 1}/{len(times)} pointer=({x},{y}) -> {frame_path}")
    return frames


def encode_video(ffmpeg: str, frames_dir: Path, fps: int, out: Path) -> None:
    pattern = frames_dir / "frame_%06d.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        ffmpeg,
        "-y",
        "-framerate",
        str(fps),
        "-i",
        str(pattern),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(out),
    ]
    subprocess.run(cmd, check=True)


def main() -> int:
    args = parse_args()
    ensure_playwright()
    viewport = parse_viewport(args.viewport)
    if not args.input.exists():
        raise SystemExit(f"Input path does not exist: {args.input}")

    server, served = serve_path(args.input)
    frames_dir = args.frames_dir or Path(tempfile.mkdtemp(prefix="html-capture-", dir=str(Path.cwd())))
    frames_dir.mkdir(parents=True, exist_ok=True)

    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": viewport[0], "height": viewport[1]}, device_scale_factor=args.scale)
            page.goto(build_seek_url(served.url, 0 if args.mode == "seek" else None), wait_until="load")
            wait_for_ready(page)

            if args.mode == "seek":
                frames = capture_seek(page, frames_dir, args.duration_ms, args.fps, args.selector)
            else:
                frames = capture_pointer(page, frames_dir, args.duration_ms, args.fps, viewport, args.pointer_path)

            browser.close()

        encode_video(args.ffmpeg, frames_dir, args.fps, args.out)
        print(f"encoded -> {args.out}")
        if not args.keep_frames and args.frames_dir is None:
            shutil.rmtree(frames_dir, ignore_errors=True)
        else:
            print(f"frames -> {frames_dir}")
        return 0
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())

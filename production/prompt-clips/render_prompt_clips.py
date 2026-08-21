#!/usr/bin/env python3
"""Batch render Claude Typer prompt clips for the vibe-motion production list."""

from __future__ import annotations

from contextlib import contextmanager
import argparse
import json
import os
import shlex
import shutil
import socket
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import urlparse


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
MANIFEST_PATH = SCRIPT_DIR / "skills_prompt_list.json"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "production" / "prompt-clips"
TYPER_SCRIPT = Path(
    os.environ.get(
        "CLAUDE_TYPER_SCRIPT",
        Path.home() / ".codex/skills/claude-typer/scripts/render_claude_typer.py",
    )
).expanduser()
SERVE_URL = "https://www.laosunwendao.com"
SERVE_HOST = urlparse(SERVE_URL).hostname

EXPECTED_VIDEO_WIDTH = 1920
EXPECTED_VIDEO_HEIGHT = 1080
EXPECTED_CLAUDE_WIDTH = 1500
EXPECTED_FPS = Fraction(30, 1)
EXPECTED_SCALE = 1
EXPECTED_CODEC = "prores"
EXPECTED_PRORES_PROFILE = "4444"
EXPECTED_PIXEL_FORMAT = "yuva444p10le"


@dataclass(frozen=True)
class RenderItem:
    index: int
    skill: str
    prompt: str
    prompt_clip: Path


@dataclass(frozen=True)
class VideoProbe:
    width: int
    height: int
    fps: Fraction
    pix_fmt: str


@dataclass(frozen=True)
class BrowserOverride:
    host: str
    ip: str
    browser_path: Path
    wrapper_path: Path

    def describe(self) -> str:
        return (
            f"host={self.host} ip={self.ip} browser={self.browser_path} "
            f"wrapper={self.wrapper_path}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Batch render Claude Typer prompt clips.")
    parser.add_argument(
        "--only",
        help="Render only one skill slug, for example remotion-vinyl-player.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned work without invoking the renderer.",
    )
    parser.add_argument(
        "--manifest",
        default=str(MANIFEST_PATH),
        help="Path to the JSON manifest.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help="Fallback directory for outputs when a manifest item omits prompt_clip.",
    )
    parser.add_argument(
        "--video-width",
        type=int,
        default=EXPECTED_VIDEO_WIDTH,
        help="Video width passed to claude-typer.",
    )
    parser.add_argument(
        "--video-height",
        type=int,
        default=EXPECTED_VIDEO_HEIGHT,
        help="Video height passed to claude-typer.",
    )
    parser.add_argument(
        "--claude-width",
        type=int,
        default=EXPECTED_CLAUDE_WIDTH,
        help="Claude panel width passed to claude-typer.",
    )
    parser.add_argument(
        "--fps",
        type=int,
        default=30,
        help="Output frame rate.",
    )
    parser.add_argument(
        "--scale",
        type=int,
        default=EXPECTED_SCALE,
        help="Render scale.",
    )
    return parser.parse_args()


def load_manifest(manifest_path: Path) -> list[dict[str, Any]]:
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    with manifest_path.open("r", encoding="utf-8") as fp:
        data = json.load(fp)

    if not isinstance(data, list):
        raise ValueError("Manifest must be a JSON array.")

    normalized: list[dict[str, Any]] = []
    for idx, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Manifest item #{idx} is not an object.")
        for field in ("index", "skill", "prompt"):
            if field not in item:
                raise ValueError(f"Manifest item #{idx} missing '{field}'.")
        normalized.append(item)
    return normalized


def resolve_output_path(raw_path: str | None, fallback_dir: Path, index: int, skill: str) -> Path:
    if raw_path:
        output_path = Path(raw_path).expanduser()
    else:
        output_path = fallback_dir / f"{index:02d}-{skill}.mov"

    if not output_path.is_absolute():
        output_path = (REPO_ROOT / output_path).resolve()
    return output_path


def build_items(manifest: list[dict[str, Any]], output_dir: Path) -> list[RenderItem]:
    items: list[RenderItem] = []
    for entry in manifest:
        index = int(entry["index"])
        skill = str(entry["skill"])
        prompt = str(entry["prompt"])
        raw_prompt_clip = entry.get("prompt_clip") or entry.get("output_path")
        prompt_clip = resolve_output_path(
            str(raw_prompt_clip) if raw_prompt_clip is not None else None,
            output_dir,
            index,
            skill,
        )
        items.append(RenderItem(index=index, skill=skill, prompt=prompt, prompt_clip=prompt_clip))
    return items


def check_renderer() -> None:
    if not TYPER_SCRIPT.exists():
        raise FileNotFoundError(
            f"Claude Typer script not found: {TYPER_SCRIPT}\n"
            "Install the claude-typer skill under ~/.codex/skills or set "
            "CLAUDE_TYPER_SCRIPT to its renderer script."
        )


def check_ffprobe_available() -> None:
    if not shutil.which("ffprobe"):
        raise FileNotFoundError("ffprobe not found in PATH. Install ffprobe before running this script.")


def check_dig_available() -> None:
    if not shutil.which("dig"):
        raise FileNotFoundError("socket.getaddrinfo failed and dig is not available in PATH.")


def detect_browser_executable() -> Path | None:
    candidate_paths = [
        Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        Path("/Applications/Chromium.app/Contents/MacOS/Chromium"),
    ]
    for candidate in candidate_paths:
        if candidate.exists():
            return candidate

    for binary in ("google-chrome", "google-chrome-stable", "chromium-browser", "chromium"):
        found = shutil.which(binary)
        if found:
            return Path(found)

    return None


def resolve_host_or_fallback(host: str) -> tuple[str | None, str]:
    try:
        socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        return None, f"dns: direct resolution succeeded for {host}"
    except socket.gaierror as exc:
        primary_error = exc

    check_dig_available()
    proc = subprocess.run(["dig", "+short", host, "A"], capture_output=True, text=True)
    if proc.returncode != 0:
        stderr = proc.stderr.strip() or proc.stdout.strip() or "unknown dig error"
        raise RuntimeError(f"socket.getaddrinfo failed for {host}, and dig failed: {stderr}") from primary_error

    for line in proc.stdout.splitlines():
        candidate = line.strip()
        if not candidate:
            continue
        try:
            socket.inet_aton(candidate)
        except OSError:
            continue
        return candidate, f"dns fallback: enabled for {host} -> {candidate}"

    raise RuntimeError(
        f"socket.getaddrinfo failed for {host}, and dig did not return any IPv4 A record."
    ) from primary_error


@contextmanager
def browser_override_for_host(host: str) -> Iterator[BrowserOverride | None]:
    ip, resolution_note = resolve_host_or_fallback(host)
    if ip is None:
        print(resolution_note)
        yield None
        return

    browser_path = detect_browser_executable()
    if browser_path is None:
        raise FileNotFoundError(
            "DNS fallback is needed, but no local Chrome/Chromium executable was found."
        )

    temp_dir = tempfile.TemporaryDirectory(prefix="prompt-clips-browser-")
    wrapper_path = Path(temp_dir.name) / "browser-wrapper"
    host_rule = f"--host-resolver-rules=MAP {host} {ip}"
    script = (
        "#!/bin/sh\n"
        f"exec {shlex.quote(str(browser_path))} {shlex.quote(host_rule)} \"$@\"\n"
    )
    wrapper_path.write_text(script, encoding="utf-8")
    wrapper_path.chmod(0o755)

    override = BrowserOverride(
        host=host,
        ip=ip,
        browser_path=browser_path,
        wrapper_path=wrapper_path,
    )
    print(f"{resolution_note}; {override.describe()}")
    try:
        yield override
    finally:
        temp_dir.cleanup()


def parse_fraction(value: Any) -> Fraction | None:
    if not isinstance(value, str) or not value or value == "0/0":
        return None
    try:
        return Fraction(value)
    except (ValueError, ZeroDivisionError):
        return None


def pix_fmt_has_alpha(pix_fmt: str) -> bool:
    pix_fmt = pix_fmt.lower()
    alpha_markers = ("yuva", "rgba", "bgra", "argb", "abgr", "gbrap", "ya", "ayuv")
    return any(marker in pix_fmt for marker in alpha_markers)


def probe_video(path: Path) -> VideoProbe:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        raise FileNotFoundError("ffprobe not found in PATH. Install ffprobe before running this script.")

    cmd = [
        ffprobe,
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,avg_frame_rate,r_frame_rate,pix_fmt",
        "-of",
        "json",
        str(path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        stderr = proc.stderr.strip() or proc.stdout.strip() or "unknown ffprobe error"
        raise RuntimeError(f"ffprobe failed for {path}: {stderr}")

    try:
        info = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"ffprobe returned invalid JSON for {path}: {exc}") from exc

    streams = info.get("streams")
    if not isinstance(streams, list) or not streams:
        raise RuntimeError(f"ffprobe found no video stream in {path}")

    stream = streams[0]
    if not isinstance(stream, dict):
        raise RuntimeError(f"ffprobe returned an invalid stream entry for {path}")

    width = stream.get("width")
    height = stream.get("height")
    pix_fmt = stream.get("pix_fmt")
    fps = parse_fraction(stream.get("avg_frame_rate")) or parse_fraction(stream.get("r_frame_rate"))

    if not isinstance(width, int) or not isinstance(height, int):
        raise RuntimeError(f"ffprobe did not report numeric dimensions for {path}")
    if not isinstance(pix_fmt, str) or not pix_fmt:
        raise RuntimeError(f"ffprobe did not report a pixel format for {path}")
    if fps is None:
        raise RuntimeError(f"ffprobe did not report a parseable frame rate for {path}")

    return VideoProbe(width=width, height=height, fps=fps, pix_fmt=pix_fmt)


def validate_probe(path: Path, expected_width: int, expected_height: int, expected_fps: Fraction) -> list[str]:
    probe = probe_video(path)
    errors: list[str] = []

    if probe.width != expected_width:
        errors.append(f"width={probe.width}")
    if probe.height != expected_height:
        errors.append(f"height={probe.height}")
    if probe.fps != expected_fps:
        errors.append(f"fps={probe.fps}")
    if not pix_fmt_has_alpha(probe.pix_fmt):
        errors.append(f"pix_fmt={probe.pix_fmt}")

    return errors


def render_with_claude_typer(
    item: RenderItem,
    args: argparse.Namespace,
    browser_executable: Path | None,
) -> list[str]:
    command = [
        sys.executable,
        str(TYPER_SCRIPT),
        item.prompt,
        "--output-file",
        str(item.prompt_clip),
        "--video-width",
        str(args.video_width),
        "--video-height",
        str(args.video_height),
        "--claude-width",
        str(args.claude_width),
        "--fps",
        str(args.fps),
        "--scale",
        str(args.scale),
        "--codec",
        EXPECTED_CODEC,
        "--prores-profile",
        EXPECTED_PRORES_PROFILE,
        "--pixel-format",
        EXPECTED_PIXEL_FORMAT,
    ]
    if browser_executable is not None:
        command.extend(["--browser-executable", str(browser_executable)])
    return command


def format_item_line(item: RenderItem) -> str:
    return f"[{item.index:02d}] {item.skill} -> {item.prompt_clip}"


def describe_expected_spec() -> str:
    return (
        f"{EXPECTED_VIDEO_WIDTH}x{EXPECTED_VIDEO_HEIGHT} "
        f"@ {EXPECTED_FPS}fps with alpha"
    )


def describe_probe_errors(path: Path, errors: list[str]) -> str:
    probe = probe_video(path)
    return (
        f"Existing output is invalid: {path}\n"
        f"Expected {describe_expected_spec()}.\n"
        f"Got width={probe.width}, height={probe.height}, fps={probe.fps}, pix_fmt={probe.pix_fmt}.\n"
        f"Mismatch: {', '.join(errors)}"
    )


def main() -> int:
    args = parse_args()
    manifest_file = Path(args.manifest).expanduser()
    output_dir = Path(args.output_dir).expanduser()
    output_dir.mkdir(parents=True, exist_ok=True)

    manifest = load_manifest(manifest_file)
    items = build_items(manifest, output_dir)

    if args.only:
        items = [item for item in items if item.skill == args.only]
        if not items:
            available = ", ".join(item["skill"] for item in manifest)
            raise SystemExit(f"--only '{args.only}' not found in manifest. Available skills: {available}")
        print(f"Only rendering skill: {args.only}")

    check_renderer()
    check_ffprobe_available()

    if SERVE_HOST is None:
        raise RuntimeError(f"Could not parse host from SERVE_URL: {SERVE_URL}")

    with browser_override_for_host(SERVE_HOST) as browser_override:
        for item in items:
            print(format_item_line(item))

            if item.prompt_clip.exists():
                errors = validate_probe(
                    item.prompt_clip,
                    expected_width=args.video_width,
                    expected_height=args.video_height,
                    expected_fps=Fraction(args.fps, 1),
                )
                if not errors:
                    print(f"  skip: already valid -> {item.prompt_clip}")
                    continue
                raise RuntimeError(describe_probe_errors(item.prompt_clip, errors))

            command = render_with_claude_typer(
                item,
                args,
                browser_override.wrapper_path if browser_override is not None else None,
            )

            if args.dry_run:
                if browser_override is not None:
                    print(f"  dry-run browser fallback: {browser_override.describe()}")
                else:
                    print("  dry-run browser fallback: disabled")
                print("  dry-run:")
                print("   ", " ".join(command))
                continue

            process = subprocess.run(command)
            if process.returncode != 0:
                raise RuntimeError(f"Render command failed for {item.skill}")

            if not item.prompt_clip.exists():
                raise RuntimeError(f"Render completed but output file is missing: {item.prompt_clip}")

            errors = validate_probe(
                item.prompt_clip,
                expected_width=args.video_width,
                expected_height=args.video_height,
                expected_fps=Fraction(args.fps, 1),
            )
            if errors:
                raise RuntimeError(describe_probe_errors(item.prompt_clip, errors))

            print(f"  done: {item.prompt_clip}")

    print("All selected tasks processed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)

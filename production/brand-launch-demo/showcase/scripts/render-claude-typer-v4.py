#!/usr/bin/env python3
"""Delegate to the claude-typer skill with a project-specific model label."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path
from types import ModuleType


SKILL_SCRIPT = Path(
    os.environ.get(
        "CLAUDE_TYPER_SCRIPT",
        Path.home() / ".codex/skills/claude-typer/scripts/render_claude_typer.py",
    )
).expanduser()


def load_skill_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("claude_typer_skill", SKILL_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load claude-typer skill script: {SKILL_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--model", required=True)
    wrapper_args, skill_args = parser.parse_known_args()
    model = wrapper_args.model.strip()
    if not model:
        raise RuntimeError("--model must not be empty")

    skill = load_skill_module()
    original_build_props = skill.build_props

    def build_props(
        prompt: str,
        video_width: int,
        video_height: int,
        claude_width: int,
    ) -> str:
        props = json.loads(
            original_build_props(prompt, video_width, video_height, claude_width)
        )
        props["model"] = model
        return json.dumps(props, ensure_ascii=False, separators=(",", ":"))

    skill.build_props = build_props
    original_argv = sys.argv
    sys.argv = [original_argv[0], *skill_args]
    try:
        return skill.main()
    finally:
        sys.argv = original_argv


if __name__ == "__main__":
    raise SystemExit(main())

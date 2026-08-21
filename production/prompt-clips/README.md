# Claude Typer 提示片头批量渲染

本目录包含 v4 展示片所选 12 个 vibe-motion skills 的片头 prompt 清单（保留原始 Skill 编号）与批量渲染脚本。

- 清单：`skills_prompt_list.json`
- 批量脚本：`render_prompt_clips.py`

默认会把每个条目输出到：

`production/prompt-clips/<序号>-<skill>.mov`

示例：`production/prompt-clips/01-3d-chladni-render.mov`

```bash
python3 production/prompt-clips/render_prompt_clips.py --dry-run
```

```bash
python3 production/prompt-clips/render_prompt_clips.py --only remotion-vinyl-player --dry-run
```

清单字段：

- `index`
- `skill`
- `prompt`
- `prompt_clip`

脚本规则：

- 默认使用 `~/.codex/skills/claude-typer/scripts/render_claude_typer.py`；也可以通过 `CLAUDE_TYPER_SCRIPT` 指向其他安装位置。统一渲染参数为 1920x1080、claude-width 1500、fps30、scale1、ProRes 4444。
- 若目标文件已存在且 `ffprobe` 验证通过 `1920x1080 / 30fps / alpha`，则跳过。
- 遇到失败立即停止。
- 只使用 `ffprobe` 做输出校验，不做任何 `ffmpeg` 编辑操作。

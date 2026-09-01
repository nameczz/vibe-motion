---
name: interactive-exploded-3d
description: Build code-driven reversible 3D exploded-view animations or gesture-controlled HTML demos from separable product models. Use for product disassembly, reassembly, short-form social video, or webcam hand control; do not use when the only source is a flat image and true hidden geometry is required.
---

# Interactive Exploded 3D

Create a real exploded view: visible product parts remain rigid and move between stored assembled transforms and authored exploded transforms. Do not substitute an image-state swap, particle dissolve, or a hidden whole-product layer unless the user asks for that style.

## Route the request

1. Inspect the source before promising the result.
   - Prefer GLB/glTF, FBX, or another scene with separately addressable nodes or meshes.
   - If the source is a single fused mesh, explain that segmentation or remodeling is required.
   - If the source is only a flat image, offer a limited 2.5D layer animation rather than claiming a true 3D exploded view.
2. Choose one or both modes:
   - **Deterministic video:** time maps to transforms so arbitrary-frame seeking and rendering are stable.
   - **Interactive HTML:** an input progress value maps continuously from assembled `0` to exploded `1`.
3. Preserve the user's requested visual direction. Generate a target frame only when it will materially clarify materials, lighting, framing, or palette; keep it clearly separate from the code-rendered result.

## Build and verify

- Read [references/production-workflow.md](references/production-workflow.md) when implementing the 3D hierarchy, animation, camera, lighting, or render checks.
- Read [references/gesture-control.md](references/gesture-control.md) only when webcam or hand control is requested.
- Read [references/social-video.md](references/social-video.md) only when packaging a short social video or creator post.

Keep model and texture licenses with the deliverable. Preview before expensive rendering. Verify assembled, partial, fully exploded, returning, and final states visually; do not declare success from code inspection alone.

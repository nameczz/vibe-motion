# Production workflow

## Validate the asset

Inspect the model graph, mesh count, material names, node names, dimensions, and animation tracks. Confirm that the intended visible parts are independently transformable. Preserve the upstream model license and attribution.

Useful checks include a glTF inspector, JSON-chunk inspection for GLB files, and a contact sheet of the untouched asset. Node names such as doors, wheels, roof, glass, interior, engine, and chassis are more useful than raw mesh indices.

## Build a semantic rigid hierarchy

Group meshes into a small number of meaningful motion assemblies rather than animating every primitive independently. Typical groups include wheels and brakes, left and right covers, front and rear assemblies, roof and glass, interior, chassis, and a stationary structural core.

For each group, store its assembled position and quaternion, exploded position and quaternion, semantic label, and stagger delay. Compute the wrapper pivot from the group's world-space bounds, add a wrapper at that pivot, then attach the original objects without changing their world transforms.

## Author the explosion

Prefer a readable three-dimensional separation over sending every part to the left and right. In a portrait composition, doors and wheels can move moderately sideways, roof upward, chassis downward, and front/rear systems along depth.

Use one normalized progress value. Derive each part's progress with a small delay and easing curve. The closing state should use the same stored transforms in reverse so the product returns exactly to assembly.

For a rapid commercial motion, a useful starting rhythm is roof and primary cover, then doors and wheels after 60–90 ms, then interior and chassis after another 60–90 ms. Treat this as a starting point, not a fixed requirement.

## Camera and framing

Keep the assembled product large. Pull the camera back only as the exploded footprint grows, then push in during the observation hold. Compensate camera radius for side-profile views so a fast orbit does not clip the product.

For seamless loops, return camera, parts, lights, UI, and progress indicators to the exact opening state. Inspect the actual last encoded frame rather than assuming that the declared duration is visible.

## Materials and lighting

Use physically based materials and a real environment reflection before adding decorative effects. A robust automotive setup uses a dielectric colored base coat with clearcoat, dark titanium secondary parts, smoked glass, matte rubber, dark machined wheels, and one restrained mechanical accent color.

Use a local PMREM/HDR environment plus large area lights to create continuous highlight bands across curved panels. On a light background, keep the product darker and use colored edge lights; on a dark background, increase silhouette separation without crushing the interior.

An AI-generated target frame can guide art direction, but translate it into actual material, light, camera, and environment parameters. Do not use the target bitmap as the animated result.

## Verification

Capture assembled hero, early separation, fully exploded, early return, and reassembled end states. Check runtime errors, missing materials, clipping, transparent-glass ordering, camera jumps, floor shadows, loop continuity, and attribution. For deterministic video, seek directly to each time rather than relying only on real-time playback.

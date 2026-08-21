<p align="center">
  <a href="https://nolangz.github.io/3D-Chladni/"><strong>Live Demo</strong></a>
</p>

<p align="center">
  <strong>English</strong> | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/nolangz/3D-Chladni/releases/latest/download/3D-Chladni-Web.zip"><strong>Download Web HTML</strong></a> ·
  <a href="https://github.com/nolangz/3D-Chladni/releases/latest/download/3D-Chladni-Mac-Apple-Silicon.zip"><strong>Download Mac App</strong></a> ·
  <a href="https://github.com/nolangz/3D-Chladni/releases/latest/download/3D-Chladni-Mac-Screen-Saver.zip"><strong>Download Mac Screen Saver</strong></a>
</p>

<p align="center"><sub>macOS downloads are signed with Developer ID and notarized by Apple.</sub></p>

<p align="center">
  <img src="media/showcase-en.png" alt="3D Chladni Web showcase with a rotating cosmic particle form" width="100%">
</p>

# 3D Chladni

3D Chladni turns spectrum, pulse, and energy into evolving three-dimensional Chladni fields. The particles are not textures or prerecorded animation: they continuously form nodal structures through modal resonance, inertial motion, and spatial projection.

The repository contains three usable applications: a Web Demo, a Mac music visualizer, and a native Mac screen saver / lock animation. The Windows visualizer is an open contributor track.

[简体中文](README.zh-CN.md) · [720p MP4 demo](media/chladni-cosmic-demo.mp4) · [Detailed desktop notes](README.txt)

## Applications

| Application | Status | Description |
| --- | --- | --- |
| Web Demo | Available | GitHub Pages-ready; built-in Lofi drives Dynamic Sand and Dynamic Cosmic |
| Mac music visualizer | Available | Electron app that follows system audio after permission, with overlay and fullscreen modes |
| Mac screen saver / lock animation | Available | Native Metal renderer for optimized Modal Sand and Cosmic Web animation |
| Windows music visualizer | Contributors wanted | Cross-platform Electron and packaging foundations exist; Windows adaptation and device validation remain |

> [!WARNING]
> **Power use:** The Web Demo and Mac music visualizer continuously perform high-density particle computation and real-time rendering and can drain a laptop battery very quickly. Running them on battery power is not recommended. The macOS screen saver uses a separate native Metal rendering path that has been optimized for computation and energy use.

![Six-second 3D Chladni motion demo](media/chladni-cosmic-demo.gif)

## Visual Modes

| Mode | Input | Default detail | Visual behavior |
| --- | --- | --- | --- |
| Dynamic Sand | Built-in Web Lofi / user audio / system audio | `1.5x` | Spectrum-driven inertial sand migration |
| Modal Sand | None required | `1.0x` | Stable Chladni nodal sculpture |
| Cosmic Web | None required | `1.0x` | Three-dimensional particle web, precession, and moving light |
| Dynamic Cosmic | Built-in Web Lofi / user audio / system audio | `1.5x` | Music-driven modal mixing and spatial deformation |

Each mode remembers its adjusted detail value for the current session. Particle density defaults to `15%`. Dynamic modes include low-frequency modal protection so bass-heavy audio retains visible structural detail.

## Web Demo

The repository-root `index.html` is the publishing entry point. It embeds the real visual engine from `app/index.html`; there is no second particle implementation to maintain.

- Switch the full interface between English and Chinese from the bottom dock.
- Randomize patterns, enter fullscreen, pause rotation, and drag to inspect the form.
- Advanced controls cover single-axis rotation, tumble, precession, speed, zoom, detail, particles, lighting, and solid shape.
- Fullscreen hides the title, dock, and settings; press `Esc` to exit.
- The mobile dock reflows without horizontal overflow.

<table>
  <tr>
    <td width="70%"><img src="media/controls-en.png" alt="English advanced controls with Cosmic Web detail set to 1.0"></td>
    <td width="30%"><img src="media/showcase-mobile-en.png" alt="Responsive English mobile layout"></td>
  </tr>
</table>

## Run Locally

On macOS, double-click `start.command`, or run this from the repository root:

```bash
python3 -m http.server 8777
```

Open [http://localhost:8777/](http://localhost:8777/). Use an HTTP server rather than opening the page through `file://`; browsers apply additional restrictions to local audio initialization and AudioContext.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. After pushing to `main`, choose **GitHub Actions** under **Settings → Pages → Source**. The workflow will:

1. Check JavaScript and publishing-script syntax.
2. Package the Web shell (`index.html`, `app/`, and the compatibility `website/` route) together with its license notices.
3. Publish the static artifact to the repository's `github.io` URL.

Relative paths support project Pages URLs such as `https://owner.github.io/repository/`. Legacy `/website/` links preserve query parameters and fragments while redirecting to the new root.

Build and verify manually with:

```bash
npm run build:pages
npm run verify:pages
```

## Capability Boundaries

| Capability | Web Demo | Mac visualizer | Mac screen saver / lock animation |
| --- | --- | --- | --- |
| Dynamic Sand / Dynamic Cosmic | Supported | Supported | Audio analysis disabled |
| Modal Sand / Cosmic Web | Supported | Supported | Supported |
| Built-in Lofi demo audio | Supported | Excluded from the package | Not required |
| User audio file / microphone | Browser support | Supported | Not supported |
| System audio | No general browser API | Supported after explicit permission | Not supported |
| Transparent overlay and menu bar | Not supported | Supported | Not applicable |
| Native optimized rendering | Not supported | Not supported | Supported |

The Mac visualizer continues to reuse `app/index.html`, while `electron-builder` explicitly excludes `pulsebox-lofi-production-522875.mp3`. The screen saver uses a separate native Metal rendering path and does not start Electron, WebKit, or audio analysis.

## Mac Visualizer

```bash
npm install
npm start
```

Build an unpacked macOS application with:

```bash
npm run package:mac
```

See [README.txt](README.txt) for screen saver and lock-launcher build, installation, and macOS system limitations.

## Windows Contributors

The Windows visualizer is not currently presented as a finished release. The repository already contains the Electron visual core, Windows packaging configuration, and system-audio integration foundations. Contributions are particularly useful for:

- Loopback-audio compatibility across Windows 10 / 11, audio interfaces, and Bluetooth devices.
- Transparent overlay, fullscreen, multi-monitor, and mixed-DPI stability.
- Installer, code-signing, automatic-update, and release workflows.
- GPU, CPU, and battery measurements, plus visual parity with Mac and Web output.

Use `npm run package:win` as the development packaging entry point. Windows will remain marked as a contributor track until the device matrix is validated.

## Architecture

```text
index.html                  GitHub Pages / local Web showcase shell
app/index.html              Particle physics, audio analysis, and Canvas rendering source of truth
desktop/                    Electron main process, controls, and system-audio bridge
macos-screensaver/          Native Metal screen saver
scripts/build-pages.sh      Minimal static publishing artifact
scripts/verify-pages.cjs    Pages paths, languages, defaults, and audio verification
```

The renderer submits at most `60 FPS` and pauses the visual loop while hidden. Particle density and DPR adapt to canvas size; quality scaling disables expensive post-processing before changing the pattern structure.

## Validation

```bash
npm run check
npm run smoke
npm run verify:web-audio
npm run verify:pages
npm run verify:mac-parity
```

Regenerate release media with:

```bash
npm run capture:media
npm run export:video -- --output media/chladni-cosmic-demo.mp4 \
  --style cosmic --width 1280 --height 720 --fps 30 --seconds 6 \
  --codec h264 --rotation precess --rotation-speed 1 --seed 20260711
```

## License

Licensing is split by scope. Apache-2.0 does not cover project media or third-party music.

| Scope | License |
| --- | --- |
| Source code, build scripts, configuration, and documentation | [Apache License 2.0](LICENSE) |
| Screenshots, GIFs, MP4s, promotional media under `media/`, and standalone particle presets | [CC BY-NC 4.0](ASSET_LICENSE.md) |
| Built-in Web track “Lofi Production” by PulseBox | [Pixabay Content License](THIRD_PARTY_NOTICES.md) |
| Product name, logo, and application icons | Trademark and branding rights reserved |

The Pixabay track is integrated only as the Web audiovisual demo's drive audio. Do not extract, resell, or redistribute the original MP3 as a standalone file. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution licensing.

## Release Checklist

Review [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) before a public release, especially project-media ownership and the requirement that Pixabay music remain part of the interactive audiovisual work rather than a standalone distribution.

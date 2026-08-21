# Release Checklist

## Repository

- [ ] Create the GitHub repository and add it as `origin`.
- [x] License source code, build scripts, configuration, and documentation under Apache-2.0.
- [x] License original screenshots, GIFs, MP4s, promotional media, and standalone particle presets under CC BY-NC 4.0.
- [ ] Confirm the product name, repository description, topics, and social preview image.
- [ ] Verify that no private certificates, signing identities, local profiles, or build output are tracked.

## Audio And Media

- [x] Record “Lofi Production” by PulseBox and the governing Pixabay Content License in `THIRD_PARTY_NOTICES.md`.
- [x] Confirm that project-original README screenshots, GIF, and MP4 may be distributed under CC BY-NC 4.0.
- [ ] Reconfirm before public launch that the MP3 remains an integrated component of the audiovisual Web Demo and is not offered for standalone redistribution.

## GitHub Pages

- [ ] Push `main` and select **GitHub Actions** under **Settings → Pages → Source**.
- [ ] Confirm the `Deploy GitHub Pages` workflow succeeds.
- [ ] Open the project Pages URL and test Dynamic Sand and Dynamic Cosmic playback.
- [ ] Test the Chinese / English switch, fullscreen, random pattern, and mobile layout.

## Desktop

- [ ] Run `npm run smoke` and `npm run verify:mac-parity`.
- [ ] Build the macOS package and confirm the bundled app does not contain the Web demo MP3.
- [ ] Configure production signing and notarization before distributing installers.

## Windows Contributions

- [ ] Open a public tracking issue for Windows 10 / 11 compatibility work.
- [ ] Document the tested audio devices, display layouts, and DPI configurations.
- [ ] Require system-audio, multi-monitor, installer, and energy regression checks before calling the Windows app release-ready.

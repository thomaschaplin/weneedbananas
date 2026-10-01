# Showreel

`weneedbananas-showreel.mp4` is a 15-second motion-graphics reel of the site (1920×1080, 60fps, with sound).

Everything is generated from code in this folder:

- `reel.html`: the animation. `render(t)` draws the frame at time `t` (seconds), so any frame can be redrawn exactly. Open it in a browser to watch a live loop (no sound), or add `?t=7.2` to freeze on one moment.
- `synth.mjs`: synthesises the 128 BPM soundtrack to `music.wav`. Scene cuts and hits sit on its beats (`B = 60 / 128` in both files).
- `build.mjs`: renders every frame with Playwright, then muxes video and audio with ffmpeg.

```sh
npm run showreel             # full render, about 3 minutes; needs ffmpeg
npm run showreel -- 2.5 7.2  # just write stills at those times to showreel/stills/
```

On first run it downloads Noto Color Emoji (25 MB, gitignored) into `fonts/`. Set `CHROMIUM_PATH` to use a specific Chromium.

Fonts: Fredoka and JetBrains Mono, both under the SIL Open Font License.

## Instagram caption

See [`instagram.md`](instagram.md).

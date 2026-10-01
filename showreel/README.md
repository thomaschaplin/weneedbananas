# Showreel

A 15-second motion-graphics reel of the site, with sound, in two formats:

- `weneedbananas-showreel.mp4`: 1920×1080 landscape, 60fps.
- `weneedbananas-showreel-vertical.mp4`: 1080×1920 (9:16) for Instagram Reels, TikTok and YouTube Shorts. Text and key content stay out of the top ~150px and bottom ~420px, where the apps put their own buttons and caption.

`alternatives/` holds five more vertical edits, each with its own soundtrack and caption (see [`instagram.md`](instagram.md)):

| File                              | Edit                                                                  |
| --------------------------------- | --------------------------------------------------------------------- |
| `weneedbananas-reel-chat.mp4`     | Opens on a chaotic household group chat, then "There's a better way." |
| `weneedbananas-reel-midnight.mp4` | The full reel in dark mode, with a minor-key soundtrack               |
| `weneedbananas-reel-privacy.mp4`  | Re-edited to lead with the phone-to-phone, no-server sync             |
| `weneedbananas-reel-type.mp4`     | All kinetic typography, a card on every beat                          |
| `weneedbananas-reel-teaser.mp4`   | A 7.5-second cut of the best moments, made to loop                    |

Everything is generated from code in this folder:

- `reel.html`: the animation. `render(t)` draws the frame at time `t` (seconds), so any frame can be redrawn exactly. Open it in a browser to watch a live loop (no sound), add `?t=7.2` to freeze on one moment, or `?v=1` for the vertical layout.
- `variants.js`: the alternative edits. Each one is a list of segments that re-cut the master timeline or play a standalone scene (the group chat, the kinetic type). It also sets the music for that edit (key, where the drums start and stop). Open `reel.html?v=1&alt=chat` to preview one.
- `synth.mjs`: synthesises the 128 BPM soundtrack for an edit to `music-<alt>.wav`. Scene cuts and hits sit on its beats (`B = 60 / 128` in both files), and the scene sound effects follow the same segment list as the picture.
- `build.mjs`: renders every frame with Playwright, then muxes video and audio with ffmpeg.

```sh
npm run showreel                       # both formats, about 3 minutes each; needs ffmpeg
npm run showreel -- vertical           # one format: landscape or vertical
npm run showreel -- alts               # all five alternatives (vertical)
npm run showreel -- alt=chat           # one alternative
npm run showreel -- vertical 2.5 7.2   # just write stills at those times to showreel/stills/
```

On first run it downloads Noto Color Emoji (25 MB, gitignored) into `fonts/`. Set `CHROMIUM_PATH` to use a specific Chromium.

Fonts: Fredoka and JetBrains Mono, both under the SIL Open Font License.

## Instagram caption

See [`instagram.md`](instagram.md).

# LUMINAe Luminary Glass Audio Generation Record v1.0

**Generation date:** 2026-08-25  
**Generator:** `scripts/generate-luminary-glass-audio.mjs`  
**Generator SHA-256:** `137fc004bb2364397477c92a63d8b10bfb7cf654a5849b56d3f31d1854675b5e`

## Purpose

The Luminary arrival and tutorial shatter need recognizable physical glass
fractures. Earlier source recordings cannot ship because their creators,
source pages, and license terms were not retained. These replacements are
first-party deterministic renders generated entirely from repository-authored
DSP code.

## Source And Rights Record

- No recorded audio, sample library, impulse response, music, third-party code,
  reference track, or external media is read by the generator.
- The generator uses only Node.js built-ins, mathematical oscillators,
  deterministic pseudo-random noise, filters, envelopes, stereo panning, and a
  PCM WAVE encoder implemented in the source file.
- The three output files are reproducible project assets governed with the
  repository source. The generator and exact output hashes are retained so a
  release reviewer can verify their origin without relying on filename or chat
  history.
- The excluded legacy recordings remain unreferenced and are not inputs to this
  generation process.

## Sound Design

| Cue | Intended beat | Synthesis structure |
| --- | --- | --- |
| First crack | Initial seal failure | Dry structural split, low physical body, two secondary fractures, and a restrained debris tail |
| Branching fracture | Crack network spreading | Six spatially separated fracture events with a longer, irregular debris decay |
| Full shatter | Aperture collapse | Primary rupture, low structural failure, 68 shard events, and a three-second physical debris tail |

All outputs are 48 kHz, 16-bit stereo PCM WAVE files.

## Outputs

| Runtime file | Duration | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `artifacts/luminae/src/assets/audio/generated/luminary/luminary-first-crack-v2.wav` | 0.96 s | 184364 | `7df2549b34bf8e0a018b6368c6cc78db293ecc94318d7f5207902e61d11ca37e` |
| `artifacts/luminae/src/assets/audio/generated/luminary/luminary-branching-fracture-v2.wav` | 1.704 s | 327212 | `a682b172b1744923ca5e22800504368fdbb574e3b9290aab706c4a7a7eaf10d0` |
| `artifacts/luminae/src/assets/audio/generated/luminary/luminary-full-shatter-v2.wav` | 3.12 s | 599084 | `a9d43b2cc37f2eac9615230f12bb9e0a2920e36629f06360158522b3d42cea0c` |

## Reproduction

From the repository root:

```bash
pnpm run generate:luminary-glass-audio
```

The generated hashes must match this record. Any sound-design or generator
change requires a versioned output filename, updated hashes, and a rerun of the
asset provenance audit.

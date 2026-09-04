# LUMINAe Procedural Audio Replacement Record v1.0

**Implementation date:** 2026-08-25  
**Runtime source:** `artifacts/luminae/src/lib/audio.ts`

## Purpose

Twelve production references to audio samples without complete creator or license records were removed. Equivalent cues are synthesized with project-authored Web Audio or rendered from deterministic project-authored DSP. The legacy files remain source-only and are excluded from the production bundle.

## Replacements

| Removed runtime sample | Procedural replacement |
| --- | --- |
| `Effects/Impact Extinction Archive.mp3` | `playImpactExtinctionArchive()` intake strike and filtered tail |
| `Effects/Effect.wav` | activation texture within `playActivationSting()` and related effect beats |
| `Effects/Burn.mp3` | `playCardBurn()` ember crackle and rising burn body |
| `Effects/Forgotten Effect Activation.mp3` | `playForgottenForge()` restrained Forgotten mark |
| `Effects/Forgotten Hour Sound effect.mp3` | `playForgottenHour()` clock, sub-tone, and cold tail |
| `Effects/Spellbound.wav` | `playBrandStrike()` beam impact and harmonic afterglow |
| `luminary/Cosmic Portal Boom.mp3` | procedural arrival sub-impact |
| `luminary/Deep Impact.mp3` | procedural arrival body impact |
| `luminary/First Crackmp3.mp3` | deterministic first-party seal-crack render plus procedural pressure bed |
| `luminary/Glass Shatter.mp3` | deterministic first-party aperture-shatter render plus procedural impact bed |
| `luminary/Second Crack.mp3` | deterministic first-party branching-fracture render plus procedural stress bed |
| `luminary/Universe_Expanding_Pad_Low_01.wav` | procedural arrival/tutorial harmonic bed |

The previously undocumented `Effects/Oblivion Void Pulse.mp3` and `Effects/Seed Beyond Seasons Avatar Seeds.mp3` were also replaced by procedural cues earlier in the same closure effort.

## Validation

- All 627 client tests pass, including audio lifecycle and cinematic timing coverage.
- Client typecheck completes with zero errors; 16 pre-existing React hook warnings remain.
- The production web build passes its declared asset, entry JavaScript, and global CSS budgets.
- Built filenames contain none of the fourteen excluded legacy sample names.
- `LUMINAe_ASSET_PROVENANCE_CLOSURE_QUEUE_v1.0.csv` marks each legacy file `EXCLUDED_FROM_RELEASE` and closed.

These cues are code-native output. They do not copy or decode the excluded recordings, and no external audio file is used to render them.

The versioned glass renders and their exact generation evidence are recorded in
`LUMINAe_LUMINARY_GLASS_AUDIO_GENERATION_RECORD_v1.0.md`. They are generated
without external recordings or media and do not restore any excluded legacy
sample to production reachability.

# Luminae Terminology Contract

Last audited: 2026-07-15

## Purpose

Luminae expresses its own game model at every runtime boundary. Shared types,
serialized state, API schemas, actions, generated clients, server logic, UI,
tests, selectors, scripts, and asset paths all use the canonical vocabulary in
this document.

## Canonical Model

- The six resources are Affinities: Flare, Radiance, Verdance, Continuum,
  Abyss, and Singularity.
- A player's resources are `affinities`; the shared supply is `affinityWell`.
- Players `harness` Affinities.
- The shared Artifact display is the Forge, represented by `forgeTier1`,
  `forgeTier2`, and `forgeTier3`.
- Players forge or reserve Artifacts.
- Score is Eminence, represented by `eminence`.
- Persistent Artifact effect state is represented by `artifactMarkers` and
  `ArtifactMarker`.

## Action Protocol

The five core action discriminants are:

- `harness_three_affinities`
- `harness_two_affinities`
- `forge_artifact`
- `forge_reserved_artifact`
- `reserve_artifact`

Action payloads use `affinities`, `affinity`, and `returnAffinities`.

## Sources Of Truth

- `@workspace/game-types` owns Affinity keys, count types, and display names.
- `lib/api-spec/openapi.yaml` owns the transport contract.
- Generated React and Zod clients are regenerated from that contract.
- `artifacts/luminae/src/lib/affinityMeta.ts` owns Affinity presentation data.

## Persistence Policy

Development saves and rooms created before this contract are intentionally not
supported. Runtime normalization still supplies defaults for optional features,
but it does not translate retired game-model fields or action names.

## Material Language

Words describing physical crystals, minerals, facets, shards, colors, artwork,
or sound design remain valid when they describe Luminae's world rather than a
game resource or action.

## Enforcement

`pnpm run lint:terminology` rejects retired game-model vocabulary outside
explicit physical-material and terminology-guard contexts.

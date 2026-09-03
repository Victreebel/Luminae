# LUMINAe Technology Lineage Matrix v2.0

## Status

**Canonical immediate-predecessor graph for Technology System v2.** The runtime
source is `BUILT_ON` in `@workspace/game-types`; `Leads Toward` is derived by
reversing these edges.

Every edge must move from Tier I to Tier II or Tier II to Tier III. A
predecessor's bonus Affinity must occur in the target's printed cost. The graph
must remain acyclic, and every Tier I or II Artifact must lead to a higher
Artifact or an exact Blueprint recipe.

## Notation

`r`, `s`, `e`, `o`, and `p` identify Flare, Continuum, Verdance, Abyss, and
Radiance. A Tier II expression such as `r01 <- s04/o05/p04` means
`t2r01` is built on `t1s04`, `t1o05`, and `t1p04`. Tier III expressions use
Tier II predecessors.

## Tier II

```text
r01 <- s04/o05/p04    r02 <- s04/e06/o06    r03 <- r01/r07/p04
r04 <- r06/e05/p01    r05 <- s03/o02/p05    r06 <- o05/o06/o07

s01 <- r04/e01/p02    s02 <- r03/o08/p03    s03 <- s05/s07/p05
s04 <- e07/e08/p06    s05 <- r03/r08        s06 <- r04/o07/p03

e01 <- r06/s06/p01    e02 <- r03/s08/o01    e03 <- e02/e08/o03
e04 <- s06/o04/p06    e05 <- s01/s06/s08    e06 <- r06/o05/p08

o01 <- s01/e02/p07    o02 <- r08/e06/p03    o03 <- r07/o02
o04 <- r02/e03/p08    o05 <- e04/e06/e08    o06 <- r04/s01/p02

p01 <- r05/s04/o07    p02 <- s03/e05/o08    p03 <- e01/e07/p06
p04 <- r01/s04/p03    p05 <- p01/p05/p06    p06 <- s06/e04/o02
```

## Tier III

```text
r01 <- r05/o03/p01    r02 <- e05/o04/p03    r03 <- s02/o06/p04
r04 <- e01/o04/p06

s01 <- r03/s01/p05    s02 <- r05/s03/o02    s03 <- r02/e05/o04
s04 <- r05/s05/p06

e01 <- s01/e04/p03    e02 <- r04/s02/o03    e03 <- s05/o05/p01
e04 <- r02/s04/e04

o01 <- s04/e02/o05    o02 <- s03/e05/p02    o03 <- r06/e04/p05
o04 <- s06/e03/o01

p01 <- r05/e04/o02    p02 <- r01/e06/p05    p03 <- r06/e01/p05
p04 <- s05/o02/p03
```

## Approved Matrix Corrections

The design draft contained two cost-incompatible references. Technology v2
records the compatible readings as explicit errata:

- `t2o03 <- t1r07/t1o02`, not `t1r07/t1s02`. Abyss from `t1o02` appears in
  the target's printed cost; Continuum does not.
- `t3s04 <- t2r05/t2s05/t2p06`, not `t2r05/t2s05/t2o06`. Radiance from
  `t2p06` appears in the target's printed cost; Abyss does not.

The draft's `p05 <- p01/p05/p06` is interpreted normally across tiers:
`t2p05 <- t1p01/t1p05/t1p06`; it is not a self-edge.

## Validation

Automated tests enforce Artifact count, tier direction, cost compatibility,
acyclicity, lower-tier coverage, bounded Tier III forms, no more than two
Project destinations per Tier III, and the Tier III lore word cap.


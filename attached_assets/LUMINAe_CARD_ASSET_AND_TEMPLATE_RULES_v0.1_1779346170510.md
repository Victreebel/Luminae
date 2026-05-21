# LUMINAe_CARD_ASSET_AND_TEMPLATE_RULES_v0.1.md

## Purpose

This document defines production rules for Luminae card artwork and card UI templates.

Its goal is to prevent non-uniform cards caused by mixing artwork with UI elements such as baked-in borders, titles, cost icons, labels, rarity marks, or text.

This document is system-level visual production guidance. It does not change gameplay mechanics, card costs, Eminence values, artifact effects, Luminaries, Blueprints, tutorial beats, or layout rules by itself.

---

# 1. Core Rule

Card artwork and card interface must remain separate.

```text
Artwork = clean scene / object / technology illustration.
Template = all standardized game information and UI.
```

Future card images should never contain baked-in card UI.

---

# 2. What Card Artwork May Contain

Card artwork may contain:

```text
artifact object
technology scene
civilization/species environment
symbolic landscape
energy phenomenon
architectural/biological/mechanical subject
lighting and atmosphere
foreground/background composition
```

Artwork should communicate the card's identity, civilization family, affinity grammar, and artifact family through imagery only.

---

# 3. What Card Artwork Must Not Contain

Card artwork must not contain:

```text
title text
card name
borders
frames
cost icons
affinity icons
Eminence values
tier labels
card type labels
rarity marks
buttons
UI panels
rules text
flavor text
watermarks
fake card layout elements
```

If an image contains any of those elements, it should be treated as a concept image only, not final in-app card art.

---

# 4. What the App/Card Template Owns

The app/card template owns all standardized information and interaction elements:

```text
card border
title
tier
artifact type
cost row
affinity icons
Eminence value
Forge button
Encrypt button
selected state
hover/tap state
discount display
locked/available state
reserve/encrypted state
card detail drawer
```

These should be rendered consistently by the app, not painted into each card image.

---

# 5. Card Image Format Rule

Recommended production target:

```text
clean square or portrait artwork
no border
no text
no UI
safe central composition
readable at small card size
high enough resolution for card-detail zoom
```

Preferred aspect ratio may vary by implementation, but the image should be crop-safe. Important subject matter should remain visible in both compact card view and enlarged detail view.

---

# 6. Prompt Rule for Future Artifact Art

Every future Artifact art prompt should include:

```text
Clean card artwork only. No text, no title, no border, no frame, no UI elements, no cost icons, no labels, no watermark.
```

Recommended prompt structure:

```text
Create clean card artwork for [Artifact Name], a [civilization/species family] technology in the [affinity combination] lane. Show [visual subject]. Style: polished cosmic sci-fantasy, high-detail, atmospheric, readable at small card size. No text, no title, no border, no frame, no UI elements, no cost icons, no labels, no watermark.
```

---

# 7. Artifact Art Direction Fields

Each Artifact should eventually have art metadata:

```text
Artifact Family
Civilization / Species Lane
Affinity Grammar
Primary Visual Subject
Secondary Visual Motifs
Forbidden Motifs
Prompt Seed / Art Brief
```

Example:

```text
Artifact: Root Vault
Artifact Family: Hidden adaptive life / buried archive
Civilization Lane: Verdance + Abyss + Continuum
Primary Visual Subject: subterranean living vault made of roots and dark fungal lattice
Secondary Motifs: memory spores, sealed chambers, faint bioluminescence
Forbidden Motifs: readable text, fantasy treasure chest, UI frame, title banner
```

---

# 8. Uniformity Requirements

All cards in the same game surface should share the same template treatment.

Uniformity must apply to:

```text
border style
title placement
cost placement
button placement
tier display
Eminence display
affinity icon scale
selection glow
discount view
```

Card art can vary wildly in subject and mood, but the surrounding card template must stay consistent.

---

# 9. Existing Non-Uniform Card Art

Existing card images that include baked-in UI, borders, labels, or titles should be categorized as:

```text
Replace
Crop/Salvage
Temporary Placeholder
Concept Only
```

Do not build new UI around inconsistent old images. The template is the source of truth.

---

# 10. Replit Implementation Guardrail

When updating card content in Replit:

```text
Do not bake titles, borders, costs, or UI into generated card images.
Do not redesign the card template unless explicitly requested.
Do not change mechanics while replacing art.
Use the app template for all card metadata and actions.
```

Allowed changes in an art-only patch:

```text
image asset replacement
image crop/fit adjustment
metadata art prompt fields
visual consistency fixes
```

Forbidden changes in an art-only patch:

```text
cost changes
Eminence changes
effect text changes
tier changes
Luminary requirements
Blueprint rules
Forge/Encrypt mechanics
```

---

# 11. Relationship to Other Luminae Sources

This document complements:

```text
LUMINAE_SYSTEM_GRAMMAR_V0.1.md
LUMINAE_SPECIES_AND_CIVILIZATION_GRAMMAR_V0.1.md
LUMINAE_ARTIFACT_FAMILY_MAP_v0.1.md
LUMINAe_ARTIFACT_MASTER_TABLE_v0.3.md
```

It does not replace those documents. It defines how card images and card templates should be separated during production.

---

# 12. Summary

```text
Card art should be clean illustration.
The app template should own all card UI.
No baked-in titles, borders, costs, labels, or buttons.
Future card generation must be template-safe and crop-safe.
Existing non-uniform art should be replaced or treated as placeholder.
```

This rule should be followed before any major Artifact content or art patch.

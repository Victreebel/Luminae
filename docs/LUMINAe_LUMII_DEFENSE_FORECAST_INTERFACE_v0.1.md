# Lumii Defense Forecast Interface v0.1

## Purpose

The Lumii Vault encounter is a boss-level opening ceremony for the Blueprint Vault.
It should feel like one continuous event:

```text
Vault Threshold -> Lumii Interruption -> Defense Forecast Match -> Threshold Return -> Vault Outcome
```

The Defense Forecast is not merely a tab or HUD. It is the state of the match after
Lumii has arrested the Vault threshold and is forecasting whether she can physically
defend the Vault from the Architect without catastrophic cost.

## Player-Facing Premise

The Architect-owned Supreme Cipher is the first safeguard. When it falls, the Vault
does not simply open. Lumii independently intervenes as a firewall.

If the player presses forward, Lumii breaks covenant and runs the real game board as
a defensive forecast. Victory convinces Lumii that physically defending the Vault
would fail or cause unacceptable collateral damage. Defeat convinces her that she can
hold the threshold.

## Interface Surfaces

### 1. Vault Threshold

Role: ritual, mystery, boundary crossing.

Owns:

- Supreme Cipher state
- mechanical Vault doors
- Lumii's white firewall presence
- sentence-by-sentence dialogue
- approach selection through authored dialogue, without visible route labels
- leave/continue decisions

Must communicate:

- the Cipher is Architect authority
- Lumii is not the Cipher and is not simply another lock
- leaving early is still possible
- proceeding turns the encounter into a covenant rupture

Must avoid:

- explaining the full Basilisk logic too plainly
- making Lumii look like she is helping the player
- simulating camera movement after the board appears

### 2. Defense Forecast Match

Role: boss-match wrapper over the real board.

Owns:

- Lumii boss presence
- Defense Forecast identity
- Forecast Pressure
- withdrawal access
- sparse Lumii commentary
- Lumii-specific presentation policy

The normal board remains the playable surface. The Forecast layer should make it feel
as if Lumii has wrapped the match in hostile diagnostic machinery, not as if a second
generic header has been pasted over the game.

### 3. Threshold Return

Role: consequence and resolution.

Owns:

- withdrawal reseal
- defeat response
- victory yield
- firewall release
- final Vault opening
- reward reveal

The player should feel returned to the same physical threshold they forced open, not
sent to a detached results screen.

## Defense Forecast Strip

The Forecast strip should be docked continuously with the normal header or replace
the normal header in the Lumii scenario. It should not float over the board with a
gap unless being used in a temporary preview mode.

Required contents:

- hostile Lumii orb / constellation presence
- `DEFENSE FORECAST`
- `Lumii`
- `Forecast Pressure` meter
- `Withdraw to Vault`
- settings menu access

Optional contents:

- compact covenant state chip, such as `COVENANT BROKEN`
- compact contested-state chip, such as `CONTESTED`
- one active commentary line, when not suppressed

Forbidden contents:

- unlabeled numeric pairs such as `0 / 0`
- generic win/loss counters
- duplicated normal board statistics
- visible route labels such as `Kinship`, `Inquiry`, or `Dominion`

## Forecast Pressure

Forecast Pressure is a boss-state mood meter, not a literal score.

It may derive from:

- either side nearing the victory requirement
- large lead changes
- public anonymous Protocol manifestations
- Luminary summons
- Tier III or 3+ Eminence forges
- the 17/20 and 19/20 thresholds (or the equivalent target-relative values in configured custom games)

It should support readable emotional states:

- stable
- rising
- critical
- terminal

The UI may express these through meter fill, palette, pulse rate, and Lumii
commentary. It should not require a numeric readout.

## Lumii Commentary

Commentary should feel like Lumii interrupting the forecast, not a chat feed.

Rules:

- one message visible at a time
- show for roughly 4.5 to 6.5 seconds
- enforce a global cooldown
- retain at most one pending line
- suppress during cinematics, turn-order presentation, modal actions, and game-over
- prioritize near-victory and outcome over Protocol, Luminary, lead, and Forge remarks
- route-flavor the text internally, but never label the route to the player

Tone:

- concise
- ominous
- diagnostic
- reluctant only on relationship-shaped paths
- never tutorial-like

## Presentation Policy

During `blueprint_clearance_lumii`, presentation is boss-locked.

Locked:

- skip cinematics
- swift Luminary/effect pacing for essential boss presentations

Still player-controlled:

- mute
- reduced motion
- rules
- refresh
- withdraw

Reduced motion means steady and complete, not skipped.

Preserve:

- cause and effect
- Blueprint/Protocol teaching-by-example
- Lumii sentence-by-sentence speech
- outcome clarity

Reduce:

- shaking
- spinning
- parallax
- zoom distance
- full-screen flash
- long travel arcs

## Anonymous Protocol Presentation

Before victory, the player should see anonymous Protocol events rather than true
Blueprint identities.

Public labels:

- `SEALED PROTOCOL // 01`
- `SEALED PROTOCOL // 02`
- `SEALED PROTOCOL // 03`

Allowed public information:

- exact gameplay consequence after manifestation
- operational state of the anonymous device
- public effect resolution

Forbidden public leaks:

- Blueprint name
- Blueprint art
- silhouette
- recipe
- private target
- reward identity
- sound or cinematic naming that reveals the Blueprint

## Outcome Interfaces

### Withdrawal

Meaning: the player backs away after rupture or before resolution.

Lumii line:

```text
Then let the threshold stand.
```

Result:

- return to Vault threshold
- no win
- no loss
- no game rollup
- covenant remains broken if already broken
- clearance can remain available according to current rules

### Defeat

Meaning: Lumii believes the Vault can be defended.

Lumii line:

```text
Now I know. I can stop you.
```

Result:

- normal loss handling where applicable
- Lumii-specific controls: `Return to Vault`, `Challenge Again`
- no generic rematch presentation

### Victory

Meaning: Lumii yields because defense would fail or destroy what she protects.

Lumii line:

```text
I have seen enough.
```

Then:

```text
I will release the doors.
```

Result:

- return to the same threshold
- Lumii withdraws firewall
- doors open mechanically
- global redaction lifts
- Antimatter is revealed
- remaining records can stay corrupted/unnamed

## Preview Requirements

The `/dev/lumii-vault-encounter` route is the canonical review bench.

It should preview:

- sealed Vault
- Cipher surge
- Cipher inert
- partial opening
- Lumii firewall
- every dialogue path
- hostile transition
- briefing
- board entry
- docked Forecast strip
- commentary
- anonymous Protocol manifestation/effect
- withdrawal
- defeat
- victory
- full opening
- reward reveal
- desktop and mobile
- audio on/off
- reduced motion/full motion

The preview should favor smooth manual testing over exhaustive controls. If a control
does not help review the player-facing experience, it should be secondary.

## Current Implementation Alignment

Already present:

- `LumiiVaultEncounter` threshold component
- sentence-by-sentence Lumii presentation
- threshold approach and dialogue state
- dedicated `/dev/lumii-vault-encounter` preview route
- `LumiiEncounterHud`
- Lumii-only presentation locks in the game settings menu
- `Forecast Pressure` label replacing the confusing `0 / 0`
- docked Forecast HUD mode

Needs polish:

- Forecast strip should look continuous with or intentionally replace the normal header
- hostile Lumii styling must remain visibly premium in the docked form
- normal and boss header responsibilities need clearer separation
- preview should show the final intended in-match composition, not just a floating HUD
- outcome return should feel physically connected to the original Vault threshold

## Next Implementation Order

1. Make the in-game docked Forecast strip visually continuous with the header.
2. Restore/preserve the earlier premium Lumii hostile presence inside that strip.
3. Keep only boss-specific information in the Forecast strip.
4. Make the preview route demonstrate the docked in-game composition.
5. Verify mobile and desktop clipping, overlap, and board visibility.
6. Tune audio and reduced-motion variants after the layout is stable.

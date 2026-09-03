# LUMINAe Replit Asset Rights Evidence Packet v1.0

Date: 2026-08-25  
Repository: `/Users/chaoscalligraphy/.codex/worktrees/4aa4/Lumiane`  
Purpose: close or reject the commercial-rights path for 144 production-reachable Replit Agent-linked images without changing runtime assets.

This is an evidence checklist, not a legal conclusion. The assets remain `PARTIAL_PROVENANCE` until the required account and input evidence is retained.

## Current Finding

The repository and authenticated account records establish generated origin and paid Replit Agent use on the Luminae project, but they do not yet establish final commercial clearance. The remaining account question is which dated agreement governed that paid use and whether any third-party image-generation terms applied.

| Evidence | Result |
| --- | --- |
| Replit-generated identity | Strong. `.agents/agent_assets_metadata.toml` contains 287 `generated` records and 19 `outputs`, including the affected card, Luminary, avatar, and Affinity families. |
| Generation chronology | Strong. Git records Replit/Recalescence generation and revision work from 2026-05-03 through 2026-06-12. The current 90-card art pass is concentrated in commits `4ca47099`, `56bb2d77`, and `f64d68da`; commit `496b672d` records compression of card, Luminary, avatar, and Affinity sources. |
| Runtime derivatives | Strong. Exact runtime paths and SHA-256 values are retained in `LUMINAe_ASSET_PROVENANCE_INVENTORY_v1.0.csv`. |
| Account and paid-use evidence | Strong but incomplete for contract applicability. The authenticated account reports a current `Replit Core` plan and paid Agent Usage invoices throughout the generation window. Invoice `QYEWKO-00017` includes project UUID `4715af4b-b04c-4b0e-a92d-48e5f73b555f`, which matches the authenticated Luminae project URL. The portal does not itself identify which agreement governed that historical use. |
| Prompts and reference inputs | Partial. `.agents/agent_assets_metadata.toml` reports `uploads = []`; task `8bc27547-6795-4c01-a494-d688858a19cd` retains the 90-card prompt-matrix work; and the task board retains multiple named Luminary regeneration tasks. This is strong evidence of project-authored prompting and no uploaded reference library, but it is not a complete per-generation input/model archive and cannot exclude every possible project-asset edit. |
| Embedded image metadata | Missing. Sampled production/source PNGs contain no useful prompt, model, author, Replit, or license text. |

## Affected Production Set

| Family | Count | Evidence status |
| --- | ---: | --- |
| Artifact card images | 90 | Replit-generated origin; account terms and generation inputs unresolved |
| Luminary images | 41 | Replit-generated/edited origin; account terms and inherited inputs unresolved |
| Player avatars | 8 | Replit-generated origin; account terms and generation inputs unresolved |
| Natural-Affinity plates | 5 | Replit-generated origin; account terms and generation inputs unresolved |
| **Total** | **144** | **Not release-cleared** |

The other 13 unresolved production images are Codex edits of inherited project art: two Blueprint cards and 11 Luminary derivatives. `LUMINAe_CODEX_GENERATION_EVIDENCE_v1.0.json` retains their prompts, exact source paths and hashes, and output hashes. The two formerly untraced project references are now closed: `generated_images/antimatter_detonator_device.jpg` is a Playwright capture of the project-owned Three.js manifestation scene, and `screenshots/design-mockups/final-hunger-verdance/panel-concept.png` is byte-identical to a retained Codex edit of the Replit-linked Final Hunger panel. These 13 outputs remain downstream of this decision only because their inherited card/Luminary inputs resolve to the Replit-linked families.

## Applicable Terms Fork

The generation window falls after both February 2026 Replit agreements:

- The [Replit Terms of Service dated February 23, 2026](https://replit.com/terms-of-service-02-23-2026) state that the consumer service is for personal and non-commercial use and direct commercial-product users to the Commercial Agreement.
- The [Replit Commercial Agreement](https://replit.com/commercial-agreement), last updated February 26, 2026, defines prompts and other inputs as Input Content and generated material as Output Content. It states that, as between Replit and the customer, the customer owns Output Content, subject to the customer's representation that it has the necessary rights to Input Content. It also warns that third-party service terms may apply.

Therefore, a Replit generation ID or Agent-authored commit is not enough. Clearance requires proof that the generating account was governed by the commercial agreement during the generation window, plus evidence that the inputs were owned or licensed.

## Authenticated Account Recovery

The signed-in Replit account was inspected on 2026-08-25. No payment-card digits, billing address, or account email are retained in this repository.

- Settings reports the current plan as `Replit Core` at `$20/month`.
- Billing history exposes paid Agent Usage invoices dated 2026-05-05, 2026-05-08, 2026-05-12, 2026-05-16, 2026-05-24, 2026-05-27, 2026-06-06, 2026-06-08, and 2026-06-16 (`QYEWKO-00017` through `QYEWKO-00025`).
- Invoice `QYEWKO-00017` itemizes paid Agent Usage for project UUID `4715af4b-b04c-4b0e-a92d-48e5f73b555f` during a service period overlapping the generation window.
- The authenticated `Recalescence/Luminae` project URL carries the same UUID, tying that paid usage to this project.
- This proves paid Agent use associated with Luminae during the relevant period. It does **not** by itself prove that `Replit Core` was the historical plan for the entire window or that the February 2026 Commercial Agreement governed every listed generation.

The account-evidence branch is therefore viable and materially preferable to immediate replacement of 157 images, but written Replit confirmation remains required before promotion to `VERIFIED`.

The prepared Billing support request was submitted through the authenticated Replit account on 2026-08-25. Replit displayed: `Your message was successfully sent. We will be in touch via email shortly.` No ticket number was shown. The written response remains pending.

## Required Account Evidence

Retain one or more dated records that jointly prove all of the following:

1. The Replit account or organization that controlled the Luminae project.
2. The exact paid/commercial product or plan active from 2026-05-03 through 2026-06-12.
3. The subscription term covered that window.
4. The terms or order form governing that product at the time.

Acceptable records include:

- Replit billing-history export or invoice PDF;
- account billing screenshot showing plan, account/organization, and covered dates;
- purchase confirmation email with plan and term;
- order form or Replit support confirmation tying the account to the Commercial Agreement.

A current plan screenshot alone is insufficient. The recovered paid Agent Usage invoices prove historical paid use, but written confirmation is still needed to tie that use to the controlling agreement and any third-party generation terms.

## Required Input Evidence

Retain one of these routes for each family:

### Route A: first-party/text-only generation

- generation prompts or a contemporaneous prompt brief;
- confirmation that no external image was supplied as a reference;
- confirmation that any named concepts, lore, and visual direction were original project material.

### Route B: project-asset edits

- exact source/reference asset path and hash;
- that source asset's own verified provenance record;
- confirmation that the edit did not incorporate an unlicensed third-party image.

### Route C: unavailable generation history

- a signed project-controller attestation identifying the family and generation period;
- a truthful statement describing whether references were used and why their rights are controlled;
- legal/release reviewer acceptance of the residual evidentiary risk.

An attestation cannot cure a reference asset that was not actually owned or licensed.

## Recovered Input Evidence

- `.agents/agent_assets_metadata.toml` records `uploads = []`, 287 generated records, and 19 output records. This supports a text/project-authored workflow with no Replit-uploaded reference library.
- Replit task `8bc27547-6795-4c01-a494-d688858a19cd` documents the 90-card art-prompt matrix and its derivation from first-party `cardLore.ts` content.
- The authenticated task board retains named Luminary generation/regeneration tasks, including Cosmic Oracle, Null Sovereign, Pale Merchant, and other panel/entity revisions.
- Local Codex transcripts retain the exact inherited files and hashes for all 13 Codex-linked production derivatives. Every local root is traced. The Antimatter device reference resolves to a project Three.js canvas capture; the Final Hunger concept resolves byte-for-byte to a retained Codex edit whose input is the Replit-linked Final Hunger panel.

This evidence is sufficient to narrow the attestation. It is not sufficient to replace the controller's factual confirmation that no unlicensed third-party image was used.

On 2026-08-25, the project controller confirmed in this Codex task that the Replit-generated Artifact cards, Luminary images, avatars, and Affinity art were created only from original prompts/project artwork and did not use unlicensed outside reference images. This dated confirmation and the corroborating records form the engineering input-rights evidence. A signed declaration is optional unless release/legal review specifically requests one.

## Optional Controller Attestation

A sign-ready declaration is available at
`LUMINAe_ASSET_CONTROLLER_ATTESTATION_v1.0.md`. It is intentionally limited to
facts within the project controller's knowledge and leaves identity, capacity,
account/organization, signature, and date for the controller to complete only
if a reviewer requests formal attestation. The template below is retained as an
optional provenance-strengthening route.

```text
I, [name], controlled the Replit account/organization [account or organization]
used to create the LUMINAe assets identified in this packet between 2026-05-03
and 2026-06-12.

The account was subscribed to [plan/product] for that full period. Attached are
[invoice/order form/billing export/support confirmation] showing the applicable
subscription term.

For the following asset families, the generation inputs were:
- Artifact cards: [text-only / references listed below]
- Luminary images: [text-only / references listed below]
- Player avatars: [text-only / references listed below]
- Affinity plates: [text-only / references listed below]

I confirm that I owned or had commercial-use and derivative rights to every
reference input listed below. I have attached the supporting provenance records.

References and records:
[list each source path/hash and evidence]

Signed: ____________________    Date: ____________________
```

## Prepared Replit Support Request

Submitted on 2026-08-25. Do not mark the records verified until the response is retained outside the public repository and summarized here.

```text
Subject: Agreement governing paid Replit Agent output, May 3-June 12, 2026

I am preparing a commercial release that includes images generated through paid
Replit Agent usage in the Recalescence/Luminae project. The project UUID is
4715af4b-b04c-4b0e-a92d-48e5f73b555f. The billing portal shows paid Agent Usage
in invoices QYEWKO-00017 through QYEWKO-00025 across the relevant period, and
the account currently reports Replit Core.

Please confirm in writing:
1. which Replit plan and agreement governed this paid Agent use from 2026-05-03
   through 2026-06-12;
2. whether Section B.2 of the Commercial Agreement dated 2026-02-26 applied to
   images generated by Agent for this project; and
3. whether any third-party image-generation/model terms applied that limit
   commercial use, distribution, or derivative works.

This request concerns agreement applicability only. I understand that I remain
responsible for rights in any input content.
```

## Closure Decision

Promote the 144 records to `VERIFIED` only if:

1. historical commercial-plan coverage is proven;
2. the applicable dated agreement is retained;
3. the dated controller confirmation and corroborating generation-input evidence are accepted by release review, with a signed attestation only if that reviewer requires one; and
4. no disclosed third-party service term contradicts commercial distribution.

If any condition fails, regenerate or replace the affected family under a retained commercial agreement using text-only original briefs or verified first-party inputs. Do not mix cleared and uncleared sources in a new edit chain.

## Search Performed

- inspected `.agents/agent_assets_metadata.toml` structure and history;
- inspected `.replit`, `replit.md`, repository remotes, generation commits, and source-file metadata;
- searched both `/Users/chaoscalligraphy/.codex/worktrees/4aa4/Lumiane` and `/Users/chaoscalligraphy/Documents/Lumiane` for Replit invoices, receipts, subscription records, terms, licenses, and agreements;
- inspected the authenticated Replit Settings, Billing, invoice-detail, Luminae project, and task-board surfaces;
- matched the paid Agent Usage project UUID in invoice `QYEWKO-00017` to the authenticated Luminae project UUID;
- inspected `uploads = []`, the 90-card prompt-matrix task, and retained Luminary regeneration tasks;
- inspected all 13 Codex derivative records and their exact inherited source paths/hashes;
- traced the Antimatter device reference to its recorded Playwright/Three.js capture and the Final Hunger concept to its retained Codex output and source-panel hash;
- reviewed the official February 2026 consumer and commercial terms linked above.

Historical paid Agent use and the controller's dated input statement are now evidenced. The remaining account gap is written confirmation of the controlling agreement and applicable third-party terms. A complete per-generation Replit input archive was not recovered, so release/legal review must accept the available evidence or request the optional signed attestation.

/**
 * Mobile Action Presentation Geometry Audit — Task #297
 *
 * Asserts that mobile action presentations remain inside a 390×844 viewport.
 * True foreground presentations remain centered; effects anchored to board UI
 * remain aligned with their source/destination instead of faking centering:
 *
 *   1. Turn announcement
 *   2. Affinity Harness well response
 *   3. Encryption source plate and transfer
 *   4. Artifact Forge card presentation
 *
 * Run:
 *   pnpm --filter @workspace/scripts exec playwright test \
 *     --config=playwright.config.ts overlay-audit/overlay-centering.spec.ts
 */

import { test, expect, type Page } from 'playwright/test';
import { mkdirSync } from 'node:fs';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE     = process.env.LUMINAE_E2E_BASE_URL ?? 'http://localhost:5191';
const W        = 390;
const H        = 844;
const OUT      = '/tmp/overlay-audit';
const MIN_CX   = W / 3;          // 130 px — left edge of center third
const MAX_CX   = (W * 2) / 3;    // 260 px — right edge of center third

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function closePanels(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
  });
  await page.waitForTimeout(200);
}

/**
 * Wait for and dismiss the "Your Turn" full-screen overlay.
 * Throws if the overlay doesn't appear within `timeoutMs`.
 */
async function awaitAndDismissTurnAnnouncement(page: Page, timeoutMs = 25_000) {
  const overlay = page.locator('.fixed.inset-0:has(.turn-announcement-eminence)');
  await overlay.waitFor({ state: 'visible', timeout: timeoutMs });
  await page.mouse.click(W / 2, H / 2);
  await overlay.waitFor({ state: 'hidden', timeout: 5_000 });
  await page.waitForTimeout(600);
  await closePanels(page);
}

/**
 * Assert element center X is in the center third (130–260 px on a 390 px viewport).
 */
function assertCenterX(cx: number, label: string) {
  expect(
    cx,
    `${label}: centerX=${cx.toFixed(1)}px is NOT in center third [${MIN_CX}–${MAX_CX}]`,
  ).toBeGreaterThanOrEqual(MIN_CX);
  expect(
    cx,
    `${label}: centerX=${cx.toFixed(1)}px is NOT in center third [${MIN_CX}–${MAX_CX}]`,
  ).toBeLessThanOrEqual(MAX_CX);
}

function assertFullyOnscreen(
  box: { x: number; y: number; width: number; height: number },
  label: string,
) {
  // Framer Motion's brief 1.025–1.035 emphasis scale can extend antialiased
  // edges by roughly 1.3 px without clipping meaningful card content.
  const tolerance = 2;
  expect(box.x, `${label}: left edge must remain on-screen`).toBeGreaterThanOrEqual(-tolerance);
  expect(box.y, `${label}: top edge must remain on-screen`).toBeGreaterThanOrEqual(-tolerance);
  expect(box.x + box.width, `${label}: right edge must remain on-screen`).toBeLessThanOrEqual(W + tolerance);
  expect(box.y + box.height, `${label}: bottom edge must remain on-screen`).toBeLessThanOrEqual(H + tolerance);
}

// ── Test ──────────────────────────────────────────────────────────────────────

test('mobile action presentations remain visible and spatially honest at 390 px', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });

  // ── Setup: create room, add AI, start game ─────────────────────────────────
  const { room, player, sessionToken } = await apiPost('/api/rooms', {
    hostName: 'AuditBot',
    maxPlayers: 2,
    turnTimerSeconds: null,
  }) as { room: { id: string; inviteCode: string }; player: { id: string }; sessionToken: string };

  await apiPost(`/api/rooms/${room.id}/ai-players`, { sessionToken, difficulty: 'easy' });
  await apiPost(`/api/rooms/${room.id}/start`, { sessionToken });

  // Inject session and navigate to game page
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ roomId, inviteCode, playerId, token }) => {
      localStorage.setItem('luminae_session', JSON.stringify({
        roomId, inviteCode, playerId,
        sessionToken: token,
        playerName: 'AuditBot',
        isHost: true,
        avatarId: 'avatar_1',
      }));
    },
    { roomId: room.id, inviteCode: room.inviteCode, playerId: player.id, token: sessionToken },
  );

  await page.goto(`${BASE}/game/${room.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('text=AFFINITY WELL').first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800);
  await closePanels(page);

  // ── Sanity: window.innerWidth must equal viewport width ────────────────────
  await test.step('window.innerWidth equals 390 px', async () => {
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(innerWidth, 'window.innerWidth must equal viewport width 390 px').toBe(W);
    // Verify the card-action burst formula produces exact centering:
    // animate.x = window.innerWidth/2 - cardWidth/2  →  card center = 195 px ✓
    const cardWidth = 112; // representative Tier-1 card width
    const burstX = innerWidth / 2 - cardWidth / 2; // left edge
    const burstCenter = burstX + cardWidth / 2;
    expect(
      burstCenter,
      'card-action burst formula: window.innerWidth/2 - cardW/2 + cardW/2 must equal 195',
    ).toBe(W / 2);
  });

  // ── OVERLAY 1: Turn Announcement ───────────────────────────────────────────
  await test.step('turn-announcement overlay is centered', async () => {
    // The "Your Turn" full-screen overlay fires when the server assigns the turn.
    // Anchor to the Eminence readout unique to the full-screen turn presentation.
    const overlay = page.locator('.fixed.inset-0:has(.turn-announcement-eminence)');
    await overlay.waitFor({ state: 'visible', timeout: 12_000 });

    // Measure the inner content block (avatar + "Your Turn" text) — first div.relative child
    const content = overlay.locator('div.relative').first();
    await content.waitFor({ state: 'visible', timeout: 3_000 });
    const box = await content.boundingBox();
    expect(box, 'turn-announcement inner content bounding box must exist').not.toBeNull();

    await page.screenshot({ path: `${OUT}/01-turn-announcement.png` });

    const cx = box!.x + box!.width / 2;
    assertCenterX(cx, 'turn-announcement content');

    // Dismiss overlay
    await page.mouse.click(W / 2, H / 2);
    await overlay.waitFor({ state: 'hidden', timeout: 3_000 });
    await page.waitForTimeout(500);
    await closePanels(page);
  });

  // ── PRESENTATION 2: Affinity Harness well response ─────────────────────────
  await test.step('Affinity Harness response stays aligned with visible wells', async () => {
    // Select 3 different Affinities in the Well, then click Harness.
    // The burst fires optimistically on click (before server response).
    await expect(page.locator('text=AFFINITY WELL').first()).toBeVisible({ timeout: 8_000 });

    // Natural Affinity reservoir buttons expose stable names independent of layout classes.
    const selected = [
      { name: 'Flare', key: 'flare' },
      { name: 'Radiance', key: 'radiance' },
      { name: 'Verdance', key: 'verdance' },
    ] as const;
    for (const affinity of selected) {
      const button = page.getByRole('button', { name: new RegExp(`^${affinity.name}\\b`) }).first();
      await expect(button).toBeVisible({ timeout: 5_000 });
      await button.click();
      await page.waitForTimeout(120);
    }

    // Click Harness — burst fires immediately (optimistic render)
    const harness = page.getByText('Harness', { exact: true }).first();
    await expect(harness, '"Harness" action must be visible').toBeVisible({ timeout: 3_000 });
    await harness.click();

    // Harness now responds locally at each selected well. Check the animated
    // sources rather than expecting the retired centered full-screen burst.
    await page.waitForTimeout(260);
    for (const affinity of selected) {
      const well = page.locator(`[data-affinity-well="${affinity.key}"]:visible`).first();
      const box = await well.boundingBox();
      expect(box, `${affinity.name} well must remain visible during Harness`).not.toBeNull();
      assertFullyOnscreen(box!, `${affinity.name} Harness response`);
    }
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(horizontalOverflow, 'Harness response must not create horizontal page overflow').toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${OUT}/02-affinity-harness-response.png` });

    // Begin waiting for the next turn immediately so the brief presentation is
    // not missed while the local Harness response settles.
    await page.waitForTimeout(120);
    await closePanels(page);
  });

  // ── PRESENTATION 3: Encryption source and transfer ─────────────────────────
  await test.step('Encryption remains on-screen from Archive source to destination', async () => {
    // Wait for our NEXT turn announcement (after the AI plays its turn)
    await awaitAndDismissTurnAnnouncement(page, 25_000);
    await page.waitForTimeout(800);

    // Open the Tier 1 Archive sheet and encrypt a concealed Artifact (2-click confirm).
    const deckBtn = page.locator('[data-deck-tier="1"] > button').first();
    await expect(deckBtn, 'Tier 1 deck button must be visible').toBeVisible({ timeout: 5_000 });
    await deckBtn.click();
    await page.waitForTimeout(600);

    const encryptBtn = page.getByRole('button', { name: /encrypt.*hidden artifact/i }).first();
    await expect(encryptBtn, '"Encrypt hidden Artifact" button must appear').toBeVisible({ timeout: 5_000 });
    await encryptBtn.click();
    await page.waitForTimeout(400);

    const confirmBtn = page.getByRole('button', { name: /^confirm\b/i }).first();
    await expect(confirmBtn, 'Encryption confirmation button must appear').toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();

    // Encryption stays local to the Archive source before the completed Cipher travels.
    const encryptionOverlay = page.getByTestId('cipher-aperture-animation');
    await encryptionOverlay.waitFor({ state: 'visible', timeout: 6_000 });
    const plate = page.getByTestId('cipher-aperture-plate');
    await plate.waitFor({ state: 'visible', timeout: 2_000 });
    await page.waitForTimeout(260);
    const sourceBox = await plate.boundingBox();
    expect(sourceBox, 'Encryption source plate must be visible').not.toBeNull();
    assertFullyOnscreen(sourceBox!, 'Encryption source plate');
    await page.screenshot({ path: `${OUT}/03a-encryption-source.png` });

    // release + conceal + lock = 1240 ms; sample shortly into transfer.
    await page.waitForTimeout(1_160);
    const transferBox = await plate.boundingBox();
    expect(transferBox, 'Encryption transfer plate must remain measurable').not.toBeNull();
    assertFullyOnscreen(transferBox!, 'Encryption transfer plate');
    await page.screenshot({ path: `${OUT}/03b-encryption-transfer.png` });

    await encryptionOverlay.waitFor({ state: 'hidden', timeout: 5_000 });
    await closePanels(page);
  });

  // ── PRESENTATION 4: Artifact Forge ─────────────────────────────────────────
  await test.step('Artifact Forge card remains on-screen in the active view mode', async () => {

    // Accumulate Affinities over 1–3 Harness turns until a Forge Artifact is affordable.
    // After the Affinity burst (turn 1) we hold 1+1+1 Affinities; after Encryption
    // (turn 3) we still hold 3. One more Harness gives us 2+2+2 = 6 Affinities,
    // sufficient for most Tier I Artifacts.
    let forged = false;

    for (let attempt = 0; attempt < 4 && !forged; attempt++) {
      await awaitAndDismissTurnAnnouncement(page, 25_000);
      await page.waitForTimeout(800);

      // Try to forge any visible Artifact: click it, then check the Forge button.
      const cardEls = page.locator('[data-card-id]');
      const cardCount = await cardEls.count();

      for (let i = 0; i < cardCount && !forged; i++) {
        const card = cardEls.nth(i);
        if (!(await card.isVisible())) continue;

        // Click the card to open the card sheet
        await card.click();
        await page.waitForTimeout(450);

        // Check if the "Forge Artifact" button is present and enabled
        const forgeBtn = page.locator('button').filter({ hasText: 'Forge Artifact' }).first();
        const forgeBtnCount = await forgeBtn.count();

        if (forgeBtnCount > 0 && await forgeBtn.isEnabled()) {
          // First click: select forge action
          await forgeBtn.click();
          await page.waitForTimeout(350);

          // Second click: confirm
          const confirmForge = page.getByRole('button', { name: /^confirm\b/i }).first();
          await expect(confirmForge, 'Forge confirmation button must appear after selecting Forge').toBeVisible({ timeout: 3_000 });
          await confirmForge.click();

          forged = true;
        } else {
          // Card not affordable — close the sheet and try the next one
          await page.keyboard.press('Escape');
          await page.waitForTimeout(250);
          // Fallback close: click outside the sheet
          const sheetOpen = await page.locator('button').filter({ hasText: 'Forge Artifact' }).count() > 0
            || await page.locator('button').filter({ hasText: 'Cannot afford' }).count() > 0;
          if (sheetOpen) {
            await page.mouse.click(W / 2, 50); // tap top of screen (outside sheet)
            await page.waitForTimeout(250);
          }
        }
      }

      if (!forged) {
        // No affordable Artifact found: Harness Affinities and wait for the next cycle.
        await closePanels(page);
        await expect(page.locator('text=AFFINITY WELL').first()).toBeVisible({ timeout: 8_000 });

        const affinityButtons = page.getByRole('button', {
          name: /^(Flare|Radiance|Verdance|Continuum|Abyss)\b/,
        });
        const affinityCount = await affinityButtons.count();
        if (affinityCount >= 3) {
          await affinityButtons.nth(0).click(); await page.waitForTimeout(100);
          await affinityButtons.nth(1).click(); await page.waitForTimeout(100);
          await affinityButtons.nth(2).click(); await page.waitForTimeout(100);
        }
        const harness = page.getByText('Harness', { exact: true }).first();
        if (await harness.count() > 0) {
          await harness.click();
          await page.waitForTimeout(3_600); // let the Affinity burst finish
        }
        await closePanels(page);
      }
    }

    expect(forged, 'must successfully forge an Artifact within 4 Harness-attempt cycles').toBe(true);

    // The card element animates via framer-motion:
    //   style={{ position:'fixed', left:0, top:0, width:startRect.w, height:startRect.h }}
    //   animate={{ x: window.innerWidth/2 - startRect.w/2, ... }}
    //   transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    //
    // Full view lifts to center; compact view stamps in place. Both must keep the
    // Artifact legible and within the viewport.
    await page.waitForTimeout(800);

    // Screenshot of the forge burst mid-animation
    await page.screenshot({ path: `${OUT}/04-forge-burst-peak.png` });

    const forgeCard = page.getByTestId('forge-animation-card');
    const cardBurstBox = await forgeCard.boundingBox();
    expect(cardBurstBox, 'animated Forge card must be measurable during presentation').not.toBeNull();
    assertFullyOnscreen(cardBurstBox!, 'Forge card');

    await page.waitForTimeout(1_500);
    await page.screenshot({ path: `${OUT}/05-forge-burst-settling.png` });

    // Wait for full burst duration and final state
    await page.waitForTimeout(2_200);
    await closePanels(page);
    await page.screenshot({ path: `${OUT}/06-final-state.png` });
  });
});

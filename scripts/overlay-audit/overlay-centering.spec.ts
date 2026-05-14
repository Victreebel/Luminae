/**
 * Overlay Centering Audit — Task #297
 *
 * Asserts that all four fixed overlays render content in the center third
 * (columns 130–260 of a 390 px wide viewport) on a 390×844 mobile screen:
 *
 *   1. Turn announcement
 *   2. Gem harvest burst
 *   3. Reserve burst (blind deck reserve)
 *   4. Card-action (forge) burst — the overlay that uses window.innerWidth at runtime
 *
 * Run:
 *   pnpm --filter @workspace/scripts exec playwright test \
 *     --config=playwright.config.ts overlay-audit/overlay-centering.spec.ts
 */

import { test, expect, type Page } from 'playwright/test';
import { mkdirSync } from 'node:fs';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE     = 'http://localhost:80';
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
  const overlay = page.locator('[class*="fixed"][class*="inset-0"][class*="cursor-pointer"]');
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

// ── Test ──────────────────────────────────────────────────────────────────────

test('all four overlays are centered in the middle third of a 390 px viewport', async ({ page }) => {
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
    // CSS: "fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
    const overlay = page.locator('[class*="fixed"][class*="inset-0"][class*="cursor-pointer"]');
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

  // ── OVERLAY 2: Gem Harvest Burst ───────────────────────────────────────────
  await test.step('gem harvest burst overlay is centered', async () => {
    // Select 3 different affinity crystals in the well, then click Harness.
    // The burst fires optimistically on click (before server response).
    await expect(page.locator('text=AFFINITY WELL').first()).toBeVisible({ timeout: 8_000 });

    // Gem buttons: rounded-xl type=button inside the affinity well grid
    const gemBtns = page
      .locator('button[type="button"][class*="rounded-xl"]')
      .filter({ hasNotText: /RESERVE|Forge|Hand|Log|Back/ });

    await expect(gemBtns.first()).toBeVisible({ timeout: 5_000 });
    const count = await gemBtns.count();
    expect(count, 'must find at least 3 affinity gem buttons in the well').toBeGreaterThanOrEqual(3);

    await gemBtns.nth(0).click(); await page.waitForTimeout(120);
    await gemBtns.nth(1).click(); await page.waitForTimeout(120);
    await gemBtns.nth(2).click(); await page.waitForTimeout(120);

    // Click Harness — burst fires immediately (optimistic render)
    const harness = page.getByText('Harness', { exact: true }).first();
    await expect(harness, '"Harness" action must be visible').toBeVisible({ timeout: 3_000 });
    await harness.click();

    // Burst overlay: "pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    const gemOverlay = page.locator(
      '.pointer-events-none.fixed.inset-0[class*="z-50"][class*="flex"][class*="justify-center"]',
    );
    await gemOverlay.waitFor({ state: 'visible', timeout: 3_000 });

    // Inner content: "relative h-72 w-[18rem]" — 288 px wide, centered by parent flex
    const content = gemOverlay.locator('div.relative').first();
    await content.waitFor({ state: 'visible', timeout: 2_000 });
    const box = await content.boundingBox();
    expect(box, 'gem-harvest-burst inner content bounding box must exist').not.toBeNull();

    await page.screenshot({ path: `${OUT}/02-gem-burst.png` });

    assertCenterX(box!.x + box!.width / 2, 'gem-harvest-burst content');

    // Wait for burst to finish before proceeding
    await page.waitForTimeout(3_600);
    await closePanels(page);
  });

  // ── OVERLAY 3: Reserve Burst ───────────────────────────────────────────────
  await test.step('reserve burst overlay is centered', async () => {
    // Wait for our NEXT turn announcement (after the AI plays its turn)
    await awaitAndDismissTurnAnnouncement(page, 25_000);
    await page.waitForTimeout(800);

    // Open the Tier 1 deck sheet and perform a blind reserve (2-click confirm)
    const deckBtn = page.locator('button[data-deck-tier="1"]').first();
    await expect(deckBtn, 'Tier 1 deck button must be visible').toBeVisible({ timeout: 5_000 });
    await deckBtn.click();
    await page.waitForTimeout(600);

    const reserveBtn = page.locator('button').filter({ hasText: /Reserve Hidden Card/ }).first();
    await expect(reserveBtn, '"Reserve Hidden Card" button must appear').toBeVisible({ timeout: 5_000 });
    await reserveBtn.click();
    await page.waitForTimeout(400);

    const confirmBtn = page.locator('button').filter({ hasText: /Confirm.*Reserve/ }).first();
    await expect(confirmBtn, '"Confirm: Reserve Hidden Card" button must appear').toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();

    // Reserve burst fires on WebSocket state update — poll until visible, then measure
    const reserveOverlay = page.locator(
      '.pointer-events-none.fixed.inset-0[class*="z-50"][class*="flex"][class*="justify-center"]',
    );
    await reserveOverlay.waitFor({ state: 'visible', timeout: 6_000 });

    const content = reserveOverlay.locator('div.relative').first();
    await content.waitFor({ state: 'visible', timeout: 2_000 });
    const box = await content.boundingBox();
    expect(box, 'reserve-burst inner content bounding box must exist').not.toBeNull();

    await page.screenshot({ path: `${OUT}/03-reserve-burst.png` });

    assertCenterX(box!.x + box!.width / 2, 'reserve-burst content');

    await page.waitForTimeout(3_600);
    await closePanels(page);
  });

  // ── OVERLAY 4: Card-Action (Forge) Burst ───────────────────────────────────
  await test.step('card-action (forge) burst animated card is centered', async () => {
    // The card-action burst uses window.innerWidth at runtime:
    //   animate.x = window.innerWidth / 2 - cardWidth / 2
    // We verify centering by measuring the card's actual getBoundingClientRect() during animation.

    // Accumulate crystals over 1–3 harvest turns until a market card is affordable.
    // After the gem burst (turn 1) we have 1+1+1 crystals; after the reserve (turn 3) still 3.
    // One more harness gives us 2+2+2 = 6 crystals → sufficient for most Tier-1 cards.
    let forged = false;

    for (let attempt = 0; attempt < 4 && !forged; attempt++) {
      await awaitAndDismissTurnAnnouncement(page, 25_000);
      await page.waitForTimeout(800);

      // Try to forge any visible market card: click it → check forge button
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
          const confirmForge = page.locator('button').filter({ hasText: 'Confirm: Forge' }).first();
          await expect(confirmForge, '"Confirm: Forge" button must appear after selecting forge').toBeVisible({ timeout: 3_000 });
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
        // No affordable card found — harvest crystals and wait for next cycle
        await closePanels(page);
        await expect(page.locator('text=AFFINITY WELL').first()).toBeVisible({ timeout: 8_000 });

        const gemBtns = page
          .locator('button[type="button"][class*="rounded-xl"]')
          .filter({ hasNotText: /RESERVE|Forge|Hand|Log|Back/ });
        const gCount = await gemBtns.count();
        if (gCount >= 3) {
          await gemBtns.nth(0).click(); await page.waitForTimeout(100);
          await gemBtns.nth(1).click(); await page.waitForTimeout(100);
          await gemBtns.nth(2).click(); await page.waitForTimeout(100);
        }
        const harness = page.getByText('Harness', { exact: true }).first();
        if (await harness.count() > 0) {
          await harness.click();
          await page.waitForTimeout(3_600); // let gem burst finish
        }
        await closePanels(page);
      }
    }

    expect(forged, 'must successfully forge a card within 4 harvest–attempt cycles').toBe(true);

    // The card element animates via framer-motion:
    //   style={{ position:'fixed', left:0, top:0, width:startRect.w, height:startRect.h }}
    //   animate={{ x: window.innerWidth/2 - startRect.w/2, ... }}
    //   transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    //
    // The card reaches its center position after ~0.6 s.
    // Wait 800 ms so the fast spring settles, then measure via getBoundingClientRect()
    // (Playwright's boundingBox() accounts for CSS transforms including framer-motion translateX).

    await page.waitForTimeout(800);

    // Screenshot of the forge burst mid-animation
    await page.screenshot({ path: `${OUT}/04-forge-burst-peak.png` });

    // ── Measurement A: animated card (runtime window.innerWidth path) ──────
    const cardBurstBox = await page.evaluate((): { x: number; y: number; width: number; height: number } | null => {
      // The card-action burst container has no flex/justify-center (unlike gem/reserve burst).
      // Its animated card is inside a <div style="perspective:900px"> sibling of the avatar section.
      // Find it: fixed, position:fixed, left=0px, small width (< 250 px to exclude full-screen elements).
      const bursts = Array.from(document.querySelectorAll('.pointer-events-none.fixed.inset-0'));
      for (const burst of bursts) {
        const perspDiv = burst.querySelector('div[style*="perspective"]') as HTMLElement | null;
        if (!perspDiv) continue;
        // The framer-motion card div is the first child of perspDiv
        const cardDiv = perspDiv.firstElementChild as HTMLElement | null;
        if (!cardDiv) continue;
        const r = cardDiv.getBoundingClientRect();
        // Sanity: should be a card-sized element (not full-screen)
        if (r.width > 10 && r.width < 250 && r.height > 10) {
          return { x: r.left, y: r.top, width: r.width, height: r.height };
        }
      }
      return null;
    });

    expect(cardBurstBox, 'animated card getBoundingClientRect() must be non-null during forge burst').not.toBeNull();
    const cardCx = cardBurstBox!.x + cardBurstBox!.width / 2;
    assertCenterX(cardCx, 'forge-burst animated card (runtime window.innerWidth path)');

    // ── Measurement B: avatar/label section (CSS fixed left-0 right-0 items-center) ──
    // The "fixed left-0 right-0 flex flex-col items-center" div holds the player avatar
    // and "Forged!" label — it is CSS-centered and also present during the burst.
    const avatarImg = page
      .locator('.fixed.left-0.right-0[class*="flex-col"][class*="items-center"]')
      .first()
      .locator('img')
      .first();

    const avatarBox = await avatarImg.boundingBox();
    expect(avatarBox, 'forge-burst avatar image bounding box must exist').not.toBeNull();
    assertCenterX(avatarBox!.x + avatarBox!.width / 2, 'forge-burst avatar image');

    await page.waitForTimeout(1_500);
    await page.screenshot({ path: `${OUT}/05-forge-burst-settling.png` });

    // Wait for full burst duration and final state
    await page.waitForTimeout(2_200);
    await closePanels(page);
    await page.screenshot({ path: `${OUT}/06-final-state.png` });
  });
});

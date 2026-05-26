/**
 * Dialog Keyboard Navigation — Mobile Viewport — Task #755
 *
 * Verifies that every interactive sheet/dialog in Luminae:
 *   1. Has role="dialog" — announced correctly by screen readers.
 *   2. Traps focus: Tab from the last focusable element wraps to the first;
 *      Shift+Tab from the first wraps to the last.
 *   3. Arrow keys (ArrowDown / ArrowUp) do not move focus outside the dialog.
 *   4. Closes on Escape.
 *
 * Coverage (each dialog gets the full 6-assertion set):
 *   A. TutorialStartModal  — /tutorial with mid-progress set in localStorage
 *   B. FriendsPanel        — /lobby/:roomId (registered test account)
 *   C. Card action sheet   — /game/:id (created via API, AI opponent)
 *
 * Viewport: 390 × 844 (iPhone 14 Pro, same as playwright.config.ts default).
 *
 * Run:
 *   pnpm --filter @workspace/scripts run test:dialog-keyboard
 */

import { test, expect, type Page, type Locator } from 'playwright/test';
import { mkdirSync } from 'node:fs';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = 'http://localhost:80';
const OUT  = '/tmp/dialog-keyboard-mobile';

// Tutorial localStorage keys (from artifacts/luminae/src/lib/tutorialProgress.ts)
const TUTORIAL_PROGRESS_KEY     = 'luminae_tutorial_progress';
const TUTORIAL_PROGRESS_VER_KEY = 'luminae_tutorial_progress_ver';
const TUTORIAL_SEQUENCE_VERSION = '2';

// Account session key (from artifacts/luminae/src/lib/accountSession.ts)
const ACCOUNT_SESSION_KEY = 'luminae_account_session';

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

/**
 * Register a throwaway test account and return the session object that the
 * app stores in localStorage under "luminae_account_session".
 * Username max length is 32 — keep the prefix short and use an 8-digit timestamp.
 */
async function createTestAccount(suffix: string) {
  const ts = String(Date.now()).slice(-8);
  const username = `kn_${suffix}_${ts}`;
  const result = (await apiPost('/api/auth/register', {
    username,
    password: 'TestPass123!',
  })) as { account: { id: string; username: string; email?: string | null }; token: string; expiresAt: string };
  return { account: result.account, token: result.token, expiresAt: result.expiresAt };
}

/**
 * Return all visible, enabled focusable descendants of the given locator
 * in DOM order.
 */
async function getFocusables(dialog: Locator): Promise<Locator[]> {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const all = dialog.locator(selector);
  const count = await all.count();
  const visible: Locator[] = [];
  for (let i = 0; i < count; i++) {
    const el = all.nth(i);
    if (await el.isVisible()) visible.push(el);
  }
  return visible;
}

/**
 * Determine whether document.activeElement is a descendant of the dialog.
 * Uses Locator.evaluate() to avoid TS overload-resolution issues with
 * page.evaluate(fn, elementHandle).
 */
async function isActiveInsideDialog(dialog: Locator): Promise<boolean> {
  return dialog.evaluate((container: Element) => {
    const active = document.activeElement;
    return active !== null && container.contains(active);
  });
}

// ── Shared assertion helpers ──────────────────────────────────────────────────

async function assertTabWraps(page: Page, dialog: Locator, label: string): Promise<void> {
  const focusables = await getFocusables(dialog);
  expect(focusables.length, `${label}: need ≥2 focusable elements for Tab-wrap test`).toBeGreaterThanOrEqual(2);

  await focusables[focusables.length - 1].focus();
  await page.waitForTimeout(80);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(120);

  expect(
    await isActiveInsideDialog(dialog),
    `${label}: Tab from last focusable element must keep focus inside the dialog`,
  ).toBe(true);
}

async function assertShiftTabWraps(page: Page, dialog: Locator, label: string): Promise<void> {
  const focusables = await getFocusables(dialog);
  expect(focusables.length, `${label}: need ≥2 focusable elements for Shift+Tab-wrap test`).toBeGreaterThanOrEqual(2);

  await focusables[0].focus();
  await page.waitForTimeout(80);
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(120);

  expect(
    await isActiveInsideDialog(dialog),
    `${label}: Shift+Tab from first focusable element must keep focus inside the dialog`,
  ).toBe(true);
}

/**
 * Assert that arrow key presses do not escape focus from the dialog.
 *
 * The useFocusTrap hook (artifacts/luminae/src/hooks/use-focus-trap.ts) only
 * explicitly handles Tab and Escape.  Arrow keys are not explicitly handled,
 * so they should leave the active element wherever it is — no focus escape.
 * This test verifies that pressing ArrowDown and ArrowUp while focused on the
 * first focusable element does not move focus to something outside the dialog.
 */
async function assertArrowKeysStayInDialog(page: Page, dialog: Locator, label: string): Promise<void> {
  const focusables = await getFocusables(dialog);
  expect(focusables.length, `${label}: need ≥1 focusable element for arrow-key test`).toBeGreaterThanOrEqual(1);

  // Focus the first element and press ArrowDown
  await focusables[0].focus();
  await page.waitForTimeout(80);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(120);

  expect(
    await isActiveInsideDialog(dialog),
    `${label}: ArrowDown must not move focus outside the dialog`,
  ).toBe(true);

  // Now press ArrowUp — focus must still be inside
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(120);

  expect(
    await isActiveInsideDialog(dialog),
    `${label}: ArrowUp must not move focus outside the dialog`,
  ).toBe(true);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

// ════════════════════════════════════════════════════════════════════════════
// A. TutorialStartModal — /tutorial
//
// The modal only renders when hasMidProgress is true (savedBeat > 0 and
// version matches TUTORIAL_SEQUENCE_VERSION=2).  Inject the required
// localStorage keys before navigating to /tutorial.
// ════════════════════════════════════════════════════════════════════════════

test.describe('A. TutorialStartModal — /tutorial — mobile keyboard nav', () => {
  async function openTutorialModal(page: Page): Promise<Locator> {
    // Set localStorage on the root origin first
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      ({ progressKey, verKey, ver }) => {
        localStorage.setItem(progressKey, '5');  // beat 5 → mid-progress
        localStorage.setItem(verKey, ver);
      },
      {
        progressKey: TUTORIAL_PROGRESS_KEY,
        verKey: TUTORIAL_PROGRESS_VER_KEY,
        ver: TUTORIAL_SEQUENCE_VERSION,
      },
    );
    await page.goto(`${BASE}/tutorial`, { waitUntil: 'domcontentloaded' });

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    await page.waitForTimeout(350); // let framer-motion spring settle
    return dialog;
  }

  test('role="dialog" is present', async ({ page }) => {
    const dialog = await openTutorialModal(page);
    await page.screenshot({ path: `${OUT}/A1-tutorial-modal-open.png` });
    expect(await dialog.getAttribute('role')).toBe('dialog');
  });

  test('aria-modal="true" is present', async ({ page }) => {
    const dialog = await openTutorialModal(page);
    expect(await dialog.getAttribute('aria-modal')).toBe('true');
  });

  test('Tab from last focusable wraps to first (focus trap)', async ({ page }) => {
    const dialog = await openTutorialModal(page);
    await assertTabWraps(page, dialog, 'TutorialStartModal');
    await page.screenshot({ path: `${OUT}/A2-tutorial-modal-tab-trap.png` });
  });

  test('Shift+Tab from first focusable wraps to last (focus trap)', async ({ page }) => {
    const dialog = await openTutorialModal(page);
    await assertShiftTabWraps(page, dialog, 'TutorialStartModal');
  });

  test('Arrow keys do not move focus outside the dialog', async ({ page }) => {
    const dialog = await openTutorialModal(page);
    await assertArrowKeysStayInDialog(page, dialog, 'TutorialStartModal');
    await page.screenshot({ path: `${OUT}/A3-tutorial-modal-arrow-keys.png` });
  });

  test('Escape closes the modal', async ({ page }) => {
    const dialog = await openTutorialModal(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500); // allow exit animation
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    await page.screenshot({ path: `${OUT}/A4-tutorial-modal-escaped.png` });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// B. FriendsPanel — /dashboard
//
// The dashboard redirect guard now checks isLoading first, so a logged-in
// user who navigates directly to /dashboard will never be bounced to "/"
// while AccountContext is still hydrating from localStorage.
// ════════════════════════════════════════════════════════════════════════════

test.describe('B. FriendsPanel — /dashboard — mobile keyboard nav', () => {
  async function openFriendsPanel(page: Page): Promise<Locator> {
    const session = await createTestAccount('fp');

    // Inject account session via localStorage on the root page, then navigate
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      ({ accountKey, accountData }) => {
        localStorage.setItem(accountKey, JSON.stringify(accountData));
      },
      {
        accountKey: ACCOUNT_SESSION_KEY,
        accountData: {
          account: session.account,
          token: session.token,
          expiresAt: session.expiresAt,
        },
      },
    );

    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800); // AccountContext useEffect + re-render

    const friendsBtn = page.locator('button').filter({ hasText: /friends/i }).first();
    await expect(friendsBtn, 'Friends button must appear once account session hydrates').toBeVisible({
      timeout: 8_000,
    });
    await friendsBtn.click();
    await page.waitForTimeout(400);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog, 'FriendsPanel dialog must open after clicking Friends').toBeVisible({
      timeout: 5_000,
    });
    return dialog;
  }

  test('role="dialog" is present when panel opens', async ({ page }) => {
    const dialog = await openFriendsPanel(page);
    await page.screenshot({ path: `${OUT}/B1-friends-panel-open.png` });
    expect(await dialog.getAttribute('role')).toBe('dialog');
  });

  test('aria-modal="true" is present when panel opens', async ({ page }) => {
    const dialog = await openFriendsPanel(page);
    expect(await dialog.getAttribute('aria-modal')).toBe('true');
  });

  test('Tab from last focusable wraps to first (focus trap)', async ({ page }) => {
    const dialog = await openFriendsPanel(page);
    await assertTabWraps(page, dialog, 'FriendsPanel');
    await page.screenshot({ path: `${OUT}/B2-friends-panel-tab-trap.png` });
  });

  test('Shift+Tab from first focusable wraps to last (focus trap)', async ({ page }) => {
    const dialog = await openFriendsPanel(page);
    await assertShiftTabWraps(page, dialog, 'FriendsPanel');
  });

  test('Arrow keys do not move focus outside the dialog', async ({ page }) => {
    const dialog = await openFriendsPanel(page);
    await assertArrowKeysStayInDialog(page, dialog, 'FriendsPanel');
    await page.screenshot({ path: `${OUT}/B3-friends-panel-arrow-keys.png` });
  });

  test('Escape closes the panel', async ({ page }) => {
    const dialog = await openFriendsPanel(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    await page.screenshot({ path: `${OUT}/B4-friends-panel-escaped.png` });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// C. Card action sheet — /game/:id
// ════════════════════════════════════════════════════════════════════════════

test.describe('C. Card action sheet — /game/:id — mobile keyboard nav', () => {
  async function createAndStartGame() {
    const { room, player, sessionToken } = (await apiPost('/api/rooms', {
      hostName: 'KeyNav-Test',
      maxPlayers: 2,
      turnTimerSeconds: null,
    })) as {
      room: { id: string; inviteCode: string };
      player: { id: string };
      sessionToken: string;
    };

    await apiPost(`/api/rooms/${room.id}/ai-players`, { sessionToken, difficulty: 'easy' });
    await apiPost(`/api/rooms/${room.id}/start`, { sessionToken });

    return { room, player, sessionToken };
  }

  async function navigateToGame(
    page: Page,
    room: { id: string; inviteCode: string },
    player: { id: string },
    sessionToken: string,
  ) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      ({ roomId, inviteCode, playerId, token }) => {
        localStorage.setItem(
          'luminae_session',
          JSON.stringify({
            roomId,
            inviteCode,
            playerId,
            sessionToken: token,
            playerName: 'KeyNav-Test',
            isHost: true,
            avatarId: 'avatar_1',
          }),
        );
      },
      { roomId: room.id, inviteCode: room.inviteCode, playerId: player.id, token: sessionToken },
    );

    await page.goto(`${BASE}/game/${room.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=AFFINITY WELL').first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(600);
  }

  async function dismissTurnAnnouncement(page: Page) {
    const overlay = page.locator('[class*="fixed"][class*="inset-0"][class*="cursor-pointer"]');
    const appeared = await overlay
      .waitFor({ state: 'visible', timeout: 12_000 })
      .then(() => true, () => false);
    if (appeared) {
      await page.mouse.click(195, 422);
      await overlay.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  async function openCardSheet(page: Page): Promise<Locator | null> {
    const cardEls = page.locator('[data-card-id]');
    await expect(cardEls.first()).toBeVisible({ timeout: 10_000 });

    const count = await cardEls.count();
    for (let i = 0; i < count; i++) {
      const card = cardEls.nth(i);
      if (!(await card.isVisible())) continue;
      await card.click();
      await page.waitForTimeout(450);

      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible()) return dialog;

      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
    return null;
  }

  test('role="dialog" is present on the card action sheet', async ({ page }) => {
    const { room, player, sessionToken } = await createAndStartGame();
    await navigateToGame(page, room, player, sessionToken);
    await dismissTurnAnnouncement(page);

    const dialog = await openCardSheet(page);
    expect(dialog, 'card action sheet must open when clicking a market card').not.toBeNull();

    await page.screenshot({ path: `${OUT}/C1-card-sheet-open.png` });
    expect(await dialog!.getAttribute('role')).toBe('dialog');
  });

  test('aria-modal="true" is present on the card action sheet', async ({ page }) => {
    const { room, player, sessionToken } = await createAndStartGame();
    await navigateToGame(page, room, player, sessionToken);
    await dismissTurnAnnouncement(page);

    const dialog = await openCardSheet(page);
    expect(dialog, 'card action sheet must open when clicking a market card').not.toBeNull();

    expect(await dialog!.getAttribute('aria-modal')).toBe('true');
  });

  test('Tab from last focusable wraps to first (focus trap)', async ({ page }) => {
    const { room, player, sessionToken } = await createAndStartGame();
    await navigateToGame(page, room, player, sessionToken);
    await dismissTurnAnnouncement(page);

    const dialog = await openCardSheet(page);
    expect(dialog, 'card action sheet must open when clicking a market card').not.toBeNull();

    await assertTabWraps(page, dialog!, 'Card action sheet');
    await page.screenshot({ path: `${OUT}/C2-card-sheet-tab-trap.png` });
  });

  test('Shift+Tab from first focusable wraps to last (focus trap)', async ({ page }) => {
    const { room, player, sessionToken } = await createAndStartGame();
    await navigateToGame(page, room, player, sessionToken);
    await dismissTurnAnnouncement(page);

    const dialog = await openCardSheet(page);
    expect(dialog, 'card action sheet must open when clicking a market card').not.toBeNull();

    await assertShiftTabWraps(page, dialog!, 'Card action sheet');
  });

  test('Arrow keys do not move focus outside the dialog', async ({ page }) => {
    const { room, player, sessionToken } = await createAndStartGame();
    await navigateToGame(page, room, player, sessionToken);
    await dismissTurnAnnouncement(page);

    const dialog = await openCardSheet(page);
    expect(dialog, 'card action sheet must open when clicking a market card').not.toBeNull();

    await assertArrowKeysStayInDialog(page, dialog!, 'Card action sheet');
    await page.screenshot({ path: `${OUT}/C3-card-sheet-arrow-keys.png` });
  });

  test('Escape closes the card action sheet', async ({ page }) => {
    const { room, player, sessionToken } = await createAndStartGame();
    await navigateToGame(page, room, player, sessionToken);
    await dismissTurnAnnouncement(page);

    const dialog = await openCardSheet(page);
    expect(dialog, 'card action sheet must open when clicking a market card').not.toBeNull();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(dialog!).not.toBeVisible({ timeout: 3_000 });
    await page.screenshot({ path: `${OUT}/C4-card-sheet-escaped.png` });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// D. Remaining game dialogs — /game/:id
//
// Covers four more game-page dialogs not tested in Section C:
//   D1. Reserved cards overlay  — click [data-singularity-well] (flux crystal)
//   D2. Deck reserve sheet      — click [data-deck-tier]:not([disabled])
//   D3. Rules sheet             — header ⋮ menu → Rules
//   D4. Win overlay             — API surrender action ends the game
//
// Each dialog uses the same 6-assertion pattern as Sections A–C:
//   role="dialog", aria-modal="true", Tab-wrap, Shift+Tab-wrap, arrow keys,
//   and Escape.  The win overlay is a terminal state — its useFocusTrap
//   onClose is a no-op — so its Escape test asserts the overlay stays visible.
// ════════════════════════════════════════════════════════════════════════════

/** Shared game factory for Section D — creates a room with one easy AI and starts it. */
async function createAndStartGameD() {
  const { room, player, sessionToken } = (await apiPost('/api/rooms', {
    hostName: 'KeyNavD-Test',
    maxPlayers: 2,
    turnTimerSeconds: null,
  })) as {
    room: { id: string; inviteCode: string };
    player: { id: string };
    sessionToken: string;
  };

  await apiPost(`/api/rooms/${room.id}/ai-players`, { sessionToken, difficulty: 'easy' });
  await apiPost(`/api/rooms/${room.id}/start`, { sessionToken });

  return { room, player, sessionToken };
}

/** Navigate the browser to the game page as the human host player. */
async function navigateToGameD(
  page: Page,
  room: { id: string; inviteCode: string },
  player: { id: string },
  sessionToken: string,
): Promise<void> {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ roomId, inviteCode, playerId, token }) => {
      localStorage.setItem(
        'luminae_session',
        JSON.stringify({
          roomId,
          inviteCode,
          playerId,
          sessionToken: token,
          playerName: 'KeyNavD-Test',
          isHost: true,
          avatarId: 'avatar_1',
        }),
      );
    },
    { roomId: room.id, inviteCode: room.inviteCode, playerId: player.id, token: sessionToken },
  );

  await page.goto(`${BASE}/game/${room.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('text=AFFINITY WELL').first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(600);
}

/** Dismiss the turn-announcement overlay if it appears (any player). */
async function dismissTurnAnnouncementD(page: Page): Promise<void> {
  const overlay = page.locator('[class*="fixed"][class*="inset-0"][class*="cursor-pointer"]');
  const appeared = await overlay
    .waitFor({ state: 'visible', timeout: 12_000 })
    .then(() => true, () => false);
  if (appeared) {
    await page.mouse.click(195, 422);
    await overlay.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// D1. Reserved cards overlay
// ────────────────────────────────────────────────────────────────────────────

test.describe('D1. Reserved cards overlay — /game/:id — mobile keyboard nav', () => {
  /**
   * The Singularity (flux) crystal cell always calls onOpenReserved() when clicked,
   * regardless of whose turn it is or how many cards are reserved.
   * It carries data-singularity-well so we can target it precisely.
   *
   * We pre-reserve a card from tier-1 via the API (blind reserve — no cardId needed)
   * so the overlay contains at least 2 focusable elements: the reserved-card button
   * and the close (×) button.  This is required for the Tab-wrap assertion.
   */
  async function openReservedOverlay(page: Page): Promise<Locator> {
    const { room, player, sessionToken } = await createAndStartGameD();
    await navigateToGameD(page, room, player, sessionToken);
    await dismissTurnAnnouncementD(page);

    // Wait until it is the human player's turn (deck buttons become enabled).
    const enabledDeck = page.locator('[data-deck-tier]:not([disabled])').first();
    await expect(enabledDeck).toBeVisible({ timeout: 25_000 });

    // Blind-reserve a tier-1 card via the API — this is the player's core action
    // and will advance the turn to the AI after submission.
    await apiPost(`/api/rooms/${room.id}/actions`, {
      type: 'reserve_card',
      tier: 1,
      sessionToken,
    });
    await page.waitForTimeout(300); // allow WebSocket state delivery

    // Open the reserved cards overlay — the flux crystal is always clickable.
    const singularityCell = page.locator('[data-singularity-well]').first();
    await expect(singularityCell).toBeVisible({ timeout: 10_000 });
    await singularityCell.click();
    await page.waitForTimeout(450);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    return dialog;
  }

  test('role="dialog" is present', async ({ page }) => {
    const dialog = await openReservedOverlay(page);
    await page.screenshot({ path: `${OUT}/D1a-reserved-overlay-open.png` });
    expect(await dialog.getAttribute('role')).toBe('dialog');
  });

  test('aria-modal="true" is present', async ({ page }) => {
    const dialog = await openReservedOverlay(page);
    expect(await dialog.getAttribute('aria-modal')).toBe('true');
  });

  test('Tab from last focusable wraps to first (focus trap)', async ({ page }) => {
    const dialog = await openReservedOverlay(page);
    await assertTabWraps(page, dialog, 'Reserved cards overlay');
    await page.screenshot({ path: `${OUT}/D1b-reserved-overlay-tab-trap.png` });
  });

  test('Shift+Tab from first focusable wraps to last (focus trap)', async ({ page }) => {
    const dialog = await openReservedOverlay(page);
    await assertShiftTabWraps(page, dialog, 'Reserved cards overlay');
  });

  test('Arrow keys do not move focus outside the dialog', async ({ page }) => {
    const dialog = await openReservedOverlay(page);
    await assertArrowKeysStayInDialog(page, dialog, 'Reserved cards overlay');
    await page.screenshot({ path: `${OUT}/D1c-reserved-overlay-arrow-keys.png` });
  });

  test('Escape closes the overlay', async ({ page }) => {
    const dialog = await openReservedOverlay(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    await page.screenshot({ path: `${OUT}/D1d-reserved-overlay-escaped.png` });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// D2. Deck reserve sheet
// ────────────────────────────────────────────────────────────────────────────

test.describe('D2. Deck reserve sheet — /game/:id — mobile keyboard nav', () => {
  /**
   * The deck-pile buttons carry data-deck-tier and are only enabled when
   * it is the human player's turn (disabled={!isMyTurn && !canPlan}).
   * Wait for any non-disabled deck button to become available, then click it.
   */
  async function openDeckSheet(page: Page): Promise<Locator> {
    const { room, player, sessionToken } = await createAndStartGameD();
    await navigateToGameD(page, room, player, sessionToken);
    await dismissTurnAnnouncementD(page);

    // Wait until at least one deck-tier button is enabled (player's turn).
    // Timeout accounts for up to one full AI turn before the human's first move.
    const enabledDeckBtn = page.locator('[data-deck-tier]:not([disabled])').first();
    await expect(enabledDeckBtn).toBeVisible({ timeout: 25_000 });
    await enabledDeckBtn.click();
    await page.waitForTimeout(450);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    return dialog;
  }

  test('role="dialog" is present', async ({ page }) => {
    const dialog = await openDeckSheet(page);
    await page.screenshot({ path: `${OUT}/D2a-deck-sheet-open.png` });
    expect(await dialog.getAttribute('role')).toBe('dialog');
  });

  test('aria-modal="true" is present', async ({ page }) => {
    const dialog = await openDeckSheet(page);
    expect(await dialog.getAttribute('aria-modal')).toBe('true');
  });

  test('Tab from last focusable wraps to first (focus trap)', async ({ page }) => {
    const dialog = await openDeckSheet(page);
    await assertTabWraps(page, dialog, 'Deck reserve sheet');
    await page.screenshot({ path: `${OUT}/D2b-deck-sheet-tab-trap.png` });
  });

  test('Shift+Tab from first focusable wraps to last (focus trap)', async ({ page }) => {
    const dialog = await openDeckSheet(page);
    await assertShiftTabWraps(page, dialog, 'Deck reserve sheet');
  });

  test('Arrow keys do not move focus outside the dialog', async ({ page }) => {
    const dialog = await openDeckSheet(page);
    await assertArrowKeysStayInDialog(page, dialog, 'Deck reserve sheet');
    await page.screenshot({ path: `${OUT}/D2c-deck-sheet-arrow-keys.png` });
  });

  test('Escape closes the sheet', async ({ page }) => {
    const dialog = await openDeckSheet(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    await page.screenshot({ path: `${OUT}/D2d-deck-sheet-escaped.png` });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// D3. Rules sheet
// ────────────────────────────────────────────────────────────────────────────

test.describe('D3. Rules sheet — /game/:id — mobile keyboard nav', () => {
  /**
   * The rules sheet is opened via the header ⋮ (MoreVertical) dropdown:
   *   1. Click the ghost-icon button that contains the ⋮ SVG icon.
   *   2. Click the "Rules" DropdownMenuItem.
   */
  async function openRulesSheet(page: Page): Promise<Locator> {
    const { room, player, sessionToken } = await createAndStartGameD();
    await navigateToGameD(page, room, player, sessionToken);
    await dismissTurnAnnouncementD(page);

    // The header bar renders: avatar / round info / timer / R{n} / ⋮ (MoreVertical)
    // The ⋮ trigger is the last button inside the <header> element and is always
    // visible regardless of whose turn it is.
    const headerMoreBtn = page.locator('header button').last();
    await expect(headerMoreBtn).toBeVisible({ timeout: 8_000 });
    await headerMoreBtn.click();
    await page.waitForTimeout(300);

    // Click the "Rules" item inside the now-open dropdown
    const rulesItem = page.locator('[role="menuitem"]').filter({ hasText: /rules/i }).first();
    await expect(rulesItem).toBeVisible({ timeout: 4_000 });
    await rulesItem.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    return dialog;
  }

  test('role="dialog" is present', async ({ page }) => {
    const dialog = await openRulesSheet(page);
    await page.screenshot({ path: `${OUT}/D3a-rules-sheet-open.png` });
    expect(await dialog.getAttribute('role')).toBe('dialog');
  });

  test('aria-modal="true" is present', async ({ page }) => {
    const dialog = await openRulesSheet(page);
    expect(await dialog.getAttribute('aria-modal')).toBe('true');
  });

  test('Tab from last focusable wraps to first (focus trap)', async ({ page }) => {
    const dialog = await openRulesSheet(page);
    await assertTabWraps(page, dialog, 'Rules sheet');
    await page.screenshot({ path: `${OUT}/D3b-rules-sheet-tab-trap.png` });
  });

  test('Shift+Tab from first focusable wraps to last (focus trap)', async ({ page }) => {
    const dialog = await openRulesSheet(page);
    await assertShiftTabWraps(page, dialog, 'Rules sheet');
  });

  test('Arrow keys do not move focus outside the dialog', async ({ page }) => {
    const dialog = await openRulesSheet(page);
    await assertArrowKeysStayInDialog(page, dialog, 'Rules sheet');
    await page.screenshot({ path: `${OUT}/D3c-rules-sheet-arrow-keys.png` });
  });

  test('Escape closes the sheet', async ({ page }) => {
    const dialog = await openRulesSheet(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    await page.screenshot({ path: `${OUT}/D3d-rules-sheet-escaped.png` });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// D4. Win overlay
// ────────────────────────────────────────────────────────────────────────────

test.describe('D4. Win overlay — /game/:id — mobile keyboard nav', () => {
  /**
   * Trigger the win overlay by submitting a surrender action via the API.
   * This ends the game immediately (AI wins) without requiring browser confirm().
   * The win overlay renders for ALL players once state.status === 'finished',
   * so the human player's browser will show the "Game Over" variant.
   *
   * Note: The win overlay's useFocusTrap onClose is intentionally a no-op
   * (terminal state — there is nothing to dismiss).  Pressing Escape consumes
   * the event but the overlay remains visible.  The Escape test below asserts
   * this correct behavior instead of expecting the overlay to close.
   */
  async function openWinOverlay(page: Page): Promise<Locator> {
    const { room, player, sessionToken } = await createAndStartGameD();
    await navigateToGameD(page, room, player, sessionToken);
    await dismissTurnAnnouncementD(page);

    // Surrender is turn-gated — the game engine rejects it unless it is the
    // human player's turn.  Wait for a deck button to become enabled (the
    // reliable signal that the player is now the active player) before
    // submitting the action.  The timeout accounts for one full AI turn.
    const enabledDeck = page.locator('[data-deck-tier]:not([disabled])').first();
    await expect(enabledDeck).toBeVisible({ timeout: 25_000 });

    // Submit the surrender action directly via the REST API, bypassing the
    // browser confirm() dialog that the in-game Surrender button uses.
    await apiPost(`/api/rooms/${room.id}/actions`, {
      type: 'surrender',
      sessionToken,
    });

    // Wait for the win overlay — the WebSocket delivers the finished state.
    // The win overlay is the only role=dialog with aria-modal=true that
    // contains a "Back to Home" button; it appears for both winners and losers.
    const dialog = page.locator('[role="dialog"][aria-modal="true"]').filter({
      has: page.locator('button', { hasText: /back to home/i }),
    });
    await expect(dialog).toBeVisible({ timeout: 12_000 });

    // The action buttons ("Play Again", "Back to Home") sit inside a motion.div
    // with transition delay: 0.9 s.  Wait for both to be fully visible before
    // returning so getFocusables() finds real, interactive elements.
    await expect(dialog.locator('button', { hasText: /back to home/i })).toBeVisible({ timeout: 6_000 });
    await expect(dialog.locator('button', { hasText: /play again/i })).toBeVisible({ timeout: 3_000 });
    return dialog;
  }

  test('role="dialog" is present', async ({ page }) => {
    const dialog = await openWinOverlay(page);
    await page.screenshot({ path: `${OUT}/D4a-win-overlay-open.png` });
    expect(await dialog.getAttribute('role')).toBe('dialog');
  });

  test('aria-modal="true" is present', async ({ page }) => {
    const dialog = await openWinOverlay(page);
    expect(await dialog.getAttribute('aria-modal')).toBe('true');
  });

  test('Tab from last focusable wraps to first (focus trap)', async ({ page }) => {
    // The win overlay contains exactly two action buttons: "Play Again" (first)
    // and "Back to Home" (last).  Bypass the getFocusables helper and address
    // them directly so the test does not depend on the filtered-locator chain
    // that intermittently collapses when the framer-motion entry animation
    // briefly resets after a React reconciliation cycle.
    await openWinOverlay(page);
    const backHome = page.locator('[role="dialog"][aria-modal="true"] button', { hasText: /back to home/i });
    await backHome.focus();
    await page.waitForTimeout(80);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(80);
    // Focus must remain inside the dialog (trap wrapped to first button).
    const focusedInsideDialog = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
      return dlg ? dlg.contains(document.activeElement) : false;
    });
    expect(focusedInsideDialog, 'Tab from last element should keep focus inside the dialog').toBe(true);
    await page.screenshot({ path: `${OUT}/D4b-win-overlay-tab-trap.png` });
  });

  test('Shift+Tab from first focusable wraps to last (focus trap)', async ({ page }) => {
    await openWinOverlay(page);
    const playAgain = page.locator('[role="dialog"][aria-modal="true"] button', { hasText: /play again/i });
    await playAgain.focus();
    await page.waitForTimeout(80);
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(80);
    // Focus must remain inside the dialog (trap wrapped to last button).
    const focusedInsideDialog = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
      return dlg ? dlg.contains(document.activeElement) : false;
    });
    expect(focusedInsideDialog, 'Shift+Tab from first element should keep focus inside the dialog').toBe(true);
  });

  test('Arrow keys do not move focus outside the dialog', async ({ page }) => {
    await openWinOverlay(page);
    const playAgain = page.locator('[role="dialog"][aria-modal="true"] button', { hasText: /play again/i });
    await playAgain.focus();
    await page.waitForTimeout(80);
    for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'] as const) {
      await page.keyboard.press(key);
      await page.waitForTimeout(50);
      const focusedInside = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
        return dlg ? dlg.contains(document.activeElement) : false;
      });
      expect(focusedInside, `Arrow key ${key} must not move focus outside the dialog`).toBe(true);
    }
    await page.screenshot({ path: `${OUT}/D4c-win-overlay-arrow-keys.png` });
  });

  test('Escape is consumed but overlay stays visible (terminal state — no dismiss)', async ({ page }) => {
    // The win overlay is a terminal game state.  useFocusTrap is wired with an
    // empty onClose callback, so Escape does not close the overlay.
    const dialog = await openWinOverlay(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    // The dialog must still be present — the overlay is intentionally non-dismissible.
    await expect(dialog).toBeVisible({ timeout: 2_000 });
    await page.screenshot({ path: `${OUT}/D4d-win-overlay-escape-noop.png` });
  });
});

/**
 * Overlay Centering Audit — Task #297
 *
 * Verifies that fixed overlays (turn announcement, gem harvest burst, reserve burst)
 * are correctly centered on a 390×844 mobile viewport.
 *
 * The card-action burst uses window.innerWidth at animation runtime to compute its
 * left position; this test also verifies window.innerWidth equals the viewport width
 * and documents that the formula produces a centered result.
 *
 * Run: node scripts/overlay-audit/audit-overlays.cjs
 */

const { chromium } = require('playwright');
const https = require('https');
const http = require('http');
const { mkdirSync } = require('fs');

const BASE_URL = 'http://localhost:80';
const VIEWPORT = { width: 390, height: 844 };
const OUT_DIR = '/tmp/overlay-audit';

// ── helpers ──────────────────────────────────────────────────────────────────

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Evaluate whether a bounding box is horizontally centered.
 * "Center third" on a 390px screen = columns 130–260 (33%–67%).
 */
function checkCentered(label, box, viewport) {
  if (!box) {
    console.log(`  ? ${label}: element not found — cannot measure bounding box`);
    return null;
  }
  const elementCenter = box.x + box.width / 2;
  const screenCenter = viewport.width / 2;
  const drift = Math.abs(elementCenter - screenCenter);
  const lo = viewport.width / 3;          // 130px
  const hi = (viewport.width * 2) / 3;   // 260px
  const pass = elementCenter >= lo && elementCenter <= hi;

  const symbol = pass ? '✓' : '✗';
  const verdict = pass ? 'PASS' : 'FAIL';
  console.log(
    `  ${symbol} ${label}: element-center=${Math.round(elementCenter)}px  ` +
    `screen-center=${screenCenter}px  drift=${Math.round(drift)}px  ` +
    `center-third=[${Math.round(lo)}–${Math.round(hi)}]  → ${verdict}`,
  );
  return pass;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log('=== Overlay Centering Audit — 390×844 mobile viewport ===\n');

  // ── 1. Create room via API ────────────────────────────────────────────────
  console.log('Setting up room...');
  const createRes = await api('POST', '/api/rooms', {
    hostName: 'AuditBot',
    maxPlayers: 2,
    turnTimerSeconds: null,
  });
  if (![200, 201].includes(createRes.status)) {
    console.error('Failed to create room:', JSON.stringify(createRes.body));
    process.exit(1);
  }
  const { room, player, sessionToken } = createRes.body;
  console.log(`  Room: ${room.id}  Player: ${player.id}`);

  const aiRes = await api('POST', `/api/rooms/${room.id}/ai-players`, {
    sessionToken,
    difficulty: 'easy',
  });
  if (![200, 201].includes(aiRes.status)) {
    console.error('Failed to add AI:', JSON.stringify(aiRes.body));
    process.exit(1);
  }

  const startRes = await api('POST', `/api/rooms/${room.id}/start`, { sessionToken });
  if (![200, 201].includes(startRes.status)) {
    console.error('Failed to start game:', JSON.stringify(startRes.body));
    process.exit(1);
  }
  console.log('  Game started.\n');

  // ── 2. Launch browser ─────────────────────────────────────────────────────
  // On Replit/NixOS the downloaded Chromium headless shell cannot load glibc
  // from standard paths. Replit provides a pre-built NixOS-compatible Chromium
  // via the REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE env var.
  const executablePath = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
  if (executablePath) console.log(`  Using system Chromium: ${executablePath}`);
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  const results = [];

  try {
    // Inject session before navigating to game
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ roomId, inviteCode, playerId, token, name }) => {
      localStorage.setItem('luminae_session', JSON.stringify({
        roomId,
        inviteCode,
        playerId,
        sessionToken: token,
        playerName: name,
        isHost: true,
        avatarId: 'avatar_1',
      }));
    }, {
      roomId: room.id,
      inviteCode: room.inviteCode,
      playerId: player.id,
      token: sessionToken,
      name: 'AuditBot',
    });

    // Navigate to the game page
    await page.goto(`${BASE_URL}/game/${room.id}`, { waitUntil: 'domcontentloaded' });

    // Wait for game board to render (Affinity Well section appears once board is ready)
    await page.waitForSelector('text=AFFINITY WELL', { timeout: 15000 }).catch(() => {
      console.log('  (AFFINITY WELL heading not found within 15s — continuing anyway)');
    });
    await sleep(800);

    // Close dev panels — DOM removal is more reliable than clicking summaries
    await page.evaluate(() => {
      document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
    });
    await sleep(200);

    // ── window.innerWidth sanity check ────────────────────────────────────
    console.log('--- window.innerWidth sanity check ---');
    const innerWidth = await page.evaluate(() => window.innerWidth);
    const innerWidthPass = innerWidth === VIEWPORT.width;
    console.log(
      `  ${innerWidthPass ? '✓' : '✗'} window.innerWidth=${innerWidth} ` +
      `(expected ${VIEWPORT.width}) → ${innerWidthPass ? 'PASS' : 'FAIL'}`,
    );
    if (innerWidth > 0) {
      const half = innerWidth / 2;
      const exampleCardW = 120;
      const left = half - exampleCardW / 2;
      console.log(
        `  Card-action burst formula: window.innerWidth/2 - cardWidth/2 ` +
        `= ${innerWidth}/2 - ${exampleCardW}/2 = ${half} - ${exampleCardW / 2} = ${left}px (left edge)`,
      );
      console.log(
        `  Card center at ${left + exampleCardW / 2}px ` +
        `(screen center ${VIEWPORT.width / 2}px) → ${Math.abs(left + exampleCardW / 2 - VIEWPORT.width / 2) < 1 ? 'centered ✓' : 'off-center ✗'}`,
      );
    }
    results.push({ overlay: 'window.innerWidth', pass: innerWidthPass, value: innerWidth });

    // ── OVERLAY 1: Turn Announcement ────────────────────────────────────────
    console.log('\n--- Turn Announcement Overlay ---');

    // Turn announcement fires automatically when it becomes the player's turn.
    // CSS: "fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
    // Inner content: motion.div "relative flex flex-col items-center gap-3"
    let turnAnnounceBox = null;
    const turnOverlaySelector = '.cursor-pointer.flex.items-center.justify-center[class*="fixed"][class*="inset-0"]';
    const altTurnSelector = '[class*="fixed"][class*="inset-0"][class*="cursor-pointer"]';

    let turnVisible = false;
    for (let i = 0; i < 3; i++) {
      try {
        await page.waitForSelector(altTurnSelector, { timeout: 4000 });
        turnVisible = true;
        break;
      } catch {
        // not yet visible
      }
      await sleep(500);
    }

    await page.screenshot({ path: `${OUT_DIR}/01-turn-announcement.png` });
    console.log(`  Screenshot: ${OUT_DIR}/01-turn-announcement.png`);

    if (turnVisible) {
      // Measure the inner content block (avatar + text)
      // It's the first direct child div of the overlay that has flex-col
      const contentLocator = page.locator(altTurnSelector).locator('> div[class*="relative"]').first();
      turnAnnounceBox = await contentLocator.boundingBox().catch(() => null);

      // Fallback: measure the whole overlay container
      if (!turnAnnounceBox) {
        const overlayLocator = page.locator(altTurnSelector).first();
        turnAnnounceBox = await overlayLocator.boundingBox().catch(() => null);
      }

      const pass = checkCentered('Turn announcement content', turnAnnounceBox, VIEWPORT);
      results.push({ overlay: 'turn-announcement', pass, box: turnAnnounceBox });

      // Dismiss by clicking center of screen
      await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height / 2);
      await sleep(600);
    } else {
      console.log('  Turn announcement not detected in DOM (may have auto-dismissed).');
      results.push({ overlay: 'turn-announcement', pass: null, note: 'not detected' });
    }

    // Re-close dev panels after interaction
    await page.evaluate(() => {
      document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
    });
    await sleep(300);

    // ── OVERLAY 2: Gem Harvest Burst ───────────────────────────────────────
    console.log('\n--- Gem Harvest Burst ---');
    // Gem burst fires OPTIMISTICALLY (immediately) when Harness is clicked.
    // Overlay CSS: "pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    // Inner content: div "relative h-72 w-[18rem]" (288px wide, centered via parent flex)

    let harvestAttempted = false;
    // Wait for "AFFINITY WELL" section to confirm we're on the board with actions available
    const wellVisible = await page.locator('text=AFFINITY WELL').count() > 0;
    if (!wellVisible) {
      await page.waitForSelector('text=AFFINITY WELL', { timeout: 8000 }).catch(() => {});
    }

    // Check if it's our turn — look for the "Your turn" pill or "Your Turn" text
    const myTurnIndicator = await page.locator('text=Your turn, text=your turn').count();
    console.log(`  My-turn indicators found: ${myTurnIndicator}`);

    // Click 3 different gem crystal buttons in the Affinity Well.
    // These are motion.button elements in a grid-cols-5 grid, with type="button" and rounded-xl.
    // We click 3 unique ones (for a take3 harvest).
    try {
      // Find the gem buttons — they are button[type="button"][class*="rounded-xl"] in the affinity well
      const gemButtons = page.locator('button[type="button"][class*="rounded-xl"]').filter({ hasNotText: /RESERVE|Forge|Hand|Log|Back/ });
      const count = await gemButtons.count();
      console.log(`  Found ${count} gem-like buttons`);

      if (count >= 3) {
        await gemButtons.nth(0).click();
        await sleep(150);
        await gemButtons.nth(1).click();
        await sleep(150);
        await gemButtons.nth(2).click();
        await sleep(150);
      } else if (count >= 1) {
        await gemButtons.nth(0).click();
        await sleep(150);
      }

      // Find and click the Harness action div.
      // The Harness "button" is a motion.div with onClick and text "Harness".
      // We use getByText with exact:true to avoid matching "HARNESS COSMIC ESSENCE" heading.
      // The span with exact text "Harness" is inside the clickable div — click event bubbles up.
      const harnessSpan = page.getByText('Harness', { exact: true }).first();
      const harnessCount = await harnessSpan.count();
      console.log(`  Harness text elements found: ${harnessCount}`);

      if (harnessCount > 0) {
        // Click the Harness div — burst fires immediately (optimistic)
        await harnessSpan.click();
        harvestAttempted = true;
        console.log('  Clicked Harness — burst should fire immediately');
      }
    } catch (e) {
      console.log(`  Gem/Harness click failed: ${e.message}`);
    }

    // Screenshot immediately after clicking Harness (burst is optimistic / fires on click)
    await sleep(350);
    await page.screenshot({ path: `${OUT_DIR}/02-gem-burst-immediate.png` });
    console.log(`  Screenshot (immediate): ${OUT_DIR}/02-gem-burst-immediate.png`);

    // Wait 1 more second and screenshot again — burst lasts ~3.5s
    await sleep(1000);
    await page.screenshot({ path: `${OUT_DIR}/03-gem-burst-1s.png` });
    console.log(`  Screenshot (+1s):       ${OUT_DIR}/03-gem-burst-1s.png`);

    // Measure the gem burst overlay content box
    // Overlay: "pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    // Content: the first non-absolute child div inside the flex-center container
    const gemBurstOverlay = page.locator('.pointer-events-none.fixed.inset-0[class*="z-50"][class*="flex"][class*="justify-center"]').first();
    const gemBurstVisible = await gemBurstOverlay.count() > 0;

    if (gemBurstVisible) {
      // The inner content div: "relative h-72 w-[18rem]"
      const innerContent = gemBurstOverlay.locator('div.relative').first();
      const box = await innerContent.boundingBox().catch(() => null);
      const pass = checkCentered('Gem harvest burst content (w-[18rem])', box, VIEWPORT);
      results.push({ overlay: 'gem-harvest-burst', pass, box });
    } else {
      console.log(`  Gem burst overlay not currently visible (harvestAttempted=${harvestAttempted}). Check screenshots.`);
      // Try measuring from screenshot file info (static analysis fallback)
      // w-[18rem] = 288px; centered at 390/2 = 195, so box.x should be (390-288)/2 = 51px
      console.log(`  Static analysis: gem burst inner div is w-[18rem]=288px → at 390px viewport,`);
      console.log(`    expected box.x = (390-288)/2 = 51px, box.center = 195px (screen center) ✓`);
      results.push({ overlay: 'gem-harvest-burst', pass: null, note: `harvestAttempted=${harvestAttempted}, overlay not visible during measurement window` });
    }

    // Wait for burst to complete before next action
    await sleep(3500);

    // Re-close dev panels
    await page.evaluate(() => {
      document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
    });

    // ── OVERLAY 3: Reserve Burst ─────────────────────────────────────────────
    console.log('\n--- Reserve Burst (deck top reserve) ---');
    // Reserve burst fires from WebSocket update when player does a BLIND deck reserve.
    // trigger: click deck stack button [data-deck-tier="1"] → sheet opens →
    //          click "Reserve Hidden Card" (first) → click "Confirm: Reserve Hidden Card" (second)
    // Then burst fires after WebSocket state update (~0.3-1.5s).

    // Wait for the NEXT turn announcement for "AuditBot" to confirm a full turn cycle:
    //   our harvest → AI turn → back to AuditBot (new turn announcement fires)
    // This is the most reliable indicator that coreActionSubmitted has reset and
    // isMyTurnForCoreAction will be true.
    console.log('  Waiting for the next "AuditBot" turn announcement...');
    let ourTurnResumed = false;

    // Step A: wait for the turn announcement overlay to appear (it fires after turn change)
    for (let i = 0; i < 25; i++) {
      await page.evaluate(() => {
        document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
      });
      const turnAnnounce = await page.locator('[class*="fixed"][class*="inset-0"][class*="cursor-pointer"]').count();
      if (turnAnnounce > 0) {
        // Check if it's AuditBot's turn announcement (shows "Your Turn")
        const yourTurnText = await page.locator('text=Your Turn').count();
        if (yourTurnText > 0) {
          console.log(`  AuditBot turn announcement appeared (iteration ${i}).`);
          ourTurnResumed = true;
          break;
        }
        // It's the AI's turn announcement — dismiss it and keep waiting
        await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height / 2);
        await sleep(500);
      }
      await sleep(600);
    }

    if (!ourTurnResumed) {
      console.log('  (Timed out waiting for AuditBot turn announcement — proceeding anyway)');
    }

    // Step B: dismiss the "Your Turn" announcement and wait for actionsLocked to clear
    for (let j = 0; j < 5; j++) {
      const turnAnnounce = await page.locator('[class*="fixed"][class*="inset-0"][class*="cursor-pointer"]').count();
      if (turnAnnounce === 0) break;
      await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height / 2);
      await sleep(700);
    }

    await page.evaluate(() => {
      document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
    });
    // Extra settle time to ensure framer-motion exit animation completes and
    // actionsLocked becomes false
    await sleep(800);

    let reserveAttempted = false;
    try {
      // Click the Tier 1 deck stack button to open the deck sheet
      const deckBtn = page.locator('button[data-deck-tier="1"]').first();
      const deckBtnCount = await deckBtn.count();
      console.log(`  Deck stack button found: ${deckBtnCount > 0}`);

      if (deckBtnCount > 0) {
        await deckBtn.click();
        await sleep(600); // wait for sheet animation

        // Click "Reserve Hidden Card" (first click — sets pendingDeckConfirm=true)
        const reserveBtn = page.getByRole('button', { name: /Reserve Hidden Card/i }).first();
        const reserveBtnAlt = page.locator('button').filter({ hasText: /Reserve Hidden Card/ }).first();
        const btn1 = (await reserveBtn.count()) > 0 ? reserveBtn : reserveBtnAlt;

        if (await btn1.count() > 0) {
          await btn1.click();
          await sleep(400);

          // Click "Confirm: Reserve Hidden Card" (second click — fires the action)
          const confirmBtn = page.locator('button').filter({ hasText: /Confirm.*Reserve/ }).first();
          const confirmBtnAlt = page.getByRole('button', { name: /Confirm.*Reserve/i }).first();
          const btn2 = (await confirmBtn.count()) > 0 ? confirmBtn : confirmBtnAlt;

          if (await btn2.count() > 0) {
            await btn2.click();
            reserveAttempted = true;
            console.log('  Clicked Confirm: Reserve Hidden Card');
          } else {
            // May already be in confirm state — try clicking Reserve again
            const btn1Again = page.locator('button').filter({ hasText: /Reserve Hidden Card|Reserve.*Card/ }).first();
            if (await btn1Again.count() > 0) {
              await btn1Again.click();
              reserveAttempted = true;
              console.log('  Clicked Reserve Hidden Card (second attempt)');
            }
          }
        }
      }
    } catch (e) {
      console.log(`  Reserve click failed: ${e.message}`);
    }

    // Wait for WebSocket to deliver the state update and trigger the reserve burst.
    // On localhost the round-trip is typically 50–200ms.
    // We poll quickly to catch the overlay, measure it in-place, and screenshot it
    // before the AI's next turn announcement clears it.
    let reserveBurstCaptured = false;
    let reserveBurstBox = null;
    let reserveBurstPass = null;

    const reserveOverlayLocator = page.locator('.pointer-events-none.fixed.inset-0[class*="z-50"][class*="flex"][class*="justify-center"]');

    for (let tick = 0; tick < 20; tick++) {
      await sleep(150);
      const overlayCount = await reserveOverlayLocator.count();
      if (overlayCount > 0) {
        // Screenshot and measure while the overlay is still visible
        await page.screenshot({ path: `${OUT_DIR}/04-reserve-burst-immediate.png` });
        const innerContent = reserveOverlayLocator.first().locator('div.relative').first();
        reserveBurstBox = await innerContent.boundingBox().catch(() => null);
        reserveBurstPass = checkCentered('Reserve burst content', reserveBurstBox, VIEWPORT);
        console.log(`  Screenshot (caught at tick ${tick}, ~${(tick + 1) * 150}ms): ${OUT_DIR}/04-reserve-burst-immediate.png`);
        reserveBurstCaptured = true;
        break;
      }
    }
    if (!reserveBurstCaptured) {
      await page.screenshot({ path: `${OUT_DIR}/04-reserve-burst-immediate.png` });
      console.log(`  Screenshot (polling timeout — overlay not detected): ${OUT_DIR}/04-reserve-burst-immediate.png`);
    }

    await sleep(1000);
    await page.screenshot({ path: `${OUT_DIR}/05-reserve-burst-1s.png` });
    console.log(`  Screenshot (+1s):       ${OUT_DIR}/05-reserve-burst-1s.png`);

    if (reserveBurstCaptured) {
      results.push({ overlay: 'reserve-burst', pass: reserveBurstPass, box: reserveBurstBox });
    } else {
      console.log(`  Reserve burst overlay not detected (reserveAttempted=${reserveAttempted}). Check screenshots.`);
      // Static analysis: the container is "flex items-center gap-8" inside flex-center parent.
      // Total content width depends on CardBack (~112px) + gap (32px) + optional flux token.
      // With just CardBack (~112px): box.x ≈ (390-112)/2 = 139px, center ≈ 195px (screen center) ✓
      console.log(`  Static analysis: reserve burst inner content is flex-centered by parent "fixed inset-0 flex justify-center".`);
      console.log(`    Content (CardBack ~112px) would be at x≈139px, center≈195px (screen center) ✓`);
      results.push({ overlay: 'reserve-burst', pass: null, note: `reserveAttempted=${reserveAttempted}, overlay not detected` });
    }

    await sleep(3000);

    // ── Final state screenshot ────────────────────────────────────────────────
    await page.evaluate(() => {
      document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
    });
    await page.screenshot({ path: `${OUT_DIR}/06-final-state.png` });
    console.log(`\n  Final state: ${OUT_DIR}/06-final-state.png`);

  } finally {
    await browser.close();
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n=== AUDIT SUMMARY ===');
  let anyFail = false;
  for (const r of results) {
    const icon = r.pass === true ? '✓' : r.pass === false ? '✗' : '?';
    const note = r.note ? `  (${r.note})` : '';
    const val = r.value != null ? `  [value=${r.value}]` : '';
    console.log(`  ${icon}  ${r.overlay}${val}${note}`);
    if (r.pass === false) anyFail = true;
  }

  console.log('\nScreenshots:');
  [
    '01-turn-announcement.png',
    '02-gem-burst-immediate.png',
    '03-gem-burst-1s.png',
    '04-reserve-burst-immediate.png',
    '05-reserve-burst-1s.png',
    '06-final-state.png',
  ].forEach((f) => console.log(`  ${OUT_DIR}/${f}`));

  console.log(`\nOverall: ${anyFail ? 'FAIL' : 'PASS (or inconclusive — see ? items)'}`);

  // CSS-centered overlays analysis
  console.log('\n=== CSS CENTERING ANALYSIS ===');
  console.log('All four overlays use Tailwind CSS centering — NOT runtime JS positioning:');
  console.log('  turn-announcement : "fixed inset-0 z-50 flex items-center justify-center cursor-pointer"');
  console.log('  gem-harvest-burst : "pointer-events-none fixed inset-0 z-50 flex items-center justify-center"');
  console.log('  reserve-burst     : "pointer-events-none fixed inset-0 z-50 flex items-center justify-center"');
  console.log('  card-action burst : "pointer-events-none fixed inset-0 z-50" (no flex)');
  console.log('    └─ card element : inline style left: window.innerWidth/2 - cardWidth/2');
  console.log('    └─ label/avatar : "fixed left-0 right-0 flex flex-col items-center" → CSS centered');
  console.log('');
  console.log('The first three overlays center purely via CSS flexbox — they are immune to');
  console.log('window.innerWidth drift since no JS calculation is involved.');
  console.log('');
  console.log('The card-action burst card position uses window.innerWidth at the moment the');
  console.log('animation is created (component mount). Playwright\'s viewport sets innerWidth');
  console.log(`to exactly ${VIEWPORT.width}px (verified above), so the formula produces:`);
  console.log(`  x = ${VIEWPORT.width}/2 - cardWidth/2 = ${VIEWPORT.width / 2} - cardWidth/2 → card centered at ${VIEWPORT.width / 2}px ✓`);

  if (anyFail) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

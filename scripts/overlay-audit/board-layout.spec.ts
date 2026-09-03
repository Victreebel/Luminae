import { expect, test, type Page } from 'playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.LUMINAE_BASE_URL ?? 'http://localhost:5191';
const OUT = '/tmp/luminae-board-layout';

type SessionFixture = {
  room: { id: string; inviteCode: string };
  player: { id: string };
  sessionToken: string;
};

async function apiPost(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`POST ${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function createMatch(name: string) {
  const fixture = await apiPost('/api/rooms', {
    hostName: name,
    maxPlayers: 2,
    turnTimerSeconds: null,
  }) as SessionFixture;

  await apiPost(`/api/rooms/${fixture.room.id}/ai-players`, {
    sessionToken: fixture.sessionToken,
    difficulty: 'easy',
  });
  await apiPost(`/api/rooms/${fixture.room.id}/start`, {
    sessionToken: fixture.sessionToken,
  });

  return fixture;
}

async function launchMatch(page: Page, fixture: SessionFixture, name: string) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ room, player, sessionToken, name: playerName }) => {
    localStorage.setItem('luminae_session', JSON.stringify({
      roomId: room.id,
      inviteCode: room.inviteCode,
      playerId: player.id,
      sessionToken,
      playerName,
      isHost: true,
      avatarId: 'avatar_1',
    }));
    localStorage.removeItem('luminae_forge_view_reliquary');
  }, { ...fixture, name });

  await page.goto(`${BASE}/game/${fixture.room.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('forge-module')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('affinity-well-panel')).toBeVisible({ timeout: 15_000 });
  const openingSequence = page.getByLabel('Click to skip turn order animation');
  if (await openingSequence.count() === 1 && await openingSequence.isVisible()) {
    await openingSequence.click();
    await openingSequence.waitFor({ state: 'hidden', timeout: 10_000 });
  }
  const turnAnnouncement = page.locator('.turn-announcement-eminence');
  if (await turnAnnouncement.count() === 1 && await turnAnnouncement.isVisible()) {
    await turnAnnouncement.click();
    await turnAnnouncement.waitFor({ state: 'hidden', timeout: 5_000 });
  }
  await page.waitForTimeout(300);
}

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type BoardGeometry = {
  viewport: { width: number; height: number };
  document: { width: number; height: number };
  viewportClass: string | null;
  forgeDensity: string | null;
  sideAffinityWell: string | null;
  shellGridAreas: string;
  main: Rect;
  forge: Rect;
  forgeControls: Rect;
  forgeTiers: Rect;
  well: Rect;
  cards: Rect[];
  cardsUncovered: boolean[];
  molds: Rect[];
  channels: Rect[];
  channelButtons: Rect[];
  takeTwoButtons: Rect[];
};

async function readBoardGeometry(page: Page): Promise<BoardGeometry> {
  return page.evaluate(() => {
    const rect = (element: Element) => {
      const value = element.getBoundingClientRect();
      return {
        x: value.x,
        y: value.y,
        width: value.width,
        height: value.height,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        left: value.left,
      };
    };
    const one = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return rect(element);
    };
    const many = (selector: string) => Array.from(document.querySelectorAll(selector), rect);
    const shell = document.querySelector('.game-shell');
    const cardElements = Array.from(document.querySelectorAll('[data-testid="forge-card-slot"]'));

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      viewportClass: shell?.getAttribute('data-board-viewport') ?? null,
      forgeDensity: shell?.getAttribute('data-forge-density') ?? null,
      sideAffinityWell: shell?.getAttribute('data-side-affinity-well') ?? null,
      shellGridAreas: shell ? getComputedStyle(shell).gridTemplateAreas : '',
      main: one('.game-main'),
      forge: one('.board-forge'),
      forgeControls: one('.board-forge-controls'),
      forgeTiers: one('[data-forge-tiers="true"]'),
      well: one('.affinity-well-panel'),
      cards: cardElements.map(rect),
      cardsUncovered: cardElements.map((card) => {
        const bounds = card.getBoundingClientRect();
        const topmost = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        );
        return topmost !== null && card.contains(topmost);
      }),
      molds: many('.board-forge-card-row > .forge-foundry-mold'),
      channels: many('[data-testid="affinity-channel"]'),
      channelButtons: many('.affinity-well-cell-button'),
      takeTwoButtons: many('.affinity-well-take2'),
    };
  });
}

const boardViewports = [
  { width: 320, height: 568, label: '320x568', viewportClass: 'phone-portrait', forgeDensity: 'compact' },
  { width: 390, height: 844, label: '390x844', viewportClass: 'phone-portrait', forgeDensity: 'compact' },
  { width: 844, height: 390, label: '844x390', viewportClass: 'phone-landscape', forgeDensity: 'compact' },
  { width: 1440, height: 900, label: '1440x900', viewportClass: 'desktop', forgeDensity: 'compact' },
  { width: 1920, height: 1080, label: '1920x1080', viewportClass: 'desktop', forgeDensity: 'full' },
] as const;

test.describe('canonical responsive board', () => {
  let fixture: SessionFixture;

  test.beforeAll(async () => {
    fixture = await createMatch('Layout audit');
  });

  for (const viewport of boardViewports) {
    test(`board keeps the complete Forge and Well visible at ${viewport.label}`, async ({ page }) => {
      mkdirSync(OUT, { recursive: true });
      await page.setViewportSize(viewport);
      await launchMatch(page, fixture, `Layout ${viewport.label}`);

      const geometry = await readBoardGeometry(page);
      expect(geometry.viewport).toEqual({ width: viewport.width, height: viewport.height });
      expect(geometry.viewportClass).toBe(viewport.viewportClass);
      expect(geometry.forgeDensity).toBe(viewport.forgeDensity);
      if (viewport.width > viewport.height) {
        expect(geometry.sideAffinityWell).toBe('true');
      }
      expect(geometry.document.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.document.height).toBeLessThanOrEqual(viewport.height + 1);

      expect(geometry.cards).toHaveLength(12);
      expect(
        geometry.forgeControls.bottom,
        JSON.stringify({ controls: geometry.forgeControls, tiers: geometry.forgeTiers }),
      ).toBeLessThanOrEqual(geometry.forgeTiers.top + 1);
      expect(
        geometry.cardsUncovered,
        JSON.stringify({
          grid: geometry.shellGridAreas,
          main: geometry.main,
          well: geometry.well,
          cards: geometry.cards,
        }),
      ).toEqual(Array.from({ length: 12 }, () => true));
      expect(geometry.molds).toHaveLength(12);
      for (const card of geometry.cards) {
        expect(card.width).toBeGreaterThanOrEqual(44);
        expect(card.height).toBeGreaterThanOrEqual(62);
        expect(card.left).toBeGreaterThanOrEqual(0);
        expect(card.right).toBeLessThanOrEqual(viewport.width + 1);
        expect(card.top).toBeGreaterThanOrEqual(0);
        expect(card.bottom).toBeLessThanOrEqual(viewport.height + 1);
        expect(card.width / card.height).toBeCloseTo(0.7, 1);
      }

      expect(geometry.channels).toHaveLength(6);
      expect(geometry.channelButtons).toHaveLength(6);
      expect(geometry.takeTwoButtons).toHaveLength(6);
      expect(geometry.well.left).toBeGreaterThanOrEqual(0);
      expect(geometry.well.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.well.top).toBeGreaterThanOrEqual(0);
      expect(geometry.well.bottom).toBeLessThanOrEqual(viewport.height);
      for (const button of [...geometry.channelButtons, ...geometry.takeTwoButtons]) {
        if (viewport.viewportClass !== 'desktop') {
          expect(button.width).toBeGreaterThanOrEqual(44);
          expect(button.height).toBeGreaterThanOrEqual(44);
        }
        expect(button.left).toBeGreaterThanOrEqual(0);
        expect(button.right).toBeLessThanOrEqual(viewport.width + 1);
      }

      await page.screenshot({ path: `${OUT}/${viewport.label}.png` });
    });
  }
});

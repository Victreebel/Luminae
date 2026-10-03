import { expect, test, type APIRequestContext } from "playwright/test";

const REVIEW_HEADERS = {
  "Content-Type": "application/json",
  "X-Luminae-UX-Review": "1",
};

interface ReviewSession {
  session: {
    account: { id: string; username: string; email: string | null };
    token: string;
    expiresAt: string;
  };
}

function authenticatedHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function deleteReviewAccount(request: APIRequestContext, token: string) {
  await request.delete("/api/dev/ux-review/sessions/current", {
    headers: { ...REVIEW_HEADERS, Authorization: `Bearer ${token}` },
  });
}

test("First Contact is committed once per account without a quiz surface", async ({ page, request }) => {
  const createdResponse = await request.post("/api/dev/ux-review/sessions", {
    headers: REVIEW_HEADERS,
    data: { checkpointId: "fresh" },
  });
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json() as ReviewSession;
  const token = created.session.token;

  try {
    const firstCompletion = await request.post("/api/onboarding/tutorial/complete", {
      headers: authenticatedHeaders(token),
      data: {
        stance: "curious",
        rapport: "receptive",
        discoveries: ["lumii_origin"],
      },
    });
    expect(firstCompletion.ok()).toBe(true);
    const firstProgress = await firstCompletion.json();
    expect(firstProgress.completed).toBe(true);
    expect(firstProgress.completionLumeAwarded).toBe(10);
    expect(firstProgress.discoveries).toEqual(["lumii_origin"]);
    expect(firstProgress.firstContactRapport).toBe("receptive");

    const repeatedCompletion = await request.post("/api/onboarding/tutorial/complete", {
      headers: authenticatedHeaders(token),
      data: {
        stance: "resolute",
        rapport: "sparring",
        discoveries: ["lumii_origin", "artifact_mastery", "encryption_authority"],
      },
    });
    expect(repeatedCompletion.ok()).toBe(true);
    const repeatedProgress = await repeatedCompletion.json();
    expect(repeatedProgress.discoveries).toEqual(["lumii_origin"]);
    expect(repeatedProgress.firstContactRapport).toBe("receptive");
    expect(repeatedProgress.completionLumeAwarded).toBe(10);

    const preferences = await request.get("/api/auth/me/preferences", {
      headers: authenticatedHeaders(token),
    });
    expect((await preferences.json()).firstContactStance).toBe("curious");

    await page.addInitScript((session) => {
      localStorage.setItem("luminae_account_session", JSON.stringify(session));
    }, created.session);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/tutorial");

    await expect(page.getByRole("heading", { name: "This encounter is part of your record" })).toBeVisible();
    await expect(page.getByText(/Inquiry/i)).toHaveCount(0);
    await expect(page.getByText("Replay Tutorial", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth),
    );

    await page.goto("/tutorial?inquiry=1");
    await expect(page.getByRole("heading", { name: "This encounter is part of your record" })).toBeVisible();
    await expect(page.getByText(/Inquiry/i)).toHaveCount(0);

    const retiredQuizEndpoint = await request.post("/api/onboarding/tutorial/quiz", {
      headers: authenticatedHeaders(token),
      data: { answers: [] },
    });
    expect(retiredQuizEndpoint.status()).toBe(404);

    await page.goto("/");
    await expect(page.getByText("First Contact Complete", { exact: true })).toBeVisible();
    await expect(page.getByText(/Inquiry/i)).toHaveCount(0);
    await expect(page.getByText("Replay Tutorial", { exact: true })).toHaveCount(0);
  } finally {
    await deleteReviewAccount(request, token);
  }
});

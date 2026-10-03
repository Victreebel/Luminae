import { Router, type IRouter } from "express";
import type { Request } from "express";
import { z } from "zod";
import {
  ARCHITECT_FIRST_CONTACT_STANCES,
  FIRST_CONTACT_RAPPORTS,
  TUTORIAL_DISCOVERY_IDS,
} from "@workspace/game-types";
import { accountAuth } from "../lib/accountAuth";
import {
  completeTutorialInvestigation,
  readTutorialInvestigation,
} from "../lib/tutorialInvestigation";
import { rateLimit } from "../lib/httpSecurity";

const router: IRouter = Router();

const CompleteBody = z.object({
  stance: z.enum(ARCHITECT_FIRST_CONTACT_STANCES),
  rapport: z.enum(FIRST_CONTACT_RAPPORTS).nullable().optional(),
  discoveries: z.array(z.enum(TUTORIAL_DISCOVERY_IDS)).max(TUTORIAL_DISCOVERY_IDS.length),
});

router.get("/onboarding/tutorial", accountAuth, async (req: Request, res): Promise<void> => {
  res.json(await readTutorialInvestigation(req.account!.id));
});

router.post(
  "/onboarding/tutorial/complete",
  accountAuth,
  rateLimit({ scope: "tutorial-complete", max: 12, windowMs: 60_000 }),
  async (req: Request, res): Promise<void> => {
    const parsed = CompleteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid tutorial completion" });
      return;
    }
    res.json(await completeTutorialInvestigation(
      req.account!.id,
      parsed.data.stance,
      parsed.data.rapport ?? null,
      parsed.data.discoveries,
    ));
  },
);

export default router;

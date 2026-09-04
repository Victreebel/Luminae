import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roomsRouter from "./rooms";
import gameRouter from "./game";
import authRouter from "./auth";
import passwordResetRouter from "./passwordReset";
import friendsRouter from "./friends";
import challengesRouter from "./challenges";
import storeRouter from "./store";
import blueprintsRouter from "./blueprints";
import chroniclesRouter from "./chronicles";
import moderationRouter from "./moderation";
import telemetryRouter from "./telemetry";
import uxReviewRouter from "./uxReview";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(passwordResetRouter);
router.use(friendsRouter);
router.use(challengesRouter);
router.use(storeRouter);
router.use(blueprintsRouter);
router.use(chroniclesRouter);
router.use(moderationRouter);
router.use(telemetryRouter);
router.use(uxReviewRouter);
router.use(roomsRouter);
router.use(gameRouter);

export default router;

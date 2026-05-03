import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roomsRouter from "./rooms";
import gameRouter from "./game";

const router: IRouter = Router();

router.use(healthRouter);
router.use(roomsRouter);
router.use(gameRouter);

export default router;

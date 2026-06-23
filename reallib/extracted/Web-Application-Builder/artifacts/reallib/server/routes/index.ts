import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reallibRouter, { seatPublicRouter } from "./reallib/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reallibRouter);
router.use(seatPublicRouter);

export default router;

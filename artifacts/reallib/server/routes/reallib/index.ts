import { Router, type IRouter } from "express";
import authRouter from "./auth";
import studentsRouter from "./students";
import seatsRouter from "./seats";
import allocationsRouter from "./allocations";
import attendanceRouter from "./attendance";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import seatPublicRouter from "./seat-public";

const router: IRouter = Router();

router.use("/reallib", authRouter);
router.use("/reallib", studentsRouter);
router.use("/reallib", seatsRouter);
router.use("/reallib", allocationsRouter);
router.use("/reallib", attendanceRouter);
router.use("/reallib", dashboardRouter);
router.use("/reallib", reportsRouter);

export { seatPublicRouter };
export default router;

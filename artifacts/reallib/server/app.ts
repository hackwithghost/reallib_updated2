import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { eq, and, sql } from "drizzle-orm";
import { db, studentsTable } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Auto-expire payments: mark students as unpaid if paidSince > 30 days ago
async function expireMonthlyPayments() {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const expired = await db
      .update(studentsTable)
      .set({
        isPaid: false,
        unpaidSince: new Date(),
        paidSince: null,
      })
      .where(
        and(
          eq(studentsTable.isPaid, true),
          sql`${studentsTable.paidSince} IS NOT NULL`,
          sql`${studentsTable.paidSince} <= ${oneMonthAgo.toISOString()}`
        )
      )
      .returning({ id: studentsTable.id, name: studentsTable.name });

    if (expired.length > 0) {
      logger.info({ count: expired.length, students: expired.map(s => s.name) }, "Auto-expired monthly payments");
    }
  } catch (err) {
    logger.error({ err }, "Failed to run payment expiry job");
  }
}

// Run at startup and every hour
expireMonthlyPayments();
setInterval(expireMonthlyPayments, 60 * 60 * 1000);

export default app;

import { Router, type IRouter } from "express";
import { eq, and, gte, lte, type SQL } from "drizzle-orm";
import { db, attendanceLogsTable, studentsTable, seatsTable } from "@workspace/db";
import { GetAttendanceReportQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../../lib/auth";

const router: IRouter = Router();

router.get("/reports/attendance", requireAuth, async (req, res): Promise<void> => {
  const qp = GetAttendanceReportQueryParams.safeParse(req.query);
  const conditions: SQL[] = [];
  if (qp.success) {
    if (qp.data.studentId) conditions.push(eq(attendanceLogsTable.studentId, Number(qp.data.studentId)));
    if (qp.data.seatId) conditions.push(eq(attendanceLogsTable.seatId, Number(qp.data.seatId)));
    if (qp.data.dateFrom) conditions.push(gte(attendanceLogsTable.date, qp.data.dateFrom));
    if (qp.data.dateTo) conditions.push(lte(attendanceLogsTable.date, qp.data.dateTo));
  }
  const rows = conditions.length > 0
    ? await db.select().from(attendanceLogsTable).where(and(...conditions)).orderBy(attendanceLogsTable.date)
    : await db.select().from(attendanceLogsTable).orderBy(attendanceLogsTable.date);

  const enriched = await Promise.all(rows.map(async (log) => {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, log.studentId));
    const [seat] = await db.select().from(seatsTable).where(eq(seatsTable.id, log.seatId));
    return {
      ...log,
      markedAt: log.markedAt.toISOString(),
      createdAt: log.createdAt.toISOString(),
      student: student ? { ...student, createdAt: student.createdAt.toISOString() } : undefined,
      seat: seat ? { ...seat, createdAt: seat.createdAt.toISOString() } : undefined,
    };
  }));

  res.json(enriched);
});

export default router;

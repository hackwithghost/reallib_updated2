import { Router, type IRouter } from "express";
import { eq, and, gte, lte, type SQL } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, attendanceLogsTable, studentsTable, seatsTable, seatAllocationsTable } from "@workspace/db";
import {
  MarkAttendanceBody,
  ListAttendanceQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../../lib/auth";

const router: IRouter = Router();

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const qp = ListAttendanceQueryParams.safeParse(req.query);
  const conditions: SQL[] = [];
  if (qp.success) {
    if (qp.data.studentId) conditions.push(eq(attendanceLogsTable.studentId, Number(qp.data.studentId)));
    if (qp.data.seatId) conditions.push(eq(attendanceLogsTable.seatId, Number(qp.data.seatId)));
    if (qp.data.dateFrom) conditions.push(gte(attendanceLogsTable.date, qp.data.dateFrom));
    if (qp.data.dateTo) conditions.push(lte(attendanceLogsTable.date, qp.data.dateTo));
    if (qp.data.status) conditions.push(eq(attendanceLogsTable.status, qp.data.status));
  }
  const rows = conditions.length > 0
    ? await db.select().from(attendanceLogsTable).where(and(...conditions)).orderBy(attendanceLogsTable.markedAt)
    : await db.select().from(attendanceLogsTable).orderBy(attendanceLogsTable.markedAt);

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

router.post("/attendance", async (req, res): Promise<void> => {
  const parsed = MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { seatId, rollNumber, pin } = parsed.data;
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.rollNumber, rollNumber));
  if (!student) {
    res.status(401).json({ error: "Invalid roll number or PIN" });
    return;
  }
  const validPin = await bcrypt.compare(pin, student.pinHash);
  if (!validPin) {
    res.status(401).json({ error: "Invalid roll number or PIN" });
    return;
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const allocations = await db.select().from(seatAllocationsTable)
    .where(and(eq(seatAllocationsTable.seatId, seatId), eq(seatAllocationsTable.studentId, student.id), eq(seatAllocationsTable.isActive, true)));
  const localTime = typeof req.body.localTime === "string" ? req.body.localTime : null;
  const currentAllocation = localTime
    ? (allocations.find(a => a.startTime <= localTime && a.endTime >= localTime) ?? allocations[0] ?? null)
    : (allocations[0] ?? null);
  if (!currentAllocation) {
    res.status(400).json({ error: "No active allocation for this student at this seat" });
    return;
  }

  const existing = await db.select().from(attendanceLogsTable)
    .where(and(eq(attendanceLogsTable.studentId, student.id), eq(attendanceLogsTable.seatId, seatId), eq(attendanceLogsTable.date, today)));
  if (existing.length > 0) {
    res.status(400).json({ error: "Attendance already marked for today" });
    return;
  }

  const slotStart = currentAllocation.startTime;
  const [sh, sm] = slotStart.split(":").map(Number);
  const lateThreshold = new Date(now);
  lateThreshold.setHours(sh, sm + 15, 0, 0);
  const status = now > lateThreshold ? "late" : "present";

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "";
  const [log] = await db.insert(attendanceLogsTable).values({
    studentId: student.id,
    seatId,
    allocationId: currentAllocation.id,
    date: today,
    markedAt: now,
    status,
    ipAddress: ip,
  }).returning();

  const [seat] = await db.select().from(seatsTable).where(eq(seatsTable.id, seatId));
  res.status(201).json({
    ...log,
    markedAt: log.markedAt.toISOString(),
    createdAt: log.createdAt.toISOString(),
    student: { ...student, createdAt: student.createdAt.toISOString() },
    seat: seat ? { ...seat, createdAt: seat.createdAt.toISOString() } : undefined,
  });
});

export default router;

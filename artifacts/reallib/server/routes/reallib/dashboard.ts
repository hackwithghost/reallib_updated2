import { Router, type IRouter } from "express";
import { eq, sql, count, and, notInArray } from "drizzle-orm";
import { db, studentsTable, seatsTable, seatAllocationsTable, attendanceLogsTable } from "@workspace/db";
import { requireAuth } from "../../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const [{ totalStudents }] = await db.select({ totalStudents: count() }).from(studentsTable);
  const [{ totalSeats }] = await db.select({ totalSeats: count() }).from(seatsTable);

  const todayLogs = await db.select().from(attendanceLogsTable).where(eq(attendanceLogsTable.date, today));
  const todayAttendance = todayLogs.length;
  const presentToday = todayLogs.filter(l => l.status === "present").length;
  const lateToday = todayLogs.filter(l => l.status === "late").length;

  const [{ activeAllocations }] = await db.select({ activeAllocations: count() }).from(seatAllocationsTable).where(eq(seatAllocationsTable.isActive, true));

  const unpaidStudents = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.isPaid, false));
  const unpaidCount = unpaidStudents[0]?.count ?? 0;

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const overdueStudents = await db.select({ count: count() }).from(studentsTable).where(
    and(
      eq(studentsTable.isPaid, false),
      sql`${studentsTable.unpaidSince} <= ${oneMonthAgo.toISOString()}`
    )
  );
  const overdueUnpaidCount = overdueStudents[0]?.count ?? 0;

  // Absent today = actively allocated students with no attendance log for today
  const todayPresentIds = todayLogs.map(l => l.studentId);
  const allocatedStudents = await db
    .select({ studentId: seatAllocationsTable.studentId })
    .from(seatAllocationsTable)
    .where(eq(seatAllocationsTable.isActive, true));
  const absentCount = allocatedStudents.filter(a => !todayPresentIds.includes(a.studentId)).length;

  res.json({ totalStudents, totalSeats, todayAttendance, activeAllocations, presentToday, lateToday, unpaidCount, overdueUnpaidCount, absentCount });
});

router.get("/dashboard/unpaid-students", requireAuth, async (req, res): Promise<void> => {
  const unpaid = await db.select().from(studentsTable)
    .where(eq(studentsTable.isPaid, false))
    .orderBy(studentsTable.unpaidSince);

  const now = new Date();
  const result = unpaid.map(s => {
    const unpaidSinceDate = s.unpaidSince ? new Date(s.unpaidSince) : null;
    const daysUnpaid = unpaidSinceDate
      ? Math.floor((now.getTime() - unpaidSinceDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    return {
      id: s.id,
      name: s.name,
      rollNumber: s.rollNumber,
      phoneNumber: s.phoneNumber,
      isActive: s.isActive,
      isPaid: s.isPaid,
      unpaidSince: unpaidSinceDate ? unpaidSinceDate.toISOString() : null,
      daysUnpaid,
      isOverdue: daysUnpaid >= 30,
      createdAt: s.createdAt.toISOString(),
    };
  });

  res.json(result);
});

router.get("/dashboard/absent-students", requireAuth, async (req, res): Promise<void> => {
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

  // Get all students who attended on this date
  const attendedLogs = await db.select().from(attendanceLogsTable).where(eq(attendanceLogsTable.date, date));
  const attendedStudentIds = attendedLogs.map(l => l.studentId);

  // Get all actively allocated students (have a seat)
  const allocations = await db
    .select({
      studentId: seatAllocationsTable.studentId,
      seatId: seatAllocationsTable.seatId,
      startTime: seatAllocationsTable.startTime,
      endTime: seatAllocationsTable.endTime,
    })
    .from(seatAllocationsTable)
    .where(eq(seatAllocationsTable.isActive, true));

  // Unique allocated student IDs
  const allocatedStudentIds = [...new Set(allocations.map(a => a.studentId))];

  // Find absent = allocated but not attended
  const absentStudentIds = allocatedStudentIds.filter(id => !attendedStudentIds.includes(id));

  if (absentStudentIds.length === 0) {
    res.json([]);
    return;
  }

  // Fetch student details
  const absentStudents = await db.select().from(studentsTable)
    .where(sql`${studentsTable.id} = ANY(${absentStudentIds})`);

  const result = absentStudents.map(s => {
    const alloc = allocations.find(a => a.studentId === s.id);
    return {
      id: s.id,
      name: s.name,
      rollNumber: s.rollNumber,
      phoneNumber: s.phoneNumber,
      isActive: s.isActive,
      isPaid: s.isPaid,
      seatId: alloc?.seatId ?? null,
      allocatedSlot: alloc ? `${alloc.startTime} – ${alloc.endTime}` : null,
      createdAt: s.createdAt.toISOString(),
    };
  });

  res.json(result);
});

router.get("/dashboard/daily-attendance", requireAuth, async (req, res): Promise<void> => {
  const days = parseInt(req.query.days as string) || 7;
  const results: { date: string; count: number; present: number; late: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const logs = await db.select().from(attendanceLogsTable).where(eq(attendanceLogsTable.date, dateStr));
    results.push({
      date: dateStr,
      count: logs.length,
      present: logs.filter(l => l.status === "present").length,
      late: logs.filter(l => l.status === "late").length,
    });
  }
  res.json(results);
});

router.get("/dashboard/weekly-attendance", requireAuth, async (req, res): Promise<void> => {
  const results: { week: string; count: number; present: number; late: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startStr = weekStart.toISOString().split("T")[0];
    const endStr = weekEnd.toISOString().split("T")[0];
    const logs = await db.select().from(attendanceLogsTable)
      .where(sql`${attendanceLogsTable.date} >= ${startStr} AND ${attendanceLogsTable.date} <= ${endStr}`);
    const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    results.push({
      week: label,
      count: logs.length,
      present: logs.filter(l => l.status === "present").length,
      late: logs.filter(l => l.status === "late").length,
    });
  }
  res.json(results);
});

export default router;

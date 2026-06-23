import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, seatAllocationsTable, seatsTable, studentsTable } from "@workspace/db";
import {
  CreateAllocationBody,
  DeleteAllocationParams,
  ListAllocationsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../../lib/auth";

function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 < e2 && s2 < e1;
}

const router: IRouter = Router();

router.get("/allocations", requireAuth, async (req, res): Promise<void> => {
  const qParams = ListAllocationsQueryParams.safeParse(req.query);
  const conditions: SQL[] = [];
  if (qParams.success) {
    if (qParams.data.seatId) conditions.push(eq(seatAllocationsTable.seatId, Number(qParams.data.seatId)));
    if (qParams.data.studentId) conditions.push(eq(seatAllocationsTable.studentId, Number(qParams.data.studentId)));
    if (qParams.data.active !== undefined) conditions.push(eq(seatAllocationsTable.isActive, qParams.data.active === "true"));
  }
  const rows = conditions.length > 0
    ? await db.select().from(seatAllocationsTable).where(and(...conditions)).orderBy(seatAllocationsTable.createdAt)
    : await db.select().from(seatAllocationsTable).orderBy(seatAllocationsTable.createdAt);

  const enriched = await Promise.all(rows.map(async (a) => {
    const [seat] = await db.select().from(seatsTable).where(eq(seatsTable.id, a.seatId));
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, a.studentId));
    return {
      ...a,
      createdAt: a.createdAt.toISOString(),
      seat: seat ? { ...seat, createdAt: seat.createdAt.toISOString() } : undefined,
      student: student ? { ...student, createdAt: student.createdAt.toISOString() } : undefined,
    };
  }));
  res.json(enriched);
});

router.post("/allocations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAllocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { seatId, studentId, startTime, endTime } = parsed.data;
  const existing = await db.select().from(seatAllocationsTable)
    .where(and(eq(seatAllocationsTable.seatId, seatId), eq(seatAllocationsTable.isActive, true)));
  const overlap = existing.find(a => timesOverlap(startTime, endTime, a.startTime, a.endTime));
  if (overlap) {
    res.status(400).json({ error: `Overlapping time slot: ${overlap.startTime} - ${overlap.endTime}` });
    return;
  }
  const [allocation] = await db.insert(seatAllocationsTable).values({ seatId, studentId, startTime, endTime }).returning();
  const [seat] = await db.select().from(seatsTable).where(eq(seatsTable.id, seatId));
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  res.status(201).json({
    ...allocation,
    createdAt: allocation.createdAt.toISOString(),
    seat: seat ? { ...seat, createdAt: seat.createdAt.toISOString() } : undefined,
    student: student ? { ...student, createdAt: student.createdAt.toISOString() } : undefined,
  });
});

router.delete("/allocations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAllocationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [a] = await db.delete(seatAllocationsTable).where(eq(seatAllocationsTable.id, params.data.id)).returning();
  if (!a) {
    res.status(404).json({ error: "Allocation not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, seatsTable, seatAllocationsTable, studentsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/reallib/seat/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid seat ID" });
    return;
  }
  const [seat] = await db.select().from(seatsTable).where(eq(seatsTable.id, id));
  if (!seat) {
    res.status(404).json({ error: "Seat not found" });
    return;
  }
  const allocations = await db.select().from(seatAllocationsTable)
    .where(and(eq(seatAllocationsTable.seatId, id), eq(seatAllocationsTable.isActive, true)));
  const localTime = typeof req.query.localTime === "string" ? req.query.localTime : null;
  const currentAllocation = localTime
    ? (allocations.find(a => a.startTime <= localTime && a.endTime >= localTime) ?? allocations[0] ?? null)
    : (allocations[0] ?? null);
  let student = null;
  if (currentAllocation) {
    const [s] = await db.select().from(studentsTable).where(eq(studentsTable.id, currentAllocation.studentId));
    student = s ? { ...s, createdAt: s.createdAt.toISOString() } : null;
  }
  res.json({
    ...seat,
    createdAt: seat.createdAt.toISOString(),
    currentAllocation: currentAllocation ? {
      ...currentAllocation,
      createdAt: currentAllocation.createdAt.toISOString(),
      student,
    } : null,
  });
});

export default router;

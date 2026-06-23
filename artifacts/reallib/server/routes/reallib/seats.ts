import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import QRCode from "qrcode";
import { db, seatsTable, seatAllocationsTable, studentsTable } from "@workspace/db";
import {
  CreateSeatBody,
  GetSeatParams,
  DeleteSeatParams,
  GetSeatQrParams,
} from "@workspace/api-zod";
import { requireAuth } from "../../lib/auth";

const DOMAINS = process.env.REPLIT_DOMAINS?.split(",")[0];
const BASE_URL = DOMAINS ? `https://${DOMAINS}` : "http://localhost:80";

async function generateQrUrl(seatId: number): Promise<string> {
  const url = `${BASE_URL}/reallib/seat/${seatId}`;
  return url;
}

const router: IRouter = Router();

router.get("/seats", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(seatsTable).orderBy(seatsTable.seatNumber);
  res.json(rows.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/seats", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSeatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [seat] = await db.insert(seatsTable).values({ seatNumber: parsed.data.seatNumber }).returning();
  const qrUrl = await generateQrUrl(seat.id);
  const qrDataUrl = await QRCode.toDataURL(qrUrl);
  const [updated] = await db.update(seatsTable).set({ qrCode: qrDataUrl }).where(eq(seatsTable.id, seat.id)).returning();
  res.status(201).json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.get("/seats/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSeatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [seat] = await db.select().from(seatsTable).where(eq(seatsTable.id, params.data.id));
  if (!seat) {
    res.status(404).json({ error: "Seat not found" });
    return;
  }
  const allocations = await db.select().from(seatAllocationsTable)
    .where(and(eq(seatAllocationsTable.seatId, params.data.id), eq(seatAllocationsTable.isActive, true)));
  const currentAllocation = allocations[0] ?? null;
  let currentAllocationWithStudent = null;
  if (currentAllocation) {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, currentAllocation.studentId));
    currentAllocationWithStudent = {
      ...currentAllocation,
      createdAt: currentAllocation.createdAt.toISOString(),
      student: student ? { ...student, createdAt: student.createdAt.toISOString() } : undefined,
    };
  }
  res.json({
    ...seat,
    createdAt: seat.createdAt.toISOString(),
    currentAllocation: currentAllocationWithStudent,
  });
});

router.delete("/seats/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSeatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [seat] = await db.delete(seatsTable).where(eq(seatsTable.id, params.data.id)).returning();
  if (!seat) {
    res.status(404).json({ error: "Seat not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/seats/:id/qr", requireAuth, async (req, res): Promise<void> => {
  const params = GetSeatQrParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [seat] = await db.select().from(seatsTable).where(eq(seatsTable.id, params.data.id));
  if (!seat) {
    res.status(404).json({ error: "Seat not found" });
    return;
  }
  const qrUrl = await generateQrUrl(seat.id);
  let qrDataUrl = seat.qrCode;
  if (!qrDataUrl || !qrDataUrl.startsWith("data:")) {
    qrDataUrl = await QRCode.toDataURL(qrUrl);
    await db.update(seatsTable).set({ qrCode: qrDataUrl }).where(eq(seatsTable.id, seat.id));
  }
  res.json({ seatId: seat.id, seatNumber: seat.seatNumber, qrDataUrl, qrUrl });
});

export default router;

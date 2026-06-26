import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, ilike, and, isNotNull, type SQL } from "drizzle-orm";
import { db, studentsTable } from "@workspace/db";
import {
  CreateStudentBody,
  UpdateStudentBody,
  GetStudentParams,
  UpdateStudentParams,
  DeleteStudentParams,
  ListStudentsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../../lib/auth";

const router: IRouter = Router();

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const params = ListStudentsQueryParams.safeParse(req.query);
  const conditions: SQL[] = [];
  if (params.success && params.data.search) {
    conditions.push(ilike(studentsTable.name, `%${params.data.search}%`));
  }
  if (params.success && params.data.active !== undefined) {
    conditions.push(eq(studentsTable.isActive, params.data.active === "true"));
  }
  const rows = conditions.length > 0
    ? await db.select().from(studentsTable).where(and(...conditions)).orderBy(studentsTable.createdAt)
    : await db.select().from(studentsTable).orderBy(studentsTable.createdAt);
  res.json(rows.map(s => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    unpaidSince: s.unpaidSince ? s.unpaidSince.toISOString() : null,
  })));
});

router.post("/students", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { pin, isActive, ...rest } = parsed.data;
  const pinHash = await bcrypt.hash(pin, 10);
  const [student] = await db.insert(studentsTable).values({
    ...rest,
    pinHash,
    isActive: isActive ?? true,
    isPaid: true,
    unpaidSince: null,
  }).returning();
  res.status(201).json({
    ...student,
    createdAt: student.createdAt.toISOString(),
    unpaidSince: student.unpaidSince ? student.unpaidSince.toISOString() : null,
  });
});

// Must be before /:id to avoid Express treating "face-descriptors" as an id param
router.get("/students/face-descriptors", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select({
    id: studentsTable.id,
    name: studentsTable.name,
    rollNumber: studentsTable.rollNumber,
    faceDescriptor: studentsTable.faceDescriptor,
  }).from(studentsTable).where(
    and(isNotNull(studentsTable.faceDescriptor), eq(studentsTable.isActive, true))
  );
  res.json(rows);
});

router.patch("/students/:id/face", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { descriptor } = req.body as { descriptor: number[] };
  if (!descriptor || !Array.isArray(descriptor)) {
    res.status(400).json({ error: "descriptor must be a number array" }); return;
  }
  const [student] = await db.update(studentsTable)
    .set({ faceDescriptor: JSON.stringify(descriptor) })
    .where(eq(studentsTable.id, id))
    .returning();
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  res.json({ success: true, name: student.name });
});

router.get("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json({
    ...student,
    createdAt: student.createdAt.toISOString(),
    unpaidSince: student.unpaidSince ? student.unpaidSince.toISOString() : null,
  });
});

router.patch("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { pin, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (pin) {
    updateData.pinHash = await bcrypt.hash(pin, 10);
  }
  const [student] = await db.update(studentsTable).set(updateData).where(eq(studentsTable.id, params.data.id)).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json({
    ...student,
    createdAt: student.createdAt.toISOString(),
    unpaidSince: student.unpaidSince ? student.unpaidSince.toISOString() : null,
  });
});

router.patch("/students/:id/payment", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { isPaid } = req.body as { isPaid: boolean };
  if (typeof isPaid !== "boolean") {
    res.status(400).json({ error: "isPaid must be a boolean" });
    return;
  }
  const updateData: Record<string, unknown> = {
    isPaid,
    unpaidSince: isPaid ? null : new Date(),
    paidSince: isPaid ? new Date() : null,
  };
  const [student] = await db.update(studentsTable).set(updateData).where(eq(studentsTable.id, params.data.id)).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json({
    ...student,
    createdAt: student.createdAt.toISOString(),
    unpaidSince: student.unpaidSince ? student.unpaidSince.toISOString() : null,
  });
});

router.delete("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db.delete(studentsTable).where(eq(studentsTable.id, params.data.id)).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;

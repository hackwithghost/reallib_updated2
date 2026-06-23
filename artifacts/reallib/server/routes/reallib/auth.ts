import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, adminsTable } from "@workspace/db";
import { AdminLoginBody, ChangePasswordBody } from "@workspace/api-zod";
import { signToken, requireAuth } from "../../lib/auth";
import type { Request } from "express";
import type { AdminPayload } from "../../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.username, username));
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken({ id: admin.id, username: admin.username });
  res.json({ token, admin: { id: admin.id, username: admin.username } });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const adminReq = req as Request & { admin: AdminPayload };
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, adminReq.admin.id));
  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(adminsTable).set({ passwordHash: newHash }).where(eq(adminsTable.id, admin.id));
  res.json({ message: "Password changed successfully" });
});

export default router;

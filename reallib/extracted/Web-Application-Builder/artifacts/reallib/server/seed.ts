import bcrypt from "bcryptjs";
import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";

async function seed() {
  const hash = await bcrypt.hash("admin123", 10);
  const existing = await db.select().from(adminsTable).where(eq(adminsTable.username, "admin"));
  if (existing.length === 0) {
    await db.insert(adminsTable).values({ username: "admin", passwordHash: hash });
    logger.info("Admin user seeded: username=admin password=admin123");
  } else {
    logger.info("Admin user already exists");
  }
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});

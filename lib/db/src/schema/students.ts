import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rollNumber: text("roll_number").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  pinHash: text("pin_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isPaid: boolean("is_paid").notNull().default(true),
  unpaidSince: timestamp("unpaid_since", { withTimezone: true }),
  paidSince: timestamp("paid_since", { withTimezone: true }).defaultNow(),
  faceDescriptor: text("face_descriptor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;

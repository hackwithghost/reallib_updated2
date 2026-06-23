import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { seatsTable } from "./seats";
import { studentsTable } from "./students";
import { seatAllocationsTable } from "./allocations";

export const attendanceLogsTable = pgTable("attendance_logs", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  seatId: integer("seat_id").notNull().references(() => seatsTable.id, { onDelete: "cascade" }),
  allocationId: integer("allocation_id").references(() => seatAllocationsTable.id, { onDelete: "set null" }),
  date: date("date", { mode: "string" }).notNull(),
  markedAt: timestamp("marked_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("present"),
  ipAddress: text("ip_address").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAttendanceLogSchema = createInsertSchema(attendanceLogsTable).omit({ id: true, createdAt: true });
export type InsertAttendanceLog = z.infer<typeof insertAttendanceLogSchema>;
export type AttendanceLog = typeof attendanceLogsTable.$inferSelect;

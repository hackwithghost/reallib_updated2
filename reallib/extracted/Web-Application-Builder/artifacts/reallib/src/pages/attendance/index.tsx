import { useState } from "react";
import { useListAttendance, useListStudents, useListSeats } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Filter, CalendarIcon } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function Attendance() {
  const [studentId, setStudentId] = useState<string>("all");
  const [seatId, setSeatId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [status, setStatus] = useState<string>("all");

  const { data: students } = useListStudents();
  const { data: seats } = useListSeats();

  const { data: logs, isLoading } = useListAttendance({
    studentId: studentId !== "all" ? Number(studentId) : undefined,
    seatId: seatId !== "all" ? Number(seatId) : undefined,
    status: status !== "all" ? status : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Attendance Logs</h2>
        <p className="text-muted-foreground mt-1">Browse and filter student attendance records.</p>
      </div>

      <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="All Students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students?.map(s => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={seatId} onValueChange={setSeatId}>
            <SelectTrigger>
              <SelectValue placeholder="All Seats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seats</SelectItem>
              {seats?.map(s => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.seatNumber}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)} 
              className="w-full"
            />
          </div>
          <div className="relative">
            <Input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)} 
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Seat</TableHead>
              <TableHead>Marked At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading attendance logs...</TableCell>
              </TableRow>
            ) : logs && logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {format(new Date(log.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {log.student?.name}
                    <span className="text-xs text-muted-foreground ml-2">({log.student?.rollNumber})</span>
                  </TableCell>
                  <TableCell>{log.seat?.seatNumber}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(log.markedAt), 'hh:mm a')}
                  </TableCell>
                  <TableCell>
                    {log.status === 'present' ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200">Present</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200">Late</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono text-muted-foreground">
                    {log.ipAddress}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No attendance records found for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

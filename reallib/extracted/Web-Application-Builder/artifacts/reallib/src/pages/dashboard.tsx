import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Armchair, ClipboardCheck, Clock, AlertTriangle, BanknoteIcon, UserX } from "lucide-react";
import { useGetDashboardStats, useGetDailyAttendance, useGetWeeklyAttendance } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

type UnpaidStudent = {
  id: number;
  name: string;
  rollNumber: string;
  phoneNumber: string;
  isActive: boolean;
  isPaid: boolean;
  unpaidSince: string | null;
  daysUnpaid: number;
  isOverdue: boolean;
  createdAt: string;
};

type AbsentStudent = {
  id: number;
  name: string;
  rollNumber: string;
  phoneNumber: string;
  isActive: boolean;
  isPaid: boolean;
  seatId: number | null;
  allocatedSlot: string | null;
  createdAt: string;
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: dailyAttendance, isLoading: dailyLoading } = useGetDailyAttendance({ days: 14 });
  const { data: weeklyAttendance, isLoading: weeklyLoading } = useGetWeeklyAttendance();

  const [unpaidStudents, setUnpaidStudents] = useState<UnpaidStudent[]>([]);
  const [unpaidLoading, setUnpaidLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];
  const [absentDate, setAbsentDate] = useState(todayStr);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [absentLoading, setAbsentLoading] = useState(true);

  useEffect(() => {
    const fetchUnpaid = async () => {
      try {
        const res = await fetch("/api/reallib/dashboard/unpaid-students", { headers: authHeaders() });
        if (res.ok) setUnpaidStudents(await res.json());
      } catch { /* silent */ } finally {
        setUnpaidLoading(false);
      }
    };
    fetchUnpaid();
  }, []);

  useEffect(() => {
    const fetchAbsent = async () => {
      setAbsentLoading(true);
      try {
        const res = await fetch(`/api/reallib/dashboard/absent-students?date=${absentDate}`, { headers: authHeaders() });
        if (res.ok) setAbsentStudents(await res.json());
        else setAbsentStudents([]);
      } catch { setAbsentStudents([]); } finally {
        setAbsentLoading(false);
      }
    };
    fetchAbsent();
  }, [absentDate]);

  const overdueStudents = unpaidStudents.filter(s => s.isOverdue);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of library seat attendance and allocations.</p>
      </div>

      {overdueStudents.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/40 bg-destructive/5 text-destructive">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Payment Overdue Alert</p>
            <p className="text-sm mt-0.5 text-destructive/80">
              {overdueStudents.length} student{overdueStudents.length > 1 ? "s have" : " has"} been unpaid for 30+ days:{" "}
              {overdueStudents.map(s => s.name).join(", ")}.
            </p>
          </div>
        </div>
      )}

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded mt-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Seats</CardTitle>
              <Armchair className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSeats}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Allocations</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAllocations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.todayAttendance}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.presentToday} Present • {stats.lateToday} Late
              </p>
            </CardContent>
          </Card>

          <Card className={(stats.unpaidCount ?? 0) > 0 ? "border-destructive/40" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unpaid Students</CardTitle>
              <BanknoteIcon className={`h-4 w-4 ${(stats.unpaidCount ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(stats.unpaidCount ?? 0) > 0 ? "text-destructive" : ""}`}>
                {stats.unpaidCount ?? 0}
              </div>
              {(stats.overdueUnpaidCount ?? 0) > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {stats.overdueUnpaidCount} overdue 30+ days
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {!unpaidLoading && unpaidStudents.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BanknoteIcon className="h-4 w-4 text-destructive" />
                <CardTitle className="text-destructive">Unpaid Fees</CardTitle>
                <Badge variant="destructive" className="text-xs">{unpaidStudents.length}</Badge>
              </div>
              <CardDescription>Students with outstanding payments. Toggle on the Students page.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y max-h-64 overflow-y-auto pr-1">
                {unpaidStudents.map(student => (
                  <div key={student.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${student.isOverdue ? "bg-destructive" : "bg-yellow-500"}`} />
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.rollNumber} • {student.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {student.unpaidSince ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Since {format(new Date(student.unpaidSince), "MMM d, yyyy")}
                          </p>
                          <Badge
                            variant={student.isOverdue ? "destructive" : "outline"}
                            className={`text-xs mt-1 ${!student.isOverdue ? "text-yellow-700 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20" : ""}`}
                          >
                            {student.daysUnpaid}d unpaid{student.isOverdue && " — OVERDUE"}
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-400 bg-yellow-50">Unpaid</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={absentStudents.length > 0 ? "border-orange-300" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserX className={`h-4 w-4 ${absentStudents.length > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
              <CardTitle className={absentStudents.length > 0 ? "text-orange-700 dark:text-orange-400" : ""}>
                Absent Students
              </CardTitle>
              {absentStudents.length > 0 && (
                <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400">
                  {absentStudents.length}
                </Badge>
              )}
            </div>
            <CardDescription>Allocated students who did not mark attendance.</CardDescription>
            <div className="pt-1">
              <Label htmlFor="absent-date" className="text-xs text-muted-foreground">Select date</Label>
              <Input
                id="absent-date"
                type="date"
                value={absentDate}
                max={todayStr}
                onChange={e => setAbsentDate(e.target.value)}
                className="mt-1 h-8 text-sm w-40"
              />
            </div>
          </CardHeader>
          <CardContent>
            {absentLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
            ) : absentStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No absences recorded for {format(new Date(absentDate + "T00:00:00"), "MMM d, yyyy")}.
              </p>
            ) : (
              <div className="divide-y max-h-64 overflow-y-auto pr-1">
                {absentStudents.map(student => (
                  <div key={student.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.rollNumber} • {student.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {student.allocatedSlot && (
                        <p className="text-xs text-muted-foreground">Slot: {student.allocatedSlot}</p>
                      )}
                      <Badge variant="outline" className="text-xs mt-1 text-orange-700 border-orange-400 bg-orange-50 dark:bg-orange-900/20">
                        Absent
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Daily Attendance</CardTitle>
            <CardDescription>Present and Late counts over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {dailyLoading ? (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
            ) : dailyAttendance && dailyAttendance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyAttendance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Bar dataKey="present" name="Present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" name="Late" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Weekly Trends</CardTitle>
            <CardDescription>Attendance trends by week</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {weeklyLoading ? (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
            ) : weeklyAttendance && weeklyAttendance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyAttendance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="present" name="Present" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="late" name="Late" stroke="hsl(var(--destructive))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

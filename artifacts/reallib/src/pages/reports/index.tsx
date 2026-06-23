import { useState } from "react";
import { useListStudents, useListSeats } from "@workspace/api-client-react";
import { Filter, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";

export default function Reports() {
  const [studentId, setStudentId] = useState<string>("all");
  const [seatId, setSeatId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const { data: students } = useListStudents();
  const { data: seats } = useListSeats();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (studentId !== "all") params.append("studentId", studentId);
      if (seatId !== "all") params.append("seatId", seatId);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      params.append("format", "csv");

      const url = `/api/reallib/reports/attendance?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({ title: "Export successful", description: "CSV file downloaded." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground mt-1">Generate and export attendance data for analysis.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Attendance Export</CardTitle>
          <CardDescription>Filter the data you want to include in your CSV export.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.rollNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Seat</Label>
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
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button onClick={handleExport} disabled={isExporting} size="lg" className="w-full md:w-auto">
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Generating CSV..." : "Export CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

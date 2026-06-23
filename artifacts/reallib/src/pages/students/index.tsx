import { useState } from "react";
import { Link } from "wouter";
import { useListStudents, useDeleteStudent, useUpdateStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Students() {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<string>("all");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students, isLoading } = useListStudents({
    search: search || undefined,
    active: active !== "all" ? active : undefined,
  });

  const deleteStudent = useDeleteStudent();
  const updateStudent = useUpdateStudent();

  const handleDelete = (id: number) => {
    deleteStudent.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Student deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete student", description: err.message, variant: "destructive" });
      }
    });
  };

  const handlePaymentToggle = async (id: number, currentIsPaid: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/reallib/students/${id}/payment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("reallib_token") || ""}`,
        },
        body: JSON.stringify({ isPaid: !currentIsPaid }),
      });
      if (!res.ok) throw new Error("Failed to update payment status");
      toast({
        title: !currentIsPaid ? "Marked as Paid" : "Marked as Unpaid",
        description: `${!currentIsPaid ? "Payment recorded" : "Student marked unpaid from today"}.`,
      });
      queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
    } catch (err: any) {
      toast({ title: "Failed to update payment", description: err.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Students</h2>
          <p className="text-muted-foreground mt-1">Manage library students and their access.</p>
        </div>
        <Link href="/students/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, roll number, or phone..."
            className="pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={active} onValueChange={setActive}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="true">Active Only</SelectItem>
            <SelectItem value="false">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Unpaid Since</TableHead>
              <TableHead>Added On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading students...</TableCell>
              </TableRow>
            ) : students && students.length > 0 ? (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono">{student.rollNumber}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.phoneNumber}</TableCell>
                  <TableCell>
                    {student.isActive ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={student.isPaid ?? true}
                        onCheckedChange={() => handlePaymentToggle(student.id, student.isPaid ?? true)}
                        disabled={togglingId === student.id}
                        aria-label="Toggle payment status"
                      />
                      <span className="text-sm font-medium">
                        {student.isPaid ?? true ? (
                          <span className="text-green-700 dark:text-green-400">Paid</span>
                        ) : (
                          <span className="text-red-700 dark:text-red-400">Unpaid</span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {!(student.isPaid ?? true) && student.unpaidSince
                      ? format(new Date(student.unpaidSince), 'MMM d, yyyy')
                      : <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(student.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/students/${student.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Student?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {student.name} and their attendance records.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(student.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

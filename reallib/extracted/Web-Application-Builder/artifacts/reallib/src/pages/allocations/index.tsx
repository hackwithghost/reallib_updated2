import { useState } from "react";
import { useListAllocations, useCreateAllocation, useDeleteAllocation, getListAllocationsQueryKey, useListStudents, useListSeats } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const allocationSchema = z.object({
  studentId: z.coerce.number().min(1, "Student is required"),
  seatId: z.coerce.number().min(1, "Seat is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

export default function Allocations() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allocations, isLoading } = useListAllocations();
  const { data: students } = useListStudents({ active: "true" });
  const { data: seats } = useListSeats();
  
  const createAllocation = useCreateAllocation();
  const deleteAllocation = useDeleteAllocation();

  const form = useForm<z.infer<typeof allocationSchema>>({
    resolver: zodResolver(allocationSchema),
    defaultValues: {
      startTime: "09:00",
      endTime: "17:00",
    },
  });

  const onSubmit = (data: z.infer<typeof allocationSchema>) => {
    createAllocation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Allocation created successfully" });
        queryClient.invalidateQueries({ queryKey: getListAllocationsQueryKey() });
        setOpen(false);
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Failed to create allocation", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this allocation?")) return;
    deleteAllocation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Allocation deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListAllocationsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete allocation", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Allocations</h2>
          <p className="text-muted-foreground mt-1">Assign students to specific seats with time slots.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Allocation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Seat to Student</DialogTitle>
              <DialogDescription>Create a permanent seat allocation for a student.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students?.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.rollNumber})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a seat" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {seats?.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.seatNumber}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time (HH:MM)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time (HH:MM)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createAllocation.isPending}>
                    {createAllocation.isPending ? "Assigning..." : "Assign Seat"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Seat</TableHead>
              <TableHead>Time Slot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading allocations...</TableCell>
              </TableRow>
            ) : allocations && allocations.length > 0 ? (
              allocations.map((alloc) => (
                <TableRow key={alloc.id}>
                  <TableCell>
                    <div className="font-medium">{alloc.student?.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{alloc.student?.rollNumber}</div>
                  </TableCell>
                  <TableCell className="font-medium">{alloc.seat?.seatNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
                      {alloc.startTime} - {alloc.endTime}
                    </div>
                  </TableCell>
                  <TableCell>
                    {alloc.isActive ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDelete(alloc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No active allocations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

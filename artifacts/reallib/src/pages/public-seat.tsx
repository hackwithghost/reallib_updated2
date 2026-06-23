import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMarkAttendance } from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { BookOpen, CheckCircle2, User, Clock, Armchair } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const attendanceSchema = z.object({
  rollNumber: z.string().min(1, "Roll number is required"),
  pin: z.string().min(4, "PIN is required"),
});

type AttendanceFormValues = z.infer<typeof attendanceSchema>;

export default function PublicSeat() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: seatDetail, isLoading, error } = useQuery({
    queryKey: ["public-seat", id],
    queryFn: async () => {
      const now = new Date();
      const localTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const res = await fetch(`/api/reallib/seat/${id}?localTime=${localTime}`);
      if (!res.ok) throw new Error("Seat not found");
      return res.json();
    },
    enabled: !!id,
    refetchInterval: 60000,
  });
  const markAttendance = useMarkAttendance();

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      rollNumber: "",
      pin: "",
    },
  });

  function onSubmit(data: AttendanceFormValues) {
    const now = new Date();
    const localTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    markAttendance.mutate({ 
      data: { 
        seatId: id, 
        rollNumber: data.rollNumber, 
        pin: data.pin,
        localTime,
      } 
    }, {
      onSuccess: () => {
        setSuccess(true);
        setDialogOpen(false);
        form.reset();
        // Reset success state after a while
        setTimeout(() => setSuccess(false), 5000);
      },
      onError: (err: any) => {
        toast({ 
          title: "Attendance Failed", 
          description: err.message || "Invalid roll number or PIN", 
          variant: "destructive" 
        });
      }
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-primary/20 rounded-full mb-4"></div>
          <div className="h-6 w-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !seatDetail) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center py-8">
          <CardTitle className="text-destructive mb-2">Invalid Seat QR</CardTitle>
          <CardDescription>This seat could not be found or the QR code is invalid.</CardDescription>
        </Card>
      </div>
    );
  }

  const isAllocated = !!seatDetail.currentAllocation;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <header className="p-4 border-b border-border bg-card flex justify-center items-center shadow-sm">
        <div className="flex items-center gap-2 text-primary font-serif font-bold text-xl">
          <BookOpen className="h-6 w-6" />
          RealLib
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {success ? (
          <Card className="w-full max-w-md border-green-200 bg-green-50 dark:bg-green-950/20 text-center py-10 animate-in zoom-in duration-300 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-bold text-green-800 dark:text-green-400">Attendance Marked!</h2>
              <p className="text-green-700/80 dark:text-green-400/80">You have successfully checked in to your seat.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary overflow-hidden">
            <div className="bg-primary/5 p-6 text-center border-b">
              <Armchair className="h-12 w-12 mx-auto text-primary mb-3" />
              <h1 className="text-3xl font-bold font-mono tracking-tight">{seatDetail.seatNumber}</h1>
              <p className="text-muted-foreground mt-1">Library Seat Check-in</p>
            </div>
            
            <CardContent className="pt-6 space-y-6">
              {isAllocated ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Assigned To</div>
                      <div className="font-semibold">{seatDetail.currentAllocation?.student?.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Time Slot</div>
                      <div className="font-semibold font-mono">
                        {seatDetail.currentAllocation?.startTime} - {seatDetail.currentAllocation?.endTime}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 bg-muted/50 rounded-lg border border-dashed">
                  <p className="text-muted-foreground font-medium">No active allocation for this seat currently.</p>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="pb-6">
              <Button 
                className="w-full" 
                size="lg" 
                disabled={!isAllocated}
                onClick={() => setDialogOpen(true)}
              >
                Mark Attendance
              </Button>
            </CardFooter>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Verify Attendance</DialogTitle>
              <DialogDescription>
                Enter your roll number and PIN to confirm your presence at seat {seatDetail.seatNumber}.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="rollNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roll Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CS2023001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>4-Digit PIN</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={markAttendance.isPending}>
                    {markAttendance.isPending ? "Verifying..." : "Confirm"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

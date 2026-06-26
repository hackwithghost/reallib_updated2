import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import FaceCaptureStep from "@/components/face-capture-step";

const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  rollNumber: z.string().min(1, "Roll number is required"),
  phoneNumber: z.string().min(10, "Valid phone number required"),
  pin: z.string().min(4, "PIN must be at least 4 digits"),
  isActive: z.boolean().default(true),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function NewStudent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createStudent = useCreateStudent();
  const [createdStudent, setCreatedStudent] = useState<{ id: number; name: string; rollNumber: string } | null>(null);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: "", rollNumber: "", phoneNumber: "", pin: "", isActive: true },
  });

  function onSubmit(data: StudentFormValues) {
    createStudent.mutate({ data }, {
      onSuccess: (student: any) => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setCreatedStudent({ id: student.id, name: student.name, rollNumber: student.rollNumber });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create student", description: err.message, variant: "destructive" });
      }
    });
  }

  // Step 2 — face capture
  if (createdStudent) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium text-sm">Student created successfully!</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Register Face — {createdStudent.name}</h2>
            <p className="text-muted-foreground mt-0.5">Step 2 of 2 · Capture this student's face for automatic attendance recognition.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Face Registration</CardTitle>
                <CardDescription>Position {createdStudent.name}'s face in the frame and click Capture.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FaceCaptureStep
              student={createdStudent}
              onDone={() => {
                toast({ title: "Student setup complete!", description: `${createdStudent.name} is ready.` });
                setLocation("/students");
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1 — student details form
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/students">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add New Student</h2>
          <p className="text-muted-foreground mt-1">Step 1 of 2 · Fill in the student's information.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
          <CardDescription>Enter the basic information and access credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="rollNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roll Number</FormLabel>
                    <FormControl><Input placeholder="CS2023001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input placeholder="+1 234 567 8900" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendance PIN</FormLabel>
                    <FormControl><Input type="password" placeholder="4-digit PIN" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-1 md:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Account</FormLabel>
                      <div className="text-sm text-muted-foreground">Can mark attendance and be allocated seats</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-4">
                <Link href="/students"><Button type="button" variant="outline">Cancel</Button></Link>
                <Button type="submit" disabled={createStudent.isPending}>
                  {createStudent.isPending ? "Creating…" : "Create & Register Face →"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

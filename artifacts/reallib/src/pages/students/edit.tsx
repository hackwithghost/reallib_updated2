import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useGetStudent, useUpdateStudent, getListStudentsQueryKey, getGetStudentQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  rollNumber: z.string().min(1, "Roll number is required"),
  phoneNumber: z.string().min(10, "Valid phone number required"),
  pin: z.string().optional(),
  isActive: z.boolean(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function EditStudent() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

 const { data: student, isLoading } = useGetStudent(id, {
  query: {
    enabled: !!id,
  } as unknown as any,
});
  const updateStudent = useUpdateStudent();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      rollNumber: "",
      phoneNumber: "",
      pin: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name,
        rollNumber: student.rollNumber,
        phoneNumber: student.phoneNumber,
        pin: "",
        isActive: student.isActive,
      });
    }
  }, [student, form]);

  function onSubmit(data: StudentFormValues) {
    const updateData: any = { ...data };
    if (!updateData.pin) {
      delete updateData.pin;
    }

    updateStudent.mutate({ id, data: updateData }, {
      onSuccess: () => {
        toast({ title: "Student updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
        setLocation("/students");
      },
      onError: (err: any) => {
        toast({ title: "Failed to update student", description: err.message, variant: "destructive" });
      }
    });
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading student details...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/students">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Student</h2>
          <p className="text-muted-foreground mt-1">Update student information.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
          <CardDescription>Update the basic information. Leave PIN blank to keep it unchanged.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rollNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roll Number</FormLabel>
                      <FormControl>
                        <Input placeholder="CS2023001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" {...field} />
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
                      <FormLabel>New Attendance PIN (Optional)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Leave blank to keep current" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-1 md:col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Account</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Can mark attendance and be allocated seats
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-4">
                <Link href="/students">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={updateStudent.isPending}>
                  {updateStudent.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

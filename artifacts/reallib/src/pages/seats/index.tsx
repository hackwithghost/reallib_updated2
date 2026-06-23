import { useState } from "react";
import { useListSeats, useCreateSeat, useDeleteSeat, getListSeatsQueryKey, getGetSeatQrUrl } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Download, QrCode, Armchair } from "lucide-react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getToken } from "@/lib/auth";

const seatSchema = z.object({
  seatNumber: z.string().min(1, "Seat number is required"),
});

export default function Seats() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: seats, isLoading } = useListSeats();
  const createSeat = useCreateSeat();
  const deleteSeat = useDeleteSeat();

  const form = useForm<z.infer<typeof seatSchema>>({
    resolver: zodResolver(seatSchema),
    defaultValues: {
      seatNumber: "",
    },
  });

  const onSubmit = (data: z.infer<typeof seatSchema>) => {
    createSeat.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Seat created successfully" });
        queryClient.invalidateQueries({ queryKey: getListSeatsQueryKey() });
        setOpen(false);
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Failed to create seat", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteSeat.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Seat deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListSeatsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete seat", description: err.message, variant: "destructive" });
      }
    });
  };

  const downloadQr = async (id: number, seatNumber: string) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/reallib/seats/${id}/qr`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      const link = document.createElement("a");
      link.href = data.qrDataUrl;
      link.download = `Seat-${seatNumber}-QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "QR Code downloaded" });
    } catch (err) {
      toast({ title: "Failed to download QR code", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Seats</h2>
          <p className="text-muted-foreground mt-1">Manage physical library seats and their QR codes.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Seat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Seat</DialogTitle>
              <DialogDescription>Create a new seat. A unique QR code will be generated automatically.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="seatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat Identifier / Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. A-12, Ground-Floor-01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createSeat.isPending}>
                    {createSeat.isPending ? "Creating..." : "Create Seat"}
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
              <TableHead>Seat Number</TableHead>
              <TableHead>QR Token</TableHead>
              <TableHead>Added On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading seats...</TableCell>
              </TableRow>
            ) : seats && seats.length > 0 ? (
              seats.map((seat) => (
                <TableRow key={seat.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Armchair className="h-4 w-4 text-muted-foreground" />
                    {seat.seatNumber}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{seat.qrCode}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(seat.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => downloadQr(seat.id, seat.seatNumber)}>
                      <Download className="h-4 w-4 mr-1" />
                      QR
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Seat?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete Seat {seat.seatNumber} and all its allocations and attendance logs.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(seat.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  No seats found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

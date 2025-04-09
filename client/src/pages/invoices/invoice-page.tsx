import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Invoice } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { DataTable } from "@/components/ui/data-table";
import StatusBadge from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Eye, Edit, Trash, PlusCircle, FileText, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

type InvoiceWithDetails = Invoice & { permitteeName: string, permitNumber: string };

export default function InvoicePage() {
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch all invoices
  const { data: invoices, isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
  });
  
  // Fetch all permits for the create form
  const { data: permits } = useQuery({
    queryKey: ["/api/permits"],
  });
  
  // Delete invoice mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invoice deleted",
        description: "The invoice has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create invoice mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/invoices", {
        ...data,
        createdBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Invoice created",
        description: "The invoice has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update invoice status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return await apiRequest("PATCH", `/api/invoices/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Invoice updated",
        description: "The invoice status has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setInvoiceToDelete(id);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteMutation.mutate(invoiceToDelete);
      setInvoiceToDelete(null);
    }
  };
  
  const handleViewInvoice = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };
  
  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      permitId: "",
      amount: "",
      status: "pending",
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      issueDate: new Date(),
    }
  });
  
  const onSubmit = (data: any) => {
    createMutation.mutate({
      permitId: parseInt(data.permitId),
      amount: parseInt(data.amount) * 100, // Convert to cents
      status: data.status,
      dueDate: data.dueDate,
      issueDate: data.issueDate,
    });
  };
  
  const columns = [
    {
      header: "Invoice Number",
      accessorKey: "invoiceNumber",
      enableSorting: true,
    },
    {
      header: "Permit Number",
      accessorKey: "permitNumber",
      enableSorting: true,
    },
    {
      header: "Permittee",
      accessorKey: "permitteeName",
      enableSorting: true,
    },
    {
      header: "Amount",
      accessorKey: "amount",
      enableSorting: true,
      cell: (row: Invoice) => formatCurrency(row.amount),
    },
    {
      header: "Status",
      accessorKey: "status",
      enableSorting: true,
      cell: (row: Invoice) => (
        <Select
          defaultValue={row.status}
          onValueChange={(value) => handleStatusChange(row.id, value)}
        >
          <SelectTrigger className="w-[110px]">
            <StatusBadge status={row.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      header: "Issue Date",
      accessorKey: "issueDate",
      enableSorting: true,
      cell: (row: Invoice) => formatDate(row.issueDate),
    },
    {
      header: "Due Date",
      accessorKey: "dueDate",
      enableSorting: true,
      cell: (row: Invoice) => formatDate(row.dueDate),
    },
    {
      header: "Actions",
      accessorKey: (row: InvoiceWithDetails) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleViewInvoice(row)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout title="Invoices" subtitle="Manage and track permit invoices">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">All Invoices</h3>
        </div>
        <Button onClick={() => {
          reset(); // Reset form
          setIsCreateDialogOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>
      
      <DataTable
        columns={columns}
        data={invoices || []}
        searchField="invoiceNumber"
        isLoading={isLoading}
      />
      
      {/* Create Invoice Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Create an invoice for a permit. All fields are required.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="permitId">Permit</Label>
              <Select
                onValueChange={(value) => setValue("permitId", value)}
                {...register("permitId", { required: "Permit is required" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a permit" />
                </SelectTrigger>
                <SelectContent>
                  {permits?.map((permit) => (
                    <SelectItem key={permit.id} value={permit.id.toString()}>
                      {permit.permitNumber} - {permit.permitteeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.permitId && (
                <p className="text-sm text-red-500">{errors.permitId.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("amount", { 
                  required: "Amount is required",
                  min: { value: 0.01, message: "Amount must be greater than 0" }
                })}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={(value) => setValue("status", value)}
                defaultValue="pending"
                {...register("status")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watch("issueDate") && "text-muted-foreground"
                      )}
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watch("issueDate") ? formatDate(watch("issueDate")) : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watch("issueDate")}
                      onSelect={(date) => setValue("issueDate", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watch("dueDate") && "text-muted-foreground"
                      )}
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watch("dueDate") ? formatDate(watch("dueDate")) : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watch("dueDate")}
                      onSelect={(date) => setValue("dueDate", date)}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Invoice Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="border rounded-md p-6 space-y-4">
              <div className="flex justify-between border-b pb-4">
                <div>
                  <h3 className="font-bold text-lg">Utah State Parks</h3>
                  <p>Special Use Permit Invoice</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Invoice #{selectedInvoice.invoiceNumber}</p>
                  <p>Issued: {formatDate(selectedInvoice.issueDate)}</p>
                  <p>Due: {formatDate(selectedInvoice.dueDate)}</p>
                </div>
              </div>
              
              <div className="flex justify-between py-4">
                <div>
                  <h4 className="font-medium mb-2">Billed To:</h4>
                  <p>{selectedInvoice.permitteeName}</p>
                  <p>Permit: {selectedInvoice.permitNumber}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-medium mb-2">Status:</h4>
                  <StatusBadge status={selectedInvoice.status} />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-2">Description</th>
                      <th className="text-right pb-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2">Special Use Permit Fee</td>
                      <td className="text-right py-2">{formatCurrency(selectedInvoice.amount)}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="py-2 font-bold">Total</td>
                      <td className="text-right py-2 font-bold">{formatCurrency(selectedInvoice.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Payment Instructions:</h4>
                <p>Please make payment by the due date using one of the methods below:</p>
                <ul className="list-disc ml-5 mt-2">
                  <li>Online: Visit utahstateparks.gov/payments</li>
                  <li>Check: Mail to Utah State Parks, PO Box 123, Salt Lake City, UT 84101</li>
                  <li>In Person: At any Utah State Park visitor center</li>
                </ul>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={invoiceToDelete !== null} onOpenChange={() => setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

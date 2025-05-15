import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Permit } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { DataTable } from "@/components/ui/data-table";
import StatusBadge from "@/components/ui/status-badge";
import ParkStatus from "@/components/permit/park-status";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Eye, Edit, Trash, PlusCircle, FileText } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export default function PermitsPage() {
  const [permitToDelete, setPermitToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Fetch all permits
  const { data: permits, isLoading } = useQuery<(Permit & { parkName: string })[]>({
    queryKey: ["/api/permits"],
  });
  
  // Delete permit mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/permits/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Permit deleted",
        description: "The permit has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting permit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setPermitToDelete(id);
  };

  const confirmDelete = () => {
    if (permitToDelete) {
      deleteMutation.mutate(permitToDelete);
      setPermitToDelete(null);
    }
  };

  const columns = [
    {
      header: "Permit Number",
      accessorKey: "permitNumber",
      enableSorting: true,
    },
    {
      header: "Park",
      accessorKey: "parkName",
      enableSorting: true,
      cell: (row) => (
        <ParkStatus parkId={row.parkId} parkName={row.parkName} />
      ),
    },
    {
      header: "Permittee",
      accessorKey: "permitteeName",
      enableSorting: true,
    },
    {
      header: "Activity",
      accessorKey: "activity",
      enableSorting: true,
    },
    {
      header: "Start Date",
      accessorKey: "startDate",
      enableSorting: true,
      cell: (row: Permit) => formatDate(row.startDate),
    },
    {
      header: "End Date",
      accessorKey: "endDate",
      enableSorting: true,
      cell: (row: Permit) => formatDate(row.endDate),
    },
    {
      header: "Status",
      accessorKey: "status",
      enableSorting: true,
      cell: (row: Permit) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      accessorKey: (row: Permit) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/permits/${row.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/permits/edit/${row.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
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
    <Layout title="Applications" subtitle="View and manage special use permit applications">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">All Applications</h3>
        </div>
        <Button asChild>
          <Link href="/permits/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Application
          </Link>
        </Button>
      </div>
      
      <DataTable
        columns={columns}
        data={permits || []}
        searchField="permitteeName"
        isLoading={isLoading}
      />
      
      <AlertDialog open={permitToDelete !== null} onOpenChange={() => setPermitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the permit
              and all its associated data.
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

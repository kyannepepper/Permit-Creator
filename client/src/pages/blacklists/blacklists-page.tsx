import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Blacklist } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Edit, Trash, PlusCircle, Ban } from "lucide-react";
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

type BlacklistWithParkName = Blacklist & { parkName: string };

export default function BlacklistsPage() {
  const [blacklistToDelete, setBlacklistToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Fetch all blacklists
  const { data: blacklists, isLoading } = useQuery<BlacklistWithParkName[]>({
    queryKey: ["/api/blacklists"],
  });
  
  // Delete blacklist mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/blacklists/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Blacklist deleted",
        description: "The blacklist has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/blacklists"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting blacklist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setBlacklistToDelete(id);
  };

  const confirmDelete = () => {
    if (blacklistToDelete) {
      deleteMutation.mutate(blacklistToDelete);
      setBlacklistToDelete(null);
    }
  };

  const columns = [
    {
      header: "Park",
      accessorKey: "parkName",
      enableSorting: true,
    },
    {
      header: "Location",
      accessorKey: "location",
      enableSorting: true,
    },
    {
      header: "Description",
      accessorKey: "description",
      enableSorting: false,
    },
    {
      header: "Start Date",
      accessorKey: "startDate",
      enableSorting: true,
      cell: (row: Blacklist) => formatDate(row.startDate),
    },
    {
      header: "End Date",
      accessorKey: "endDate",
      enableSorting: true,
      cell: (row: Blacklist) => row.endDate ? formatDate(row.endDate) : "No end date",
    },
    {
      header: "Actions",
      accessorKey: (row: Blacklist) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/blacklists/edit/${row.id}`}>
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
    <Layout title="Blacklists" subtitle="Manage blacklisted locations in parks">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Ban className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-medium">Blacklisted Locations</h3>
        </div>
        <Button asChild>
          <Link href="/blacklists/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Blacklist
          </Link>
        </Button>
      </div>
      
      <DataTable
        columns={columns}
        data={blacklists || []}
        searchField="location"
        isLoading={isLoading}
      />
      
      <AlertDialog open={blacklistToDelete !== null} onOpenChange={() => setBlacklistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this blacklist entry.
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

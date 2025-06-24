import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Park } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Edit, Trash, PlusCircle, TreePine } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";

export default function ParksPage() {
  const [parkToDelete, setParkToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // For this demo, we're allowing staff users to have management permissions
  const isManager = true; // user?.role === "manager" || user?.role === "admin";
  
  // Fetch all parks
  const { data: parks, isLoading } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });
  
  // Delete park mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/parks/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Park deleted",
        description: "The park has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/parks"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting park",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  


  const handleDelete = (id: number) => {
    setParkToDelete(id);
  };

  const confirmDelete = () => {
    if (parkToDelete) {
      deleteMutation.mutate(parkToDelete);
      setParkToDelete(null);
    }
  };

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
      enableSorting: true,
    },
    {
      header: "Location",
      accessorKey: "location",
      enableSorting: true,
    },
    {
      header: "Actions",
      accessorKey: "id",
      enableSorting: false,
      cell: (row: Park) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/parks/edit/${row.id}`}>
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
    <Layout title="Parks">
      <div className="space-y-6">


        <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <TreePine className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-medium">All Parks</h3>
        </div>
        {isManager && (
          <Button asChild>
            <Link href="/parks/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Park
            </Link>
          </Button>
        )}
      </div>
      
      <DataTable
        columns={columns}
        data={parks || []}
        searchField="name"
        isLoading={isLoading}
      />
      
      <AlertDialog open={parkToDelete !== null} onOpenChange={() => setParkToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the park.
              Parks with active permits cannot be deleted.
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
      </div>
    </Layout>
  );
}

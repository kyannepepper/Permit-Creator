import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, PlusCircle, Edit, Trash, Copy } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

type PermitTemplate = {
  id: number;
  name: string;
  parkId: number;
  parkName: string;
  locations: string[];
  applicationCost: number;
  createdAt: string;
  updatedAt: string;
};

export default function PermitTemplatesPage() {
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch all permit templates
  const { data: templates, isLoading } = useQuery<PermitTemplate[]>({
    queryKey: ["/api/permit-templates"],
  });
  
  // Fetch parks for filtering
  const { data: parks } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/parks"],
  });
  
  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/permit-templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Template deleted",
        description: "The permit template has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Duplicate template mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/permit-templates/${id}/duplicate`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Template duplicated",
        description: `"${data.name}" has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error duplicating template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setTemplateToDelete(id);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete);
      setTemplateToDelete(null);
    }
  };

  // Filter templates by park if a specific park tab is selected
  const filteredTemplates = templates?.filter(template => {
    if (activeTab === "all") return true;
    return template.parkId.toString() === activeTab;
  }) || [];

  const columns = [
    {
      header: "Template Name",
      accessorKey: "name",
      enableSorting: true,
    },
    {
      header: "Park",
      accessorKey: "parkName",
      enableSorting: true,
    },
    {
      header: "# of Locations",
      accessorKey: "locations",
      enableSorting: false,
      cell: (row: PermitTemplate) => row.locations.length,
    },
    {
      header: "Application Cost",
      accessorKey: "applicationCost",
      enableSorting: true,
      cell: (row: PermitTemplate) => `$${row.applicationCost.toFixed(2)}`,
    },
    {
      header: "Actions",
      id: "actions",
      enableSorting: false,
      cell: (row: PermitTemplate) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/permit-templates/edit/${row.id}`}>
              <Edit className="h-4 w-4 text-neutral-medium" />
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => duplicateMutation.mutate(row.id)}
            disabled={duplicateMutation.isPending}
            title="Duplicate template"
          >
            <Copy className="h-4 w-4 text-blue-500" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleDelete(row.id)}
            title="Delete template"
          >
            <Trash className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout title="Permit Templates" subtitle="View and manage permit templates">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">List of all permit templates</h3>
        </div>
        <Button asChild>
          <Link href="/permit-templates/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Permit
          </Link>
        </Button>
      </div>
      
      <Tabs 
        defaultValue="all" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all">All Parks</TabsTrigger>
          {parks?.map(park => (
            <TabsTrigger key={park.id} value={park.id.toString()}>
              {park.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      
      <DataTable
        columns={columns}
        data={filteredTemplates}
        searchField="name"
        isLoading={isLoading}
      />
      
      <AlertDialog open={templateToDelete !== null} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the permit template
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
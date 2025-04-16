import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Activity } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Edit, Trash, PlusCircle, Activity as ActivityIcon, DollarSign, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Activity form schema
const activitySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  defaultFee: z.coerce.number().min(0, "Fee must be a positive number"),
  requiresInsurance: z.boolean().default(false),
  insuranceLimit: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

export default function ActivitiesPage() {
  const [activityToDelete, setActivityToDelete] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const { toast } = useToast();
  
  // Fetch all activities
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });
  
  // Form setup
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: "",
      description: "",
      defaultFee: 0,
      requiresInsurance: false,
      insuranceLimit: "",
    }
  });
  
  // Create activity mutation
  const createMutation = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      // Convert dollar amount to cents
      const dataInCents = {
        ...data,
        defaultFee: Math.round(data.defaultFee * 100)
      };
      return await apiRequest("POST", "/api/activities", dataInCents);
    },
    onSuccess: () => {
      toast({
        title: "Activity created",
        description: "The activity type has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsCreateDialogOpen(false);
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating activity",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update activity mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: ActivityFormValues }) => {
      // Convert dollar amount to cents
      const dataInCents = {
        ...data,
        defaultFee: Math.round(data.defaultFee * 100)
      };
      return await apiRequest("PATCH", `/api/activities/${id}`, dataInCents);
    },
    onSuccess: () => {
      toast({
        title: "Activity updated",
        description: "The activity type has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setEditingActivity(null);
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating activity",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete activity mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/activities/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Activity deleted",
        description: "The activity type has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setActivityToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting activity",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    // Pre-populate the form with activity data
    reset({
      name: activity.name,
      description: activity.description || "",
      // Convert cents to dollars for display
      defaultFee: activity.defaultFee ? activity.defaultFee / 100 : 0,
      requiresInsurance: activity.requiresInsurance || false,
      insuranceLimit: activity.insuranceLimit || "",
    });
  };
  
  const handleCreateSubmit = (data: ActivityFormValues) => {
    createMutation.mutate(data);
  };
  
  const handleUpdateSubmit = (data: ActivityFormValues) => {
    if (editingActivity) {
      updateMutation.mutate({ id: editingActivity.id, data });
    }
  };
  
  const handleDelete = (id: number) => {
    setActivityToDelete(id);
  };
  
  const confirmDelete = () => {
    if (activityToDelete) {
      deleteMutation.mutate(activityToDelete);
    }
  };
  
  const columns = [
    {
      header: "Name",
      accessorKey: "name",
      enableSorting: true,
    },
    {
      header: "Description",
      accessorKey: "description",
      enableSorting: false,
      cell: (row: Activity) => row.description || "N/A",
    },
    {
      header: "Default Fee",
      accessorKey: "defaultFee",
      enableSorting: true,
      cell: (row: Activity) => formatCurrency(row.defaultFee || 0),
    },
    {
      header: "Requires Insurance",
      accessorKey: "requiresInsurance",
      enableSorting: true,
      cell: (row: Activity) => (
        row.requiresInsurance ? (
          <Check className="h-5 w-5 text-green-500 mx-auto" />
        ) : (
          <X className="h-5 w-5 text-red-500 mx-auto" />
        )
      ),
    },
    {
      header: "Insurance Limit",
      accessorKey: "insuranceLimit",
      enableSorting: true,
      cell: (row: Activity) => {
        if (!row.requiresInsurance) return "N/A";
        return row.insuranceLimit || "N/A";
      },
    },
    {
      header: "Actions",
      accessorKey: (row: Activity) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditActivity(row)}
          >
            <Edit className="h-4 w-4" />
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
    <Layout title="Activities" subtitle="Manage activity types for special use permits">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <ActivityIcon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Activity Types</h3>
        </div>
        <Button onClick={() => {
          reset(); // Reset form
          setIsCreateDialogOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Activity Type
        </Button>
      </div>
      
      <DataTable
        columns={columns}
        data={activities || []}
        searchField="name"
        isLoading={isLoading}
      />
      
      {/* Create Activity Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity Type</DialogTitle>
            <DialogDescription>
              Create a new activity type for permit applications.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleCreateSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Activity Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g. Wedding, Photography, Race"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe this activity type"
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="defaultFee">Default Fee ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="defaultFee"
                  type="number"
                  step="0.01"
                  className="pl-9"
                  {...register("defaultFee")}
                />
              </div>
              {errors.defaultFee && (
                <p className="text-sm text-red-500">{errors.defaultFee.message}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="requiresInsurance"
                checked={watch("requiresInsurance")}
                onCheckedChange={(checked) => setValue("requiresInsurance", checked)}
              />
              <Label htmlFor="requiresInsurance" className="cursor-pointer">
                Requires Insurance
              </Label>
            </div>
            
            {watch("requiresInsurance") && (
              <div className="space-y-2">
                <Label htmlFor="insuranceLimit">Insurance Limit ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="insuranceLimit"
                    type="number"
                    className="pl-9"
                    {...register("insuranceLimit")}
                    placeholder="1000000"
                  />
                </div>
                {errors.insuranceLimit && (
                  <p className="text-sm text-red-500">{errors.insuranceLimit.message}</p>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Add Activity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Activity Dialog */}
      <Dialog open={!!editingActivity} onOpenChange={(open) => !open && setEditingActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity Type</DialogTitle>
            <DialogDescription>
              Update the details for this activity type.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleUpdateSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Activity Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g. Wedding, Photography, Race"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe this activity type"
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="defaultFee">Default Fee ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="defaultFee"
                  type="number"
                  step="0.01"
                  className="pl-9"
                  {...register("defaultFee")}
                />
              </div>
              {errors.defaultFee && (
                <p className="text-sm text-red-500">{errors.defaultFee.message}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="requiresInsurance"
                checked={watch("requiresInsurance")}
                onCheckedChange={(checked) => setValue("requiresInsurance", checked)}
              />
              <Label htmlFor="requiresInsurance" className="cursor-pointer">
                Requires Insurance
              </Label>
            </div>
            
            {watch("requiresInsurance") && (
              <div className="space-y-2">
                <Label htmlFor="insuranceLimit">Insurance Limit ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="insuranceLimit"
                    type="number"
                    className="pl-9"
                    {...register("insuranceLimit")}
                    placeholder="1000000"
                  />
                </div>
                {errors.insuranceLimit && (
                  <p className="text-sm text-red-500">{errors.insuranceLimit.message}</p>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setEditingActivity(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Activity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={activityToDelete !== null} onOpenChange={() => setActivityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this activity type.
              Activities that are in use by existing permits cannot be deleted.
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

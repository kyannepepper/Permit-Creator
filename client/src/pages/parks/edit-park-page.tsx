import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { insertParkSchema, Park } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Extend the park schema with validation
const editParkSchema = insertParkSchema.extend({
  name: z.string().min(2, {
    message: "Park name must be at least 2 characters.",
  }),
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
});

type FormValues = z.infer<typeof editParkSchema>;

export default function EditParkPage() {
  const { id } = useParams<{ id: string }>();
  const parkId = parseInt(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch park data
  const { data: park, isLoading: isLoadingPark } = useQuery<Park>({
    queryKey: [`/api/parks/${parkId}`],
    enabled: !isNaN(parkId),
  });
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(editParkSchema),
    defaultValues: {
      name: "",
      location: "",
      description: "",
      status: "",
    },
    values: park ? {
      name: park.name,
      location: park.location,
      description: park.description,
      status: park.status || "active",
    } : undefined,
  });
  
  // Handle form submission
  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return await apiRequest("PATCH", `/api/parks/${parkId}`, values);
    },
    onSuccess: () => {
      toast({
        title: "Park updated",
        description: "The park has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/parks/${parkId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/parks"] });
      setLocation("/parks");
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating park",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values);
  };

  if (isLoadingPark) {
    return (
      <Layout title="Edit Park" subtitle="Loading park data...">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!park) {
    return (
      <Layout title="Error" subtitle="Park not found">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">The requested park could not be found.</p>
            <Button onClick={() => setLocation("/parks")}>Return to Parks</Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title={`Edit Park: ${park.name}`} subtitle="Update park information">
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Park Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Park Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter park name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Davis County, Wasatch County" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide a description of the park" 
                        className="min-h-[100px]" 
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/parks")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}
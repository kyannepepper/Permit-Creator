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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X } from "lucide-react";
import React, { useState } from "react";

// Extend the park schema with validation
const editParkSchema = insertParkSchema.extend({
  name: z.string().min(2, {
    message: "Park name must be at least 2 characters.",
  }),
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  locations: z.array(z.string()).optional(),
  waiver: z.string().optional(),
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
  
  // Local state for locations management
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState("");

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(editParkSchema),
    defaultValues: {
      name: "",
      location: "",
      locations: [],
      waiver: "",
    },
    values: park ? {
      name: park.name,
      location: park.location,
      locations: Array.isArray(park.locations) ? park.locations : 
                 typeof park.locations === 'string' ? JSON.parse(park.locations || '[]') : [],
      waiver: park.waiver || "",
    } : undefined,
  });

  // Update local locations state when park data loads
  React.useEffect(() => {
    if (park?.locations) {
      const parkLocations = Array.isArray(park.locations) ? park.locations : 
                           typeof park.locations === 'string' ? JSON.parse(park.locations || '[]') : [];
      setLocations(parkLocations);
    }
  }, [park]);

  // Add location function
  const addLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      const updatedLocations = [...locations, newLocation.trim()];
      setLocations(updatedLocations);
      form.setValue("locations", updatedLocations);
      setNewLocation("");
    }
  };

  // Remove location function
  const removeLocation = (index: number) => {
    const updatedLocations = locations.filter((_, i) => i !== index);
    setLocations(updatedLocations);
    form.setValue("locations", updatedLocations);
  };
  
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
              </div>

              {/* Locations Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Park Locations</h3>
                    <p className="text-sm text-muted-foreground">
                      Add specific locations within this park where permits can be used
                    </p>
                  </div>
                </div>

                {/* Add New Location */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter location name (e.g., Pavilion A, Main Beach)"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addLocation();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addLocation}
                    variant="outline"
                    size="sm"
                    disabled={!newLocation.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                {/* Locations List */}
                {locations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Current Locations:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {locations.map((location, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-secondary rounded-md"
                        >
                          <span className="text-sm">{location}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLocation(index)}
                            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Waiver Text */}
              <FormField
                control={form.control}
                name="waiver"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Park Waiver Text</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter the waiver text that applies to all permits for this park..." 
                        className="min-h-[200px]" 
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
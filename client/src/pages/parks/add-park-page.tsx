import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { insertParkSchema } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
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

// Extend the park schema with validation
const addParkSchema = insertParkSchema.extend({
  name: z.string().min(2, {
    message: "Park name must be at least 2 characters.",
  }),
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  waiver: z.string().optional(),
});

type FormValues = z.infer<typeof addParkSchema>;

export default function AddParkPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [locations, setLocations] = useState<string[]>([""]);
  
  const addLocation = () => setLocations([...locations, ""]);
  const removeLocation = (index: number) => {
    if (locations.length > 1) {
      setLocations(locations.filter((_, i) => i !== index));
    }
  };
  const updateLocation = (index: number, value: string) => {
    const updated = [...locations];
    updated[index] = value;
    setLocations(updated);
  };
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(addParkSchema),
    defaultValues: {
      name: "",
      location: "",
      waiver: "",
    },
  });
  
  // Handle form submission
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return await apiRequest("POST", "/api/parks", values);
    },
    onSuccess: () => {
      toast({
        title: "Park added",
        description: "The park has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/parks"] });
      setLocation("/parks");
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding park",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    const validLocations = locations.filter(loc => loc.trim() !== "");
    const submitData = {
      ...values,
      locations: JSON.stringify(validLocations),
    };
    createMutation.mutate(submitData);
  };

  return (
    <Layout title="Add Park" subtitle="Add a new state park to the system">
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

              {/* Locations within Park */}
              <div className="md:col-span-2">
                <FormLabel>Locations within Park</FormLabel>
                <div className="space-y-2 mt-2">
                  {locations.map((location, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Enter location name (e.g., Visitor Center, Beach Area, Trail Head)"
                        value={location}
                        onChange={(e) => updateLocation(index, e.target.value)}
                      />
                      {locations.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeLocation(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLocation}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Location
                  </Button>
                </div>
              </div>

              {/* Park Waiver */}
              <FormField
                control={form.control}
                name="waiver"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Park Waiver (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter waiver text that will apply to all permits for this park..." 
                        className="min-h-[120px]" 
                        {...field} 
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
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Adding..." : "Add Park"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}

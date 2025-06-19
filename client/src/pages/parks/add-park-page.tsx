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
  locations: z.array(z.object({
    name: z.string(),
    fee: z.number()
  })).optional(),
  waiver: z.string().optional(),
});

type FormValues = z.infer<typeof addParkSchema>;

export default function AddParkPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [locations, setLocations] = useState<{name: string, fee: number}[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [newLocationFee, setNewLocationFee] = useState("");

  const addLocation = () => {
    if (newLocation.trim()) {
      const fee = parseFloat(newLocationFee) || 0;
      const newLocationObj = { name: newLocation.trim(), fee };
      const isDuplicate = locations.some(loc => loc.name === newLocation.trim());
      
      if (!isDuplicate) {
        setLocations([...locations, newLocationObj]);
        setNewLocation("");
        setNewLocationFee("");
      }
    }
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
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
    const submitData = {
      ...values,
      locations,
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

              {/* Locations Management */}
              <div className="md:col-span-2">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                      className="md:col-span-2"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Fee ($0)"
                        value={newLocationFee}
                        onChange={(e) => setNewLocationFee(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addLocation();
                          }
                        }}
                        className="flex-1"
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
                  </div>

                  {/* Locations List */}
                  {locations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Current Locations:</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {locations.map((location, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-secondary rounded-md"
                          >
                            <div className="flex-1">
                              <span className="text-sm font-medium">{location.name}</span>
                              <div className="text-xs text-muted-foreground">
                                {location.fee > 0 ? `$${location.fee.toFixed(2)} fee` : 'No fee'}
                              </div>
                            </div>
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

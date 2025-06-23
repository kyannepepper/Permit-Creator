import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import Layout from "@/components/layout/layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Plus, X } from "lucide-react";

const createTemplateSchema = z.object({
  permitType: z.string().min(1, "Permit type is required"),
  parkId: z.string().min(1, "Park selection is required"),
  applicationFee: z.string().min(1, "Application fee is required"),
  permitFee: z.string().min(1, "Permit fee is required"),
  refundableDeposit: z.string().optional(),
  maxPeople: z.string().optional(),
  insuranceTier: z.string().default("0"), // Will be converted to number
  termsAndConditions: z.string().optional(),
  imagePath: z.string().optional(),
});

type CreateTemplateData = z.infer<typeof createTemplateSchema>;

export default function CreateSimpleTemplatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Check if user is admin (only admins can modify insurance requirements)
  const isAdmin = user?.role === 'admin';
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  const form = useForm<CreateTemplateData>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      permitType: "",
      parkId: "", 
      applicationFee: "0",
      permitFee: "35",
      refundableDeposit: "0",
      maxPeople: "",
      insuranceTier: "0",
      termsAndConditions: "",
      imagePath: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      const processedData = {
        permitType: data.permitType,
        parkId: parseInt(data.parkId),
        applicationFee: parseFloat(data.applicationFee),
        permitFee: parseFloat(data.permitFee),
        refundableDeposit: data.refundableDeposit ? parseFloat(data.refundableDeposit) : 0,
        maxPeople: data.maxPeople ? parseInt(data.maxPeople) : null,
        insuranceTier: parseInt(data.insuranceTier),
        termsAndConditions: data.termsAndConditions || null,
        imagePath: data.imagePath || null,
      };
      
      const response = await apiRequest("POST", "/api/permit-templates/simple", processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
      toast({
        title: "Success",
        description: "Permit template created successfully",
      });
      setLocation("/permit-templates");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create permit template",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateTemplateData) => {
    createMutation.mutate(data);
  };

  const handleImageUpload = (imagePath: string) => {
    form.setValue("imagePath", imagePath);
  };

  const handleRemoveImage = () => {
    form.setValue("imagePath", "");
  };

  return (
    <Layout title="Create Permit Template">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <p className="text-muted-foreground">Create a new special use permit template</p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Permit Template Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Permit Type */}
                <FormField
                  control={form.control}
                  name="permitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Use Permit Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Wedding Photography, Commercial Filming" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Park Selection */}
                <FormField
                  control={form.control}
                  name="parkId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Park</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a park" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parks.map((park) => (
                            <SelectItem key={park.id} value={park.id.toString()}>
                              {park.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Application Fee */}
                <FormField
                  control={form.control}
                  name="applicationFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Fee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select application fee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">$0</SelectItem>
                          <SelectItem value="10">$10</SelectItem>
                          <SelectItem value="50">$50</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Permit Fee */}
                <FormField
                  control={form.control}
                  name="permitFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permit Fee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select permit fee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="35">$35</SelectItem>
                          <SelectItem value="100">$100</SelectItem>
                          <SelectItem value="250">$250</SelectItem>
                          <SelectItem value="350">$350</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Refundable Deposit */}
                <FormField
                  control={form.control}
                  name="refundableDeposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refundable Deposit (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Max People */}
                <FormField
                  control={form.control}
                  name="maxPeople"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Number of People (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="No limit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Insurance Tier */}
                <FormField
                  control={form.control}
                  name="insuranceTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={!isAdmin ? "text-muted-foreground" : ""}>
                        Insurance Requirements {!isAdmin && "(Admin only)"}
                      </FormLabel>
                      <Select 
                        onValueChange={isAdmin ? field.onChange : undefined} 
                        defaultValue={field.value}
                        disabled={!isAdmin}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select insurance tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Tier 0 - Personal Insurance</SelectItem>
                          <SelectItem value="1">Tier 1 - $500K Per Person/$1M Per Occurrence</SelectItem>
                          <SelectItem value="2">Tier 2 - $1M Per Person/$2M Per Occurrence</SelectItem>
                          <SelectItem value="3">Tier 3 - $1M Per Person/$3M Per Occurrence</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload */}
                <ImageUpload
                  onImageUpload={handleImageUpload}
                  currentImage={form.watch("imagePath")}
                  onRemoveImage={handleRemoveImage}
                  className="space-y-2"
                />

                {/* Terms and Conditions */}
                <FormField
                  control={form.control}
                  name="termsAndConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms and Conditions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter specific terms and conditions for this permit type..."
                          {...field}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Template"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/permit-templates")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
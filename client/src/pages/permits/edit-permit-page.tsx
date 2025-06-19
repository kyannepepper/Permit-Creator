import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
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
import Layout from "@/components/layout/layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const editPermitSchema = z.object({
  permitType: z.string().min(1, "Permit type is required"),
  parkId: z.string().min(1, "Park selection is required"),
  applicationFee: z.string().min(1, "Application fee is required"),
  permitFee: z.string().min(1, "Permit fee is required"),
  refundableDeposit: z.string().optional(),
  maxPeople: z.string().optional(),
  insuranceRequired: z.boolean().default(false),
  termsAndConditions: z.string().optional(),
});

type EditPermitData = z.infer<typeof editPermitSchema>;

export default function EditPermitPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/permits/edit/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const permitId = match ? parseInt(params.id) : 0;
  
  // Fetch permit data
  const { data: permit, isLoading: permitLoading } = useQuery<any>({
    queryKey: [`/api/permits/${permitId}`],
    enabled: !!permitId,
  });
  
  // Fetch parks for dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  const form = useForm<EditPermitData>({
    resolver: zodResolver(editPermitSchema),
    defaultValues: {
      permitType: "",
      parkId: "", 
      applicationFee: "0",
      permitFee: "35",
      refundableDeposit: "0",
      maxPeople: "",
      insuranceRequired: false,
      termsAndConditions: "",
    },
  });

  // Set form values when permit data loads
  useEffect(() => {
    if (permit) {
      form.reset({
        permitType: permit.permitType || "",
        parkId: permit.parkId?.toString() || "",
        applicationFee: permit.applicationFee?.toString() || "0",
        permitFee: permit.permitFee?.toString() || "35", 
        refundableDeposit: permit.refundableDeposit?.toString() || "0",
        maxPeople: permit.maxPeople?.toString() || "",
        insuranceRequired: permit.insuranceRequired || false,
        termsAndConditions: permit.termsAndConditions || "",
      });
    }
  }, [permit, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EditPermitData) => {
      const processedData = {
        permitType: data.permitType,
        parkId: parseInt(data.parkId),
        applicationFee: parseFloat(data.applicationFee),
        permitFee: parseFloat(data.permitFee),
        refundableDeposit: data.refundableDeposit ? parseFloat(data.refundableDeposit) : 0,
        maxPeople: data.maxPeople ? parseInt(data.maxPeople) : null,
        insuranceRequired: data.insuranceRequired,
        termsAndConditions: data.termsAndConditions || null,
      };
      
      const response = await apiRequest("PATCH", `/api/permits/${permitId}`, processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Success",
        description: "Permit updated successfully",
      });
      setLocation("/permits");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permit",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: EditPermitData) => {
    updateMutation.mutate(data);
  };

  if (permitLoading) {
    return (
      <Layout title="Edit Permit" subtitle="Loading permit data">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!permit) {
    return (
      <Layout title="Edit Permit" subtitle="Permit not found">
        <div className="flex flex-col items-center justify-center h-64">
          <h3 className="text-lg font-medium mb-2">Permit not found</h3>
          <p className="text-neutral-medium mb-4">The requested permit could not be found.</p>
          <Button onClick={() => setLocation("/permits")}>Back to Permits</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Edit Permit">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Edit Permit</h1>
          <p className="text-muted-foreground">Update the special use permit</p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Permit Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Permit Type */}
                  <FormField
                    control={form.control}
                    name="permitType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Permit Type</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Wedding, Photography, Commercial Event"
                            {...field}
                          />
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Application Fee */}
                  <FormField
                    control={form.control}
                    name="applicationFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Fee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">$0 (No Fee)</SelectItem>
                            <SelectItem value="10">$10 (Standard)</SelectItem>
                            <SelectItem value="50">$50 (Premium)</SelectItem>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="35">$35 (Basic)</SelectItem>
                            <SelectItem value="100">$100 (Standard)</SelectItem>
                            <SelectItem value="250">$250 (Premium)</SelectItem>
                            <SelectItem value="350">$350 (Commercial)</SelectItem>
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
                        <FormLabel>Refundable Deposit</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Max People */}
                  <FormField
                    control={form.control}
                    name="maxPeople"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum People (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="e.g., 50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Insurance Required */}
                  <FormField
                    control={form.control}
                    name="insuranceRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Insurance Required</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Check if liability insurance is required for this permit type
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Terms and Conditions */}
                <FormField
                  control={form.control}
                  name="termsAndConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms and Conditions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter any specific terms and conditions for this permit type..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="flex-1"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Permit"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setLocation("/permits")}
                    className="flex-1"
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { createPermitTemplateSchema, Park } from "@shared/schema";
import { APPLICATION_FEE_OPTIONS, PERMIT_FEE_OPTIONS } from "@shared/stripe-products";
import Layout from "@/components/layout/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ImageUpload } from "@/components/ui/image-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type FormValues = z.infer<typeof createPermitTemplateSchema>;

export default function SimpleCreatePermitPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch parks data
  const { data: parks } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(createPermitTemplateSchema),
    defaultValues: {
      permitType: "",
      parkId: undefined,
      applicationFee: 0,
      permitFee: 35,
      refundableDeposit: 0,
      maxPeople: undefined,
      insuranceRequired: false,
      termsAndConditions: "",
      imagePath: "",
    },
  });

  // Handle form submission
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      console.log("Submitting permit template data:", values);
      const result = await apiRequest("POST", "/api/permit-templates/simple", values);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Permit template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
      setLocation("/permits");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create permit template",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const handleImageUpload = (imagePath: string) => {
    form.setValue("imagePath", imagePath);
  };

  const handleRemoveImage = () => {
    form.setValue("imagePath", "");
  };

  return (
    <Layout title="Create Permit Template" subtitle="Create a new permit template">
      <Card>
        <CardHeader>
          <CardTitle>Permit Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Permit Type */}
                <FormField
                  control={form.control}
                  name="permitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permit Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Wedding, Film Shoot, Event" {...field} />
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
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a park" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parks?.map((park) => (
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
                      <FormLabel>Application Cost</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseFloat(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select application cost" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {APPLICATION_FEE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              ${option.value} - {option.label}
                            </SelectItem>
                          ))}
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
                      <FormLabel>Permit Cost</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseFloat(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select permit cost" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PERMIT_FEE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              ${option.value} - {option.label}
                            </SelectItem>
                          ))}
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
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
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
                      <FormLabel>Maximum People (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="No limit"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Insurance Required */}
              <FormField
                control={form.control}
                name="insuranceRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Insurance Required
                      </FormLabel>
                    </div>
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
                        placeholder="Enter any specific terms and conditions for this permit type..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/permits")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Permit Template"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}
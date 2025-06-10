import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { APPLICATION_FEE_OPTIONS, PERMIT_FEE_OPTIONS, getStripeProductInfo } from "@shared/stripe-products";
import { ArrowLeft, Save } from "lucide-react";

const applicationSchema = z.object({
  parkId: z.string().min(1, "Please select a park"),
  eventTitle: z.string().min(1, "Event title is required"),
  eventDate: z.string().min(1, "Event date is required"),
  eventDescription: z.string().min(10, "Please provide a detailed description (minimum 10 characters)"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  organizationName: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  attendees: z.string().min(1, "Number of attendees is required"),
  setupTime: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  specialRequests: z.string().optional(),
  applicationFee: z.string().min(1, "Please select an application fee"),
  permitFee: z.string().min(1, "Please select a permit fee"),
  agreedToTerms: z.boolean().refine(val => val === true, "You must agree to the terms"),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export default function CreateApplicationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch parks for dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      parkId: "",
      eventTitle: "",
      eventDate: "",
      eventDescription: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      organizationName: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      attendees: "",
      setupTime: "",
      startTime: "",
      endTime: "",
      specialRequests: "",
      applicationFee: "",
      permitFee: "",
      agreedToTerms: false,
    },
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const parkId = parseInt(data.parkId);
      const applicationFee = parseFloat(data.applicationFee);
      const permitFee = parseFloat(data.permitFee);
      
      const stripeInfo = getStripeProductInfo(parkId, applicationFee, permitFee);
      
      const applicationData = {
        ...data,
        parkId,
        attendees: parseInt(data.attendees),
        applicationFee,
        permitFee,
        totalFee: stripeInfo.totalFee,
        applicationFeeStripeProductId: stripeInfo.applicationFeeStripeProductId,
        permitFeeStripeProductId: stripeInfo.permitFeeStripeProductId,
        eventDate: new Date(data.eventDate).toISOString(),
      };

      const response = await apiRequest("POST", "/api/applications", applicationData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Application Submitted",
        description: "Your permit application has been successfully submitted and is awaiting payment.",
      });
      setLocation("/applications");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ApplicationFormData) => {
    createApplicationMutation.mutate(data);
  };

  const watchedApplicationFee = form.watch("applicationFee");
  const watchedPermitFee = form.watch("permitFee");
  
  const totalFee = (parseFloat(watchedApplicationFee) || 0) + (parseFloat(watchedPermitFee) || 0);

  return (
    <Layout title="Create Application">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Permit Application</h1>
            <p className="text-muted-foreground">
              Submit a new special use permit application
            </p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/applications")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Park Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Park Information</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="parkId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Park *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a park" />
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
              </CardContent>
            </Card>

            {/* Event Information */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="eventTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter event title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eventDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="eventDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide a detailed description of your event..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="attendees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Attendees *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="setupTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setup Time (Optional)</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requests (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any special accommodations or requests..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Fee Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Fee Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="applicationFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Fee *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select application fee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {APPLICATION_FEE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="permitFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Permit Fee *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select permit fee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PERMIT_FEE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(watchedApplicationFee || watchedPermitFee) && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total Fee:</span>
                      <span>${totalFee.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Application Fee: ${watchedApplicationFee || '0.00'} + Permit Fee: ${watchedPermitFee || '0.00'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Applicant Information */}
            <Card>
              <CardHeader>
                <CardTitle>Applicant Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.smith@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Salt Lake City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input placeholder="UT" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="84101" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Terms and Submit */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="agreedToTerms"
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
                            I agree to the terms and conditions *
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            By submitting this application, you agree to comply with all park rules and regulations.
                          </p>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={createApplicationMutation.isPending}
                    className="w-full"
                  >
                    {createApplicationMutation.isPending ? (
                      "Submitting..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Submit Application
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
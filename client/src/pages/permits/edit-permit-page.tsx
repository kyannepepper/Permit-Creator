import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { insertPermitSchema, Park, Activity, Permit } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Extend the permit schema with validation
const editPermitSchema = insertPermitSchema.extend({
  startDate: z.coerce.date({
    required_error: "A start date is required",
  }),
  endDate: z.coerce.date({
    required_error: "An end date is required",
  }),
  permitteeName: z.string().min(2, {
    message: "Permittee name must be at least 2 characters.",
  }),
  permitteeEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  permitteePhone: z.string().optional(),
  parkId: z.number({
    required_error: "Please select a park.",
  }),
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  activity: z.string({
    required_error: "Please select an activity.",
  }),
  description: z.string().optional(),
  participantCount: z.number().positive({
    message: "Participant count must be a positive number.",
  }).optional(),
  specialConditions: z.string().optional(),
  status: z.string(),
}).partial();

type FormValues = z.infer<typeof editPermitSchema>;

export default function EditPermitPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/permits/edit/:id");
  const { toast } = useToast();
  const { user } = useAuth();
  
  const permitId = match ? parseInt(params.id) : 0;
  
  // Fetch permit data
  const { data: permit, isLoading: permitLoading } = useQuery<Permit>({
    queryKey: [`/api/permits/${permitId}`],
    enabled: !!permitId,
  });
  
  // Fetch parks for dropdown
  const { data: parks } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });
  
  // Fetch activities for dropdown
  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(editPermitSchema),
    defaultValues: {
      permitType: "",
      parkId: undefined,
      location: "",
      permitteeName: "",
      permitteeEmail: "",
      permitteePhone: "",
      activity: "",
      description: "",
      participantCount: undefined,
      specialConditions: "",
      status: "",
      startDate: undefined,
      endDate: undefined,
    },
  });
  
  // Set form values when permit data is loaded
  useEffect(() => {
    if (permit) {
      form.reset({
        ...permit,
        startDate: new Date(permit.startDate),
        endDate: new Date(permit.endDate),
      });
    }
  }, [permit, form]);
  
  // Handle form submission
  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return await apiRequest("PATCH", `/api/permits/${permitId}`, {
        ...values,
        updatedBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Permit updated",
        description: "The permit has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${permitId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits/recent"] });
      setLocation("/permits");
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating permit",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values);
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
    <Layout 
      title="Edit Permit" 
      subtitle={`Editing permit ${permit.permitNumber}`}
    >
      <Card>
        <CardContent className="pt-6">
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select permit type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="nonprofit">Non-Profit</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Park */}
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
                
                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location within Park</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Beach area, Pavilion 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Activity */}
                <FormField
                  control={form.control}
                  name="activity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an activity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activities?.map((activity) => (
                            <SelectItem key={activity.id} value={activity.name}>
                              {activity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Permittee Name */}
                <FormField
                  control={form.control}
                  name="permitteeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permittee Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Permittee Email */}
                <FormField
                  control={form.control}
                  name="permitteeEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permittee Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Permittee Phone */}
                <FormField
                  control={form.control}
                  name="permitteePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permittee Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Participant Count */}
                <FormField
                  control={form.control}
                  name="participantCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Participant Count</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Number of participants" 
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Start Date */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                formatDate(field.value)
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* End Date */}
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                formatDate(field.value)
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                        placeholder="Provide a detailed description of the event or activity" 
                        className="min-h-[100px]" 
                        {...field} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Special Conditions */}
              <FormField
                control={form.control}
                name="specialConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Conditions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any special conditions or requirements" 
                        className="min-h-[100px]" 
                        {...field} 
                        value={field.value || ''} 
                      />
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
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Updating..." : "Update Permit"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}

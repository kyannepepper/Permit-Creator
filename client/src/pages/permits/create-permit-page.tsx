import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertPermitSchema, Park, Activity } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const createPermitSchema = insertPermitSchema.extend({
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
  status: z.string().default("pending"),
  permitTemplateId: z.string().optional(),
  timeSlot: z.string().optional(),
  hasInsurance: z.boolean().optional(),
  // Add dynamic fields for custom fields and waivers
  // These will be transformed in the onSubmit function
});

type FormValues = z.infer<typeof createPermitSchema>;

export default function CreatePermitPage() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch parks for dropdown
  const { data: parks } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });

  // Fetch permit templates
  const { data: templates } = useQuery({
    queryKey: ["/api/permit-templates"],
  });

  // Filter parks to only show ones with templates
  const parksWithTemplates = parks?.filter(park => 
    templates?.some(template => template.parkId === park.id)
  );

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(createPermitSchema),
    defaultValues: {
      permitType: "standard",
      parkId: undefined,
      location: "",
      permitteeName: "",
      permitteeEmail: "",
      permitteePhone: "",
      activity: "",
      description: "",
      participantCount: undefined,
      specialConditions: "",
      status: "pending",
      startDate: undefined,
      endDate: undefined,
      createdBy: user?.id,
      updatedBy: user?.id,
      permitTemplateId: undefined,
      timeSlot: undefined,
      hasInsurance: false,
    },
  });

  // Handle form submission
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      console.log("Submitting permit data:", values);
      try {
        const result = await apiRequest("POST", "/api/permits", {
          ...values,
          createdBy: user?.id,
          updatedBy: user?.id,
        });
        console.log("API response:", result);
        return result;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Permit creation successful");
      toast({
        title: "Permit created",
        description: "The permit has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits/recent"] });
      setLocation("/permits");
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error creating permit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const nextStep = () => {
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const onSubmit = (values: FormValues) => {
    // Get the selected template to store reference information
    const selectedTemplate = templates?.find(t => t.id.toString() === values.permitTemplateId);
    
    // Prepare permit data
    const permitData = {
      ...values,
      // Store template information in specialConditions if not already set
      specialConditions: values.specialConditions || JSON.stringify({
        templateId: values.permitTemplateId,
        templateName: selectedTemplate?.name,
        timeSlot: values.timeSlot,
        applicationCost: selectedTemplate?.applicationCost,
        customFields: Object.keys(values)
          .filter(key => key.startsWith('customField_'))
          .reduce((acc, key) => {
            const index = parseInt(key.split('_')[1]);
            const field = selectedTemplate?.customFields?.[index];
            if (field) {
              acc[field.name] = values[key as keyof FormValues];
            }
            return acc;
          }, {} as Record<string, any>),
        waivers: Object.keys(values)
          .filter(key => key.startsWith('waiver_'))
          .reduce((acc, key) => {
            const index = parseInt(key.split('_')[1]);
            const waiver = selectedTemplate?.waivers?.[index];
            if (waiver) {
              acc[waiver.title] = values[key as keyof FormValues];
            }
            return acc;
          }, {} as Record<string, any>),
        hasInsurance: values.hasInsurance
      })
    };
    
    // Submit the data
    createMutation.mutate(permitData as FormValues);
  };

  return (
    <Layout title="Add Application" subtitle="Create a new special use permit application">
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {step === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Step 1: Select Park</h3>
                  <FormField
                    control={form.control}
                    name="parkId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Park</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(parseInt(value));
                            nextStep();
                          }}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a park" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {parksWithTemplates?.map((park) => (
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
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Step 2: Select Permit</h3>
                  <FormField
                    control={form.control}
                    name="permitTemplateId" // Added new field name
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Permit Template</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            nextStep();
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select permit template" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates?.map((template) => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" onClick={prevStep} variant="outline">Back</Button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Step 3: Select Location</h3>
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location within Park</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            nextStep();
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates?.find(t => t.id.toString() === form.getValues("permitTemplateId"))
                              ?.locations?.map((location) => (
                                <SelectItem key={location.name} value={location.name}>
                                  {location.name}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" onClick={prevStep} variant="outline">Back</Button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Step 4: Select Date and Time</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => {
                        const selectedTemplate = templates?.find(t => t.id.toString() === form.getValues("permitTemplateId"));
                        const selectedLocation = selectedTemplate?.locations?.find(l => l.name === form.getValues("location"));
                        const availableDates = selectedLocation?.availableDates || [];
                        const blackoutDates = selectedLocation?.blackoutDates?.map(date => new Date(date)) || [];
                        
                        // Function to check if a date is available
                        const isDateAvailable = (date: Date) => {
                          // First check if it's not a blackout date
                          const isBlackout = blackoutDates.some(blackoutDate => 
                            blackoutDate.getFullYear() === date.getFullYear() &&
                            blackoutDate.getMonth() === date.getMonth() &&
                            blackoutDate.getDate() === date.getDate()
                          );
                          
                          if (isBlackout) {
                            return false;
                          }
                          
                          // Then check if it's within an available date range
                          return availableDates.some(availableDate => {
                            const start = new Date(availableDate.startDate);
                            const end = availableDate.endDate ? new Date(availableDate.endDate) : null;
                            
                            // If there's no end date and repeatWeekly is true,
                            // check if the day of the week matches
                            if (!end && availableDate.repeatWeekly) {
                              return date >= start && date.getDay() === start.getDay();
                            }
                            
                            return date >= start && (!end || date <= end);
                          });
                        };

                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date</FormLabel>
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
                                  disabled={(date) => !isDateAvailable(date)}
                                  modifiers={{
                                    blackout: blackoutDates
                                  }}
                                  modifiersStyles={{
                                    blackout: {
                                      textDecoration: "line-through",
                                      color: "red",
                                      opacity: 0.5
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="timeSlot"
                      render={({ field }) => {
                        const selectedTemplate = templates?.find(t => t.id.toString() === form.getValues("permitTemplateId"));
                        const selectedLocation = selectedTemplate?.locations?.find(l => l.name === form.getValues("location"));
                        const selectedDate = form.getValues("startDate");
                        
                        // Get available time slots for the selected date's day of week
                        const dayOfWeek = selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() : '';
                        const availableTimeSlots = selectedLocation?.availableTimes || [];

                        return (
                          <FormItem>
                            <FormLabel>Time Slot</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!selectedDate}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a time slot" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableTimeSlots.map((slot, index) => (
                                  <SelectItem 
                                    key={index} 
                                    value={`${slot.startTime}-${slot.endTime}`}
                                  >
                                    {new Date(`2000/01/01 ${slot.startTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })} 
                                    - 
                                    {new Date(`2000/01/01 ${slot.endTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <Button type="button" onClick={prevStep} variant="outline">Back</Button>
                    <Button type="button" onClick={nextStep}>Continue to Application</Button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Step 5: Application Details</h3>
                  
                  {/* Basic Applicant Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-base font-medium">Applicant Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Get selected template */}
                  {(() => {
                    const selectedTemplate = templates?.find(t => t.id.toString() === form.getValues("permitTemplateId"));
                    
                    return (
                      <>
                        {/* Show permit information if required */}
                        {selectedTemplate?.permitInfoRequired && (
                          <div className="space-y-4">
                            <h4 className="text-base font-medium">Permit Information</h4>
                            <div className="bg-muted/50 p-4 rounded-md">
                              <p className="text-sm">{selectedTemplate.permitInfoRequired}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Show applicant information if required */}
                        {selectedTemplate?.applicantInfoRequired && (
                          <div className="space-y-4">
                            <h4 className="text-base font-medium">Additional Applicant Requirements</h4>
                            <div className="bg-muted/50 p-4 rounded-md">
                              <p className="text-sm">{selectedTemplate.applicantInfoRequired}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Show insurance requirements if required */}
                        {selectedTemplate?.requireInsurance && (
                          <div className="space-y-4">
                            <h4 className="text-base font-medium">Insurance Requirements</h4>
                            <div className="bg-accent/30 p-4 rounded-md">
                              <p className="text-sm font-medium">This permit requires insurance coverage.</p>
                              {selectedTemplate.insuranceLimit > 0 && (
                                <p className="text-sm mt-2">Minimum coverage: {formatCurrency(selectedTemplate.insuranceLimit)}</p>
                              )}
                              {selectedTemplate.insuranceActivities?.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm font-medium">Required for these activities:</p>
                                  <ul className="list-disc list-inside text-sm mt-1">
                                    {selectedTemplate.insuranceActivities.map((activity, i) => (
                                      <li key={i}>{activity}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <FormField
                                control={form.control}
                                name="hasInsurance"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-4">
                                    <FormControl>
                                      <Checkbox 
                                        checked={field.value} 
                                        onCheckedChange={field.onChange} 
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm">I confirm that I have the required insurance coverage</FormLabel>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Show application cost if any */}
                        {selectedTemplate?.applicationCost > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-base font-medium">Application Cost</h4>
                            <div className="bg-muted/50 p-4 rounded-md">
                              <p className="text-sm">This application has a non-refundable fee of {formatCurrency(selectedTemplate.applicationCost)}.</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Show attachments requirement if required */}
                        {selectedTemplate?.attachmentsRequired && (
                          <div className="space-y-4">
                            <h4 className="text-base font-medium">Required Attachments</h4>
                            <div className="bg-muted/50 p-4 rounded-md">
                              <p className="text-sm">Supporting documentation is required for this application. You will be contacted after submission to provide these documents.</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Show custom fields */}
                        {selectedTemplate?.customFields && selectedTemplate.customFields.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-base font-medium">Additional Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedTemplate.customFields.map((field, index) => {
                                const fieldName = `customField_${index}`;
                                
                                if (field.type === 'text') {
                                  return (
                                    <FormField
                                      key={index}
                                      control={form.control}
                                      name={fieldName as any}
                                      render={({ field: formField }) => (
                                        <FormItem>
                                          <FormLabel>{field.name}{field.required && ' *'}</FormLabel>
                                          <FormControl>
                                            <Input placeholder={field.name} {...formField} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  );
                                } else if (field.type === 'number') {
                                  return (
                                    <FormField
                                      key={index}
                                      control={form.control}
                                      name={fieldName as any}
                                      render={({ field: formField }) => (
                                        <FormItem>
                                          <FormLabel>{field.name}{field.required && ' *'}</FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="number"
                                              placeholder={field.name} 
                                              {...formField}
                                              onChange={(e) => formField.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  );
                                } else if (field.type === 'checkbox') {
                                  return (
                                    <FormField
                                      key={index}
                                      control={form.control}
                                      name={fieldName as any}
                                      render={({ field: formField }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                                          <FormControl>
                                            <Checkbox 
                                              checked={formField.value} 
                                              onCheckedChange={formField.onChange} 
                                            />
                                          </FormControl>
                                          <div className="space-y-1 leading-none">
                                            <FormLabel>{field.name}{field.required && ' *'}</FormLabel>
                                          </div>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  );
                                } else if (field.type === 'select' && field.options) {
                                  return (
                                    <FormField
                                      key={index}
                                      control={form.control}
                                      name={fieldName as any}
                                      render={({ field: formField }) => (
                                        <FormItem>
                                          <FormLabel>{field.name}{field.required && ' *'}</FormLabel>
                                          <Select
                                            onValueChange={formField.onChange}
                                            value={formField.value}
                                          >
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder={`Select ${field.name}`} />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {field.options.map((option, optionIndex) => (
                                                <SelectItem key={optionIndex} value={option}>
                                                  {option}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Show waivers */}
                        {selectedTemplate?.waivers && selectedTemplate.waivers.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-base font-medium">Waivers and Agreements</h4>
                            <div className="space-y-4">
                              {selectedTemplate.waivers.map((waiver, index) => (
                                <div key={index} className="rounded-md border p-4">
                                  <div className="font-medium mb-2">{waiver.title}</div>
                                  <div className="text-sm bg-muted/30 p-3 rounded-md mb-3 max-h-40 overflow-y-auto">
                                    {waiver.text}
                                  </div>
                                  <FormField
                                    control={form.control}
                                    name={`waiver_${index}` as any}
                                    render={({ field: formField }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox 
                                            checked={formField.value} 
                                            onCheckedChange={formField.onChange} 
                                          />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                          <FormLabel>I agree to the terms above</FormLabel>
                                        </div>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button type="button" onClick={prevStep} variant="outline">Back</Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "Creating..." : "Submit Application"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}
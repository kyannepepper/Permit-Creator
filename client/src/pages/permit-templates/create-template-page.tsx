import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/layout/layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Park } from "@shared/schema";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Trash2, Calendar as CalendarIcon2, PlusCircle, Image } from "lucide-react";
import { cn } from "@/lib/utils";

// Form schema
const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  availableDates: z.array(z.object({
    startDate: z.date(),
    endDate: z.date(),
  })).optional(),
  availableTimes: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
  })).optional(),
  maxDays: z.number().min(1).optional(),
  blackoutDates: z.array(z.date()).optional(),
});

const customFieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  type: z.enum(["text", "number", "date", "checkbox", "select"]) as z.ZodType<"text" | "number" | "date" | "checkbox" | "select">,
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

const waiverSchema = z.object({
  title: z.string().min(1, "Waiver title is required"),
  body: z.string().min(1, "Waiver text is required"),
  checkboxText: z.string().min(1, "Checkbox text is required"),
});

const createTemplateSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters"),
  parkId: z.number({
    required_error: "Please select a park",
  }),
  locations: z.array(locationSchema).min(1, "At least one location is required"),
  applicationCost: z.number().min(0, "Cost must be a positive number"),
  customFields: z.array(customFieldSchema).optional(),
  waivers: z.array(waiverSchema).optional(),
  requireInsurance: z.boolean().default(false),
  insuranceActivities: z.array(z.string()).optional(),
  insuranceLimit: z.number().optional(),
  attachmentsRequired: z.boolean().default(false),
  permitInfoRequired: z.boolean().default(false),
  applicantInfoRequired: z.boolean().default(false),
});

type FormValues = z.infer<typeof createTemplateSchema>;

export default function CreateTemplatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch parks for dropdown
  const { data: parks } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });
  
  // Fetch activities for dropdown
  const { data: activities } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/activities"],
  });
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: "",
      parkId: undefined,
      locations: [{ name: "", description: "", images: [], availableDates: [], availableTimes: [], maxDays: 1, blackoutDates: [] }],
      applicationCost: 0,
      customFields: [],
      waivers: [],
      requireInsurance: false,
      insuranceActivities: [],
      insuranceLimit: 0,
      attachmentsRequired: false,
      permitInfoRequired: false,
      applicantInfoRequired: false,
    },
  });
  
  // Field arrays for dynamic form elements
  const {
    fields: locationFields,
    append: appendLocation,
    remove: removeLocation,
  } = useFieldArray({
    control: form.control,
    name: "locations",
  });
  
  const {
    fields: customFieldFields,
    append: appendCustomField,
    remove: removeCustomField,
  } = useFieldArray({
    control: form.control,
    name: "customFields",
  });
  
  const {
    fields: waiverFields,
    append: appendWaiver,
    remove: removeWaiver,
  } = useFieldArray({
    control: form.control,
    name: "waivers",
  });
  
  // Handle form submission
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return await apiRequest("POST", "/api/permit-templates", {
        ...values,
        createdBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Template created",
        description: "The permit template has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
      setLocation("/permit-templates");
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  return (
    <Layout title="Create Permit Template" subtitle="Create a new permit template">
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Wedding Permit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                
                <FormField
                  control={form.control}
                  name="applicationCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Cost</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Add Location(s)</h3>
                <Accordion type="multiple" className="w-full mb-4">
                  {locationFields.map((field, index) => (
                    <AccordionItem value={`location-${index}`} key={field.id}>
                      <AccordionTrigger className="text-base">
                        {form.watch(`locations.${index}.name`) || `Location ${index + 1}`}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <FormField
                            control={form.control}
                            name={`locations.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Beach Area, Pavilion 3" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`locations.${index}.maxDays`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maximum Days Allowed</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="1" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`locations.${index}.description`}
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Location Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Provide details about this location" 
                                  className="min-h-[80px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Image Upload Section */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Location Images</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="border border-dashed border-neutral-300 rounded-md p-4 flex flex-col items-center justify-center text-center relative h-36">
                              <PlusCircle className="h-8 w-8 text-neutral-400 mb-2" />
                              <p className="text-sm text-neutral-500">Click to add image</p>
                              <Input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                id={`location-image-${index}`}
                                onChange={(e) => {
                                  // Image upload logic would go here
                                  console.log('Image selected', e.target.files);
                                }}
                              />
                              <label 
                                htmlFor={`location-image-${index}`}
                                className="absolute inset-0 cursor-pointer z-10"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Available Dates Section */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Available Dates</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <FormLabel>Start Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <span>Select date range start</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={new Date()}
                                    onSelect={() => {}}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <FormLabel>End Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <span>Select date range end</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={new Date()}
                                    onSelect={() => {}}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              // Add date range logic would go here
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Date Range
                          </Button>
                        </div>
                        
                        {/* Available Times Section */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Available Times</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <FormLabel>Start Time</FormLabel>
                              <Input
                                type="time"
                                placeholder="Start Time"
                              />
                            </div>
                            <div>
                              <FormLabel>End Time</FormLabel>
                              <Input
                                type="time"
                                placeholder="End Time"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              // Add time range logic would go here
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Time Slot
                          </Button>
                        </div>
                        
                        {/* Blackout Dates Section */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Blackout Dates</h4>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full md:w-auto justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                <span>Select blackout dates</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="multiple"
                                selected={[]}
                                onSelect={() => {}}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="mt-2 text-sm text-neutral-500">
                            Selected blackout dates: None
                          </div>
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          {locationFields.length > 1 && (
                            <Button 
                              type="button" 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => removeLocation(index)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove Location
                            </Button>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendLocation({ 
    name: "", 
    description: "", 
    maxDays: 1,
    images: [],
    availableDates: [],
    availableTimes: [],
    blackoutDates: []
  })}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Location
                </Button>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Preview Fields</h3>
                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Permit Name</li>
                    <li>Application Cost: ${form.watch("applicationCost").toFixed(2)}</li>
                    <li>Contact Person</li>
                    <li>Phone Number</li>
                    <li>Email</li>
                  </ul>
                </div>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="custom-fields">
                  <AccordionTrigger>Add Fields (optional)</AccordionTrigger>
                  <AccordionContent>
                    {customFieldFields.map((field, index) => (
                      <div key={field.id} className="bg-gray-50 p-4 rounded-md mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`customFields.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Field Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Event Name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`customFields.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Field Type</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select field type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="checkbox">Checkbox</SelectItem>
                                    <SelectItem value="select">Dropdown</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`customFields.${index}.required`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Required field</FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end mt-4">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => removeCustomField(index)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Field
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => appendCustomField({ name: "", type: "text" as const, required: false })}
                        className="flex-1"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Custom Field
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const predefinedFields: {
                            name: string;
                            type: "text" | "number" | "date" | "checkbox" | "select";
                            required: boolean;
                          }[] = [
                            { name: "Event Name", type: "text", required: true },
                            { name: "Max Attendees", type: "number", required: true },
                            { name: "Business Name", type: "text", required: false },
                            { name: "Physical Address", type: "text", required: false },
                            { name: "Event Start Date", type: "date", required: true },
                            { name: "Event End Date", type: "date", required: true },
                            { name: "Permit Cost", type: "number", required: false },
                            { name: "Deposit Cost", type: "number", required: false },
                          ];
                          predefinedFields.forEach(field => appendCustomField(field));
                        }}
                        className="flex-1"
                      >
                        Choose a Premade Option
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="waivers">
                  <AccordionTrigger>Add a Waiver</AccordionTrigger>
                  <AccordionContent>
                    {waiverFields.map((field, index) => (
                      <div key={field.id} className="bg-gray-50 p-4 rounded-md mb-4">
                        <FormField
                          control={form.control}
                          name={`waivers.${index}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Waiver Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Liability Waiver" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`waivers.${index}.body`}
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Waiver Text</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter the full text of the waiver here" 
                                  className="min-h-[150px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`waivers.${index}.checkboxText`}
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Checkbox Text</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. I agree to the terms and conditions" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end mt-4">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => removeWaiver(index)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Waiver
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendWaiver({ title: "", body: "", checkboxText: "" })}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Waiver
                    </Button>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="insurance">
                  <AccordionTrigger>Ask for Insurance (optional)</AccordionTrigger>
                  <AccordionContent>
                    <FormField
                      control={form.control}
                      name="requireInsurance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 mb-4">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Require insurance for this template</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("requireInsurance") && (
                      <div className="space-y-4">
                        <h4 className="font-medium mt-2">Select activities that will require insurance:</h4>
                        {activities?.map((activity) => (
                          <FormField
                            key={activity.id}
                            control={form.control}
                            name="insuranceActivities"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={activity.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(activity.name)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value || [], activity.name])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== activity.name
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {activity.name}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                        
                        <FormField
                          control={form.control}
                          name="insuranceLimit"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Insurance Limit ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="1000000" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))} 
                                />
                              </FormControl>
                              <FormDescription>
                                The minimum insurance coverage required in US dollars
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="additional-options">
                  <AccordionTrigger>Additional Options</AccordionTrigger>
                  <AccordionContent>
                    <FormField
                      control={form.control}
                      name="attachmentsRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 mb-4">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Allow document attachments</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="permitInfoRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 mb-4">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Include permit information section</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="applicantInfoRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 mb-4">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Include applicant information section</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <div className="flex justify-end space-x-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/permit-templates")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}
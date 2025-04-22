import { useState, useRef } from "react";
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
import { format } from "date-fns";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { CalendarIcon, Plus, Trash2, Calendar as CalendarIcon2, PlusCircle, Image } from "lucide-react";
import { cn } from "@/lib/utils";

// Form schema
const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  availableDates: z.array(z.object({
    startDate: z.date(),
    endDate: z.date().nullable(), // Allow null for no end date
    hasNoEndDate: z.boolean().default(false), // Flag for no end date
    repeatWeekly: z.boolean().default(false), // Flag for weekly repetition
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
  options: z.string().optional(), // Store options as a newline-separated string
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
  permitCost: z.number().min(0, "Cost must be a positive number").optional(),
  customFields: z.array(customFieldSchema).optional(),
  waivers: z.array(waiverSchema).optional(),
  requireInsurance: z.boolean().default(false),
  insuranceActivities: z.array(z.string()).optional(),
  // Insurance field collection
  insuranceFields: z.array(z.string()).default([]),
  // New insurance fields
  injuryToOnePersonAmount: z.string().optional(),
  injuryToMultiplePersonsAmount: z.string().optional(),
  propertyDamageAmount: z.string().optional(),
  // Old field removed: insuranceLimit
  attachmentsRequired: z.boolean().default(false),
  permitInfoRequired: z.string().optional(),
  applicantInfoRequired: z.string().optional(),
});

type FormValues = z.infer<typeof createTemplateSchema>;

export default function CreateTemplatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Local state for image previews (in real app, we would upload and get URLs)
  const [imagePreviewUrls, setImagePreviewUrls] = useState<{[key: string]: string}>({});
  const [aiImagePrompt, setAiImagePrompt] = useState<string>("");
  const [activeLocationIndex, setActiveLocationIndex] = useState<number>(0);
  const [aiImageDialogOpen, setAiImageDialogOpen] = useState<boolean>(false);
  
  // Local state for date selection
  const [dateRanges, setDateRanges] = useState<{[key: string]: {start?: Date, end?: Date, noEndDate?: boolean, repeatWeekly?: boolean}}>({});
  const [blackoutDates, setBlackoutDates] = useState<{[key: string]: Date[]}>({});
  
  // Local state for time slots
  const [timeSlots, setTimeSlots] = useState<{[key: string]: {startTime: string, endTime: string}}>({});
  
  // Fetch parks for dropdown
  const { data: parks } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });
  
  // Fetch activities for dropdown
  const { data: activities } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/activities"],
  });
  
  // AI image generation mutation
  const generateImageMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/generate-image", { prompt });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        // Update preview
        setImagePreviewUrls({
          ...imagePreviewUrls,
          [`location-${activeLocationIndex}`]: data.url
        });
        
        // Update form state with the image URL
        const currentImages = form.getValues(`locations.${activeLocationIndex}.images`) || [];
        form.setValue(`locations.${activeLocationIndex}.images`, 
          [...currentImages, data.url]
        );
        
        toast({
          title: "AI image generated",
          description: "Image has been generated and added to the location.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Image generation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: "",
      parkId: undefined,
      locations: [{ name: "", description: "", images: [], availableDates: [], availableTimes: [], maxDays: 1, blackoutDates: [] }],
      applicationCost: 0,
      permitCost: 0,
      customFields: [], // will include { name, type, required, options }
      waivers: [],
      requireInsurance: false,
      insuranceActivities: [],
      insuranceFields: [], // fields to collect from applicant
      // New insurance fields
      injuryToOnePersonAmount: "Non-applicable",
      injuryToMultiplePersonsAmount: "Non-applicable",
      propertyDamageAmount: "Non-applicable",
      // Removed insuranceLimit
      attachmentsRequired: false,
      permitInfoRequired: "",
      applicantInfoRequired: "",
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
  
  const {
    fields: insuranceFieldsArray,
    append: appendInsuranceField,
    remove: removeInsuranceField,
  } = useFieldArray({
    control: form.control,
    name: "insuranceFields",
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
    // Process the customFields to convert options from string to array
    const processedValues = {
      ...values,
      customFields: values.customFields?.map(field => {
        if (field.type === "select" && field.options) {
          // Split by newline and filter out empty lines
          return {
            ...field,
            options: field.options
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)
          };
        }
        return field;
      })
    };
    
    createMutation.mutate(processedValues);
  };

  return (
    <Layout title="Create Permit Template" subtitle="Create a new permit template">
      {/* AI Image Generation Dialog */}
      <Dialog open={aiImageDialogOpen} onOpenChange={setAiImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Location Image with AI</DialogTitle>
            <DialogDescription>
              Describe the location you want to visualize, and AI will generate an image for you.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ai-prompt">Image description</Label>
              <Textarea
                id="ai-prompt"
                placeholder="Describe the location (e.g. 'A serene mountain lake with a wooden dock, surrounded by pine trees, sunset view')"
                value={aiImagePrompt}
                onChange={(e) => setAiImagePrompt(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAiImagePrompt("");
                setAiImageDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={() => {
                if (aiImagePrompt.trim()) {
                  generateImageMutation.mutate(aiImagePrompt.trim());
                  setAiImageDialogOpen(false);
                  setAiImagePrompt("");
                }
              }}
              disabled={generateImageMutation.isPending || !aiImagePrompt.trim()}
            >
              {generateImageMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span> Generating...
                </>
              ) : (
                'Generate Image'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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

                <FormField
                  control={form.control}
                  name="permitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permit Cost</FormLabel>
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
                          <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {imagePreviewUrls[`location-${index}`] ? (
                                <div className="border border-neutral-300 rounded-md overflow-hidden relative h-36">
                                  <img 
                                    src={imagePreviewUrls[`location-${index}`]} 
                                    alt="Location preview" 
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        // Remove the image
                                        const newImagePreviewUrls = { ...imagePreviewUrls };
                                        delete newImagePreviewUrls[`location-${index}`];
                                        setImagePreviewUrls(newImagePreviewUrls);
                                        
                                        // Update form state
                                        const currentImages = form.getValues(`locations.${index}.images`) || [];
                                        form.setValue(`locations.${index}.images`, 
                                          currentImages.filter((_, i) => i !== 0)
                                        );
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="border border-dashed border-neutral-300 rounded-md p-4 flex flex-col items-center justify-center text-center relative h-36">
                                  <PlusCircle className="h-8 w-8 text-neutral-400 mb-2" />
                                  <p className="text-sm text-neutral-500">Click to add image</p>
                                  <Input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    id={`location-image-${index}`}
                                    onChange={(e) => {
                                      const files = e.target.files;
                                      if (files && files.length > 0) {
                                        const file = files[0];
                                        const reader = new FileReader();
                                        
                                        reader.onloadend = () => {
                                          // In a real app, we would upload to server and get a URL
                                          // For demo, we'll use the data URL
                                          const imageUrl = reader.result as string;
                                          
                                          // Update preview
                                          setImagePreviewUrls({
                                            ...imagePreviewUrls,
                                            [`location-${index}`]: imageUrl
                                          });
                                          
                                          // Update form state (would normally be URL from server)
                                          const currentImages = form.getValues(`locations.${index}.images`) || [];
                                          form.setValue(`locations.${index}.images`, 
                                            [...currentImages, imageUrl]
                                          );
                                          
                                          toast({
                                            title: "Image added",
                                            description: "Image has been added to the location.",
                                          });
                                        };
                                        
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                  <label 
                                    htmlFor={`location-image-${index}`}
                                    className="absolute inset-0 cursor-pointer z-10"
                                  />
                                </div>
                              )}
                            </div>
                            
                            {/* AI image generation button */}
                            <Button
                              type="button"
                              variant="outline"
                              className="flex items-center justify-center gap-2"
                              onClick={() => {
                                setActiveLocationIndex(index);
                                setAiImageDialogOpen(true);
                              }}
                              disabled={generateImageMutation.isPending}
                            >
                              <Image className="h-4 w-4" />
                              {generateImageMutation.isPending && activeLocationIndex === index ? 
                                "Generating image..." : 
                                "Generate image with AI"
                              }
                            </Button>
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
                                    <span>
                                      {dateRanges[`location-${index}`]?.start 
                                        ? format(dateRanges[`location-${index}`].start as Date, 'PPP')
                                        : "Select date range start"
                                      }
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={dateRanges[`location-${index}`]?.start}
                                    onSelect={(date) => {
                                      const newRanges = { ...dateRanges };
                                      if (!newRanges[`location-${index}`]) {
                                        newRanges[`location-${index}`] = {};
                                      }
                                      newRanges[`location-${index}`].start = date;
                                      setDateRanges(newRanges);
                                    }}
                                    initialFocus
                                    disabled={(date) => date < new Date()}
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
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      dateRanges[`location-${index}`]?.noEndDate && "opacity-50 cursor-not-allowed"
                                    )}
                                    disabled={dateRanges[`location-${index}`]?.noEndDate}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <span>
                                      {dateRanges[`location-${index}`]?.noEndDate
                                        ? "No end date selected"
                                        : dateRanges[`location-${index}`]?.end 
                                          ? format(dateRanges[`location-${index}`].end as Date, 'PPP')
                                          : "Select date range end"
                                      }
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={dateRanges[`location-${index}`]?.end}
                                    onSelect={(date) => {
                                      const newRanges = { ...dateRanges };
                                      if (!newRanges[`location-${index}`]) {
                                        newRanges[`location-${index}`] = {};
                                      }
                                      newRanges[`location-${index}`].end = date;
                                      setDateRanges(newRanges);
                                    }}
                                    initialFocus
                                    disabled={(date) => {
                                      // Disable dates before start date if selected
                                      if (dateRanges[`location-${index}`]?.start) {
                                        return date < dateRanges[`location-${index}`].start as Date;
                                      }
                                      return date < new Date();
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          {/* Date options checkboxes */}
                          <div className="flex flex-col space-y-2 mt-1 mb-2">
                            <div className="flex items-center">
                              <Checkbox 
                                id={`noEndDate-${index}`} 
                                checked={dateRanges[`location-${index}`]?.noEndDate || false}
                                onCheckedChange={(checked) => {
                                  const newRanges = { ...dateRanges };
                                  if (!newRanges[`location-${index}`]) {
                                    newRanges[`location-${index}`] = {};
                                  }
                                  newRanges[`location-${index}`].noEndDate = Boolean(checked);
                                  setDateRanges(newRanges);
                                }}
                              />
                              <label
                                htmlFor={`noEndDate-${index}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-2"
                              >
                                No end date
                              </label>
                            </div>
                            
                            <div className="flex items-center">
                              <Checkbox 
                                id={`repeatWeekly-${index}`} 
                                checked={dateRanges[`location-${index}`]?.repeatWeekly || false}
                                onCheckedChange={(checked) => {
                                  const newRanges = { ...dateRanges };
                                  if (!newRanges[`location-${index}`]) {
                                    newRanges[`location-${index}`] = {};
                                  }
                                  newRanges[`location-${index}`].repeatWeekly = Boolean(checked);
                                  setDateRanges(newRanges);
                                }}
                              />
                              <label
                                htmlFor={`repeatWeekly-${index}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-2"
                              >
                                Repeat weekly
                              </label>
                            </div>
                          </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              if (dateRanges[`location-${index}`]?.start) {
                                // Check if no end date is selected
                                const hasNoEndDate = dateRanges[`location-${index}`]?.noEndDate || false;
                                const repeatWeekly = dateRanges[`location-${index}`]?.repeatWeekly || false;
                                
                                // For dates with no end date, we set endDate to null
                                const endDate = hasNoEndDate ? null : dateRanges[`location-${index}`]?.end;
                                
                                if (hasNoEndDate || dateRanges[`location-${index}`]?.end) {
                                  // Add to form state
                                  const currentDates = form.getValues(`locations.${index}.availableDates`) || [];
                                  form.setValue(`locations.${index}.availableDates`, [
                                    ...currentDates,
                                    {
                                      startDate: dateRanges[`location-${index}`].start as Date,
                                      endDate: endDate,
                                      hasNoEndDate: hasNoEndDate,
                                      repeatWeekly: repeatWeekly
                                    }
                                  ]);
                                  
                                  // Clear the current selection
                                  const newRanges = { ...dateRanges };
                                  newRanges[`location-${index}`] = {};
                                  setDateRanges(newRanges);
                                  
                                  toast({
                                    title: "Date range added",
                                    description: "The date range has been added to the location.",
                                  });
                                } else {
                                  toast({
                                    title: "Missing end date",
                                    description: "Please select an end date or check 'No end date'.",
                                    variant: "destructive"
                                  });
                                }
                              } else {
                                toast({
                                  title: "Missing start date",
                                  description: "Please select a start date.",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Date Range
                          </Button>
                          
                          {/* Show added date ranges */}
                          {form.watch(`locations.${index}.availableDates`)?.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium mb-1">Added Date Ranges:</h5>
                              <div className="text-sm space-y-1">
                                {form.watch(`locations.${index}.availableDates`).map((dateRange, i) => (
                                  <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                    <span>
                                      {format(new Date(dateRange.startDate), 'MMM d, yyyy')} 
                                      {dateRange.hasNoEndDate 
                                        ? ' - No end date' 
                                        : ` - ${format(new Date(dateRange.endDate), 'MMM d, yyyy')}`
                                      }
                                      {dateRange.repeatWeekly && ' (Repeats Weekly)'}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        // Remove from form state
                                        const currentDates = form.getValues(`locations.${index}.availableDates`) || [];
                                        form.setValue(
                                          `locations.${index}.availableDates`,
                                          currentDates.filter((_, dateIndex) => dateIndex !== i)
                                        );
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Available Times Section */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Available Times</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <FormLabel>Day</FormLabel>
                              <Select
                                value={timeSlots[`location-${index}`]?.day || ""}
                                onValueChange={(value) => {
                                  const newTimeSlots = { ...timeSlots };
                                  if (!newTimeSlots[`location-${index}`]) {
                                    newTimeSlots[`location-${index}`] = { day: value, startTime: "", endTime: "" };
                                  }
                                  newTimeSlots[`location-${index}`].day = value;
                                  setTimeSlots(newTimeSlots);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a day" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="monday">Monday</SelectItem>
                                  <SelectItem value="tuesday">Tuesday</SelectItem>
                                  <SelectItem value="wednesday">Wednesday</SelectItem>
                                  <SelectItem value="thursday">Thursday</SelectItem>
                                  <SelectItem value="friday">Friday</SelectItem>
                                  <SelectItem value="saturday">Saturday</SelectItem>
                                  <SelectItem value="sunday">Sunday</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <FormLabel>Start Time</FormLabel>
                                <Input
                                  type="time"
                                  placeholder="Start Time"
                                  value={timeSlots[`location-${index}`]?.startTime || ""}
                                  onChange={(e) => {
                                    const newTimeSlots = { ...timeSlots };
                                    if (!newTimeSlots[`location-${index}`]) {
                                      newTimeSlots[`location-${index}`] = { day: "", startTime: "", endTime: "" };
                                    }
                                    newTimeSlots[`location-${index}`].startTime = e.target.value;
                                    setTimeSlots(newTimeSlots);
                                  }}
                                />
                              </div>
                              <div>
                                <FormLabel>End Time</FormLabel>
                                <Input
                                  type="time"
                                  placeholder="End Time"
                                  value={timeSlots[`location-${index}`]?.endTime || ""}
                                  onChange={(e) => {
                                    const newTimeSlots = { ...timeSlots };
                                    if (!newTimeSlots[`location-${index}`]) {
                                      newTimeSlots[`location-${index}`] = { day: "", startTime: "", endTime: "" };
                                    }
                                    newTimeSlots[`location-${index}`].endTime = e.target.value;
                                    setTimeSlots(newTimeSlots);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              if (timeSlots[`location-${index}`]?.startTime && 
                                  timeSlots[`location-${index}`]?.endTime && 
                                  timeSlots[`location-${index}`]?.day) {
                                // Add to form state
                                const currentTimes = form.getValues(`locations.${index}.availableTimes`) || [];
                                form.setValue(`locations.${index}.availableTimes`, [
                                  ...currentTimes,
                                  {
                                    day: timeSlots[`location-${index}`].day,
                                    startTime: timeSlots[`location-${index}`].startTime,
                                    endTime: timeSlots[`location-${index}`].endTime
                                  }
                                ]);
                                
                                // Clear the current selection
                                const newTimeSlots = { ...timeSlots };
                                newTimeSlots[`location-${index}`] = { startTime: "", endTime: "" };
                                setTimeSlots(newTimeSlots);
                                
                                toast({
                                  title: "Time slot added",
                                  description: "The time slot has been added to the location.",
                                });
                              } else {
                                toast({
                                  title: "Missing times",
                                  description: "Please select both start and end times.",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Time Slot
                          </Button>
                          
                          {/* Show added time slots */}
                          {form.watch(`locations.${index}.availableTimes`)?.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium mb-1">Added Time Slots:</h5>
                              <div className="text-sm space-y-1">
                                {form.watch(`locations.${index}.availableTimes`).map((timeSlot, i) => (
                                  <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                    <span>
                                      {timeSlot.day.charAt(0).toUpperCase() + timeSlot.day.slice(1)}: {new Date(`2000/01/01 ${timeSlot.startTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })} - {new Date(`2000/01/01 ${timeSlot.endTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        // Remove from form state
                                        const currentTimes = form.getValues(`locations.${index}.availableTimes`) || [];
                                        form.setValue(
                                          `locations.${index}.availableTimes`,
                                          currentTimes.filter((_, timeIndex) => timeIndex !== i)
                                        );
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
                                selected={blackoutDates[`location-${index}`] || []}
                                onSelect={(dates) => {
                                  // Update local state
                                  const newBlackoutDates = { ...blackoutDates };
                                  newBlackoutDates[`location-${index}`] = dates;
                                  setBlackoutDates(newBlackoutDates);
                                  
                                  // Update form state
                                  form.setValue(`locations.${index}.blackoutDates`, dates);
                                }}
                                initialFocus
                                disabled={(date) => date < new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="mt-2 text-sm text-neutral-500">
                            {form.watch(`locations.${index}.blackoutDates`)?.length > 0 ? (
                              <div className="bg-gray-50 p-2 rounded-md">
                                <h5 className="text-xs font-medium mb-1">Selected blackout dates:</h5>
                                <div className="flex flex-wrap gap-1">
                                  {form.watch(`locations.${index}.blackoutDates`).map((date, i) => (
                                    <div key={i} className="inline-flex items-center bg-gray-100 px-2 py-1 rounded text-xs">
                                      {format(new Date(date), 'MMM d, yyyy')}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 ml-1"
                                        onClick={() => {
                                          // Remove from form state and local state
                                          const currentDates = form.getValues(`locations.${index}.blackoutDates`) || [];
                                          const newDates = currentDates.filter((_, dateIndex) => dateIndex !== i);
                                          form.setValue(`locations.${index}.blackoutDates`, newDates);
                                          
                                          const newBlackoutDates = { ...blackoutDates };
                                          newBlackoutDates[`location-${index}`] = newDates;
                                          setBlackoutDates(newBlackoutDates);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span>No blackout dates selected</span>
                            )}
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
                        
                        {form.watch(`customFields.${index}.type`) === "select" && (
                          <FormField
                            control={form.control}
                            name={`customFields.${index}.options`}
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>Dropdown Options</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Enter one option per line" 
                                    className="min-h-[80px]" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Enter each option on a new line
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
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
                        onClick={() => appendCustomField({ name: "", type: "text" as const, required: false, options: "" })}
                        className="flex-1"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Custom Field
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                          >
                            Choose a Premade Option
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Premade Fields</DialogTitle>
                            <DialogDescription>
                              Select the fields you want to add to your template.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            {[
                              { name: "Event Name", type: "text", required: true },
                              { name: "Max Attendees", type: "number", required: true },
                              { name: "Business Name", type: "text", required: false },
                              { name: "Physical Address", type: "text", required: false },
                              { name: "Event Start Date", type: "date", required: true },
                              { name: "Event End Date", type: "date", required: true },
                              { name: "Permit Cost", type: "number", required: false },
                              { name: "Deposit Cost", type: "number", required: false },
                            ].map((field, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`field-${index}`}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      appendCustomField({...field, options: ""});
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`field-${index}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {field.name}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                              </div>
                            ))}
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button type="button">Done</Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                
                                // If insurance is enabled, automatically add the standard fields
                                if (checked) {
                                  const currentFields = form.getValues("insuranceFields") || [];
                                  
                                  if (!currentFields.includes("Insurance Carrier")) {
                                    appendInsuranceField("Insurance Carrier");
                                  }
                                  
                                  if (!currentFields.includes("Insurance Phone")) {
                                    appendInsuranceField("Insurance Phone");
                                  }
                                  
                                  if (!currentFields.includes("Insurance Document")) {
                                    appendInsuranceField("Insurance Document");
                                  }
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel>Require insurance for this template</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("requireInsurance") && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="injuryToOnePersonAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dollar Amount for injury to or death of any one person per occurrence</FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select amount" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Non-applicable">Non-applicable</SelectItem>
                                    <SelectItem value="$1 Million">$1 Million</SelectItem>
                                    <SelectItem value="$2 Million">$2 Million</SelectItem>
                                    <SelectItem value="$3 Million">$3 Million</SelectItem>
                                    <SelectItem value="$10 Million">$10 Million</SelectItem>
                                    <SelectItem value="Custom">Type Custom Text</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              {field.value === "Custom" && (
                                <Input 
                                  className="mt-2"
                                  placeholder="Enter custom amount" 
                                  onChange={(e) => field.onChange(e.target.value)}
                                />
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="injuryToMultiplePersonsAmount"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Dollar Amount for injury to or death of more than one person per occurrence</FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select amount" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Non-applicable">Non-applicable</SelectItem>
                                    <SelectItem value="$1 Million">$1 Million</SelectItem>
                                    <SelectItem value="$2 Million">$2 Million</SelectItem>
                                    <SelectItem value="$3 Million">$3 Million</SelectItem>
                                    <SelectItem value="$10 Million">$10 Million</SelectItem>
                                    <SelectItem value="Custom">Type Custom Text</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              {field.value === "Custom" && (
                                <Input 
                                  className="mt-2"
                                  placeholder="Enter custom amount" 
                                  onChange={(e) => field.onChange(e.target.value)}
                                />
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="propertyDamageAmount"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Dollar Amount for damage to property and products per occurrence</FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select amount" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Non-applicable">Non-applicable</SelectItem>
                                    <SelectItem value="$1 Million">$1 Million</SelectItem>
                                    <SelectItem value="$2 Million">$2 Million</SelectItem>
                                    <SelectItem value="$3 Million">$3 Million</SelectItem>
                                    <SelectItem value="$10 Million">$10 Million</SelectItem>
                                    <SelectItem value="Custom">Type Custom Text</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              {field.value === "Custom" && (
                                <Input 
                                  className="mt-2"
                                  placeholder="Enter custom amount" 
                                  onChange={(e) => field.onChange(e.target.value)}
                                />
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-4">
                          <h4 className="text-sm font-medium mb-2">Insurance Fields</h4>
                          {insuranceFieldsArray.map((fieldObj, index) => {
                            // Get the actual field value from the object
                            const fieldValue = form.getValues(`insuranceFields.${index}`);
                            return (
                              <div key={fieldObj.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                                <span className="flex-1">{fieldValue}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeInsuranceField(index)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                          
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground">
                              Required insurance fields are automatically added when insurance is required.
                              You can remove any field by clicking the trash icon if it's not needed.
                            </p>
                          </div>
                        </div>
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
                        <FormItem>
                          <FormLabel>Permit Information</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter permit information instructions for applicants" 
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This text will appear in the permit information section for applicants to reference
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="applicantInfoRequired"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Application Information</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter application information instructions" 
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This text will appear in the application information section for applicants to reference
                          </FormDescription>
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
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

// Hooks and Utils
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Components
import Layout from "@/components/layout/layout";

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
    endDate: z.date().nullable(),
    hasNoEndDate: z.boolean(),
    repeatWeekly: z.boolean(),
  })).optional(),
  availableTimes: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
  })).optional(),
  maxDays: z.number().optional(),
  blackoutDates: z.array(z.date()).optional(),
});

// Custom field schema
const customFieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  type: z.enum(["text", "number", "date", "checkbox", "select"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

// Waiver schema
const waiverSchema = z.object({
  title: z.string().min(1, "Waiver title is required"),
  body: z.string().min(1, "Waiver text is required"),
  checkboxText: z.string().min(1, "Checkbox text is required"),
});

const templateSchema = z.object({
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
  insuranceFields: z.array(z.string()).optional(), 
  injuryToOnePersonAmount: z.string().optional(), 
  injuryToMultiplePersonsAmount: z.string().optional(),
  propertyDamageAmount: z.string().optional(),
  attachmentsRequired: z.boolean().default(false),
  permitInfoRequired: z.string().optional(),
  applicantInfoRequired: z.string().optional(),
});

type FormValues = z.infer<typeof templateSchema>;

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Local state for image previews
  const [imagePreviewUrls, setImagePreviewUrls] = useState<{[key: string]: string}>({});
  const [aiImagePrompt, setAiImagePrompt] = useState<string>("");
  const [activeLocationIndex, setActiveLocationIndex] = useState<number>(0);
  const [aiImageDialogOpen, setAiImageDialogOpen] = useState<boolean>(false);
  
  // Local state for date selection
  const [dateRanges, setDateRanges] = useState<{[key: string]: {start?: Date, end?: Date, noEndDate?: boolean, repeatWeekly?: boolean}}>({});
  const [blackoutDates, setBlackoutDates] = useState<{[key: string]: Date[]}>({});
  
  // Local state for time slots
  const [timeSlots, setTimeSlots] = useState<{[key: string]: {startTime: string, endTime: string}}>({});
  
  // Fetch the template data
  const { data: template, isLoading, error } = useQuery({
    queryKey: [`/api/permit-templates/${id}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/permit-templates/${id}`);
      return response.json();
    },
  });
  
  // Fetch parks for dropdown
  const { data: parks } = useQuery<any[]>({
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
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      parkId: undefined,
      locations: [], // Initialize with empty array, no default location
      applicationCost: 0,
      customFields: [],
      waivers: [],
      requireInsurance: false,
      insuranceActivities: [],
      insuranceFields: [],
      injuryToOnePersonAmount: "Non-applicable", 
      injuryToMultiplePersonsAmount: "Non-applicable",
      propertyDamageAmount: "Non-applicable",
      attachmentsRequired: false,
      permitInfoRequired: "",
      applicantInfoRequired: "",
    },
  });
  
  // Update form when data is loaded
  useEffect(() => {
    if (template) {
      // Reset form with template data
      form.reset({
        ...template,
        permitInfoRequired: template.permitInfoRequired || "",
        applicantInfoRequired: template.applicantInfoRequired || "",
      });
      
      // Set up image previews
      if (template.locations && template.locations.length > 0) {
        const imagePreviewData: {[key: string]: string} = {};
        
        template.locations.forEach((location: any, index: number) => {
          if (location.images && location.images.length > 0) {
            imagePreviewData[`location-${index}`] = location.images[0];
          }
          
          // Set up date ranges
          if (location.availableDates && location.availableDates.length > 0) {
            const dateRangeData: {[key: string]: {start?: Date, end?: Date, noEndDate?: boolean, repeatWeekly?: boolean}} = {};
            
            console.log(`Loading date ranges for location ${index}:`, location.availableDates);
            
            location.availableDates.forEach((dateRange: any, dateIndex: number) => {
              const key = `${index}-${dateIndex}`;
              console.log(`Processing date range ${key}:`, dateRange);
              
              // Handle both string dates and Date objects
              let startDate = undefined;
              if (dateRange.startDate) {
                startDate = dateRange.startDate instanceof Date 
                  ? dateRange.startDate 
                  : new Date(dateRange.startDate);
              }
              
              let endDate = undefined;
              if (dateRange.endDate && !dateRange.hasNoEndDate) {
                endDate = dateRange.endDate instanceof Date 
                  ? dateRange.endDate 
                  : new Date(dateRange.endDate);
              }
              
              dateRangeData[key] = {
                start: startDate,
                end: endDate,
                noEndDate: !!dateRange.hasNoEndDate,
                repeatWeekly: !!dateRange.repeatWeekly,
              };
              
              console.log(`Converted date range ${key}:`, dateRangeData[key]);
            });
            
            // Update both React state and form values
            setDateRanges(prevState => {
              const newState = {...prevState, ...dateRangeData};
              console.log("Updated date ranges state:", newState);
              return newState;
            });
            
            // Make sure form values are also updated accordingly
            const availableDates = location.availableDates.map((dateRange: any) => ({
              startDate: dateRange.startDate instanceof Date ? dateRange.startDate : new Date(dateRange.startDate),
              endDate: dateRange.hasNoEndDate ? null : (dateRange.endDate ? new Date(dateRange.endDate) : null),
              hasNoEndDate: !!dateRange.hasNoEndDate,
              repeatWeekly: !!dateRange.repeatWeekly
            }));
            
            form.setValue(`locations.${index}.availableDates`, availableDates);
          }
          
          // Set up blackout dates
          if (location.blackoutDates && location.blackoutDates.length > 0) {
            const formattedBlackoutDates = location.blackoutDates.map((date: string) => new Date(date));
            setBlackoutDates(prevState => ({...prevState, [`location-${index}`]: formattedBlackoutDates}));
          }
          
          // Set up time slots
          if (location.availableTimes && location.availableTimes.length > 0) {
            const timeSlotData: {[key: string]: {startTime: string, endTime: string}} = {};
            
            location.availableTimes.forEach((timeSlot: any, timeIndex: number) => {
              timeSlotData[`${index}-${timeIndex}`] = {
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
              };
            });
            
            setTimeSlots(prevState => ({...prevState, ...timeSlotData}));
          }
        });
        
        setImagePreviewUrls(imagePreviewData);
      }
    }
  }, [template, form]);
  
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
  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return await apiRequest("PATCH", `/api/permit-templates/${id}`, {
        ...values,
        updatedBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Template updated",
        description: "The permit template has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
      setLocation("/permit-templates");
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    // Check if locations have date ranges and properly format them
    const processedValues = {
      ...values,
      locations: values.locations.map((location, index) => {
        console.log(`Preparing location ${index} for submission:`, location);
        
        // Process date ranges to ensure they have correct format
        const processedDateRanges = Object.keys(dateRanges)
          .filter(key => key.startsWith(`${index}-`))
          .map(key => {
            const dateRange = dateRanges[key];
            // Skip this date range if startDate is missing
            if (!dateRange.start) {
              console.log(`Skipping date range ${key} due to missing startDate`);
              return null;
            }
            
            return {
              startDate: dateRange.start,
              endDate: dateRange.noEndDate ? null : dateRange.end,
              hasNoEndDate: dateRange.noEndDate || false,
              repeatWeekly: dateRange.repeatWeekly || false
            };
          })
          .filter((item): item is {startDate: Date, endDate: Date | null, hasNoEndDate: boolean, repeatWeekly: boolean} => item !== null);
          
        console.log(`Processed date ranges for location ${index}:`, processedDateRanges);
          
        // Process time slots
        const processedTimeSlots = Object.keys(timeSlots)
          .filter(key => key.startsWith(`${index}-`))
          .map(key => {
            const timeSlot = timeSlots[key];
            return {
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime
            };
          });
          
        console.log(`Processed time slots for location ${index}:`, processedTimeSlots);
          
        return {
          ...location,
          availableDates: processedDateRanges.length > 0 ? processedDateRanges : [],
          availableTimes: processedTimeSlots.length > 0 ? processedTimeSlots : []
        };
      })
    };
    
    console.log('Submitting values:', processedValues);
    updateMutation.mutate(processedValues);
  };

  if (isLoading) {
    return (
      <Layout title="Edit Permit Template" subtitle="Loading...">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Edit Permit Template" subtitle="Error loading template">
        <div className="flex flex-col justify-center items-center min-h-[400px]">
          <p className="text-red-500 mb-4">Failed to load the template</p>
          <Button onClick={() => setLocation("/permit-templates")}>
            Return to Template List
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Edit Permit Template" subtitle="Modify an existing permit template">
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
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Manage Location(s)</h3>
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
                        <div className="mt-6">
                          <h4 className="text-sm font-medium mb-2">Available Dates</h4>
                          <div className="space-y-4">
                            {form.watch(`locations.${index}.availableDates`)?.map((_, dateIndex) => (
                              <div key={dateIndex} className="border border-neutral-200 rounded-md p-4 relative">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="mb-2 block">Start Date</Label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRanges[`${index}-${dateIndex}`]?.start && "text-muted-foreground"
                                          )}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {dateRanges[`${index}-${dateIndex}`]?.start ? (
                                            format(dateRanges[`${index}-${dateIndex}`].start as Date, "PPP")
                                          ) : (
                                            <span>Pick a date</span>
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0">
                                        <Calendar
                                          mode="single"
                                          selected={dateRanges[`${index}-${dateIndex}`]?.start}
                                          onSelect={(date) => {
                                            if (date) {
                                              const newDateRanges = { ...dateRanges };
                                              if (!newDateRanges[`${index}-${dateIndex}`]) {
                                                newDateRanges[`${index}-${dateIndex}`] = {};
                                              }
                                              newDateRanges[`${index}-${dateIndex}`].start = date;
                                              setDateRanges(newDateRanges);
                                              
                                              // Update form state
                                              const currentAvailableDates = [...(form.getValues(`locations.${index}.availableDates`) || [])];
                                              
                                              if (!currentAvailableDates[dateIndex]) {
                                                currentAvailableDates[dateIndex] = {
                                                  startDate: date,
                                                  endDate: null,
                                                  hasNoEndDate: false,
                                                  repeatWeekly: false,
                                                };
                                              } else {
                                                currentAvailableDates[dateIndex].startDate = date;
                                              }
                                              
                                              form.setValue(`locations.${index}.availableDates`, currentAvailableDates);
                                            }
                                          }}
                                          disabled={(date) =>
                                            dateRanges[`${index}-${dateIndex}`]?.end
                                              ? date > (dateRanges[`${index}-${dateIndex}`].end as Date)
                                              : false
                                          }
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  
                                  <div className="flex flex-col">
                                    <div className="flex flex-row items-center space-x-3 space-y-0 mb-4">
                                      <Checkbox
                                        id={`no-end-date-${index}-${dateIndex}`}
                                        checked={dateRanges[`${index}-${dateIndex}`]?.noEndDate}
                                        onCheckedChange={(checked) => {
                                          const newDateRanges = { ...dateRanges };
                                          if (!newDateRanges[`${index}-${dateIndex}`]) {
                                            newDateRanges[`${index}-${dateIndex}`] = {};
                                          }
                                          newDateRanges[`${index}-${dateIndex}`].noEndDate = !!checked;
                                          setDateRanges(newDateRanges);
                                          
                                          // Update form state
                                          const currentAvailableDates = [...(form.getValues(`locations.${index}.availableDates`) || [])];
                                          
                                          if (!currentAvailableDates[dateIndex]) {
                                            currentAvailableDates[dateIndex] = {
                                              startDate: new Date(),
                                              endDate: null,
                                              hasNoEndDate: !!checked,
                                              repeatWeekly: false,
                                            };
                                          } else {
                                            currentAvailableDates[dateIndex].hasNoEndDate = !!checked;
                                          }
                                          
                                          form.setValue(`locations.${index}.availableDates`, currentAvailableDates);
                                        }}
                                        className="mr-2"
                                      />
                                      <Label htmlFor={`no-end-date-${index}-${dateIndex}`}>No End Date</Label>
                                    </div>
                                    
                                    {!dateRanges[`${index}-${dateIndex}`]?.noEndDate && (
                                      <div>
                                        <Label className="mb-2 block">End Date</Label>
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !dateRanges[`${index}-${dateIndex}`]?.end && "text-muted-foreground"
                                              )}
                                            >
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {dateRanges[`${index}-${dateIndex}`]?.end ? (
                                                format(dateRanges[`${index}-${dateIndex}`].end as Date, "PPP")
                                              ) : (
                                                <span>Pick a date</span>
                                              )}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0">
                                            <Calendar
                                              mode="single"
                                              selected={dateRanges[`${index}-${dateIndex}`]?.end as Date}
                                              onSelect={(date) => {
                                                if (date) {
                                                  const newDateRanges = { ...dateRanges };
                                                  if (!newDateRanges[`${index}-${dateIndex}`]) {
                                                    newDateRanges[`${index}-${dateIndex}`] = {};
                                                  }
                                                  newDateRanges[`${index}-${dateIndex}`].end = date;
                                                  setDateRanges(newDateRanges);
                                                  
                                                  // Update form state
                                                  const currentAvailableDates = [...(form.getValues(`locations.${index}.availableDates`) || [])];
                                                  
                                                  if (!currentAvailableDates[dateIndex]) {
                                                    currentAvailableDates[dateIndex] = {
                                                      startDate: new Date(),
                                                      endDate: date,
                                                      hasNoEndDate: false,
                                                      repeatWeekly: false,
                                                    };
                                                  } else {
                                                    currentAvailableDates[dateIndex].endDate = date;
                                                  }
                                                  
                                                  form.setValue(`locations.${index}.availableDates`, currentAvailableDates);
                                                }
                                              }}
                                              disabled={(date) =>
                                                dateRanges[`${index}-${dateIndex}`]?.start
                                                  ? date < (dateRanges[`${index}-${dateIndex}`].start as Date)
                                                  : false
                                              }
                                            />
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-4 flex flex-row items-center space-x-3 space-y-0">
                                  <Checkbox
                                    id={`repeat-weekly-${index}-${dateIndex}`}
                                    checked={dateRanges[`${index}-${dateIndex}`]?.repeatWeekly}
                                    onCheckedChange={(checked) => {
                                      const newDateRanges = { ...dateRanges };
                                      if (!newDateRanges[`${index}-${dateIndex}`]) {
                                        newDateRanges[`${index}-${dateIndex}`] = {};
                                      }
                                      newDateRanges[`${index}-${dateIndex}`].repeatWeekly = !!checked;
                                      setDateRanges(newDateRanges);
                                      
                                      // Update form state
                                      const currentAvailableDates = [...(form.getValues(`locations.${index}.availableDates`) || [])];
                                      
                                      if (!currentAvailableDates[dateIndex]) {
                                        currentAvailableDates[dateIndex] = {
                                          startDate: new Date(),
                                          endDate: null,
                                          hasNoEndDate: false,
                                          repeatWeekly: !!checked,
                                        };
                                      } else {
                                        currentAvailableDates[dateIndex].repeatWeekly = !!checked;
                                      }
                                      
                                      form.setValue(`locations.${index}.availableDates`, currentAvailableDates);
                                    }}
                                    className="mr-2"
                                  />
                                  <Label htmlFor={`repeat-weekly-${index}-${dateIndex}`}>Repeat Weekly</Label>
                                </div>
                                
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="absolute top-2 right-2"
                                  onClick={() => {
                                    // Remove date range
                                    const currentAvailableDates = [...(form.getValues(`locations.${index}.availableDates`) || [])];
                                    const newDateRanges = { ...dateRanges };
                                    
                                    delete newDateRanges[`${index}-${dateIndex}`];
                                    setDateRanges(newDateRanges);
                                    
                                    currentAvailableDates.splice(dateIndex, 1);
                                    form.setValue(`locations.${index}.availableDates`, currentAvailableDates);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Add new date range
                                const currentAvailableDates = [...(form.getValues(`locations.${index}.availableDates`) || [])];
                                const dateIndex = currentAvailableDates.length;
                                
                                currentAvailableDates.push({
                                  startDate: new Date(),
                                  endDate: null,
                                  hasNoEndDate: false,
                                  repeatWeekly: false,
                                });
                                
                                form.setValue(`locations.${index}.availableDates`, currentAvailableDates);
                                
                                // Set up state for this date range
                                setDateRanges({
                                  ...dateRanges,
                                  [`${index}-${dateIndex}`]: {
                                    start: new Date(),
                                    end: undefined,
                                    noEndDate: false,
                                    repeatWeekly: false,
                                  },
                                });
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Date Range
                            </Button>
                          </div>
                        </div>
                        
                        {/* Available Times Section */}
                        <div className="mt-6">
                          <h4 className="text-sm font-medium mb-2">Available Time Slots</h4>
                          <div className="space-y-4">
                            {form.watch(`locations.${index}.availableTimes`)?.map((_, timeIndex) => (
                              <div key={timeIndex} className="border border-neutral-200 rounded-md p-4 relative">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="mb-2 block">Start Time</Label>
                                    <Input
                                      type="time"
                                      value={timeSlots[`${index}-${timeIndex}`]?.startTime || ""}
                                      onChange={(e) => {
                                        const newTimeSlots = { ...timeSlots };
                                        if (!newTimeSlots[`${index}-${timeIndex}`]) {
                                          newTimeSlots[`${index}-${timeIndex}`] = { startTime: "", endTime: "" };
                                        }
                                        newTimeSlots[`${index}-${timeIndex}`].startTime = e.target.value;
                                        setTimeSlots(newTimeSlots);
                                        
                                        // Update form state
                                        const currentAvailableTimes = [...(form.getValues(`locations.${index}.availableTimes`) || [])];
                                        
                                        if (!currentAvailableTimes[timeIndex]) {
                                          currentAvailableTimes[timeIndex] = {
                                            startTime: e.target.value,
                                            endTime: "",
                                          };
                                        } else {
                                          currentAvailableTimes[timeIndex].startTime = e.target.value;
                                        }
                                        
                                        form.setValue(`locations.${index}.availableTimes`, currentAvailableTimes);
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label className="mb-2 block">End Time</Label>
                                    <Input
                                      type="time"
                                      value={timeSlots[`${index}-${timeIndex}`]?.endTime || ""}
                                      onChange={(e) => {
                                        const newTimeSlots = { ...timeSlots };
                                        if (!newTimeSlots[`${index}-${timeIndex}`]) {
                                          newTimeSlots[`${index}-${timeIndex}`] = { startTime: "", endTime: "" };
                                        }
                                        newTimeSlots[`${index}-${timeIndex}`].endTime = e.target.value;
                                        setTimeSlots(newTimeSlots);
                                        
                                        // Update form state
                                        const currentAvailableTimes = [...(form.getValues(`locations.${index}.availableTimes`) || [])];
                                        
                                        if (!currentAvailableTimes[timeIndex]) {
                                          currentAvailableTimes[timeIndex] = {
                                            startTime: "",
                                            endTime: e.target.value,
                                          };
                                        } else {
                                          currentAvailableTimes[timeIndex].endTime = e.target.value;
                                        }
                                        
                                        form.setValue(`locations.${index}.availableTimes`, currentAvailableTimes);
                                      }}
                                    />
                                  </div>
                                </div>
                                
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="absolute top-2 right-2"
                                  onClick={() => {
                                    // Remove time slot
                                    const currentAvailableTimes = [...(form.getValues(`locations.${index}.availableTimes`) || [])];
                                    const newTimeSlots = { ...timeSlots };
                                    
                                    delete newTimeSlots[`${index}-${timeIndex}`];
                                    setTimeSlots(newTimeSlots);
                                    
                                    currentAvailableTimes.splice(timeIndex, 1);
                                    form.setValue(`locations.${index}.availableTimes`, currentAvailableTimes);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Add new time slot
                                const currentAvailableTimes = [...(form.getValues(`locations.${index}.availableTimes`) || [])];
                                const timeIndex = currentAvailableTimes.length;
                                
                                currentAvailableTimes.push({
                                  startTime: "",
                                  endTime: "",
                                });
                                
                                form.setValue(`locations.${index}.availableTimes`, currentAvailableTimes);
                                
                                // Set up state for this time slot
                                setTimeSlots({
                                  ...timeSlots,
                                  [`${index}-${timeIndex}`]: {
                                    startTime: "",
                                    endTime: "",
                                  },
                                });
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Time Slot
                            </Button>
                          </div>
                        </div>
                        
                        {/* Blackout Dates Section */}
                        <div className="mt-6">
                          <h4 className="text-sm font-medium mb-2">Blackout Dates</h4>
                          <div className="space-y-4">
                            <div className="border border-neutral-200 rounded-md p-4">
                              <Label className="mb-2 block">Select blackout dates</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                  >
                                    <CalendarIcon2 className="mr-2 h-4 w-4" />
                                    <span>
                                      {blackoutDates[`location-${index}`]?.length
                                        ? `${blackoutDates[`location-${index}`].length} date(s) selected`
                                        : "Select dates"}
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="multiple"
                                    selected={blackoutDates[`location-${index}`] || []}
                                    onSelect={(dates) => {
                                      if (dates && dates.length > 0) {
                                        setBlackoutDates({
                                          ...blackoutDates,
                                          [`location-${index}`]: dates,
                                        });
                                        
                                        // Update form state
                                        form.setValue(`locations.${index}.blackoutDates`, dates);
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                              
                              {blackoutDates[`location-${index}`]?.length > 0 && (
                                <div className="mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setBlackoutDates({
                                        ...blackoutDates,
                                        [`location-${index}`]: [],
                                      });
                                      
                                      // Update form state
                                      form.setValue(`locations.${index}.blackoutDates`, []);
                                    }}
                                  >
                                    Clear Blackout Dates
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Location actions */}
                        <div className="flex justify-end mt-4">
                          {locationFields.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (locationFields.length > 1) {
                                  removeLocation(index);
                                  
                                  // Remove associated states
                                  const newImagePreviewUrls = { ...imagePreviewUrls };
                                  delete newImagePreviewUrls[`location-${index}`];
                                  setImagePreviewUrls(newImagePreviewUrls);
                                  
                                  const newBlackoutDates = { ...blackoutDates };
                                  delete newBlackoutDates[`location-${index}`];
                                  setBlackoutDates(newBlackoutDates);
                                  
                                  // Remove date ranges and time slots for this location
                                  const newDateRanges = { ...dateRanges };
                                  const newTimeSlots = { ...timeSlots };
                                  
                                  Object.keys(newDateRanges).forEach((key) => {
                                    if (key.startsWith(`${index}-`)) {
                                      delete newDateRanges[key];
                                    }
                                  });
                                  
                                  Object.keys(newTimeSlots).forEach((key) => {
                                    if (key.startsWith(`${index}-`)) {
                                      delete newTimeSlots[key];
                                    }
                                  });
                                  
                                  setDateRanges(newDateRanges);
                                  setTimeSlots(newTimeSlots);
                                }
                              }}
                              className="ml-2 text-red-500"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
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
                  size="sm"
                  onClick={() => {
                    appendLocation({ name: "", description: "", images: [], availableDates: [], availableTimes: [], maxDays: 1, blackoutDates: [] });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
              
              <Separator className="my-6" />
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="custom-fields">
                  <AccordionTrigger>Custom Fields</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {customFieldFields.map((field, index) => (
                        <div key={field.id} className="flex gap-4 items-center border border-neutral-200 rounded-md p-4 relative">
                          <div className="flex-1">
                            <h4 className="font-medium">{form.watch(`customFields.${index}.name`)}</h4>
                            <p className="text-sm text-neutral-500">
                              Type: {form.watch(`customFields.${index}.type`)}
                              {form.watch(`customFields.${index}.required`) && " (Required)"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomField(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Custom Field
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Add Custom Field</DialogTitle>
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
                                      appendCustomField(field);
                                    }
                                  }}
                                />
                                <Label htmlFor={`field-${index}`}>
                                  {field.name} {field.required && <span className="text-red-500">*</span>}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button type="button" variant="outline">
                                Done
                              </Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="waivers">
                  <AccordionTrigger>Waivers</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {waiverFields.map((field, index) => (
                        <div key={field.id} className="flex flex-col border border-neutral-200 rounded-md p-4 relative">
                          <FormField
                            control={form.control}
                            name={`waivers.${index}.title`}
                            render={({ field }) => (
                              <FormItem className="mb-2">
                                <FormLabel>Waiver Title</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`waivers.${index}.body`}
                            render={({ field }) => (
                              <FormItem className="mb-2">
                                <FormLabel>Waiver Text</FormLabel>
                                <FormControl>
                                  <Textarea className="min-h-[100px]" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`waivers.${index}.checkboxText`}
                            render={({ field }) => (
                              <FormItem className="mb-2">
                                <FormLabel>Checkbox Label</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  Text that will appear next to the waiver acceptance checkbox
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeWaiver(index)}
                            className="self-end mt-2"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Waiver
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          appendWaiver({
                            title: "Release of Liability",
                            body: "I hereby agree to release and discharge Utah State Parks, its agents, employees, and representatives from any and all liability, claims, demands, and causes of action that may arise from my participation in activities at the park.",
                            checkboxText: "I agree to the terms and conditions of this waiver",
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Waiver
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="insurance">
                  <AccordionTrigger>Insurance Requirements</AccordionTrigger>
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
                                  const standardFields = [
                                    "Insurance Carrier",
                                    "Insurance Phone",
                                    "Insurance Document"
                                  ];
                                  
                                  // Add all standard fields if not already present
                                  const newFields = [...currentFields];
                                  standardFields.forEach(field => {
                                    if (!newFields.includes(field)) {
                                      newFields.push(field);
                                    }
                                  });
                                  
                                  form.setValue("insuranceFields", newFields);
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
                        {/* Insurance amount fields */}
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
                        
                        {/* Insurance fields UI handled through checkboxes below */}
                        
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium mb-2">Insurance Fields</h4>
                          
                          <div className="border border-neutral-200 rounded-md p-4 space-y-2">
                            {[
                              "Insurance Carrier",
                              "Insurance Phone",
                              "Insurance Document",
                              "Policy Number",
                              "Expiration Date",
                              "Additional Insured"
                            ].map((fieldName) => {
                              const currentFields = form.getValues("insuranceFields") || [];
                              const isChecked = currentFields.includes(fieldName);
                              
                              return (
                                <div key={fieldName} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`insurance-field-${fieldName}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const currentFields = form.getValues("insuranceFields") || [];
                                      
                                      if (checked) {
                                        if (!currentFields.includes(fieldName)) {
                                          form.setValue("insuranceFields", [...currentFields, fieldName]);
                                        }
                                      } else {
                                        form.setValue("insuranceFields", 
                                          currentFields.filter(field => field !== fieldName)
                                        );
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`insurance-field-${fieldName}`}>{fieldName}</Label>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground">
                              Select the insurance fields you want to include in this permit template.
                              Required insurance fields are automatically selected when insurance is required.
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <FormLabel className="mb-2 block">Activities Requiring Insurance</FormLabel>
                          <div className="border border-neutral-200 rounded-md p-4">
                            {activities?.map((activity) => (
                              <div key={activity.id} className="flex items-center space-x-2 mb-2">
                                <Checkbox
                                  id={`activity-${activity.id}`}
                                  checked={form.watch("insuranceActivities")?.includes(activity.name)}
                                  onCheckedChange={(checked) => {
                                    const currentActivities = form.watch("insuranceActivities") || [];
                                    
                                    if (checked) {
                                      form.setValue("insuranceActivities", [...currentActivities, activity.name]);
                                    } else {
                                      form.setValue("insuranceActivities", 
                                        currentActivities.filter(name => name !== activity.name)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={`activity-${activity.id}`}>{activity.name}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="additional">
                  <AccordionTrigger>Additional Requirements</AccordionTrigger>
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
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}
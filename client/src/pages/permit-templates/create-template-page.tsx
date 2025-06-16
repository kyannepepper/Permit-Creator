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
import { APPLICATION_FEE_OPTIONS, PERMIT_FEE_OPTIONS } from "@shared/stripe-products";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronDown, ChevronRight, Plus, Trash2, Check, X, Image, CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Time Picker Component
interface TimePickerDropdownsProps {
  value: string;
  onChange: (timeString: string) => void;
}

function TimePickerDropdowns({ value, onChange }: TimePickerDropdownsProps) {
  // Parse time string (HH:MM format) into components
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: '9', minute: '00', ampm: 'AM' };
    
    const [hours, minutes] = timeStr.split(':').map(str => str.padStart(2, '0'));
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return {
      hour: hour12.toString(),
      minute: minutes,
      ampm
    };
  };

  // Convert 12-hour format to 24-hour format (HH:MM)
  const formatTime = (hour: string, minute: string, ampm: string) => {
    let hour24 = parseInt(hour, 10);
    if (ampm === 'AM' && hour24 === 12) hour24 = 0;
    if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
    
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const { hour, minute, ampm } = parseTime(value);

  const handleChange = (field: string, newValue: string) => {
    const current = parseTime(value);
    const updated = { ...current, [field]: newValue };
    onChange(formatTime(updated.hour, updated.minute, updated.ampm));
  };

  // Generate hour options (1-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  
  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = ['00', '15', '30', '45'];

  return (
    <div className="flex items-center space-x-2">
      <Select value={hour} onValueChange={(value) => handleChange('hour', value)}>
        <SelectTrigger className="w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <span className="text-muted-foreground">:</span>
      
      <Select value={minute} onValueChange={(value) => handleChange('minute', value)}>
        <SelectTrigger className="w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minuteOptions.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={ampm} onValueChange={(value) => handleChange('ampm', value)}>
        <SelectTrigger className="w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// Form schemas
const basicInfoSchema = z.object({
  templateName: z.string().min(1, "Template name is required"),
  parkId: z.number().min(1, "Park selection is required"),
  applicationCost: z.number().min(0, "Application cost must be a positive number").default(0),
});

const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  permitCost: z.number().min(0, "Permit cost must be a positive number").default(0),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  availableDates: z.array(z.object({
    startDate: z.date(),
    endDate: z.date().nullable(),
    hasNoEndDate: z.boolean().default(false),
    repeatWeekly: z.boolean().default(false),
  })).optional(),
  availableTimes: z.object({
    monday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }).optional(),
    tuesday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }).optional(),
    wednesday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }).optional(),
    thursday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }).optional(),
    friday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }).optional(),
    saturday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }).optional(),
    sunday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }).optional(),
  }).optional(),
  blackoutDates: z.array(z.date()).optional(),
});

const fieldsSchema = z.object({
  customFields: z.array(z.object({
    label: z.string().min(1, "Field label is required"),
    type: z.enum(["text", "textarea", "select", "checkbox", "number", "date"]),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
  })).optional(),
  requireWaiver: z.boolean().default(false),
  waiverText: z.string().optional(),
  requireInsurance: z.boolean().default(false),
  insuranceRequirements: z.string().optional(),
  requireInsuranceDocument: z.boolean().default(false),
  additionalOptions: z.string().optional(),
  requireAdditionalDocument: z.boolean().default(false),
});

export default function CreateTemplatePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Section management
  const [activeSection, setActiveSection] = useState<number>(1);
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [basicInfo, setBasicInfo] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [fieldsData, setFieldsData] = useState<any>(null);

  // Current location being edited
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(true); // Show form initially
  
  // Availability type for dynamic form display
  const [availabilityType, setAvailabilityType] = useState<'always' | 'dateRange' | 'noEndDate' | 'repeatWeekly'>('always');
  
  // Selected blackout dates
  const [selectedBlackoutDates, setSelectedBlackoutDates] = useState<Date[]>([]);
  const [blackoutDatesRepeatYearly, setBlackoutDatesRepeatYearly] = useState(false);

  // Forms
  const basicForm = useForm({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      templateName: "",
      parkId: 0,
      applicationCost: 0,
    },
  });

  const locationForm = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      permitCost: 0,
      description: "",
      images: [],
      availableDates: [],
      availableTimes: {
        monday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        thursday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      },
      blackoutDates: [],
    },
  });

  const fieldsForm = useForm({
    resolver: zodResolver(fieldsSchema),
    defaultValues: {
      customFields: [],
      requireWaiver: false,
      waiverText: "",
      requireInsurance: false,
      insuranceRequirements: "",
      requireInsuranceDocument: false,
      additionalOptions: "",
      requireAdditionalDocument: false,
    },
  });

  // Custom fields array for fieldsForm
  const { fields: customFields, append: appendField, remove: removeField } = useFieldArray({
    control: fieldsForm.control,
    name: "customFields",
  });

  // Location form field arrays
  const { fields: availableDatesFields, append: appendAvailableDate, remove: removeAvailableDate } = useFieldArray({
    control: locationForm.control,
    name: "availableDates",
  });



  const { fields: blackoutDatesFields, append: appendBlackoutDate, remove: removeBlackoutDate } = useFieldArray({
    control: locationForm.control,
    name: "blackoutDates",
  });

  // Fetch parks
  const { data: parks = [], isLoading: parksLoading } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await apiRequest("POST", "/api/permit-templates", templateData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Permit template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
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

  // Section handlers
  const handleBasicInfoSubmit = (data: any) => {
    setBasicInfo(data);
    setCompletedSections(prev => [...prev.filter(s => s !== 1), 1]);
    setActiveSection(2);
  };

  const handleLocationSubmit = (data: any) => {
    // Convert day-based available times to array format for backend
    const convertedData = {
      ...data,
      availableTimes: data.availableTimes ? Object.entries(data.availableTimes)
        .filter(([_, dayData]: [string, any]) => dayData.enabled)
        .map(([day, dayData]: [string, any]) => ({
          day,
          startTime: dayData.startTime,
          endTime: dayData.endTime,
        })) : []
    };

    if (isEditingLocation) {
      // Update existing location
      const updatedLocations = locations.map((loc, index) => 
        index === currentLocation ? convertedData : loc
      );
      setLocations(updatedLocations);
      setIsEditingLocation(false);
    } else {
      // Add new location
      setLocations(prev => [...prev, convertedData]);
      setShowLocationForm(false); // Hide form after adding location
    }
    
    // Reset location form
    locationForm.reset();
    setCurrentLocation(null);
  };

  const handleAddAnotherLocation = () => {
    locationForm.reset();
    setCurrentLocation(null);
    setIsEditingLocation(false);
    setShowLocationForm(true); // Show form when "Add Another Location" is clicked
  };

  const handleFinishLocations = () => {
    if (locations.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one location",
        variant: "destructive",
      });
      return;
    }
    setCompletedSections(prev => [...prev.filter(s => s !== 2), 2]);
    setActiveSection(3);
  };

  const handleEditLocation = (index: number) => {
    const location = locations[index];
    // Convert array-based available times back to day-based structure for editing
    const dayBasedTimes = {
      monday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      thursday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    };

    // Populate with existing times if they exist
    if (location.availableTimes && Array.isArray(location.availableTimes)) {
      location.availableTimes.forEach((timeSlot: any) => {
        if (dayBasedTimes[timeSlot.day as keyof typeof dayBasedTimes]) {
          dayBasedTimes[timeSlot.day as keyof typeof dayBasedTimes] = {
            enabled: true,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
          };
        }
      });
    }

    locationForm.reset({
      ...location,
      availableTimes: dayBasedTimes,
    });
    setCurrentLocation(index);
    setIsEditingLocation(true);
    setShowLocationForm(true);
  };

  const handleDeleteLocation = (index: number) => {
    setLocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleFieldsSubmit = (data: any) => {
    setFieldsData(data);
    setCompletedSections(prev => [...prev.filter(s => s !== 3), 3]);
    
    // Create final template data
    const templateData = {
      name: basicInfo.templateName,
      parkId: basicInfo.parkId,
      applicationCost: basicInfo.applicationCost,
      locations: locations,
      ...data,
    };

    createTemplateMutation.mutate(templateData);
  };

  const addCustomField = () => {
    appendField({
      label: "",
      type: "text",
      required: false,
      options: [],
    });
  };

  const SectionHeader = ({ number, title, isActive, isCompleted, onClick }: {
    number: number;
    title: string;
    isActive: boolean;
    isCompleted: boolean;
    onClick: () => void;
  }) => (
    <div
      className={cn(
        "flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all",
        isActive ? "border-primary bg-primary/5" : "border-border",
        isCompleted && !isActive ? "border-green-500 bg-green-50" : ""
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          isCompleted ? "bg-green-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {isCompleted ? <Check className="w-4 h-4" /> : number}
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {isActive ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
    </div>
  );

  if (parksLoading) {
    return (
      <Layout title="Create Permit Template">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Create Permit Template">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <SectionHeader
            number={1}
            title="Template Information"
            isActive={activeSection === 1}
            isCompleted={completedSections.includes(1)}
            onClick={() => setActiveSection(1)}
          />
          
          {activeSection === 1 && (
            <Card>
              <CardContent className="pt-6">
                <Form {...basicForm}>
                  <form onSubmit={basicForm.handleSubmit(handleBasicInfoSubmit)} className="space-y-6">
                    <FormField
                      control={basicForm.control}
                      name="templateName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter template name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicForm.control}
                      name="parkId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Park</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
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

                    <FormField
                      control={basicForm.control}
                      name="applicationCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Application Cost</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseFloat(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select application cost" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {APPLICATION_FEE_OPTIONS.map((fee) => (
                                <SelectItem key={fee.value} value={fee.value.toString()}>
                                  {fee.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit">Continue to Locations</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Section 2: Locations */}
        <div className="space-y-4">
          <SectionHeader
            number={2}
            title="Add Locations"
            isActive={activeSection === 2}
            isCompleted={completedSections.includes(2)}
            onClick={() => completedSections.includes(1) && setActiveSection(2)}
          />
          
          {activeSection === 2 && (
            <div className="space-y-4">
              {/* Existing locations */}
              {locations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Added Locations ({locations.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {locations.map((location, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{location.name}</h4>
                            <p className="text-sm text-muted-foreground">Permit Cost: ${location.permitCost}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditLocation(index)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteLocation(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add Another Location button */}
              {locations.length > 0 && !showLocationForm && !isEditingLocation && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Button onClick={handleAddAnotherLocation} className="w-full" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Location
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Location form */}
              {(showLocationForm || isEditingLocation) && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {isEditingLocation ? "Edit Location" : "Add New Location"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                  <Form {...locationForm}>
                    <form onSubmit={locationForm.handleSubmit(handleLocationSubmit)} className="space-y-6">
                      <FormField
                        control={locationForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter location name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={locationForm.control}
                        name="permitCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Permit Cost</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseFloat(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select permit cost" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PERMIT_FEE_OPTIONS.map((fee) => (
                                  <SelectItem key={fee.value} value={fee.value.toString()}>
                                    {fee.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={locationForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe this location and any specific requirements"
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-3">
                        <FormLabel>Location Images</FormLabel>
                        <div className="flex items-center gap-4 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                          <Image className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Upload location images</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB each</p>
                          </div>
                          <Button type="button" variant="outline" size="sm">
                            Choose Files
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      {/* Available Dates */}
                      <div className="space-y-4">
                        <FormLabel>Available Dates</FormLabel>
                        <p className="text-sm text-muted-foreground">Configure when this location is available for permits.</p>
                        
                        <Card className="p-4">
                          <div className="space-y-4">
                            <RadioGroup 
                              value={availabilityType} 
                              onValueChange={(value) => setAvailabilityType(value as any)}
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="always" />
                                <Label htmlFor="always">Always available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="dateRange" id="dateRange" />
                                <Label htmlFor="dateRange">Start and end date</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="noEndDate" id="noEndDate" />
                                <Label htmlFor="noEndDate">No end date</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="repeatWeekly" id="repeatWeekly" />
                                <Label htmlFor="repeatWeekly">Repeat weekly</Label>
                              </div>
                            </RadioGroup>

                            {/* Date Range Fields */}
                            {availabilityType === 'dateRange' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                                <div>
                                  <Label className="text-sm">Start Date</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal",
                                          "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        <span>Pick start date</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        onSelect={(date) => {
                                          // Handle date selection
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div>
                                  <Label className="text-sm">End Date</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal",
                                          "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        <span>Pick end date</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        onSelect={(date) => {
                                          // Handle date selection
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                            )}

                            {/* No End Date Fields */}
                            {availabilityType === 'noEndDate' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                                <div>
                                  <Label className="text-sm">Start Date</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal",
                                          "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        <span>Pick start date</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        onSelect={(date) => {
                                          // Handle date selection
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  No end date - available indefinitely from start date
                                </div>
                              </div>
                            )}

                            {/* Repeat Weekly Fields */}
                            {availabilityType === 'repeatWeekly' && (
                              <div className="p-4 border rounded-lg bg-muted/20">
                                <Label className="text-sm mb-3 block">Select days of the week</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                  {[
                                    { key: 'monday', label: 'Monday' },
                                    { key: 'tuesday', label: 'Tuesday' },
                                    { key: 'wednesday', label: 'Wednesday' },
                                    { key: 'thursday', label: 'Thursday' },
                                    { key: 'friday', label: 'Friday' },
                                    { key: 'saturday', label: 'Saturday' },
                                    { key: 'sunday', label: 'Sunday' }
                                  ].map(day => (
                                    <div key={day.key} className="flex items-center space-x-2">
                                      <Checkbox 
                                        id={day.key} 
                                        onCheckedChange={(checked) => {
                                          // Handle day selection
                                        }}
                                      />
                                      <Label htmlFor={day.key} className="text-sm">{day.label}</Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                        
                        {availableDatesFields.slice(1).map((field, index) => (
                          <Card key={field.id} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <Label className="text-sm">Start Date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !locationForm.watch(`availableDates.${index}.startDate`) && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {locationForm.watch(`availableDates.${index}.startDate`) ? (
                                        new Date(locationForm.watch(`availableDates.${index}.startDate`)).toLocaleDateString()
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={locationForm.watch(`availableDates.${index}.startDate`)}
                                      onSelect={(date) => locationForm.setValue(`availableDates.${index}.startDate`, date || new Date())}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div>
                                <Label className="text-sm">End Date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !locationForm.watch(`availableDates.${index}.endDate`) && "text-muted-foreground"
                                      )}
                                      disabled={locationForm.watch(`availableDates.${index}.hasNoEndDate`)}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {locationForm.watch(`availableDates.${index}.endDate`) ? (
                                        new Date(locationForm.watch(`availableDates.${index}.endDate`)).toLocaleDateString()
                                      ) : (
                                        <span>Pick end date</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={locationForm.watch(`availableDates.${index}.endDate`)}
                                      onSelect={(date) => locationForm.setValue(`availableDates.${index}.endDate`, date)}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div className="flex items-end gap-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={locationForm.watch(`availableDates.${index}.hasNoEndDate`)}
                                    onCheckedChange={(checked) => {
                                      locationForm.setValue(`availableDates.${index}.hasNoEndDate`, !!checked);
                                      if (checked) {
                                        locationForm.setValue(`availableDates.${index}.endDate`, null);
                                      }
                                    }}
                                  />
                                  <Label className="text-sm">No end date</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={locationForm.watch(`availableDates.${index}.repeatWeekly`)}
                                    onCheckedChange={(checked) => locationForm.setValue(`availableDates.${index}.repeatWeekly`, !!checked)}
                                  />
                                  <Label className="text-sm">Repeat weekly</Label>
                                </div>
                              </div>

                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeAvailableDate(index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      <Separator />

                      {/* Available Times */}
                      <div className="space-y-4">
                        <FormLabel>Available Times</FormLabel>
                        <p className="text-sm text-muted-foreground">Select which days this location is available and set time ranges for each day.</p>
                        
                        <div className="space-y-3">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                            const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1);
                            const isEnabled = locationForm.watch(`availableTimes.${day}.enabled`);
                            
                            return (
                              <Card key={day} className="p-4">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={isEnabled}
                                      onCheckedChange={(checked) => {
                                        locationForm.setValue(`availableTimes.${day}.enabled`, !!checked);
                                      }}
                                    />
                                    <Label className="min-w-[80px] font-medium">{dayCapitalized}</Label>
                                  </div>
                                  
                                  {isEnabled && (
                                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 flex-1 overflow-visible">
                                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 flex-wrap">
                                        <div className="flex-shrink-0 min-w-0">
                                          <Label className="text-xs text-muted-foreground">Start Time</Label>
                                          <TimePickerDropdowns
                                            value={locationForm.watch(`availableTimes.${day}.startTime`)}
                                            onChange={(timeString) => locationForm.setValue(`availableTimes.${day}.startTime`, timeString)}
                                          />
                                        </div>
                                        <span className="text-muted-foreground self-start sm:pt-5 flex-shrink-0 hidden sm:inline">to</span>
                                        <div className="flex-shrink-0 min-w-0">
                                          <Label className="text-xs text-muted-foreground">End Time</Label>
                                          <TimePickerDropdowns
                                            value={locationForm.watch(`availableTimes.${day}.endTime`)}
                                            onChange={(timeString) => locationForm.setValue(`availableTimes.${day}.endTime`, timeString)}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />

                      {/* Blackout Dates */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <FormLabel>Blackout Dates</FormLabel>
                          {selectedBlackoutDates.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBlackoutDates([])}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Clear All
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Click on multiple dates to select blackout periods. Click again to unselect.</p>
                        
                        <Card className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2 mb-4">
                              <Checkbox
                                id="repeatYearly"
                                checked={blackoutDatesRepeatYearly}
                                onCheckedChange={(checked) => setBlackoutDatesRepeatYearly(!!checked)}
                              />
                              <Label htmlFor="repeatYearly" className="text-sm font-medium">
                                Repeat these dates every year
                              </Label>
                              <div className="text-xs text-muted-foreground ml-2">
                                (e.g., holidays, annual events)
                              </div>
                            </div>
                            
                            <Calendar
                              mode="multiple"
                              selected={selectedBlackoutDates}
                              onSelect={(dates) => setSelectedBlackoutDates(dates || [])}
                              className="rounded-md border"
                            />
                            
                            {selectedBlackoutDates.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                  Selected Blackout Dates ({selectedBlackoutDates.length})
                                  {blackoutDatesRepeatYearly && (
                                    <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                      Repeats Yearly
                                    </span>
                                  )}
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                  {selectedBlackoutDates
                                    .sort((a, b) => a.getTime() - b.getTime())
                                    .map((date, index) => (
                                    <div key={index} className={cn(
                                      "flex items-center gap-1 px-2 py-1 rounded-md text-sm",
                                      blackoutDatesRepeatYearly 
                                        ? "bg-blue/10 text-blue-700 border border-blue-200" 
                                        : "bg-destructive/10 text-destructive"
                                    )}>
                                      {date.toLocaleDateString()}
                                      {blackoutDatesRepeatYearly && (
                                        <span className="text-xs ml-1 opacity-75">
                                          (yearly)
                                        </span>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto p-0 w-4 h-4 hover:bg-destructive/20"
                                        onClick={() => {
                                          setSelectedBlackoutDates(prev => 
                                            prev.filter(d => d.getTime() !== date.getTime())
                                          );
                                        }}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {blackoutDatesFields.slice(1).map((field, index) => (
                            <Card key={field.id} className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal",
                                          !locationForm.watch(`blackoutDates.${index}`) && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {locationForm.watch(`blackoutDates.${index}`) ? (
                                          new Date(locationForm.watch(`blackoutDates.${index}`)).toLocaleDateString()
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={locationForm.watch(`blackoutDates.${index}`)}
                                        onSelect={(date) => locationForm.setValue(`blackoutDates.${index}`, date || new Date())}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeBlackoutDate(index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        {isEditingLocation && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              locationForm.reset();
                              setCurrentLocation(null);
                              setIsEditingLocation(false);
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button type="submit">
                          {isEditingLocation ? "Update Location" : "Add Location"}
                        </Button>
                      </div>
                    </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {/* Action buttons */}
              {!isEditingLocation && !showLocationForm && locations.length > 0 && (
                <div className="flex justify-end">
                  <Button onClick={handleFinishLocations}>
                    Continue to Custom Fields
                  </Button>
                </div>
              )}

              {!isEditingLocation && showLocationForm && (
                <div className="flex justify-end">
                  <Button onClick={handleFinishLocations}>
                    Continue to Fields & Options
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Fields & Options */}
        <div className="space-y-4">
          <SectionHeader
            number={3}
            title="Fields & Options"
            isActive={activeSection === 3}
            isCompleted={completedSections.includes(3)}
            onClick={() => completedSections.includes(2) && setActiveSection(3)}
          />
          
          {activeSection === 3 && (
            <Card>
              <CardContent className="pt-6">
                <Form {...fieldsForm}>
                  <form onSubmit={fieldsForm.handleSubmit(handleFieldsSubmit)} className="space-y-8">
                    {/* Custom Fields */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold">Custom Fields</h4>
                        <Button type="button" onClick={addCustomField} variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Field
                        </Button>
                      </div>
                      
                      {customFields.map((field, index) => (
                        <Card key={field.id} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={fieldsForm.control}
                              name={`customFields.${index}.label`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Field Label</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter field label" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={fieldsForm.control}
                              name={`customFields.${index}.type`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Field Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="text">Text</SelectItem>
                                      <SelectItem value="textarea">Textarea</SelectItem>
                                      <SelectItem value="select">Select</SelectItem>
                                      <SelectItem value="checkbox">Checkbox</SelectItem>
                                      <SelectItem value="number">Number</SelectItem>
                                      <SelectItem value="date">Date</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex items-end gap-2">
                              <FormField
                                control={fieldsForm.control}
                                name={`customFields.${index}.required`}
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm">Required</FormLabel>
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeField(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    <Separator />

                    {/* Waiver */}
                    <div className="space-y-4">
                      <FormField
                        control={fieldsForm.control}
                        name="requireWaiver"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-base font-medium">Add Waiver</FormLabel>
                          </FormItem>
                        )}
                      />

                      {fieldsForm.watch("requireWaiver") && (
                        <FormField
                          control={fieldsForm.control}
                          name="waiverText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Waiver Text</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter waiver text that applicants must agree to"
                                  className="min-h-[120px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Separator />

                    {/* Insurance */}
                    <div className="space-y-4">
                      <FormField
                        control={fieldsForm.control}
                        name="requireInsurance"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-base font-medium">Ask for Insurance</FormLabel>
                          </FormItem>
                        )}
                      />

                      {fieldsForm.watch("requireInsurance") && (
                        <div className="space-y-4">
                          <FormField
                            control={fieldsForm.control}
                            name="insuranceRequirements"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Insurance Requirements</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Describe insurance requirements and minimum coverage amounts"
                                    className="min-h-[100px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={fieldsForm.control}
                            name="requireInsuranceDocument"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-3">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium">Require insurance document upload</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Additional Options */}
                    <div className="space-y-4">
                      <FormField
                        control={fieldsForm.control}
                        name="additionalOptions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Options</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any additional requirements, options, or notes for this permit type"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={fieldsForm.control}
                        name="requireAdditionalDocument"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium">Require additional document upload for these options</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between pt-6">
                      <Button type="button" variant="outline" onClick={() => setActiveSection(2)}>
                        Back to Locations
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createTemplateMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {createTemplateMutation.isPending ? "Creating..." : "Create Permit Template"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
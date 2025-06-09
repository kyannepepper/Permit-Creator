import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, FileText, ArrowLeft, Save, X } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPermitSchema } from "@shared/schema";
import type { InsertPermit } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout/layout";
import type { Permit, Park } from "@shared/schema";

export default function PermitTemplatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permit-templates"],
  });

  const { data: parks = [] } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/permit-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPermit> }) => {
      const response = await apiRequest("PUT", `/api/permit-templates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
      setEditingTemplateId(null);
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredTemplates = selectedTemplateId 
    ? templates.filter(template => template.id === selectedTemplateId)
    : templates.filter(template =>
        ((template.templateData as any)?.name || template.permitType)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.activity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parks.find(park => park.id === template.parkId)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const handleDeleteTemplate = (id: number) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleEditTemplate = (template: Permit) => {
    setEditingTemplateId(template.id);
    setSelectedTemplateId(template.id);
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
  };

  const getParkName = (parkId: number) => {
    return parks.find(park => park.id === parkId)?.name || "Unknown Park";
  };

  // Inline Edit Form Component - Simple Template Editor
  const InlineEditForm = ({ template }: { template: Permit }) => {
    const form = useForm<InsertPermit>({
      resolver: zodResolver(insertPermitSchema),
      defaultValues: {
        permitType: template.permitType,
        parkId: template.parkId,
        location: template.location,
        activity: template.activity,
        description: template.description || "",
        participantCount: template.participantCount || 0,
        startDate: template.startDate,
        endDate: template.endDate,
        templateData: template.templateData as any,
      },
    });

    const onSubmit = (data: InsertPermit) => {
      updateTemplateMutation.mutate({ id: template.id, data });
    };

    return (
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">Edit Template</CardTitle>
              <p className="text-muted-foreground text-lg">
                {getParkName(template.parkId)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancelEdit}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="permitType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter template name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="activity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Activity Type</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter activity type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter default location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="participantCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Participant Count</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            placeholder="Enter participant count"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value || ""}
                            placeholder="Enter template description"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTemplateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateTemplateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Layout title="Permit Templates" subtitle="Loading templates...">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Permit Templates</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Permit Templates" subtitle="Create and manage reusable permit templates">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            {(selectedTemplateId || editingTemplateId) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedTemplateId(null);
                  setEditingTemplateId(null);
                }}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to All Templates
              </Button>
            )}
            <h1 className="text-3xl font-bold">
              {editingTemplateId ? "Edit Template" : selectedTemplateId ? "Template Details" : "Permit Templates"}
            </h1>
            <p className="text-muted-foreground">
              {editingTemplateId 
                ? "Edit the selected permit template inline"
                : selectedTemplateId 
                ? "Detailed view of the selected permit template"
                : "Create and manage reusable permit templates to streamline the application process"
              }
            </p>
          </div>
          {!selectedTemplateId && !editingTemplateId && (
            <Link href="/permit-templates/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        {!selectedTemplateId && !editingTemplateId && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Templates Grid or Edit Form */}
        {editingTemplateId ? (
          // Show inline edit form
          <InlineEditForm template={filteredTemplates.find(t => t.id === editingTemplateId)!} />
        ) : filteredTemplates.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "No templates match your search criteria." : "Get started by creating your first permit template."}
            </p>
            {!searchTerm && (
              <Link href="/permit-templates/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className={selectedTemplateId ? "space-y-6" : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"}>
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className={`transition-shadow ${
                  selectedTemplateId 
                    ? "w-full" 
                    : "hover:shadow-lg cursor-pointer"
                }`}
                onClick={() => !selectedTemplateId && setSelectedTemplateId(template.id)}
              >
                {selectedTemplateId ? (
                  // Detailed view when single template is selected
                  <div>
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-2xl mb-2">
                            {(template.templateData as any)?.name || template.permitType}
                          </CardTitle>
                          <p className="text-muted-foreground text-lg">
                            {getParkName(template.parkId)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Basic Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Basic Information</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Activity Type:</span>
                              <span className="font-medium">{template.activity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Application Cost:</span>
                              <span className="font-medium">${(template.templateData as any)?.applicationCost || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Insurance Required:</span>
                              <Badge variant={(template.templateData as any)?.requireInsurance ? "default" : "secondary"}>
                                {(template.templateData as any)?.requireInsurance ? "Yes" : "No"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {/* Locations */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Available Locations</h3>
                          <div className="space-y-2">
                            {((template.templateData as any)?.locations || []).map((location: any, index: number) => (
                              <div key={index} className="p-3 bg-muted rounded-lg">
                                <div className="font-medium">{location.name}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  Capacity: {location.capacity || 'N/A'}
                                </div>
                              </div>
                            ))}
                            {((template.templateData as any)?.locations || []).length === 0 && (
                              <p className="text-muted-foreground text-sm">No locations specified</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                ) : (
                  // Compact view for grid display
                  <div>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">
                            {(template.templateData as any)?.name || template.permitType}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {getParkName(template.parkId)}
                          </p>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Activity:</span>
                          <span className="font-medium">{template.activity}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Locations:</span>
                          <span className="font-medium">
                            {((template.templateData as any)?.locations || []).length || 0} locations
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Application Cost:</span>
                          <span className="font-medium">
                            ${(template.templateData as any)?.applicationCost || '0.00'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t">
                          <Badge variant="outline" className="text-xs">
                            Template
                          </Badge>
                          <span className="text-xs text-muted-foreground">Click to view details</span>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
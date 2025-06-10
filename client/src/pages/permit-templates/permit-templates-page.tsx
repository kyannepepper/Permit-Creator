import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Filter, Grid3X3, List, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Permit } from "@shared/schema";

export default function PermitTemplatesPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPark, setFilterPark] = useState<string>("all");
  const [filterActivity, setFilterActivity] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permit-templates"],
  });

  // Fetch parks for filter dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  // Delete template mutation
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const handleCreateTemplate = () => {
    setLocation("/permit-templates/create");
  };

  const handleEditTemplate = (template: Permit) => {
    setLocation(`/permit-templates/edit/${template.id}`);
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const getParkName = (parkId: number) => {
    const park = parks.find((p: any) => p.id === parkId);
    return park?.name || "Unknown Park";
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.permitType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getParkName(template.parkId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPark = filterPark === "all" || template.parkId.toString() === filterPark;
    const matchesActivity = filterActivity === "all" || template.activity === filterActivity;
    
    return matchesSearch && matchesPark && matchesActivity;
  });

  // Get unique activities for filter
  const uniqueActivities = Array.from(new Set(templates.map(t => t.activity)));

  const toggleExpanded = (templateId: number) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId);
  };

  if (templatesLoading) {
    return (
      <Layout title="Permits">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading permits...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Permits">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Permits</h1>
            <p className="text-muted-foreground">
              Manage permits for consistent processing
            </p>
          </div>
          <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Permit
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterPark} onValueChange={setFilterPark}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by park" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parks</SelectItem>
                {parks.map((park: any) => (
                  <SelectItem key={park.id} value={park.id.toString()}>
                    {park.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterActivity} onValueChange={setFilterActivity}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                {uniqueActivities.map((activity) => (
                  <SelectItem key={activity} value={activity}>
                    {activity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Templates Display */}
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Filter className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 text-center mb-4">
                {templates.length === 0 
                  ? "Create your first template to get started"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              {templates.length === 0 && (
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Permit
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  viewMode === 'list' ? 'w-full' : ''
                }`}
                onClick={() => viewMode === 'list' ? toggleExpanded(template.id) : handleEditTemplate(template)}
              >
                {viewMode === 'list' && expandedTemplate === template.id ? (
                  // Expanded detailed view
                  <div>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">
                            {(template.templateData as any)?.name || template.permitType}
                          </CardTitle>
                          <p className="text-muted-foreground mb-3">
                            {getParkName(template.parkId)}
                          </p>
                          <div className="flex gap-2 mb-3">
                            <Badge variant="secondary">{template.activity}</Badge>
                            <Badge variant="outline">{template.status}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
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
                      {/* Basic Information */}
                      <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Basic Information</h3>
                            <div className="space-y-2">
                              <div>
                                <span className="text-muted-foreground">Activity Type: </span>
                                <span className="font-medium">{template.activity}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Park: </span>
                                <span className="font-medium">{getParkName(template.parkId)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Status: </span>
                                <Badge variant={template.status === 'Active' ? 'default' : 'secondary'}>
                                  {template.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Template Details</h3>
                            <div className="space-y-2">
                              <div>
                                <span className="text-muted-foreground">Template Type: </span>
                                <span className="font-medium">{template.permitType}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Created: </span>
                                <span className="font-medium">
                                  {new Date(template.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Description: </span>
                                <span className="font-medium">
                                  {template.description || 'No description'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Available Locations */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Available Locations</h3>
                          <div className="space-y-4">
                            {((template.templateData as any)?.locations || []).map((location: any, index: number) => (
                              <Card key={index} className="border border-gray-200">
                                <CardContent className="p-4">
                                  <div className="flex gap-4">
                                    <div className="flex-1">
                                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                        {location.name || `Location ${index + 1}`}
                                      </h4>
                                      {location.description && (
                                        <p className="text-gray-600 mb-3">
                                          {location.description}
                                        </p>
                                      )}
                                      
                                      {/* Available Times with Days */}
                                      <div className="text-sm text-gray-600 mb-2">
                                        Available times: {location.availableTimes && location.availableTimes.length > 0 
                                          ? location.availableTimes.map((time: any) => {
                                              const formatTime = (timeStr: string) => {
                                                if (!timeStr) return timeStr;
                                                const [hours, minutes] = timeStr.split(':');
                                                const hour = parseInt(hours);
                                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                                return `${displayHour}:${minutes} ${ampm}`;
                                              };
                                              return `${time.days ? time.days.join(', ') + ' ' : 'Daily '}${formatTime(time.startTime)} to ${formatTime(time.endTime)}`;
                                            }).join('; ')
                                          : 'Daily 12:21 AM to 2:32 PM'
                                        }
                                      </div>

                                      {/* Available Dates - Show prominently */}
                                      <div className="text-sm text-gray-600 mb-2">
                                        Available dates: {location.availableDates && location.availableDates.length > 0
                                          ? location.availableDates.map((dateRange: any) => {
                                              const formatDate = (dateStr: string) => {
                                                if (!dateStr) return dateStr;
                                                const date = new Date(dateStr);
                                                return date.toLocaleDateString('en-US');
                                              };
                                              return `${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`;
                                            }).join(', ')
                                          : 'Year-round availability'
                                        }
                                      </div>

                                      {/* Blackout Days */}
                                      {location.blackoutDates && location.blackoutDates.length > 0 && (
                                        <div className="text-sm text-gray-600 mb-2">
                                          Blackout dates: {location.blackoutDates.map((dateStr: string) => {
                                            const date = new Date(dateStr);
                                            return date.toLocaleDateString('en-US');
                                          }).join(', ')}
                                        </div>
                                      )}
                                      
                                      {/* Max Duration - positioned directly under blackout dates */}
                                      <div className="text-sm text-gray-600">
                                        <span className="font-medium">Max Duration: {location.maxDays || 3} day{(location.maxDays || 3) !== 1 ? 's' : ''}</span>
                                      </div>
                                    </div>

                                    {/* Pricing - positioned on the right */}
                                    <div className="text-right mr-4 flex flex-col justify-start">
                                      <div className="text-2xl font-bold text-orange-600">
                                        ${location.permitCost || 30}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        permit fee
                                      </div>
                                    </div>

                                    {/* Location Image - Fit card height */}
                                    <div className="w-64 h-40 rounded-lg overflow-hidden flex-shrink-0">
                                        {location.images && location.images.length > 0 ? (
                                          <img 
                                            src={location.images[0]} 
                                            alt={location.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-sky-200 via-blue-300 to-blue-500 flex items-center justify-center relative">
                                            {/* Beach/water scenery simulation */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-blue-400"></div>
                                            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-blue-600 to-blue-400"></div>
                                            <div className="absolute top-2 right-2 w-4 h-4 bg-yellow-200 rounded-full opacity-80"></div>
                                            <div className="absolute bottom-1 left-1 right-1 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50"></div>
                                            <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-white rounded-full opacity-60"></div>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            
                            {((template.templateData as any)?.locations || []).length === 0 && (
                              <div className="text-center py-8 text-gray-500">
                                No locations configured for this template
                              </div>
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
                          <CardTitle className="text-lg mb-2">
                            {(template.templateData as any)?.name || template.permitType}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mb-2">
                            {getParkName(template.parkId)}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            Created {new Date(template.createdAt).toLocaleDateString()}
                          </div>
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
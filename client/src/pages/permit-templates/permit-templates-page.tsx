import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout/layout";
import { Plus, Edit, Copy, Trash2, List, Grid, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Permit } from "@shared/schema";

export default function PermitTemplatesPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPark, setFilterPark] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permit-templates"],
  });

  // Fetch parks for filter
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await apiRequest("DELETE", `/api/permit-templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
      toast({
        title: "Template deleted",
        description: "Permit template has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest("POST", `/api/permit-templates/${templateId}/duplicate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
      toast({
        title: "Template duplicated",
        description: "Permit template has been duplicated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate template",
        variant: "destructive",
      });
    },
  });

  const getParkName = (parkId: number) => {
    const park = (parks as any[]).find((p: any) => p.id === parkId);
    return park?.name || "Unknown Park";
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.permitType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getParkName(template.parkId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPark = filterPark === "all" || template.parkId.toString() === filterPark;
    
    return matchesSearch && matchesPark;
  });

  const toggleExpanded = (templateId: number) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId);
  };

  const handleEditTemplate = (template: Permit) => {
    setLocation(`/permit-templates/edit/${template.id}`);
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  if (templatesLoading) {
    return (
      <Layout title="Permit Templates" subtitle="Loading templates...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Permit Templates" subtitle="Manage permit templates for different activities">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button onClick={() => setLocation("/permits/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterPark} onValueChange={setFilterPark}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by park" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parks</SelectItem>
                {(parks as any[]).map((park: any) => (
                  <SelectItem key={park.id} value={park.id.toString()}>
                    {park.name}
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
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Templates Display */}
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterPark !== "all" 
                    ? "Try adjusting your search or filters"
                    : "Get started by creating your first permit template"
                  }
                </p>
                <Button onClick={() => setLocation("/permits/create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredTemplates.map((template) => (
              <Card key={template.id} className={`hover:shadow-md transition-all duration-200 overflow-hidden ${expandedTemplate === template.id ? 'h-auto' : 'h-40'}`}>
                {expandedTemplate === template.id ? (
                  // Expanded view showing all details
                  <div className="h-full flex flex-col" onClick={() => toggleExpanded(template.id)}>
                    <div className="flex h-32">
                      {/* Image on the left */}
                      {template.imagePath && (
                        <div className="flex-shrink-0 w-40 h-32">
                          <img
                            src={template.imagePath}
                            alt={template.permitType}
                            className="w-full h-full object-cover object-center rounded-l-lg"
                            onError={(e) => {
                              // Hide image if it fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Header Content */}
                      <div className="flex-1 flex flex-col">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-1">
                                {template.permitType}
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
                                  duplicateTemplateMutation.mutate(template.id);
                                }}
                                disabled={duplicateTemplateMutation.isPending}
                              >
                                <Copy className="h-4 w-4" />
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
                    </div>
                    
                    {/* Expanded Details */}
                    <div className="flex-1 px-6 pb-4 pt-4">
                      <div className="text-sm space-y-2">
                        {template.refundableDeposit && parseFloat(template.refundableDeposit) > 0 && (
                          <div>
                            <span className="font-medium">Deposit:</span> ${template.refundableDeposit}
                          </div>
                        )}
                      </div>
                    </div>
                    <CardContent>
                      {/* Template Details */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium">Application Fee:</span>
                            <div className="text-lg font-semibold text-green-600">${template.applicationFee}</div>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Permit Fee:</span>
                            <div className="text-lg font-semibold text-blue-600">${template.permitFee}</div>
                          </div>
                        </div>
                        
                        {template.refundableDeposit && parseFloat(template.refundableDeposit) > 0 && (
                          <div>
                            <span className="text-sm font-medium">Refundable Deposit:</span>
                            <div className="text-lg font-semibold text-orange-600">${template.refundableDeposit}</div>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {template.maxPeople && (
                            <Badge variant="outline">Max People: {template.maxPeople}</Badge>
                          )}
                          {template.insuranceRequired && (
                            <Badge variant="secondary">
                              Insurance Required
                            </Badge>
                          )}
                        </div>
                        
                        {template.termsAndConditions && (
                          <div>
                            <span className="text-sm font-medium">Terms & Conditions:</span>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                              {template.termsAndConditions}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>
                ) : (
                  // Compact view for grid display or collapsed list
                  <div onClick={() => toggleExpanded(template.id)} className="cursor-pointer">
                    <div className="flex h-full">
                      {/* Image on the left - full height */}
                      {template.imagePath && (
                        <div className="flex-shrink-0 w-40 h-40">
                          <img
                            src={template.imagePath}
                            alt={template.permitType}
                            className="w-full h-full object-cover object-center rounded-l-lg"
                            onError={(e) => {
                              // Hide image if it fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Content area */}
                      <div className="flex-1 flex flex-col">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-2">
                                {template.permitType}
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
                                  duplicateTemplateMutation.mutate(template.id);
                                }}
                                disabled={duplicateTemplateMutation.isPending}
                              >
                                <Copy className="h-4 w-4" />
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
                    </div>
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
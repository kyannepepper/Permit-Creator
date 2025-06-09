import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, MapPin, DollarSign, Calendar, Clock, Shield, FileText, AlertTriangle } from "lucide-react";
import type { Permit, Park } from "@shared/schema";

export default function TemplateDetailPage() {
  const { id } = useParams();

  const { data: template, isLoading } = useQuery<Permit>({
    queryKey: ["/api/permit-templates", id],
  });

  const { data: parks = [] } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });

  const getParkName = (parkId: number) => {
    return parks.find(park => park.id === parkId)?.name || "Unknown Park";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Template not found</h2>
        <p className="text-muted-foreground mb-4">The permit template you're looking for doesn't exist.</p>
        <Link href="/permit-templates">
          <Button>Back to Templates</Button>
        </Link>
      </div>
    );
  }

  const templateData = template.templateData as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/permit-templates">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{templateData?.name || template.permitType}</h1>
            <p className="text-muted-foreground">{getParkName(template.parkId)}</p>
          </div>
        </div>
        <Link href={`/permit-templates/edit/${template.id}`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Template
          </Button>
        </Link>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Template Name</p>
              <p className="text-sm">{templateData?.name || template.permitType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Park</p>
              <p className="text-sm">{getParkName(template.parkId)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Application Cost</p>
              <p className="text-sm">${templateData?.applicationCost || '0'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations */}
      {templateData?.locations && templateData.locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Available Locations ({templateData.locations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {templateData.locations.map((location: any, index: number) => (
                <Card key={index} className="border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {location.description && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Description</p>
                        <p className="text-sm">{location.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Permit Cost</p>
                        <p className="text-sm font-semibold">${location.permitCost || '0'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Max Days</p>
                        <p className="text-sm">{location.maxDays || 'N/A'}</p>
                      </div>
                    </div>

                    {location.availableTimes && location.availableTimes.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Available Times</p>
                        <div className="space-y-1">
                          {location.availableTimes.map((time: any, timeIndex: number) => (
                            <Badge key={timeIndex} variant="outline" className="text-xs">
                              {time.startTime} - {time.endTime}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {location.images && location.images.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Images</p>
                        <div className="grid grid-cols-2 gap-2">
                          {location.images.slice(0, 4).map((image: string, imgIndex: number) => (
                            <img
                              key={imgIndex}
                              src={image}
                              alt={`${location.name} ${imgIndex + 1}`}
                              className="w-full h-20 object-cover rounded border"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insurance Requirements */}
      {templateData?.requireInsurance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Insurance Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Injury to One Person</p>
                <p className="text-sm">{templateData.injuryToOnePersonAmount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Injury to Multiple Persons</p>
                <p className="text-sm">{templateData.injuryToMultiplePersonsAmount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Property Damage</p>
                <p className="text-sm">{templateData.propertyDamageAmount}</p>
              </div>
            </div>
            
            {templateData.insuranceActivities && templateData.insuranceActivities.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Insurance Activities</p>
                <div className="flex flex-wrap gap-2">
                  {templateData.insuranceActivities.map((activity: any, index: number) => (
                    <Badge key={index} variant="secondary">
                      Tier {activity.tier}: {activity.activity} - {activity.insuranceLimits}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {templateData.insuranceFields && templateData.insuranceFields.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Additional Insurance Fields</p>
                <div className="space-y-2">
                  {templateData.insuranceFields.map((field: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">{field.label}</span>
                      <Badge variant="outline">{field.required ? 'Required' : 'Optional'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Custom Fields */}
      {templateData?.customFields && templateData.customFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Custom Fields
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templateData.customFields.map((field: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{field.label}</p>
                    <p className="text-sm text-muted-foreground">Type: {field.type}</p>
                  </div>
                  <Badge variant="outline">{field.required ? 'Required' : 'Optional'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waivers */}
      {templateData?.waivers && templateData.waivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Required Waivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templateData.waivers.map((waiver: any, index: number) => (
                <div key={index} className="p-3 border rounded">
                  <p className="font-medium mb-2">{waiver.title}</p>
                  <p className="text-sm text-muted-foreground mb-2">{waiver.description}</p>
                  {waiver.url && (
                    <a 
                      href={waiver.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View Waiver Document
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Layout from "@/components/layout/layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Park } from "@shared/schema";
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Trash2 } from "lucide-react";
import { Link } from "wouter";

export default function ParkDetailsPage() {
  const { id } = useParams();
  const parkId = parseInt(id || '0');
  const [selectedBlackoutDays, setSelectedBlackoutDays] = useState<Date[]>([]);
  const { toast } = useToast();

  // Fetch park data
  const { data: park, isLoading: parkLoading } = useQuery<Park>({
    queryKey: [`/api/parks/${parkId}`],
  });

  // Initialize blackout days when park data loads
  useEffect(() => {
    if (park?.blackoutDays) {
      try {
        const blackoutDates = Array.isArray(park.blackoutDays) 
          ? park.blackoutDays.map((dateStr: string) => new Date(dateStr))
          : [];
        setSelectedBlackoutDays(blackoutDates);
      } catch (error) {
        console.error("Error parsing blackout days:", error);
      }
    }
  }, [park]);

  // Update blackout days mutation
  const updateBlackoutDaysMutation = useMutation({
    mutationFn: async (blackoutDays: string[]) => {
      await apiRequest("PATCH", `/api/parks/${parkId}`, {
        blackoutDays
      });
    },
    onSuccess: () => {
      toast({
        title: "Blackout days updated",
        description: "The park's blackout days have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/parks/${parkId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating blackout days",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) {
      setSelectedBlackoutDays([]);
      return;
    }
    
    setSelectedBlackoutDays(dates.sort((a, b) => a.getTime() - b.getTime()));
  };

  const handleSaveBlackoutDays = () => {
    const blackoutDaysStrings = selectedBlackoutDays.map(date => date.toISOString().split('T')[0]);
    updateBlackoutDaysMutation.mutate(blackoutDaysStrings);
  };

  const handleRemoveBlackoutDay = (dateToRemove: Date) => {
    setSelectedBlackoutDays(prev => 
      prev.filter(date => date.toISOString().split('T')[0] !== dateToRemove.toISOString().split('T')[0])
    );
  };

  const handleClearAllBlackoutDays = () => {
    setSelectedBlackoutDays([]);
  };

  if (parkLoading || !park) {
    return (
      <Layout title="Park Details">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading park details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${park.name} - Details`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/parks">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Parks
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{park.name}</h1>
              <div className="flex items-center text-muted-foreground mt-1">
                <MapPin className="h-4 w-4 mr-1" />
                {park.location}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Park Information */}
          <Card>
            <CardHeader>
              <CardTitle>Park Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm mt-1">{park.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <p className="text-sm mt-1">{park.location}</p>
              </div>

              {park.waiver && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Waiver Text</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{park.waiver}</p>
                </div>
              )}

              {park.locations && Array.isArray(park.locations) && park.locations.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Available Locations</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {park.locations.map((location: any, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {typeof location === 'string' ? location : location.name || location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blackout Days Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Blackout Days
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select dates when permits cannot be issued for this park. Click on dates to add or remove them.
              </p>

              {/* Selected Blackout Days List */}
              {selectedBlackoutDays.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Selected Blackout Days ({selectedBlackoutDays.length})</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllBlackoutDays}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                    {selectedBlackoutDays.map((date, index) => (
                      <div key={index} className="flex items-center justify-between text-sm py-1 px-2 bg-gray-50 rounded">
                        <span>{date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBlackoutDay(date)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendar */}
              <div className="flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={selectedBlackoutDays}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </div>

              {/* Save Button */}
              <Separator />
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={handleSaveBlackoutDays}
                  disabled={updateBlackoutDaysMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {updateBlackoutDaysMutation.isPending ? "Saving..." : "Save Blackout Days"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
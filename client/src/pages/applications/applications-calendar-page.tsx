import { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter, X, User, Mail, Phone, Calendar as CalendarIcon, MapPin, Users, Loader2 } from "lucide-react";
import Layout from "@/components/layout/layout";
import { useAuth } from "@/hooks/use-auth";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    "en-US": enUS,
  },
});

// Status color mapping
const statusColors = {
  "pending": "#fbbf24", // yellow
  "approved": "#10b981", // green
  "disapproved": "#ef4444", // red
  "completed": "#6b7280", // gray
};

export default function ApplicationsCalendarPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPark, setSelectedPark] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<any>(null);

  // Helper function to determine if an application is fully paid
  const isFullyPaid = (application: any) => {
    const applicationFee = parseFloat(application.applicationFee || '0');
    const permitFee = parseFloat(application.permitFee || '0');
    const locationFee = parseFloat(application.locationFee || '0');
    
    const totalDue = applicationFee + permitFee + locationFee;
    
    if (totalDue === 0) return true; // No payment required
    
    // Check if all fees are paid
    const applicationFeePaid = application.applicationFeePaid || applicationFee === 0;
    const permitFeePaid = application.permitFeePaid || permitFee === 0;
    
    return applicationFeePaid && permitFeePaid;
  };

  // Helper function to get display status
  const getDisplayStatus = (application: any) => {
    if (application.status.toLowerCase() === 'approved' && isFullyPaid(application)) {
      return 'completed';
    }
    return application.status.toLowerCase();
  };

  // Fetch applications - only when authenticated
  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/applications/all"],
    enabled: !!user && !authLoading,
  });

  // Fetch parks - only when authenticated
  const { data: parks = [], isLoading: parksLoading } = useQuery({
    queryKey: ["/api/parks"],
    enabled: !!user && !authLoading,
  });

  // Transform applications into calendar events
  const events = applications
    .filter((app: any) => app.eventDates) // Only include applications with event dates
    .filter((app: any) => selectedPark === "all" || app.parkId === parseInt(selectedPark))
    .filter((app: any) => selectedStatus === "all" || getDisplayStatus(app) === selectedStatus)
    .flatMap((app: any) => {
      try {
        // Parse event dates - handle JSON string or array
        let dates = app.eventDates;
        if (typeof app.eventDates === 'string') {
          dates = JSON.parse(app.eventDates);
        }
        
        if (!Array.isArray(dates) || dates.length === 0) {
          return [];
        }
        
        // Create a calendar event for each date
        return dates.map((dateStr: string, index: number) => {
          const eventDate = new Date(dateStr);
          const displayStatus = getDisplayStatus(app);
          
          return {
            id: `${app.id}-${index}`, // Unique ID for each date
            title: app.eventTitle || `${app.firstName} ${app.lastName}` || "Untitled Event",
            start: eventDate,
            end: eventDate,
            allDay: true,
            resource: app,
            style: {
              backgroundColor: statusColors[displayStatus as keyof typeof statusColors] || "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
            },
          };
        });
      } catch (error) {
        console.error('Error parsing event dates for application:', app.id, error);
        return [];
      }
    });

  const clearFilters = () => {
    setSelectedPark("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters = selectedPark !== "all" || selectedStatus !== "all";

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <Layout title="Applications Calendar">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
          <span className="ml-2">Loading...</span>
        </div>
      </Layout>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return (
      <Layout title="Applications Calendar">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">Please log in to access the calendar page.</p>
            <Button onClick={() => window.location.href = '/auth'}>Go to Login</Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (applicationsLoading || parksLoading) {
    return (
      <Layout title="Applications Calendar">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Applications Calendar">
      <div className="space-y-6">


        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-auto"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Park</label>
                <Select value={selectedPark} onValueChange={setSelectedPark}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Parks" />
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
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="disapproved">Disapproved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Legend */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: statusColors.pending }}
                ></div>
                <span className="text-sm">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: statusColors.approved }}
                ></div>
                <span className="text-sm">Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: statusColors.disapproved }}
                ></div>
                <span className="text-sm">Disapproved</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: statusColors.completed }}
                ></div>
                <span className="text-sm">Completed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardContent className="p-6">
            <div style={{ height: "600px" }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                eventPropGetter={(event) => ({
                  style: event.style,
                })}
                onSelectEvent={(event: any) => {
                  setSelectedApplication(event.resource);
                }}
                popup
                showMultiDayTimes
                step={60}
                views={['month', 'week', 'day']}
                defaultView="month"
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {events.length} application{events.length !== 1 ? "s" : ""}
                {hasActiveFilters && " (filtered)"}
              </span>
              <div className="flex gap-2">
                {Object.entries(
                  events.reduce((acc: any, event: any) => {
                    const status = event.resource.status;
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([status, count]) => (
                  <Badge key={status} variant="secondary">
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Details Dialog */}
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedApplication?.eventTitle || "Application Details"}
              </DialogTitle>
            </DialogHeader>
            
            {selectedApplication && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge 
                    style={{ 
                      backgroundColor: statusColors[selectedApplication.status as keyof typeof statusColors] || "#6b7280",
                      color: "white"
                    }}
                  >
                    {selectedApplication.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Application #{selectedApplication.applicationNumber || selectedApplication.id}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Applicant:</span>
                      <span>{selectedApplication.firstName} {selectedApplication.lastName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      <span>{selectedApplication.email}</span>
                    </div>
                    
                    {selectedApplication.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Phone:</span>
                        <span>{selectedApplication.phone}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Event Date{(() => {
                        try {
                          const dates = JSON.parse(selectedApplication.eventDates || '[]');
                          return Array.isArray(dates) && dates.length > 1 ? 's' : '';
                        } catch {
                          return '';
                        }
                      })()}:</span>
                      <span>{(() => {
                        try {
                          let dates = selectedApplication.eventDates;
                          if (typeof dates === 'string') {
                            dates = JSON.parse(dates);
                          }
                          if (Array.isArray(dates) && dates.length > 0) {
                            if (dates.length === 1) {
                              return new Date(dates[0]).toLocaleDateString();
                            } else {
                              const sortedDates = dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                              return sortedDates.map(date => new Date(date).toLocaleDateString()).join(', ');
                            }
                          }
                          return 'N/A';
                        } catch {
                          return 'N/A';
                        }
                      })()}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Park:</span>
                      <span>{parks.find((p: any) => p.id === selectedApplication.parkId)?.name || "Unknown"}</span>
                    </div>
                    
                    {selectedApplication.attendees && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Attendees:</span>
                        <span>{selectedApplication.attendees}</span>
                      </div>
                    )}
                    
                    {selectedApplication.startTime && (
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Time:</span>
                        <span>{selectedApplication.startTime} - {selectedApplication.endTime}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedApplication.eventDescription && (
                  <div className="mt-4">
                    <span className="font-medium">Description:</span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedApplication.eventDescription}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
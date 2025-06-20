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
import { Filter, X, User, Mail, Phone, Calendar as CalendarIcon, MapPin, Users } from "lucide-react";
import Layout from "@/components/layout/layout";
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
};

export default function ApplicationsCalendarPage() {
  const [selectedPark, setSelectedPark] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<any>(null);

  // Fetch applications
  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/applications"],
  });

  // Fetch parks
  const { data: parks = [], isLoading: parksLoading } = useQuery({
    queryKey: ["/api/parks"],
  });

  // Transform applications into calendar events
  const events = applications
    .filter((app: any) => app.eventDate) // Only include applications with event dates
    .filter((app: any) => selectedPark === "all" || app.parkId === parseInt(selectedPark))
    .filter((app: any) => selectedStatus === "all" || app.status === selectedStatus)
    .map((app: any) => {
      const eventDate = new Date(app.eventDate);
      // Create a day-long event if only one date is provided
      const startDate = new Date(eventDate);
      const endDate = new Date(eventDate);
      endDate.setDate(endDate.getDate() + 1); // Make it span the full day
      
      return {
        id: app.id,
        title: app.eventTitle || `${app.firstName} ${app.lastName}` || "Untitled Event",
        start: startDate,
        end: endDate,
        allDay: true,
        resource: app,
        style: {
          backgroundColor: statusColors[app.status as keyof typeof statusColors] || "#6b7280",
          color: "white",
          border: "none",
          borderRadius: "4px",
        },
      };
    });

  const clearFilters = () => {
    setSelectedPark("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters = selectedPark !== "all" || selectedStatus !== "all";

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
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Applications Calendar</h1>
          <p className="text-muted-foreground">
            View all permit applications on a calendar organized by event dates
          </p>
        </div>

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
                      <span className="font-medium">Event Date:</span>
                      <span>{new Date(selectedApplication.eventDate).toLocaleDateString()}</span>
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
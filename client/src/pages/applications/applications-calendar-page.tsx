import { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
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
  "under_review": "#6366f1", // blue
};

export default function ApplicationsCalendarPage() {
  const [selectedPark, setSelectedPark] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

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
    .filter((app: any) => selectedPark === "all" || app.parkId === parseInt(selectedPark))
    .filter((app: any) => selectedStatus === "all" || app.status === selectedStatus)
    .map((app: any) => ({
      id: app.id,
      title: app.eventTitle || "Untitled Event",
      start: new Date(app.startDate),
      end: new Date(app.endDate),
      resource: app,
      style: {
        backgroundColor: statusColors[app.status as keyof typeof statusColors] || "#6b7280",
      },
    }));

  const clearFilters = () => {
    setSelectedPark("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters = selectedPark !== "all" || selectedStatus !== "all";

  if (applicationsLoading || parksLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
                    <SelectItem value="under_review">Under Review</SelectItem>
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
                  style={{ backgroundColor: statusColors.under_review }}
                ></div>
                <span className="text-sm">Under Review</span>
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
                onSelectEvent={(event) => {
                  // Could navigate to application details or show a modal
                  console.log("Selected event:", event);
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
      </div>
    </Layout>
  );
}
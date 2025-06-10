import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout/layout";
import type { Application } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";

export default function ApplicationsCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterPark, setFilterPark] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch applications data
  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  // Fetch parks for filter dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  // Fetch invoices to check payment status
  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
  });

  // Fetch permit templates to get blackout dates
  const { data: permitTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/permit-templates"],
  });

  const getParkName = (parkId: number) => {
    const park = parks.find((p: any) => p.id === parkId);
    return park?.name || "Unknown Park";
  };

  const getApplicationStatus = (application: Application) => {
    if (application.status.toLowerCase() === 'approved') {
      const invoice = invoices.find((inv: any) => inv.applicationId === application.id);
      if (invoice?.isPaid) {
        return { status: 'paid', label: 'Paid & Approved', color: 'bg-green-500' };
      } else if (invoice) {
        return { status: 'invoice-pending', label: 'Waiting on Invoice', color: 'bg-orange-500' };
      } else {
        return { status: 'approved', label: 'Approved', color: 'bg-green-500' };
      }
    } else if (application.status.toLowerCase() === 'disapproved') {
      return { status: 'disapproved', label: 'Disapproved', color: 'bg-red-500' };
    } else if (application.status.toLowerCase() === 'pending') {
      if (application.isPaid) {
        return { status: 'waiting-approval', label: 'Waiting on Approval', color: 'bg-blue-500' };
      } else {
        return { status: 'waiting-payment', label: 'Waiting on Payment', color: 'bg-yellow-500' };
      }
    }
    return { status: 'unknown', label: 'Unknown', color: 'bg-gray-500' };
  };

  // Filter applications based on criteria
  const filteredApplications = applications.filter((application) => {
    const matchesPark = filterPark === "all" || application.parkId.toString() === filterPark;
    
    if (filterStatus === "all") return matchesPark;
    
    const appStatus = getApplicationStatus(application);
    const matchesStatus = filterStatus === appStatus.status;
    
    return matchesPark && matchesStatus;
  });

  // Get calendar days for current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get applications for a specific date
  const getApplicationsForDate = (date: Date) => {
    return filteredApplications.filter((app) => {
      if (!app.eventDate) return false;
      const eventDate = new Date(app.eventDate);
      return isSameDay(eventDate, date);
    });
  };

  // Get blackout dates for current month
  const getBlackoutDatesForDate = (date: Date) => {
    const blackoutDates: any[] = [];
    
    permitTemplates.forEach((template: any) => {
      if (template.templateData?.locations) {
        template.templateData.locations.forEach((location: any) => {
          if (location.blackoutDates) {
            location.blackoutDates.forEach((blackoutDate: any) => {
              const blackoutStart = new Date(blackoutDate.startDate);
              const blackoutEnd = blackoutDate.endDate ? new Date(blackoutDate.endDate) : blackoutStart;
              
              if (date >= blackoutStart && date <= blackoutEnd) {
                blackoutDates.push({
                  parkId: template.parkId,
                  reason: blackoutDate.reason || 'Blackout Period',
                  location: location.name
                });
              }
            });
          }
        });
      }
    });
    
    return blackoutDates;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  if (isLoading) {
    return (
      <Layout title="Applications Calendar">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading calendar...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Applications Calendar">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Applications Calendar</h1>
            <p className="text-muted-foreground">
              View all applications and blackout dates on the calendar
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="min-w-[200px]">
                  <Select value={filterPark} onValueChange={setFilterPark}>
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

                <div className="min-w-[200px]">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid & Approved</SelectItem>
                      <SelectItem value="invoice-pending">Waiting on Invoice</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="waiting-approval">Waiting on Approval</SelectItem>
                      <SelectItem value="waiting-payment">Waiting on Payment</SelectItem>
                      <SelectItem value="disapproved">Disapproved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Paid & Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">Waiting on Invoice</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Waiting on Approval</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Waiting on Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Disapproved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-800 rounded"></div>
                <span className="text-sm">Blackout Period</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((day) => {
                const dayApplications = getApplicationsForDate(day);
                const blackoutDates = getBlackoutDatesForDate(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] p-2 border rounded-lg ${
                      isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                    } ${isToday ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-2 ${
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className="space-y-1">
                      {/* Show blackout dates first */}
                      {blackoutDates.map((blackout, index) => (
                        <div
                          key={`blackout-${index}`}
                          className="text-xs p-1 rounded bg-gray-800 text-white truncate"
                          title={`${blackout.reason} - ${getParkName(blackout.parkId)}`}
                        >
                          🚫 {blackout.reason}
                        </div>
                      ))}
                      
                      {/* Show applications */}
                      {dayApplications.slice(0, 3).map((app) => {
                        const status = getApplicationStatus(app);
                        const applicantName = `${app.firstName || ''} ${app.lastName || ''}`.trim();
                        
                        return (
                          <div
                            key={app.id}
                            className={`text-xs p-1 rounded text-white truncate ${status.color}`}
                            title={`${app.eventTitle || 'Event'} - ${applicantName} (${status.label})`}
                          >
                            <div className="font-medium truncate">{app.eventTitle || 'Event'}</div>
                            <div className="truncate opacity-90">{applicantName}</div>
                          </div>
                        );
                      })}
                      
                      {/* Show count if more applications */}
                      {dayApplications.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayApplications.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {filteredApplications.filter(app => getApplicationStatus(app).status === 'paid').length}
              </div>
              <p className="text-xs text-muted-foreground">Paid & Approved</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {filteredApplications.filter(app => getApplicationStatus(app).status === 'waiting-approval').length}
              </div>
              <p className="text-xs text-muted-foreground">Waiting on Approval</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {filteredApplications.filter(app => getApplicationStatus(app).status === 'waiting-payment').length}
              </div>
              <p className="text-xs text-muted-foreground">Waiting on Payment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {filteredApplications.filter(app => getApplicationStatus(app).status === 'invoice-pending').length}
              </div>
              <p className="text-xs text-muted-foreground">Waiting on Invoice</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
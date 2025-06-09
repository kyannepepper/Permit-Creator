import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Eye, Calendar, User, MapPin, Clock, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout/layout";
import type { Application } from "@shared/schema";

export default function ApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPark, setFilterPark] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Fetch applications from the database
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  // Fetch parks for filter dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  const getParkName = (parkId: number) => {
    const park = parks.find((p: any) => p.id === parkId);
    return park?.name || "Unknown Park";
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending_payment':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'N/A';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('en-US');
  };

  // Filter applications based on search and filter criteria
  const filteredApplications = applications.filter((application) => {
    const matchesSearch = 
      application.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.activityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getParkName(application.parkId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || application.status === filterStatus;
    const matchesPark = filterPark === "all" || application.parkId.toString() === filterPark;
    
    return matchesSearch && matchesStatus && matchesPark;
  });

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(new Set(applications.map(app => app.status)));

  if (applicationsLoading) {
    return (
      <Layout title="Applications">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading applications...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Applications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Applications</h1>
            <p className="text-muted-foreground">
              View and manage permit applications submitted by the public
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm">
              {filteredApplications.length} of {applications.length} applications
            </Badge>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications found</h3>
              <p className="text-gray-600 text-center mb-4">
                {applications.length === 0 
                  ? "No applications have been submitted yet"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <Card 
                key={application.id} 
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedApplication(application)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {application.applicationNumber}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {application.applicantName} {application.organizationName && `(${application.organizationName})`}
                      </p>
                      <div className="flex gap-2 mb-2">
                        <Badge className={getStatusColor(application.status)}>
                          {formatStatus(application.status)}
                        </Badge>
                        <Badge variant="outline">
                          {application.activityType}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Park: </span>
                      <span className="font-medium">{getParkName(application.parkId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Event: </span>
                      <span className="font-medium">
                        {formatDate(application.startDate)} - {formatDate(application.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Participants: </span>
                      <span className="font-medium">{application.expectedParticipants}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Location: </span>
                      <span className="font-medium">{application.proposedLocation}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Fee: </span>
                      <span className="font-medium">{formatCurrency(application.applicationFee)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Submitted: </span>
                      <span className="font-medium">{formatDate(application.submittedAt)}</span>
                    </div>
                  </div>

                  {application.activityDescription && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        <span className="font-medium">Description: </span>
                        {application.activityDescription}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Application Detail Modal/Panel - Simple version for now */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Application Details
                    </h2>
                    <p className="text-lg text-gray-600">
                      {selectedApplication.applicationNumber}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedApplication(null)}
                  >
                    Close
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Applicant Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Applicant Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-muted-foreground">Name: </span>
                        <span className="font-medium">{selectedApplication.applicantName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email: </span>
                        <span className="font-medium">{selectedApplication.applicantEmail}</span>
                      </div>
                      {selectedApplication.applicantPhone && (
                        <div>
                          <span className="text-muted-foreground">Phone: </span>
                          <span className="font-medium">{selectedApplication.applicantPhone}</span>
                        </div>
                      )}
                      {selectedApplication.organizationName && (
                        <div>
                          <span className="text-muted-foreground">Organization: </span>
                          <span className="font-medium">{selectedApplication.organizationName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Event Details</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-muted-foreground">Activity Type: </span>
                        <span className="font-medium">{selectedApplication.activityType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Park: </span>
                        <span className="font-medium">{getParkName(selectedApplication.parkId)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location: </span>
                        <span className="font-medium">{selectedApplication.proposedLocation}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dates: </span>
                        <span className="font-medium">
                          {formatDate(selectedApplication.startDate)} - {formatDate(selectedApplication.endDate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Participants: </span>
                        <span className="font-medium">{selectedApplication.expectedParticipants}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Description */}
                {selectedApplication.activityDescription && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Activity Description</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {selectedApplication.activityDescription}
                    </p>
                  </div>
                )}

                {/* Status and Review Information */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(selectedApplication.status)}>
                        {formatStatus(selectedApplication.status)}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        Application Fee: {formatCurrency(selectedApplication.applicationFee)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      Submitted: {formatDate(selectedApplication.submittedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
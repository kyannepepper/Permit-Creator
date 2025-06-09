import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Application } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Calendar, Users, DollarSign, Clock, MapPin, User, Mail, Phone, CheckCircle, Clock3, X, XCircle } from "lucide-react";

export default function ApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPark, setFilterPark] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [disapproveApplication, setDisapproveApplication] = useState<Application | null>(null);
  const [disapprovalReason, setDisapprovalReason] = useState("");
  const { toast } = useToast();

  // Fetch applications data
  const { data: applications = [], isLoading, error } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  // Fetch parks for filter dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  // Approve application mutation
  const approveApplicationMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await apiRequest("PATCH", `/api/applications/${applicationId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Application Approved",
        description: "The application has been approved and an invoice has been created for the permit fee.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive",
      });
    },
  });

  // Disapprove application mutation
  const disapproveApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: number; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/applications/${applicationId}/disapprove`, {
        reason
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      setDisapproveApplication(null);
      setDisapprovalReason("");
      toast({
        title: "Application Disapproved",
        description: "The application has been disapproved and the applicant has been notified via email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disapprove application",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Layout title="Applications">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Applications">
        <div className="text-center py-8">
          <p className="text-destructive">Failed to load applications. Please try again.</p>
        </div>
      </Layout>
    );
  }

  const getParkName = (parkId: number) => {
    const park = parks.find((p: any) => p.id === parkId);
    return park?.name || `Park ${parkId}`;
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return 'N/A';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return 'N/A';
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US');
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'N/A';
    // Handle both 24-hour and 12-hour time formats
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return timeStr;
  };

  // Filter applications based on search and filter criteria
  const filteredApplications = applications.filter((application) => {
    const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
    const matchesSearch = 
      application.id?.toString().includes(searchTerm.toLowerCase()) ||
      applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getParkName(application.parkId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || application.status === filterStatus;
    const matchesPark = filterPark === "all" || application.parkId.toString() === filterPark;
    
    return matchesSearch && matchesStatus && matchesPark;
  });

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(new Set(applications.map(app => app.status)));

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'under review': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleApproveApplication = (applicationId: number) => {
    approveApplicationMutation.mutate(applicationId);
  };

  return (
    <Layout title="Applications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            <p className="text-muted-foreground">
              View and manage all permit applications
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPark} onValueChange={setFilterPark}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Filter by park" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parks</SelectItem>
                  {parks.map((park) => (
                    <SelectItem key={park.id} value={park.id.toString()}>
                      {park.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
        <div className="grid gap-6">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No applications found matching your criteria.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((application) => {
              const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
              const isApproved = application.status.toLowerCase() === 'approved';
              const isDisapproved = application.status.toLowerCase() === 'disapproved';
              const isPending = application.status.toLowerCase() === 'pending';
              
              return (
                <Card key={application.id} className={`hover:shadow-lg transition-shadow ${isApproved ? 'border-green-200 bg-green-50/30' : isDisapproved ? 'border-red-200 bg-red-50/30' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {application.eventTitle && (
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{application.eventTitle}</h3>
                              <span className="text-sm text-muted-foreground font-medium">
                                {formatDate(application.eventDate)}
                              </span>
                            </div>
                          )}
                          {isApproved && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">Approved</span>
                            </div>
                          )}
                          {isDisapproved && (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">Disapproved</span>
                            </div>
                          )}
                          {isPending && (
                            <div className="flex items-center gap-1 text-orange-600">
                              <Clock3 className="h-4 w-4" />
                              <span className="text-sm font-medium">Awaiting Review</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{applicantName || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{getParkName(application.parkId)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(application.eventDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>{formatCurrency(application.totalFee)}</span>
                          </div>
                        </div>
                        
                        {application.eventTitle && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            <strong>Event:</strong> {application.eventTitle}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveApplication(application.id)}
                              disabled={approveApplicationMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {approveApplicationMutation.isPending ? (
                                <>
                                  <Clock3 className="h-4 w-4 mr-2 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDisapproveApplication(application)}
                              disabled={disapproveApplicationMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Disapprove
                            </Button>
                          </>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedApplication(application)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {selectedApplication?.eventTitle || 'Application Details'}
                              </DialogTitle>
                            </DialogHeader>
                            
                            {selectedApplication && (
                              <div className="space-y-6">
                                {/* Status and Basic Info */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    {selectedApplication.status.toLowerCase() === 'approved' ? (
                                      <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-medium">Approved</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-orange-600">
                                        <Clock3 className="h-5 w-5" />
                                        <span className="font-medium">Awaiting Review</span>
                                      </div>
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                      Submitted: {formatDate(selectedApplication.createdAt)}
                                    </span>
                                  </div>
                                  {selectedApplication.status.toLowerCase() !== 'approved' && (
                                    <Button
                                      onClick={() => handleApproveApplication(selectedApplication.id)}
                                      disabled={approveApplicationMutation.isPending}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {approveApplicationMutation.isPending ? (
                                        <>
                                          <Clock3 className="h-4 w-4 mr-2 animate-spin" />
                                          Approving...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Approve Application
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>

                                {/* Applicant Information */}
                                <div>
                                  <h3 className="text-lg font-semibold mb-3">Applicant Information</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Name:</span>
                                        <span>{applicantName || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Email:</span>
                                        <span>{selectedApplication.email || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Phone:</span>
                                        <span>{selectedApplication.phone || 'N/A'}</span>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div>
                                        <span className="font-medium">Type:</span>
                                        <span className="ml-2">{selectedApplication.applicantType || 'N/A'}</span>
                                      </div>
                                      {selectedApplication.organizationName && (
                                        <div>
                                          <span className="font-medium">Organization:</span>
                                          <span className="ml-2">{selectedApplication.organizationName}</span>
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-medium">Address:</span>
                                        <span className="ml-2">
                                          {[selectedApplication.address, selectedApplication.city, selectedApplication.state, selectedApplication.zipCode]
                                            .filter(Boolean)
                                            .join(', ') || 'N/A'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* Event Details */}
                                <div>
                                  <h3 className="text-lg font-semibold mb-3">Event Details</h3>
                                  <div className="space-y-3">
                                    <div>
                                      <span className="font-medium">Event Title:</span>
                                      <span className="ml-2">{selectedApplication.eventTitle || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Park:</span>
                                      <span className="ml-2">{getParkName(selectedApplication.parkId)}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Date:</span>
                                        <span>{formatDate(selectedApplication.eventDate)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Start:</span>
                                        <span>{formatTime(selectedApplication.startTime)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">End:</span>
                                        <span>{formatTime(selectedApplication.endTime)}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">Attendees:</span>
                                      <span>{selectedApplication.attendees || 'N/A'}</span>
                                    </div>
                                    {selectedApplication.setupTime && (
                                      <div>
                                        <span className="font-medium">Setup Time:</span>
                                        <span className="ml-2">{formatTime(selectedApplication.setupTime)}</span>
                                      </div>
                                    )}
                                    {selectedApplication.eventDescription && (
                                      <div>
                                        <span className="font-medium">Description:</span>
                                        <p className="mt-1 text-sm bg-muted p-3 rounded">
                                          {selectedApplication.eventDescription}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <Separator />

                                {/* Financial Information */}
                                <div>
                                  <h3 className="text-lg font-semibold mb-3">Financial Information</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">Application Fee:</span>
                                      <span>{formatCurrency(selectedApplication.applicationFee)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">Permit Fee:</span>
                                      <span>{formatCurrency(selectedApplication.permitFee)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">Total Fee:</span>
                                      <span className="font-semibold">{formatCurrency(selectedApplication.totalFee)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Additional Information */}
                                {(selectedApplication.specialRequests || selectedApplication.additionalRequirements) && (
                                  <>
                                    <Separator />
                                    <div>
                                      <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                                      {selectedApplication.specialRequests && (
                                        <div className="mb-3">
                                          <span className="font-medium">Special Requests:</span>
                                          <p className="mt-1 text-sm bg-muted p-3 rounded">
                                            {selectedApplication.specialRequests}
                                          </p>
                                        </div>
                                      )}
                                      {selectedApplication.additionalRequirements && (
                                        <div>
                                          <span className="font-medium">Additional Requirements:</span>
                                          <p className="mt-1 text-sm bg-muted p-3 rounded">
                                            {typeof selectedApplication.additionalRequirements === 'string' 
                                              ? selectedApplication.additionalRequirements 
                                              : JSON.stringify(selectedApplication.additionalRequirements, null, 2)}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
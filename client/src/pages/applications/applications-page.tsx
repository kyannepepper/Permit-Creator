import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Application } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, Calendar, MapPin, User, Mail, Phone, CheckCircle, Clock3, XCircle, DollarSign } from "lucide-react";

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

  const handleApproveApplication = (applicationId: number) => {
    approveApplicationMutation.mutate(applicationId);
  };

  const handleDisapproveApplication = () => {
    if (disapproveApplication && disapprovalReason.trim()) {
      disapproveApplicationMutation.mutate({
        applicationId: disapproveApplication.id,
        reason: disapprovalReason.trim()
      });
    }
  };

  // Filter applications based on search and filter criteria
  const filteredApplications = applications.filter((application) => {
    const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
    
    const matchesSearch = 
      application.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || application.status === filterStatus;
    const matchesPark = filterPark === "all" || application.parkId.toString() === filterPark;
    
    return matchesSearch && matchesStatus && matchesPark;
  });

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(new Set(applications.map(app => app.status)));

  return (
    <Layout title="Applications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            <p className="text-muted-foreground">
              View and manage special use permit applications
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
                  {parks.map((park: any) => (
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
                <Card 
                  key={application.id} 
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    isApproved ? 'border-green-200 bg-green-50/30' : 
                    isDisapproved ? 'border-red-200 bg-red-50/30' : ''
                  }`}
                  onClick={() => setSelectedApplication(application)}
                >
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
                            <span className="font-semibold">{formatCurrency(application.permitFee)}</span>
                          </div>
                        </div>
                        
                        {application.eventDescription && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            <strong>Description:</strong> {application.eventDescription}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Application Details Dialog */}
        <Dialog open={!!selectedApplication} onOpenChange={(open) => {
          if (!open) setSelectedApplication(null);
        }}>
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
                    ) : selectedApplication.status.toLowerCase() === 'disapproved' ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">Disapproved</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-600">
                        <Clock3 className="h-5 w-5" />
                        <span className="font-medium">Awaiting Review</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Applicant Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Applicant Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Name:</span>
                        <span>{`${selectedApplication.firstName || ''} ${selectedApplication.lastName || ''}`.trim() || 'N/A'}</span>
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
                        <span className="font-medium">Organization:</span>
                        <span className="ml-2">{selectedApplication.organizationName || 'Individual'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Address:</span>
                        <span className="ml-2">
                          {selectedApplication.address ? (
                            `${selectedApplication.address}, ${selectedApplication.city || ''}, ${selectedApplication.state || ''} ${selectedApplication.zipCode || ''}`
                          ) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Event Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Event Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Event Title:</span>
                        <span className="ml-2">{selectedApplication.eventTitle || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Park:</span>
                        <span className="ml-2">{getParkName(selectedApplication.parkId)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Event Date:</span>
                        <span className="ml-2">{formatDate(selectedApplication.eventDate)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Expected Attendees:</span>
                        <span className="ml-2">{selectedApplication.attendees || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Setup Time:</span>
                        <span className="ml-2">{selectedApplication.setupTime || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Start Time:</span>
                        <span className="ml-2">{selectedApplication.startTime || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">End Time:</span>
                        <span className="ml-2">{selectedApplication.endTime || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Permit Fee:</span>
                        <span className="ml-2">{formatCurrency(selectedApplication.permitFee)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedApplication.eventDescription && (
                    <div className="mt-4">
                      <span className="font-medium">Event Description:</span>
                      <p className="mt-1 text-sm bg-muted p-3 rounded">
                        {selectedApplication.eventDescription}
                      </p>
                    </div>
                  )}

                  {selectedApplication.specialRequests && (
                    <div className="mt-4">
                      <span className="font-medium">Special Requests:</span>
                      <p className="mt-1 text-sm bg-muted p-3 rounded">
                        {selectedApplication.specialRequests}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Disapproval Dialog */}
        <Dialog open={!!disapproveApplication} onOpenChange={(open) => {
          if (!open) {
            setDisapproveApplication(null);
            setDisapprovalReason("");
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Disapprove Application</DialogTitle>
            </DialogHeader>
            
            {disapproveApplication && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    You are about to disapprove the application for:
                  </p>
                  <p className="font-medium">{disapproveApplication.eventTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    by {disapproveApplication.firstName} {disapproveApplication.lastName}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Reason for disapproval <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={disapprovalReason}
                    onChange={(e) => setDisapprovalReason(e.target.value)}
                    placeholder="Please provide a detailed reason for disapproving this application..."
                    className="w-full min-h-[100px] p-3 border border-input bg-background rounded-md text-sm resize-vertical"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The applicant will receive an email with this reason and contact information for questions.
                  </p>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDisapproveApplication(null);
                      setDisapprovalReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDisapproveApplication}
                    disabled={!disapprovalReason.trim() || disapproveApplicationMutation.isPending}
                  >
                    {disapproveApplicationMutation.isPending ? (
                      <>
                        <Clock3 className="h-4 w-4 mr-2 animate-spin" />
                        Disapproving...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Disapprove Application
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
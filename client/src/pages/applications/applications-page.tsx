import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Application } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, Calendar, MapPin, User, Mail, Phone, CheckCircle, Clock3, XCircle, DollarSign, Trash2, MessageCircle, Smartphone, Loader2, MoreVertical, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPark, setFilterPark] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [approveApplication, setApproveApplication] = useState<Application | null>(null);
  const [disapproveApplication, setDisapproveApplication] = useState<Application | null>(null);
  const [disapprovalReason, setDisapprovalReason] = useState("");
  const [reachOutApplication, setReachOutApplication] = useState<Application | null>(null);
  const [contactFormVisible, setContactFormVisible] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);

  // Email templates for quick selection
  const emailTemplates = [
    {
      label: "Request Additional Information",
      message: "We need some additional information to process your permit application. Please provide:\n\n• [Specify what information is needed]\n\nOnce we receive this information, we'll continue processing your application."
    },
    {
      label: "Approval Notification",
      message: "Great news! Your permit application has been approved. Your permit details are as follows:\n\n• Permit Number: [Will be assigned]\n• Event Date: [Date from application]\n• Location: [Location from application]\n\nPlease keep this information for your records."
    },
    {
      label: "Schedule Meeting/Call",
      message: "We'd like to schedule a brief meeting to discuss your permit application. Please let us know your availability for a call this week.\n\nWe can be reached at (801) 538-7220 during business hours, or reply to this email with your preferred times."
    },
    {
      label: "Fee Information",
      message: "Your permit application fees are ready for payment:\n\n• Application Fee: $[amount]\n• Permit Fee: $[amount]\n• Total: $[total]\n\nPayment instructions will be provided separately. Please contact us if you have any questions about the fees."
    },
    {
      label: "Policy Clarification",
      message: "We wanted to clarify some park policies that apply to your event:\n\n• [List relevant policies]\n\nPlease confirm that your event will comply with these requirements. Let us know if you have any questions."
    },
    {
      label: "Custom Message",
      message: ""
    }
  ];
  const [disapprovalMessagingMethod, setDisapprovalMessagingMethod] = useState<"email" | "sms" | "both">("email");
  const { toast } = useToast();
  const [location] = useLocation();

  // Fetch applications data
  const { data: applications = [], isLoading, error } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  // Fetch parks for filter dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  // Fetch approved applications with invoice status
  const { data: approvedApplicationsWithInvoices = [] } = useQuery<any[]>({
    queryKey: ["/api/applications", "approved-with-invoices"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/applications/approved-with-invoices");
        if (!response.ok) {
          return []; // Return empty array if endpoint fails
        }
        return response.json();
      } catch (error) {
        console.warn("Failed to fetch approved applications with invoices:", error);
        return [];
      }
    },
  });

  // Fetch invoices to check payment status
  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
  });

  // Fetch permit templates to resolve permit type names
  const { data: permitTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/permit-templates"],
  });

  // Set default park filter based on user's assigned park
  useEffect(() => {
    if (user?.assignedParkId && filterPark === "all") {
      setFilterPark(user.assignedParkId.toString());
    }
  }, [user, filterPark]);

  // Handle URL parameters to auto-open application details
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const applicationId = urlParams.get('id');
    
    if (applicationId && applications.length > 0) {
      const application = applications.find(app => app.id === parseInt(applicationId));
      if (application) {
        setSelectedApplication(application);
      }
    }
  }, [applications]);

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
    mutationFn: async ({ applicationId, reason, method }: { applicationId: number; reason: string; method: "email" | "sms" | "both" }) => {
      const response = await apiRequest("PATCH", `/api/applications/${applicationId}/disapprove`, {
        reason,
        method
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      setDisapproveApplication(null);
      setDisapprovalReason("");
      setDisapprovalMessagingMethod("email");
      const methodText = variables.method === "both" ? "email and SMS" : variables.method === "email" ? "email" : "SMS";
      toast({
        title: "Application Disapproved",
        description: `The application has been disapproved and the applicant has been notified via ${methodText}.`,
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

  // Delete application mutation
  const deleteApplicationMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await apiRequest("DELETE", `/api/applications/${applicationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Application Deleted",
        description: "The unpaid application has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete application",
        variant: "destructive",
      });
    },
  });

  // Contact form submission handler - opens Gmail with prefilled email
  const handleContactFormSubmit = async () => {
    if (!reachOutApplication || !contactMessage.trim() || !fromEmail.trim()) {
      return;
    }

    const subject = encodeURIComponent(`Regarding Your Permit Application - ${reachOutApplication.eventTitle || 'Application'}`);
    const body = encodeURIComponent(`Dear ${reachOutApplication.firstName} ${reachOutApplication.lastName},

We're reaching out regarding your Special Use Permit application for "${reachOutApplication.eventTitle || 'your event'}".

${contactMessage.trim()}

If you have any questions or need assistance, please don't hesitate to contact us:

Phone: (801) 538-7220

We're here to help and look forward to hearing from you.

Best regards,
Utah State Parks Permit Office`);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(reachOutApplication.email || '')}&su=${subject}&body=${body}&from=${encodeURIComponent(fromEmail)}`;
    
    // Open Gmail in a new tab
    window.open(gmailUrl, '_blank');
    
    toast({
      title: "Gmail Opened",
      description: "Gmail has been opened with your message pre-filled. Please review and send the email.",
    });
    
    setContactFormVisible(false);
    setReachOutApplication(null);
    setContactMessage("");
    setFromEmail("");
  };

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

  const getPermitTypeName = (permitTypeId: number | null) => {
    if (!permitTypeId) return 'N/A';
    const template = permitTemplates.find((t: any) => t.id === permitTypeId);
    return template?.permitType || 'Unknown Permit Type';
  };

  const getLocationInfo = (parkId: number, locationId: number | null) => {
    if (!locationId) return { name: 'N/A', fee: 0 };
    
    const park = parks.find((p: any) => p.id === parkId);
    if (!park || !park.locations) return { name: 'N/A', fee: 0 };
    
    try {
      const locations = Array.isArray(park.locations) ? park.locations : JSON.parse(park.locations);
      
      // Since locationId appears to be a random number, we need to find it differently
      // For now, let's use locationId as an index into the locations array
      const locationIndex = locationId % locations.length;
      const location = locations[locationIndex];
      
      if (location) {
        return { 
          name: location.name || 'Unknown Location', 
          fee: location.fee || 0 
        };
      }
    } catch (error) {
      console.error('Error parsing locations:', error);
    }
    
    return { name: 'N/A', fee: 0 };
  };

  const getInsuranceInfo = (insurance: any) => {
    if (!insurance) return { status: 'Not Required', hasDocument: false };
    
    try {
      const insuranceData = typeof insurance === 'string' ? JSON.parse(insurance) : insurance;
      
      let status = 'Unknown';
      if (insuranceData.status === 'not_required' || insuranceData.required === false) {
        status = 'Not Required';
      } else if (insuranceData.carrier && insuranceData.phoneNumber) {
        status = `Required - ${insuranceData.carrier}`;
      } else {
        status = 'Required';
      }
      
      const hasDocument = !!insuranceData.documentPath;
      const documentPath = insuranceData.documentPath;
      
      return { status, hasDocument, documentPath };
    } catch (error) {
      console.error('Error parsing insurance data:', error);
      return { status: 'Unknown', hasDocument: false };
    }
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  const calculatePaidAmount = (application: any) => {
    let totalPaid = 0;
    
    // If invoice is paid, include both application fee and permit fee
    if (application.invoiceStatus === 'paid') {
      // Add application fee if exists
      if (application.applicationFee) {
        const appFee = typeof application.applicationFee === 'string' 
          ? parseFloat(application.applicationFee) 
          : application.applicationFee;
        totalPaid += appFee;
      }
      
      // Add permit fee if exists
      if (application.permitFee) {
        const permitFee = typeof application.permitFee === 'string' 
          ? parseFloat(application.permitFee) 
          : application.permitFee;
        totalPaid += permitFee;
      }
    }
    
    return totalPaid;
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

  const getInvoiceStatus = (applicationId: number) => {
    // Find invoice for this application - invoice's permitId refers to the application ID
    const invoice = invoices.find((inv: any) => inv.permitId === applicationId);
    
    return invoice ? {
      hasInvoice: true,
      invoiceStatus: invoice.status || 'pending',
      invoiceAmount: invoice.amount || null,
      invoiceNumber: invoice.invoiceNumber || null
    } : {
      hasInvoice: false,
      invoiceStatus: null,
      invoiceAmount: null,
      invoiceNumber: null
    };
  };

  // Enhance applications with invoice status
  const enhancedApplications = applications.map(application => {
    const invoiceInfo = getInvoiceStatus(application.id);
    return {
      ...application,
      parkName: getParkName(application.parkId),
      ...invoiceInfo
    };
  });

  const handleApproveApplication = (applicationId: number) => {
    approveApplicationMutation.mutate(applicationId);
  };

  const handleDisapproveApplication = () => {
    if (disapproveApplication && disapprovalReason.trim()) {
      disapproveApplicationMutation.mutate({
        applicationId: disapproveApplication.id,
        reason: disapprovalReason.trim(),
        method: disapprovalMessagingMethod
      });
    }
  };

  const handleDeleteApplication = (applicationId: number) => {
    deleteApplicationMutation.mutate(applicationId);
  };

  // Filter applications based on search and filter criteria
  const filteredApplications = enhancedApplications.filter((application) => {
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
              const isUnpaid = isPending && !application.isPaid;
              const isPaidPending = isPending && application.isPaid;
              const invoiceStatus = getInvoiceStatus(application.id);
              
              return (
                <Card 
                  key={application.id} 
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    isApproved ? 'border-green-200 bg-green-50/30' : 
                    isDisapproved ? 'border-red-200 bg-red-50/30' :
                    isUnpaid ? 'border-yellow-200 bg-yellow-50/30' : ''
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
                          {isUnpaid && (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Clock3 className="h-4 w-4" />
                              <span className="text-sm font-medium">Unpaid Application</span>
                            </div>
                          )}
                          {isPaidPending && (
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
                            <span className="font-semibold">${calculatePaidAmount(application).toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {(application as any).locationName && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            <strong>Location:</strong> {(application as any).locationName}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Invoice Status Badge for Approved Applications */}
                        {isApproved && (
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              {invoiceStatus.hasInvoice ? (
                                invoiceStatus.invoiceStatus === 'paid' ? (
                                  <div className="px-2 py-1 text-xs font-medium rounded-md bg-green-100 text-green-800 border border-green-200 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Invoice Paid
                                  </div>
                                ) : (
                                  <div className="px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                                    <Clock3 className="h-3 w-3" />
                                    Invoice Pending
                                  </div>
                                )
                              ) : (
                                <div className="px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-800 border border-gray-200 flex items-center gap-1">
                                  <Clock3 className="h-3 w-3" />
                                  Awaiting Invoice
                                </div>
                              )}
                            </div>
                            
                            {/* Three-dots menu for approved applications */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedApplication(application)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setReachOutApplication(application)}>
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Send Message
                                </DropdownMenuItem>
                                {invoiceStatus.hasInvoice && invoiceStatus.invoiceStatus === 'paid' && (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      const confirmDelete = window.confirm(
                                        `Are you sure you want to delete the approved application for "${application.eventTitle}" by ${applicantName}? This action cannot be undone and will also delete the associated permit and invoice.`
                                      );
                                      if (confirmDelete) {
                                        handleDeleteApplication(application.id);
                                      }
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        
                        {/* Three-dots menu for non-approved applications */}
                        {!isApproved && (
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedApplication(application)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setReachOutApplication(application)}>
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Send Message
                                </DropdownMenuItem>
                                {isPaidPending && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => handleApproveApplication(application.id)}
                                      disabled={approveApplicationMutation.isPending}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => setDisapproveApplication(application)}
                                      disabled={disapproveApplicationMutation.isPending}
                                      className="text-red-600"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Disapprove
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {(isUnpaid || isDisapproved) && (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      const confirmDelete = window.confirm(
                                        `Are you sure you want to delete this application for "${application.eventTitle}" by ${applicantName}? This action cannot be undone.`
                                      );
                                      if (confirmDelete) {
                                        handleDeleteApplication(application.id);
                                      }
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
                    ) : selectedApplication.status.toLowerCase() === 'pending' && !selectedApplication.isPaid ? (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <Clock3 className="h-5 w-5" />
                        <span className="font-medium">Unpaid Application</span>
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


                </div>

                <Separator />

                {/* Permit Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Permit Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Permit Type:</span>
                        <span className="ml-2">{getPermitTypeName(selectedApplication.permitTypeId) || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Park:</span>
                        <span className="ml-2">{getParkName(selectedApplication.parkId)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Location in Park:</span>
                        <span className="ml-2">{getLocationInfo(selectedApplication.parkId, selectedApplication.locationId).name}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Application Fee:</span>
                        <span className="ml-2">{formatCurrency(selectedApplication.applicationFee || 0)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Permit Fee:</span>
                        <span className="ml-2">{formatCurrency(selectedApplication.permitFee || 0)}</span>
                      </div>
                      {(() => {
                        const locationInfo = getLocationInfo(selectedApplication.parkId, selectedApplication.locationId);
                        return locationInfo.fee > 0 ? (
                          <div>
                            <span className="font-medium">Location Fee:</span>
                            <span className="ml-2">{formatCurrency(locationInfo.fee)}</span>
                          </div>
                        ) : null;
                      })()}
                      <div>
                        <span className="font-medium">Total Fees:</span>
                        <span className="ml-2 font-semibold">{(() => {
                          const locationInfo = getLocationInfo(selectedApplication.parkId, selectedApplication.locationId);
                          const total = Number(selectedApplication.applicationFee || 0) + 
                                       Number(selectedApplication.permitFee || 0) + 
                                       Number(locationInfo.fee || 0);
                          return formatCurrency(total);
                        })()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                  
                  {/* Insurance Information */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Insurance Information</h4>
                    <div className="bg-muted p-3 rounded space-y-2">
                      <div>
                        <span className="font-medium">Insurance Status:</span>
                        <span className="ml-2">
                          {getInsuranceInfo(selectedApplication.insurance).status}
                        </span>
                      </div>
                      {(() => {
                        const insuranceInfo = getInsuranceInfo(selectedApplication.insurance);
                        return insuranceInfo.hasDocument ? (
                          <div>
                            <span className="font-medium">Insurance Document:</span>
                            <a 
                              href={(() => {
                                const insuranceInfo = getInsuranceInfo(selectedApplication.insurance);
                                // If documentPath starts with http, use it directly. Otherwise, use API endpoint
                                return insuranceInfo.documentPath?.startsWith('http') 
                                  ? insuranceInfo.documentPath 
                                  : `/api/documents/${selectedApplication.id}/insurance`;
                              })()}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 hover:text-blue-800 underline"
                            >
                              View Document
                            </a>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Application Details</h4>
                    <div className="bg-muted p-3 rounded space-y-2">
                      <div>
                        <span className="font-medium">Application Number:</span>
                        <span className="ml-2">{selectedApplication.applicationNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Submission Date:</span>
                        <span className="ml-2">{selectedApplication.createdAt ? formatDate(selectedApplication.createdAt) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Documents and Notes */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Documents and Notes</h4>
                    {(selectedApplication as any).notes ? (
                      <div className="bg-muted p-3 rounded space-y-2">
                        {(selectedApplication as any).notes && (
                          <div>
                            <span className="font-medium">Application Notes:</span>
                            <p className="mt-1 text-sm">{(selectedApplication as any).notes}</p>
                          </div>
                        )}

                      </div>
                    ) : (
                      <p className="text-muted-foreground bg-muted p-3 rounded">None provided</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      // Determine application state for actions
                      const isPending = selectedApplication.status.toLowerCase() === 'pending';
                      const isApproved = selectedApplication.status.toLowerCase() === 'approved';
                      const isDisapproved = selectedApplication.status.toLowerCase() === 'disapproved';
                      const isUnpaid = isPending && !selectedApplication.isPaid;
                      const isPaidPending = isPending && selectedApplication.isPaid;

                      return (
                        <>
                          {/* For paid pending applications: show Approve, Disapprove, and Contact */}
                          {isPaidPending && (
                            <>
                              <Button
                                onClick={() => {
                                  setSelectedApplication(null);
                                  handleApproveApplication(selectedApplication.id);
                                }}
                                disabled={approveApplicationMutation.isPending}
                                className="flex-1 sm:flex-none"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  setSelectedApplication(null);
                                  setDisapproveApplication(selectedApplication);
                                }}
                                disabled={disapproveApplicationMutation.isPending}
                                className="flex-1 sm:flex-none"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Disapprove
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedApplication(null);
                                  setReachOutApplication(selectedApplication);
                                  setContactFormVisible(true);
                                }}
                                className="flex-1 sm:flex-none border-blue-200 text-blue-600 hover:bg-blue-50"
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Contact via Email
                              </Button>
                            </>
                          )}
                          
                          {/* For unpaid pending applications: show Contact */}
                          {isUnpaid && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedApplication(null);
                                setReachOutApplication(selectedApplication);
                                setContactFormVisible(true);
                              }}
                              className="flex-1 sm:flex-none"
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Contact via Email
                            </Button>
                          )}
                          
                          {/* For approved applications: show Contact */}
                          {isApproved && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedApplication(null);
                                setReachOutApplication(selectedApplication);
                                setContactFormVisible(true);
                              }}
                              className="flex-1 sm:flex-none"
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Contact Applicant
                            </Button>
                          )}
                          
                          {/* Delete button: show for unpaid and disapproved applications */}
                          {(isUnpaid || isDisapproved) && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                const confirmDelete = window.confirm(
                                  `Are you sure you want to delete the application for "${selectedApplication.eventTitle}" by ${selectedApplication.firstName} ${selectedApplication.lastName}? This action cannot be undone.`
                                );
                                if (confirmDelete) {
                                  setSelectedApplication(null);
                                  deleteApplicationMutation.mutate(selectedApplication.id);
                                }
                              }}
                              disabled={deleteApplicationMutation.isPending}
                              className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          )}
                        </>
                      );
                    })()}
                  </div>
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
            setDisapprovalMessagingMethod("email");
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
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>Email: {disapproveApplication.email}</span>
                    </div>
                    {disapproveApplication.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>Phone: {disapproveApplication.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messaging Method Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    How would you like to send the disapproval notice?
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setDisapprovalMessagingMethod("email")}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        disapprovalMessagingMethod === "email"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Mail className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Email</div>
                        <div className="text-xs text-muted-foreground">Send to {disapproveApplication.email}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisapprovalMessagingMethod("sms")}
                      disabled={!disapproveApplication.phone}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        disapprovalMessagingMethod === "sms"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      } ${
                        !disapproveApplication.phone ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Smartphone className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">SMS</div>
                        <div className="text-xs text-muted-foreground">
                          {disapproveApplication.phone ? `Send to ${disapproveApplication.phone}` : "No phone number"}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisapprovalMessagingMethod("both")}
                      disabled={!disapproveApplication.phone}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        disapprovalMessagingMethod === "both"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      } ${
                        !disapproveApplication.phone ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <MessageCircle className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Both Email & SMS</div>
                        <div className="text-xs text-muted-foreground">
                          {disapproveApplication.phone ? "Send via both methods" : "Phone required for this option"}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Reason for disapproval <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={disapprovalReason}
                      onChange={(e) => setDisapprovalReason(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !disapprovalReason.trim()) {
                          e.preventDefault();
                          setDisapprovalReason("Unfortunately, your application does not meet our current requirements. Please review the permit guidelines and consider resubmitting with the necessary modifications.");
                        }
                      }}
                      placeholder="Type your reason here or press Tab to auto-fill with default template..."
                      className="w-full min-h-[100px] p-3 border border-input bg-background rounded-md text-sm resize-vertical"
                      required
                    />
                    {!disapprovalReason.trim() && (
                      <div className="absolute top-3 right-3 text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
                        Press <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">Tab</kbd> to auto-fill
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The applicant will receive this reason via {disapprovalMessagingMethod === "both" ? "email and SMS" : disapprovalMessagingMethod} with contact information for questions.
                  </p>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDisapproveApplication(null);
                      setDisapprovalReason("");
                      setDisapprovalMessagingMethod("email");
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

        {/* Email Contact Dialog */}
        <Dialog open={contactFormVisible} onOpenChange={(open) => {
          if (!open) {
            setContactFormVisible(false);
            setReachOutApplication(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Contact Applicant via Email</DialogTitle>
            </DialogHeader>
            
            {reachOutApplication && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Send an email regarding the application for:
                  </p>
                  <p className="font-medium">{reachOutApplication.eventTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    by {reachOutApplication.firstName} {reachOutApplication.lastName}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>Email: {reachOutApplication.email}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Your email address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="Enter the email address you want to send from"
                      className="w-full p-2 border border-input bg-background rounded-md text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Message Template
                    </label>
                    <select
                      onChange={(e) => {
                        const selectedTemplate = emailTemplates.find(t => t.label === e.target.value);
                        if (selectedTemplate) {
                          setContactMessage(selectedTemplate.message);
                        }
                      }}
                      className="w-full p-2 border border-input bg-background rounded-md text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>Select a template or write custom message</option>
                      {emailTemplates.map((template) => (
                        <option key={template.label} value={template.label}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Your message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Type your message to the applicant..."
                      className="w-full min-h-[120px] p-3 border border-input bg-background rounded-md text-sm resize-vertical"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      This will open Gmail with your message pre-filled. You can review and edit before sending.
                    </p>
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setContactFormVisible(false);
                        setReachOutApplication(null);
                        setContactMessage("");
                        setFromEmail("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleContactFormSubmit}
                      disabled={!fromEmail.trim() || !contactMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {contactSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
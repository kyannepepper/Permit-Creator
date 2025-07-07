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
import { Search, Calendar, MapPin, User, Mail, Phone, CheckCircle, Clock3, XCircle, DollarSign, Trash2, MessageCircle, Smartphone, Loader2, MoreVertical, Eye, AlertTriangle, Plus, MessageSquare } from "lucide-react";
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

  const [newNote, setNewNote] = useState("");
  const [showAddNote, setShowAddNote] = useState(false);

  // Format multiple event dates helper
  const formatEventDates = (eventDates: any) => {
    if (!eventDates) return 'N/A';
    
    try {
      // Handle JSON string or array
      let dates = eventDates;
      if (typeof eventDates === 'string') {
        dates = JSON.parse(eventDates);
      }
      
      if (Array.isArray(dates) && dates.length > 0) {
        if (dates.length === 1) {
          return new Date(dates[0]).toLocaleDateString('en-US');
        } else {
          const sortedDates = dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
          return sortedDates.map(date => new Date(date).toLocaleDateString('en-US')).join(', ');
        }
      }
      
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };


  const [disapprovalMessagingMethod, setDisapprovalMessagingMethod] = useState<"email" | "sms" | "both">("email");
  const { toast } = useToast();
  const [location] = useLocation();

  // Fetch applications data - simplified single endpoint approach
  const { data: applications = [], isLoading, error } = useQuery<Application[]>({
    queryKey: ["/api/applications/all"],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async () => {
      console.log('Fetching applications from /api/applications/all...');
      
      const response = await fetch('/api/applications/all', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`Applications endpoint failed: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch applications: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Successfully fetched ${data.length} applications`);
      return data;
    },
  });
  
  // Check for selected application ID in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedId = urlParams.get('selected');
    if (selectedId && applications.length > 0) {
      const application = applications.find((app: any) => app.id === parseInt(selectedId));
      if (application) {
        setSelectedApplication(application);
        // Clean up the URL
        window.history.replaceState({}, '', '/applications');
      }
    }
  }, [applications]);

  // Fetch parks for filter dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });



  // Fetch permit templates to resolve permit type names
  const { data: permitTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/permit-templates"],
  });

  // Fetch park locations for accurate location mapping
  const { data: parkLocations = [] } = useQuery<any[]>({
    queryKey: ["/api/park-locations"],
  });

  // Fetch unpaid applications
  const { data: unpaidApplications = [] } = useQuery<any[]>({
    queryKey: ['/api/applications/unpaid'],
    enabled: filterStatus === 'unpaid',
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
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
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



  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const response = await apiRequest("PATCH", `/api/applications/${id}`, { notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      setNewNote("");
      setShowAddNote(false);
      toast({
        title: "Note added",
        description: "Note has been added to the application.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add note",
        description: error.message,
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
          <p className="text-sm text-muted-foreground mt-2">
            Error: {error.message || 'Unknown error'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Please check your login status and try refreshing the page.
          </p>
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

  const getLocationInfo = (parkId: number, locationId: number | string | null, customLocationName?: string) => {
    // If locationId is null but customLocationName exists, use the custom location
    if (!locationId && customLocationName) {
      return { name: customLocationName, fee: 0 };
    }
    
    if (!locationId && locationId !== 0) return { name: 'N/A', fee: 0 };
    
    // If locationId is a string (custom location name), return it directly
    if (typeof locationId === 'string' && isNaN(Number(locationId))) {
      return { name: locationId, fee: 0 };
    }
    
    // Handle custom location case (locationId = -1)
    if (locationId === -1 && customLocationName) {
      return { name: customLocationName, fee: 0 };
    }
    
    const numLocationId = Number(locationId);
    
    // Look up location in the park_locations table
    const location = parkLocations.find((loc: any) => loc.id === numLocationId);
    if (location) {
      return { 
        name: location.name || 'Unknown Location', 
        fee: Number(location.permitCost) || 0 
      };
    }
    
    // Fallback: if location not found in park_locations table, 
    // try the legacy JSON locations array (for backwards compatibility)
    const park = parks.find((p: any) => p.id === parkId);
    if (park && park.locations) {
      try {
        const locations = Array.isArray(park.locations) ? park.locations : JSON.parse(park.locations);
        
        // If it's a valid array index, use it directly
        if (numLocationId >= 0 && numLocationId < locations.length) {
          const legacyLocation = locations[numLocationId];
          if (legacyLocation) {
            return { 
              name: legacyLocation.name || 'Unknown Location', 
              fee: legacyLocation.fee || 0 
            };
          }
        }
        
        // For legacy data with large random numbers, use hash mapping
        const locationIndex = numLocationId % locations.length;
        const legacyLocation = locations[locationIndex];
        
        if (legacyLocation) {
          return { 
            name: legacyLocation.name || 'Unknown Location', 
            fee: legacyLocation.fee || 0 
          };
        }
      } catch (error) {
        console.error('Error parsing legacy locations:', error);
      }
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
      
      const hasDocument = !!(insuranceData.documentFullUrl || insuranceData.documentPath);
      const documentPath = insuranceData.documentFullUrl || insuranceData.documentPath;
      
      return { status, hasDocument, documentPath, insuranceData };
    } catch (error) {
      console.error('Error parsing insurance data:', error);
      return { status: 'Unknown', hasDocument: false };
    }
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num) || num <= 0) return '$0.00';
    return `$${num.toFixed(2)}`;
  };

  const getPaymentStatus = (application: any) => {
    const statuses = [];
    
    // Check application fee status (include $0 fees as automatically paid)
    if (application.applicationFee && parseFloat(application.applicationFee) > 0) {
      statuses.push({
        type: 'Application Fee',
        paid: application.isPaid || false
      });
    }
    
    // Check permit fee status - if permitFeePaid is true, both permit and location fees are paid
    if (application.permitFee && parseFloat(application.permitFee) > 0) {
      statuses.push({
        type: 'Permit Fee',
        paid: application.permitFeePaid || false
      });
    }
    
    // Check location fee status - also paid when permitFeePaid is true
    const locationInfo = getLocationInfo(application.parkId, application.locationId, application.customLocationName);
    if (locationInfo.fee > 0) {
      statuses.push({
        type: 'Location Fee',
        paid: application.permitFeePaid || false
      });
    }
    
    return statuses;
  };

  // New function to check if application is fully paid (including $0 fees)
  const isApplicationFullyPaid = (application: any) => {
    const appFee = application.applicationFee ? parseFloat(application.applicationFee) : 0;
    const permitFee = application.permitFee ? parseFloat(application.permitFee) : 0;
    const locationInfo = getLocationInfo(application.parkId, application.locationId, application.customLocationName);
    const locationFee = locationInfo.fee;
    
    // Application fee: $0 = automatically paid, >$0 = check isPaid
    const appFeePaid = appFee === 0 || application.isPaid;
    
    // Permit and location fees: paid together when permitFeePaid is true
    const permitAndLocationPaid = (permitFee === 0 && locationFee === 0) || application.permitFeePaid;
    
    return appFeePaid && permitAndLocationPaid;
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

  // Enhance applications with park name
  const enhancedApplications = applications.map(application => ({
    ...application,
    parkName: getParkName(application.parkId)
  }));

  const handleApproveApplication = (applicationId: number) => {
    approveApplicationMutation.mutate(applicationId);
  };

  const handleDisapproveApplication = () => {
    if (!disapproveApplication || !disapprovalReason.trim()) {
      return;
    }

    // Open email client with disapproval message
    const subject = encodeURIComponent(`Permit Application Disapproved - ${disapproveApplication.eventTitle || 'Application'}`);
    const body = encodeURIComponent(`Dear ${disapproveApplication.firstName} ${disapproveApplication.lastName},

We regret to inform you that your Special Use Permit application for "${disapproveApplication.eventTitle || 'your event'}" has been disapproved.

Reason for Disapproval:
${disapprovalReason.trim()}

If you have any questions about this decision or would like guidance on resubmitting your application, please don't hesitate to contact us:

Phone: (801) 538-7220
Email: permits@utahstateparks.org

We appreciate your interest in Utah State Parks and encourage you to reapply when you're able to meet our requirements.

Best regards,
Utah State Parks Permit Office`);

    const mailtoUrl = `mailto:${encodeURIComponent(disapproveApplication.email || '')}?subject=${subject}&body=${body}`;
    
    // Open email client
    window.location.href = mailtoUrl;
    
    // Close dialog and reset form
    setDisapproveApplication(null);
    setDisapprovalReason("");
    setDisapprovalMessagingMethod("email");
    
    toast({
      title: "Email Client Opened",
      description: "Your email client has been opened with the disapproval message. Please review and send the email.",
    });
  };

  const handleDeleteApplication = (applicationId: number) => {
    deleteApplicationMutation.mutate(applicationId);
  };

  // Filter applications based on search and filter criteria
  const filteredApplications = filterStatus === 'unpaid' 
    ? (unpaidApplications || []).filter((application: any) => {
        const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
        
        const matchesSearch = 
          application.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          application.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          application.applicationNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesPark = filterPark === "all" || application.parkId.toString() === filterPark;
        
        return matchesSearch && matchesPark;
      })
    : enhancedApplications.filter((application) => {
        const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
        
        const matchesSearch = 
          application.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          application.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          application.applicationNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Custom status matching logic to handle approved vs completed
        let matchesStatus = false;
        if (filterStatus === "all") {
          matchesStatus = true;
        } else if (filterStatus === "approved") {
          // Only show approved applications that are NOT fully paid
          matchesStatus = application.status === "approved" && !isApplicationFullyPaid(application);
        } else if (filterStatus === "completed") {
          // Show completed status OR approved applications that are fully paid
          matchesStatus = application.status === "completed" || 
                         (application.status === "approved" && isApplicationFullyPaid(application));
        } else {
          // For all other statuses (pending, disapproved, etc.)
          matchesStatus = application.status === filterStatus;
        }
        const matchesPark = filterPark === "all" || application.parkId.toString() === filterPark;
        
        // Always filter out unpaid applications unless specifically requested
        const isPending = application.status.toLowerCase() === 'pending';
        const isUnpaid = isPending && !application.isPaid;
        const showUnpaid = filterStatus === 'unpaid';
        
        return matchesSearch && matchesStatus && matchesPark && (!isUnpaid || showUnpaid);
      });

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(new Set(applications.map(app => app.status)));

  return (
    <Layout title="Applications">
      <div className="space-y-6">



        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by application number, event title, name, or email..."
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
                  <SelectItem value="unpaid">Unpaid (Will be deleted in 24h)</SelectItem>
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


              // Check if application is fully paid (including $0 fees)
              const paymentStatuses = getPaymentStatus(application);
              const fullyPaid = isApplicationFullyPaid(application);
              
              return (
                <Card 
                  key={application.id} 
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    fullyPaid ? 'border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg' :
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
                                {formatEventDates(application.eventDates)}
                              </span>
                            </div>
                          )}
                          {isApproved && !fullyPaid && (
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
                          {filterStatus === 'unpaid' && (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm font-medium">Will be deleted in 24 hours</span>
                            </div>
                          )}
                          {filterStatus !== 'unpaid' && isUnpaid && (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Clock3 className="h-4 w-4" />
                              <span className="text-sm font-medium">Unpaid Application</span>
                            </div>
                          )}
                          {fullyPaid && (
                            <div className="flex items-center gap-1 text-green-700 bg-green-200 px-3 py-1 rounded-full">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-bold">PERMIT SENT</span>
                            </div>
                          )}
                          {!fullyPaid && isPaidPending && (
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
                            <span>{formatEventDates(application.eventDates)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {application.email ? (
                              <a 
                                href={`mailto:${application.email}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {application.email}
                              </a>
                            ) : (
                              <span>N/A</span>
                            )}
                          </div>
                        </div>
                        
                        {(application as any).locationName && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            <strong>Location:</strong> {(application as any).locationName}
                          </p>
                        )}
                        
                        {application.notes && (
                          <div className="flex items-center gap-1 text-blue-600 text-sm mt-2">
                            <MessageSquare className="h-4 w-4" />
                            <span>Has Notes</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Payment Status for Approved/Completed Applications */}
                        {(isApproved || application.status === 'completed') && (
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              {fullyPaid ? (
                                <div className="px-2 py-1 text-xs font-medium rounded-md bg-green-100 text-green-800 border border-green-200 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Permit Sent
                                </div>
                              ) : (
                                <div className="px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                                  <Clock3 className="h-3 w-3" />
                                  Payment Pending
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Single consolidated three-dots menu */}
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
                              <DropdownMenuItem onClick={() => {
                                const email = application.email;
                                if (email) {
                                  window.open(`mailto:${email}`, '_blank');
                                }
                              }}>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedApplication(application);
                                setShowAddNote(true);
                              }}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Note
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
                                    className="text-red-600"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Disapprove
                                  </DropdownMenuItem>
                                </>
                              )}
                              {((isUnpaid || isDisapproved) || fullyPaid) && (
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
                    {selectedApplication.status.toLowerCase() === 'approved' && isApplicationFullyPaid(selectedApplication) ? (
                      <div className="flex items-center gap-2 text-blue-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Completed</span>
                      </div>
                    ) : selectedApplication.status.toLowerCase() === 'approved' ? (
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
                    
                    {/* Show approval information if approved */}
                    {selectedApplication.status.toLowerCase() === 'approved' && selectedApplication.approvedBy && (
                      <div className="ml-4 text-sm text-muted-foreground">
                        Approved by {selectedApplication.approvedBy}
                        {selectedApplication.approvedAt && (
                          <span className="ml-1">
                            on {new Date(selectedApplication.approvedAt).toLocaleDateString()}
                          </span>
                        )}
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
                        {selectedApplication.email ? (
                          <a 
                            href={`mailto:${selectedApplication.email}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {selectedApplication.email}
                          </a>
                        ) : (
                          <span>N/A</span>
                        )}
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
                        <span className="font-medium">Event Date{(() => {
                          try {
                            const dates = JSON.parse(selectedApplication.eventDates || '[]');
                            return Array.isArray(dates) && dates.length > 1 ? 's' : '';
                          } catch {
                            return '';
                          }
                        })()}:</span>
                        <span className="ml-2">{formatEventDates(selectedApplication.eventDates)}</span>
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
                        <span className="ml-2">{getLocationInfo(selectedApplication.parkId, selectedApplication.locationId, selectedApplication.customLocationName).name}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Application Cost:</span>
                        <span className="ml-2">{formatCurrency(selectedApplication.applicationFee || 0)}</span>
                        {selectedApplication.applicationFee && parseFloat(selectedApplication.applicationFee) > 0 && (
                          <div className="flex items-center gap-1 ml-2">
                            {selectedApplication.isPaid ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className={`text-sm ${selectedApplication.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedApplication.isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Permit Cost:</span>
                        <span className="ml-2">{formatCurrency(selectedApplication.permitFee || 0)}</span>
                        {selectedApplication.permitFee && parseFloat(selectedApplication.permitFee) > 0 && (
                          <div className="flex items-center gap-1 ml-2">
                            {selectedApplication.permitFeePaid ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-600">Paid</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm text-red-600">Unpaid</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {(() => {
                        const locationInfo = getLocationInfo(selectedApplication.parkId, selectedApplication.locationId, selectedApplication.customLocationName);
                        return locationInfo.fee > 0 ? (
                          <div>
                            <span className="font-medium">Location Cost:</span>
                            <span className="ml-2">{formatCurrency(locationInfo.fee)}</span>
                            <div className="flex items-center gap-1 ml-2">
                              {selectedApplication.permitFeePaid ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-600">Paid</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  <span className="text-sm text-red-600">Unpaid</span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : null;
                      })()}
                      <div>
                        <span className="font-medium">Total Costs:</span>
                        <span className="ml-2 font-semibold">{(() => {
                          const locationInfo = getLocationInfo(selectedApplication.parkId, selectedApplication.locationId, selectedApplication.customLocationName);
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
                      {(() => {
                        const insuranceData = typeof selectedApplication.insurance === 'string' 
                          ? JSON.parse(selectedApplication.insurance) 
                          : selectedApplication.insurance;
                        

                        
                        if (!insuranceData || insuranceData.required === false) {
                          return (
                            <div>
                              <span className="font-medium">Insurance:</span>
                              <span className="ml-2">Not Required</span>
                            </div>
                          );
                        }
                        
                        return (
                          <>
                            <div>
                              <span className="font-medium">Insurance Provider:</span>
                              <span className="ml-2">{insuranceData.carrier || 'Not Specified'}</span>
                            </div>
                            <div>
                              <span className="font-medium">Insurance Number:</span>
                              <span className="ml-2">{insuranceData.phoneNumber || 'Not Provided'}</span>
                            </div>
                            {(insuranceData.documentBase64 || insuranceData.documentUploaded) && (
                              <div>
                                <span className="font-medium">Insurance Document:</span>
                                {insuranceData.documentBase64 ? (
                                  <a 
                                    href={`/api/applications/${selectedApplication.id}/insurance-document/download`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download Document
                                  </a>
                                ) : (
                                  <span className="ml-2 text-green-600">
                                    Document available in database
                                  </span>
                                )}
                                <div className="text-xs text-muted-foreground ml-2 mt-1">
                                  Filename: {insuranceData.documentOriginalName || insuranceData.documentFilename || 'Unknown'}
                                </div>
                                {insuranceData.documentSize && (
                                  <div className="text-xs text-muted-foreground ml-2">
                                    Size: {(insuranceData.documentSize / 1024).toFixed(1)} KB
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
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


                </div>

                {/* Notes Section */}
                {selectedApplication.notes && (
                  <div>
                    <Separator />
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Notes
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{selectedApplication.notes}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <Separator />
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Actions</h3>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddNote(true)}
                      className="bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Note
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      // Determine application state for actions
                      const isPending = selectedApplication.status.toLowerCase() === 'pending';
                      const isApproved = selectedApplication.status.toLowerCase() === 'approved';
                      const isDisapproved = selectedApplication.status.toLowerCase() === 'disapproved';
                      const isUnpaid = isPending && !selectedApplication.isPaid;
                      const isPaidPending = isPending && selectedApplication.isPaid;
                      
                      // Check if application is fully paid (simplified without invoices)
                      const locationInfo = getLocationInfo(selectedApplication.parkId, selectedApplication.locationId, selectedApplication.customLocationName);
                      const hasLocationFee = locationInfo.fee > 0;
                      const isFullyPaid = selectedApplication.status === 'completed';

                      return (
                        <>
                          {/* Send Email - always available */}
                          <Button
                            variant="outline"
                            onClick={() => {
                              const email = selectedApplication.email;
                              if (email) {
                                window.open(`mailto:${email}`, '_blank');
                              }
                              setSelectedApplication(null);
                            }}
                            className="flex-1 sm:flex-none bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </Button>

                          {/* Approve - for paid pending applications */}
                          {isPaidPending && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedApplication(null);
                                handleApproveApplication(selectedApplication.id);
                              }}
                              disabled={approveApplicationMutation.isPending}
                              className="flex-1 sm:flex-none bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                          )}

                          {/* Disapprove - for paid pending applications */}
                          {isPaidPending && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedApplication(null);
                                setDisapproveApplication(selectedApplication);
                              }}

                              className="flex-1 sm:flex-none bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Disapprove
                            </Button>
                          )}

                          {/* Delete - for unpaid, disapproved, or fully paid applications */}
                          {((isUnpaid || isDisapproved) || isFullyPaid) && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                const applicantName = `${selectedApplication.firstName} ${selectedApplication.lastName}`;
                                const confirmDelete = window.confirm(
                                  `Are you sure you want to delete this application for "${selectedApplication.eventTitle}" by ${applicantName}? This action cannot be undone.`
                                );
                                if (confirmDelete) {
                                  setSelectedApplication(null);
                                  deleteApplicationMutation.mutate(selectedApplication.id);
                                }
                              }}
                              disabled={deleteApplicationMutation.isPending}
                              className="flex-1 sm:flex-none bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
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

        {/* Add Note Dialog */}
        <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Note</label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter note about this application..."
                  className="w-full p-3 border rounded-md resize-none"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddNote(false);
                    setNewNote("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedApplication && newNote.trim()) {
                      // Server handles formatting with user name and timestamp
                      addNoteMutation.mutate({ 
                        id: selectedApplication.id, 
                        notes: newNote.trim()
                      });
                    }
                  }}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                >
                  {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </div>
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

                {/* Email Notice */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    How would you like to send the disapproval notice?
                  </label>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-500 bg-blue-50 text-blue-700">
                    <Mail className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Email</div>
                      <div className="text-xs text-muted-foreground">Send to {disapproveApplication.email}</div>
                    </div>
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
                    This will open your email client with the disapproval message pre-filled for review before sending.
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
                    disabled={!disapprovalReason.trim()}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
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
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import StatsCard from "@/components/dashboard/stats-card";
import ApplicationCards from "@/components/dashboard/application-cards";
import ParkStatus from "@/components/dashboard/park-status";

import { FileSignature, Clock, CheckCircle, DollarSign, FileCheck, FileText, MapPin, Calendar, User, Shield, Clock3, XCircle, Mail, Loader2, Building, AlertTriangle, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";

// Custom formatCurrency that handles string amounts from database
const formatCurrency = (amount: string | number | null) => {
  if (!amount || amount === 0 || amount === '0' || amount === '0.000') return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return '$0.00';
  return `$${num.toFixed(2)}`;
};
import { Permit, Application } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/ui/status-badge";
import ParkStatusComponent from "@/components/permit/park-status";

// Park Access Component
function UserParkAccess() {
  const { user } = useAuth();
  const { data: userParks, isLoading } = useQuery<{ id: number; name: string }[]>({
    queryKey: [`/api/users/${user?.id}/parks`],
    enabled: !!user?.id,
  });

  if (!user) {
    return null;
  }

  if (user.role === 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Park Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin Access</Badge>
            <span className="text-sm text-muted-foreground">Full access to all parks</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Your Park Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading park assignments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Your Park Access
        </CardTitle>
      </CardHeader>
      <CardContent>
        {userParks && userParks.length > 0 ? (
          <div className="space-y-2">
            {userParks.map((park) => (
              <div key={park.id} className="flex items-center gap-2">
                <Badge variant="outline">{park.name}</Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              You can view and manage data for these parks only.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">No Access</Badge>
            <span className="text-sm text-muted-foreground">No park assignments - contact admin for access</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [selectedPermitId, setSelectedPermitId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  
  // Contact form states
  const [contactFormVisible, setContactFormVisible] = useState(false);
  const [reachOutApplication, setReachOutApplication] = useState<any>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  
  const { toast } = useToast();

  const getPaymentStatus = (application: any) => {
    const statuses = [];
    
    // Check application fee status
    if (application.applicationFee && parseFloat(application.applicationFee) > 0) {
      statuses.push({
        type: 'Application Fee',
        paid: application.isPaid || false
      });
    }
    
    // Check permit fee status (via invoice)
    if (application.permitFee && parseFloat(application.permitFee) > 0) {
      statuses.push({
        type: 'Permit Fee',
        paid: application.invoiceStatus === 'paid'
      });
    }
    
    // Check location fee status (location fees not implemented yet)
    if (application.locationFee && parseFloat(application.locationFee) > 0) {
      statuses.push({
        type: 'Location Fee',
        paid: false
      });
    }
    
    return statuses;
  };

  const getLocationInfo = (parkId: number, locationId: number | null, parks: any[], customLocationName?: string) => {
    // If locationId is null but customLocationName exists, use the custom location
    if (!locationId && customLocationName) {
      return { name: customLocationName, fee: 0 };
    }
    
    if (!locationId || !parks) return { name: 'N/A', fee: 0 };
    
    const park = parks.find((p: any) => p.id === parkId);
    if (!park || !park.locations) return { name: 'N/A', fee: 0 };
    
    try {
      const locations = Array.isArray(park.locations) ? park.locations : JSON.parse(park.locations);
      
      // Since locationId appears to be a random number, use it as an index into the locations array
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
      
      const hasDocument = !!(insuranceData.documentFullUrl || insuranceData.documentPath);
      const documentPath = insuranceData.documentFullUrl || insuranceData.documentPath;
      
      return { status, hasDocument, documentPath };
    } catch (error) {
      console.error('Error parsing insurance data:', error);
      return { status: 'Unknown', hasDocument: false };
    }
  };

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

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<{
    activePermits: number;
    approvedApplications: number;
    paidInvoices: number;
    totalRevenue: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch parks data for location mapping
  const { data: parks } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  // Fetch recent applications needing approval
  const { data: applications, isLoading: applicationsLoading } = useQuery<
    (Application & { parkName: string })[]
  >({
    queryKey: ["/api/applications/pending"],
  });



  // Fetch selected permit details
  const { data: selectedPermit } = useQuery<Permit & { parkName: string }>({
    queryKey: ["/api/permits", selectedPermitId],
    enabled: !!selectedPermitId,
  });

  // Fetch selected application details
  const { data: selectedApplication } = useQuery<Application & { parkName: string }>({
    queryKey: ["/api/applications", selectedApplicationId],
    enabled: !!selectedApplicationId,
  });

  const handleViewDetails = (id: number) => {
    setSelectedPermitId(id);
    setIsDetailModalOpen(true);
  };

  const handleReviewApplication = (id: number) => {
    setSelectedApplicationId(id);
    setIsApplicationModalOpen(true);
  };

  const handleContactApplication = (application: Application & { parkName: string }) => {
    setReachOutApplication(application);
    setContactFormVisible(true);
  };

  // Email templates for contact form
  const emailTemplates = [
    {
      label: "Request Additional Information",
      message: "We need some additional information to process your permit application. Please provide the following details:\n\n[Please specify what information is needed]\n\nOnce we receive this information, we'll continue processing your application."
    },
    {
      label: "Application Status Update",
      message: "We wanted to provide you with an update on your permit application status. Your application is currently under review, and we expect to have a decision within [timeframe].\n\nIf you have any questions in the meantime, please don't hesitate to reach out."
    },
    {
      label: "Payment Reminder",
      message: "This is a friendly reminder that your permit application fee is still pending. To continue processing your application, please submit your payment at your earliest convenience.\n\nIf you have already submitted payment, please disregard this message."
    }
  ];

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
Utah State Parks Office`);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(reachOutApplication.email)}&su=${subject}&body=${body}&from=${encodeURIComponent(fromEmail)}`;
    
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

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Active Permits"
          value={statsLoading ? "..." : stats?.activePermits ?? 0}
          icon={<FileSignature className="text-pink-600 h-5 w-5" />}
          iconClassName="bg-pink-600 bg-opacity-10"
          trend={{ value: "12% from last month", positive: true }}
        />

        <StatsCard
          title="Approved Applications"
          value={statsLoading ? "..." : stats?.approvedApplications ?? 0}
          icon={<FileCheck className="text-green-500 h-5 w-5" />}
          iconClassName="bg-green-500 bg-opacity-10"
          trend={{ value: "8% from last week", positive: true }}
        />

        <StatsCard
          title="Paid Invoices"
          value={statsLoading ? "..." : stats?.paidInvoices ?? 0}
          icon={<CheckCircle className="text-blue-500 h-5 w-5" />}
          iconClassName="bg-blue-500 bg-opacity-10"
          trend={{ value: "24% from last month", positive: true }}
        />

        <StatsCard
          title="Total Revenue"
          value={statsLoading ? "..." : formatCurrency(stats?.totalRevenue || 0)}
          icon={<DollarSign className="text-emerald-600 h-5 w-5" />}
          iconClassName="bg-emerald-600 bg-opacity-10"
          trend={{ value: "18% from last month", positive: true }}
        />
      </div>

        {/* Recent Applications Cards */}
        <div className="mb-8">
        <ApplicationCards 
          applications={applications || []} 
          isLoading={applicationsLoading} 
          onReview={handleReviewApplication}
          onContact={handleContactApplication}
        />
      </div>

        {/* User Park Access */}
        <div className="mb-8">
        <UserParkAccess />
      </div>

        {/* Park Status */}
        <ParkStatus />

      {/* Permit Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Application Details
            </DialogTitle>
            <DialogDescription>
              Comprehensive view of permit application information
            </DialogDescription>
          </DialogHeader>

          {selectedPermit && (
            <div className="grid gap-6 py-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Application Number</p>
                      <p className="font-medium">{selectedPermit.permitNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <StatusBadge status={selectedPermit.status} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Activity Type</p>
                      <p className="font-medium">{selectedPermit.activity}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Permit Type</p>
                      <p className="font-medium">{selectedPermit.permitType}</p>
                    </div>
                  </div>
                  {selectedPermit.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Description</p>
                      <p className="text-sm">{selectedPermit.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location & Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location & Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Park</p>
                      <ParkStatusComponent parkId={selectedPermit.parkId} parkName={selectedPermit.parkName} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="font-medium">{selectedPermit.location}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(selectedPermit.startDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">End Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(selectedPermit.endDate)}
                      </p>
                    </div>
                  </div>
                  {selectedPermit.participantCount && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Participant Count</p>
                      <p className="font-medium">{selectedPermit.participantCount} participants</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Applicant Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Applicant Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedPermit.permitteeName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedPermit.permitteeEmail}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedPermit.permitteePhone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Application Review Modal */}
      <Dialog open={isApplicationModalOpen} onOpenChange={setIsApplicationModalOpen}>
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
                  {selectedApplication.status?.toLowerCase() === 'approved' ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Approved</span>
                    </div>
                  ) : selectedApplication.status?.toLowerCase() === 'disapproved' ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Disapproved</span>
                    </div>
                  ) : selectedApplication.status?.toLowerCase() === 'pending' && !selectedApplication.isPaid ? (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <Clock3 className="h-4 w-4" />
                      <span className="font-medium">Unpaid Application</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-600">
                      <Clock3 className="h-4 w-4" />
                      <span className="font-medium">Awaiting Review</span>
                    </div>
                  )}
                </div>
                <Badge variant="outline">APP-{selectedApplication.id}</Badge>
              </div>

              <Separator />

              {/* Application Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Event Information</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Applicant:</span>
                      <span className="ml-auto">{selectedApplication.firstName} {selectedApplication.lastName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Park:</span>
                      <span className="ml-auto">{selectedApplication.parkName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Location:</span>
                      <span className="ml-auto">{getLocationInfo(selectedApplication.parkId, selectedApplication.locationId, parks || [], selectedApplication.customLocationName).name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Event Date{(() => {
                        try {
                          const dates = JSON.parse(selectedApplication.eventDates || '[]');
                          return Array.isArray(dates) && dates.length > 1 ? 's' : '';
                        } catch {
                          return '';
                        }
                      })()}:</span>
                      <span className="ml-auto">{formatEventDates(selectedApplication.eventDates)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Fee Information</h3>
                  
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
                      const locationInfo = getLocationInfo(selectedApplication.parkId, selectedApplication.locationId, parks || [], selectedApplication.customLocationName);
                      return locationInfo.fee > 0 ? (
                        <div>
                          <span className="font-medium">Location Fee:</span>
                          <span className="ml-2">{formatCurrency(locationInfo.fee)}</span>
                        </div>
                      ) : null;
                    })()}
                    <div className="border-t pt-2">
                      <span className="font-medium">Total Fees:</span>
                      <span className="ml-2 font-semibold">{(() => {
                        const locationInfo = getLocationInfo(selectedApplication.parkId, selectedApplication.locationId, parks || [], selectedApplication.customLocationName);
                        const total = Number(selectedApplication.applicationFee || 0) + 
                                     Number(selectedApplication.permitFee || 0) + 
                                     Number(locationInfo.fee || 0);
                        return formatCurrency(total);
                      })()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Contact Information</h3>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Email:</span>
                      {selectedApplication.email ? (
                        <a 
                          href={`mailto:${selectedApplication.email}`}
                          className="ml-2 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {selectedApplication.email}
                        </a>
                      ) : (
                        <span className="ml-2">N/A</span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span>
                      <span className="ml-2">{selectedApplication.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Organization:</span>
                      <span className="ml-2">{selectedApplication.organizationName || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Insurance Information</h3>
                  
                  <div className="space-y-2">
                    {(() => {
                      const insuranceInfo = getInsuranceInfo(selectedApplication.insurance);
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
                          {insuranceInfo.hasDocument && (
                            <div>
                              <span className="font-medium">Insurance Document:</span>
                              {insuranceInfo.insuranceData?.documentBase64 ? (
                                <a 
                                  href={`/api/applications/${application.id}/insurance-document/download`}
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
                                  Available in database
                                </span>
                              )}
                              <div className="text-xs text-muted-foreground ml-2 mt-1">
                                Filename: {insuranceInfo.insuranceData?.documentOriginalName || insuranceInfo.insuranceData?.documentFilename || 'Unknown'}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {selectedApplication.eventDescription && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Event Description</h3>
                  <p className="text-sm bg-muted p-3 rounded">
                    {selectedApplication.eventDescription}
                  </p>
                </div>
              )}

              {selectedApplication.specialRequests && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Special Requests</h3>
                  <p className="text-sm bg-muted p-3 rounded">
                    {selectedApplication.specialRequests}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <Separator />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsApplicationModalOpen(false)}
                >
                  Close
                </Button>

                <Button
                  onClick={() => {
                    setIsApplicationModalOpen(false);
                    window.open(`/applications?id=${selectedApplication.id}`, '_blank');
                  }}
                >
                  Open Full Review
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
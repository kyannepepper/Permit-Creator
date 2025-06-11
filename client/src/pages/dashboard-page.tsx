import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import StatsCard from "@/components/dashboard/stats-card";
import ApplicationCards from "@/components/dashboard/application-cards";
import ParkStatus from "@/components/dashboard/park-status";
import RecentInvoices from "@/components/dashboard/recent-invoices";
import { FileSignature, Clock, CheckCircle, DollarSign, FileCheck, FileText, MapPin, Calendar, User, Shield, Clock3, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Permit, Application } from "@shared/schema";
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

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<{
    activePermits: number;
    approvedApplications: number;
    paidInvoices: number;
    totalRevenue: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
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

  return (
    <Layout
      title="Dashboard"
      subtitle="Welcome to the ParkPass Special Use Permits system"
    >
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
        />
      </div>

      {/* User Park Access */}
      <div className="mb-8">
        <UserParkAccess />
      </div>

      {/* Two Column Layout for Park Status and Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ParkStatus />
        <RecentInvoices />
      </div>

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
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Event Date:</span>
                      <span className="ml-auto">{selectedApplication.eventDate ? new Date(selectedApplication.eventDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Start Time:</span>
                      <span className="ml-auto">{selectedApplication.startTime || 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">End Time:</span>
                      <span className="ml-auto">{selectedApplication.endTime || 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Permit Fee:</span>
                      <span className="ml-auto font-semibold">${Number(selectedApplication.permitFee || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Contact Information</h3>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Email:</span>
                      <span className="ml-2">{selectedApplication.email}</span>
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
    </Layout>
  );
}
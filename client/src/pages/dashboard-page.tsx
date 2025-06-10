import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import StatsCard from "@/components/dashboard/stats-card";
import ApplicationTable from "@/components/dashboard/application-table";
import ParkStatus from "@/components/dashboard/park-status";
import RecentInvoices from "@/components/dashboard/recent-invoices";
import { FileSignature, Clock, CheckCircle, DollarSign, FileCheck, FileText, MapPin, Calendar, User, Shield } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Permit } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/ui/status-badge";
import ParkStatusComponent from "@/components/permit/park-status";

export default function DashboardPage() {
  const [selectedPermitId, setSelectedPermitId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch recent applications needing approval
  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/applications/pending"],
  });

  // Fetch selected permit details
  const { data: selectedPermit } = useQuery<Permit & { parkName: string }>({
    queryKey: ["/api/permits", selectedPermitId],
    enabled: !!selectedPermitId,
  });

  const handleViewDetails = (id: number) => {
    setSelectedPermitId(id);
    setIsDetailModalOpen(true);
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
          value={statsLoading ? "..." : stats?.activePermits}
          icon={<FileSignature className="text-pink-600 h-5 w-5" />}
          iconClassName="bg-pink-600 bg-opacity-10"
          trend={{ value: "12% from last month", positive: true }}
        />

        <StatsCard
          title="Approved Applications"
          value={statsLoading ? "..." : stats?.approvedApplications}
          icon={<FileCheck className="text-green-500 h-5 w-5" />}
          iconClassName="bg-green-500 bg-opacity-10"
          trend={{ value: "8% from last week", positive: true }}
        />

        <StatsCard
          title="Paid Invoices"
          value={statsLoading ? "..." : stats?.paidInvoices}
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

      {/* Recent Applications Table */}
      <div className="mb-8">
        <PermitTable 
          permits={applications || []} 
          isLoading={applicationsLoading} 
          onViewDetails={handleViewDetails}
        />
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
    </Layout>
  );
}
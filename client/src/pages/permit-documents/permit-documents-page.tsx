import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, CheckCircle, Clock3 } from "lucide-react";
import { Link } from "wouter";

type Application = {
  id: number;
  applicationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  eventTitle: string;
  eventDate: string;
  parkId: number;
  status: string;
  isPaid: boolean;
  applicationFee: string;
  permitFee: string;
  locationFee: string;
  invoiceStatus?: string;
  locationFeePaid?: boolean;
  parkName: string;
};

export default function PermitDocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPark, setFilterPark] = useState("all");

  // Fetch applications that are approved and fully paid
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications/approved-with-invoices"],
  });

  const { data: parks = [] } = useQuery({
    queryKey: ["/api/parks"],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
  });

  // Get payment status for an application
  const getPaymentStatus = (application: Application) => {
    const statuses = [];
    
    if (application.applicationFee && parseFloat(application.applicationFee) > 0) {
      statuses.push({
        type: 'Application Fee',
        paid: application.isPaid || false
      });
    }
    
    if (application.permitFee && parseFloat(application.permitFee) > 0) {
      statuses.push({
        type: 'Permit Fee',
        paid: application.invoiceStatus === 'paid'
      });
    }
    
    if (application.locationFee && parseFloat(application.locationFee) > 0) {
      statuses.push({
        type: 'Location Fee',
        paid: application.locationFeePaid || false
      });
    }
    
    return statuses;
  };

  const isFullyPaid = (application: Application) => {
    const paymentStatuses = getPaymentStatus(application);
    return paymentStatuses.length > 0 && paymentStatuses.every(status => status.paid);
  };

  // Filter applications to only show approved and fully paid ones
  const eligibleApplications = applications.filter(app => 
    app.status.toLowerCase() === 'approved' && isFullyPaid(app)
  );

  // Filter based on search and park selection
  const filteredApplications = eligibleApplications.filter((application) => {
    const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
    
    const matchesSearch = 
      application.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.applicationNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPark = filterPark === "all" || application.parkId.toString() === filterPark;
    
    return matchesSearch && matchesPark;
  });

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

  return (
    <Layout title="Permit Documents">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Permit Documents</h1>
            <p className="text-muted-foreground">
              Generate permit documents for approved and fully paid applications
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Ready for Permit Generation</p>
                <p className="text-sm text-blue-700">
                  Only applications that are approved and have all payments completed are eligible for permit document generation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
          {applicationsLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading applications...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No applications ready for permit generation</p>
                  <p className="text-sm text-muted-foreground">
                    Applications must be approved and fully paid to generate permit documents.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((application) => {
              const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
              
              return (
                <Card 
                  key={application.id} 
                  className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="text-lg font-semibold">{application.eventTitle}</h3>
                          <Badge className="bg-green-200 text-green-800 hover:bg-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            FULLY PAID
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Applicant</p>
                            <p className="font-medium">{applicantName}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Park</p>
                            <p className="font-medium">{application.parkName}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Event Date</p>
                            <p className="font-medium">{formatDate(application.eventDate)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Application #</p>
                            <p className="font-medium">{application.applicationNumber}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Link href={`/permit-documents/create/${application.id}`}>
                          <Button className="w-full lg:w-auto">
                            <FileText className="h-4 w-4 mr-2" />
                            Create Permit Document
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Summary */}
        {!applicationsLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground">
                Showing {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''} ready for permit generation
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
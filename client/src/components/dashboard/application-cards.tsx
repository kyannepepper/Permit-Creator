import { Application } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { User, MapPin, Calendar, DollarSign, CheckCircle, Clock3, XCircle, ArrowRight, Mail } from "lucide-react";

type ApplicationCardsProps = {
  applications: (Application & { parkName: string })[];
  isLoading: boolean;
  onReview?: (applicationId: number) => void;
  onContact?: (application: Application & { parkName: string }) => void;
};

export default function ApplicationCards({ applications, isLoading, onReview, onContact }: ApplicationCardsProps) {
  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  const calculatePaidAmount = (application: any) => {
    let totalPaid = 0;
    
    // Check if application fee is paid
    if (application.isPaid && application.applicationFee) {
      const appFee = typeof application.applicationFee === 'string' 
        ? parseFloat(application.applicationFee) 
        : application.applicationFee;
      totalPaid += appFee;
    }
    
    // Check if permit fee is paid (via invoice status)
    if (application.permitFeePaymentStatus === 'paid' && application.permitFee) {
      const permitFee = typeof application.permitFee === 'string' 
        ? parseFloat(application.permitFee) 
        : application.permitFee;
      totalPaid += permitFee;
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-neutral-light">
          <h3 className="text-lg font-semibold">Applications Needing Approval</h3>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Limit to first 3 applications
  const displayApplications = applications.slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-neutral-light flex justify-between items-center">
        <h3 className="text-lg font-semibold">Applications Needing Approval</h3>
        <Link href="/applications">
          <Button variant="outline" size="sm" className="gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      
      <div className="p-6 space-y-4">
        {displayApplications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-medium">No pending applications found</p>
          </div>
        ) : (
          displayApplications.map((application) => {
            const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
            const isApproved = application.status.toLowerCase() === 'approved';
            const isDisapproved = application.status.toLowerCase() === 'disapproved';
            const isPending = application.status.toLowerCase() === 'pending';
            const isUnpaid = isPending && !application.isPaid;
            const isPaidPending = isPending && application.isPaid;
            
            return (
              <Card 
                key={application.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  isApproved ? 'border-green-200 bg-green-50/30' : 
                  isDisapproved ? 'border-red-200 bg-red-50/30' :
                  isUnpaid ? 'border-yellow-200 bg-yellow-50/30' : ''
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {application.eventTitle && (
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-semibold">{application.eventTitle}</h4>
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
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{applicantName || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{application.parkName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(application.eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{formatCurrency(calculatePaidAmount(application))}</span>
                        </div>
                      </div>
                      
                      {application.eventDescription && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          <strong>Description:</strong> {application.eventDescription}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Contact button - always available */}
                      {onContact && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onContact(application)}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Contact
                        </Button>
                      )}
                      
                      {/* Review button */}
                      {onReview ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onReview(application.id)}
                        >
                          Review
                        </Button>
                      ) : (
                        <Link href={`/applications?id=${application.id}`}>
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
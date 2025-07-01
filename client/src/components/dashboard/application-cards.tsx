import { Application, Permit, Invoice } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { User, MapPin, Calendar, DollarSign, CheckCircle, Clock3, XCircle, ArrowRight, Mail } from "lucide-react";

type ApplicationCardsProps = {
  applications: (Application & { 
    parkName: string;
    hasInvoice?: boolean;
    invoiceStatus?: string;
    invoiceAmount?: number | null;
    permitId?: number | null;
  })[];
  permits?: Permit[];
  invoices?: Invoice[];
  isLoading: boolean;
  onReview?: (applicationId: number) => void;
  onContact?: (application: Application & { parkName: string }) => void;
};

export default function ApplicationCards({ applications, permits, invoices, isLoading, onReview, onContact }: ApplicationCardsProps) {
  const [, navigate] = useLocation();
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

  const isFullyPaid = (application: any) => {
    const paymentStatuses = getPaymentStatus(application);
    return paymentStatuses.length > 0 && paymentStatuses.every(status => status.paid);
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
  }

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
          displayApplications.filter(app => {
            // Filter out unpaid applications from dashboard
            const isPending = app.status.toLowerCase() === 'pending';
            const isUnpaid = isPending && !app.isPaid;
            return !isUnpaid;
          }).map((application) => {
            const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
            const isApproved = application.status.toLowerCase() === 'approved';
            const isDisapproved = application.status.toLowerCase() === 'disapproved';
            const isPending = application.status.toLowerCase() === 'pending';
            const isUnpaid = isPending && !application.isPaid;
            const isPaidPending = isPending && application.isPaid;
            const fullyPaid = isFullyPaid(application);
            
            return (
              <Card 
                key={application.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  fullyPaid ? 'border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg' :
                  isApproved ? 'border-green-200 bg-green-50/30' : 
                  isDisapproved ? 'border-red-200 bg-red-50/30' :
                  isUnpaid ? 'border-yellow-200 bg-yellow-50/30' : ''
                }`}
                onClick={() => {
                  // Navigate to applications page with this application selected
                  navigate(`/applications?selected=${application.id}`);
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {application.eventTitle && (
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-semibold">{application.eventTitle}</h4>
                            <span className="text-sm text-muted-foreground font-medium">
                              {formatEventDates(application.eventDates)}
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
                        {/* Show invoice status for approved applications */}
                        {fullyPaid && (
                          <div className="flex items-center gap-1 text-green-700 bg-green-200 px-2 py-1 rounded-full">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-bold">FULLY PAID</span>
                          </div>
                        )}
                        {!fullyPaid && isApproved && application.hasInvoice && application.invoiceStatus === 'paid' && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Invoice Paid</span>
                          </div>
                        )}
                        {isApproved && application.hasInvoice && application.invoiceStatus === 'pending' && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Clock3 className="h-4 w-4" />
                            <span className="text-sm font-medium">Invoice Pending</span>
                          </div>
                        )}
                        {isApproved && application.hasInvoice && application.invoiceStatus !== 'paid' && application.invoiceStatus !== 'pending' && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <Clock3 className="h-4 w-4" />
                            <span className="text-sm font-medium">Payment Due</span>
                          </div>
                        )}
                        {isApproved && !application.hasInvoice && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock3 className="h-4 w-4" />
                            <span className="text-sm font-medium">Awaiting Invoice</span>
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
                      
                      {(application as any).locationName && typeof (application as any).locationName === 'string' && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          <strong>Location:</strong> {(application as any).locationName}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {/* Invoice Status Badge */}
                      {isApproved && (
                        <div className="flex justify-end">
                          {application.hasInvoice && application.invoiceStatus === 'paid' ? (
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                              Invoice Paid
                            </div>
                          ) : application.hasInvoice && application.invoiceStatus === 'pending' ? (
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium border border-blue-200">
                              Invoice Pending
                            </div>
                          ) : application.hasInvoice ? (
                            <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium border border-orange-200">
                              Payment Due
                            </div>
                          ) : (
                            <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                              Awaiting Invoice
                            </div>
                          )}
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
    </div>
  );
}
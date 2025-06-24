import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Invoice, Application } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Search, Eye, Calendar, DollarSign, User, Mail, Phone, CheckCircle, Clock3, CreditCard, MoreVertical, MessageCircle, Trash2 } from "lucide-react";

export default function InvoicePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPark, setFilterPark] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const { toast } = useToast();

  // Fetch parks for filter dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  // Fetch approved applications
  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  // Fetch invoices
  const { data: invoices = [], isLoading, error } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  // Create approved applications with invoice status
  const approvedApplications = useMemo(() => {
    return applications
      .filter(app => app.status === 'approved')
      .map(application => {
        const relatedInvoice = invoices.find(invoice => invoice.permitId === application.id);
        const park = parks.find(p => p.id === application.parkId);
        
        return {
          ...application,
          parkName: park?.name || 'Unknown Park',
          hasInvoice: !!relatedInvoice,
          invoiceStatus: relatedInvoice?.status || null,
          invoiceAmount: relatedInvoice?.amount || null,
          invoiceNumber: relatedInvoice?.invoiceNumber || null,
          invoiceId: relatedInvoice?.id || null
        };
      });
  }, [applications, invoices, parks]);

  // Mark invoice as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, {
        status: 'paid'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Invoice Paid",
        description: "The invoice has been marked as paid.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Layout title="Invoices">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invoices...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Invoices">
        <div className="text-center py-8">
          <p className="text-destructive">Failed to load invoices. Please try again.</p>
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
    return `$${(num / 100).toFixed(2)}`;
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

  // Filter approved applications based on search and filter criteria
  const filteredApplications = approvedApplications.filter((application) => {
    const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
    
    const matchesSearch = !searchTerm || 
      applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (application.invoiceNumber && application.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "paid" && application.invoiceStatus === "paid") ||
      (filterStatus === "pending" && (!application.hasInvoice || application.invoiceStatus === "pending")) ||
      (filterStatus === "unpaid" && application.hasInvoice && application.invoiceStatus !== "paid");
    const matchesPark = filterPark === "all" || (application && application.parkId.toString() === filterPark);
    
    return matchesSearch && matchesStatus && matchesPark;
  });

  // Get unique statuses for filter
  const uniqueStatuses = ["paid", "pending", "unpaid"];

  const handleMarkPaid = (invoiceId: number) => {
    markPaidMutation.mutate(invoiceId);
  };

  return (
    <Layout title="Invoices">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">
              View and manage permit fee invoices
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
                    placeholder="Search invoices..."
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

        {/* Approved Applications with Invoice Status */}
        <div className="grid gap-6">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No approved applications found matching your criteria.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((application) => {
              const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
              const isPaid = application.invoiceStatus === 'paid';
              const hasInvoice = application.hasInvoice;
              const isPending = !hasInvoice || application.invoiceStatus === 'pending';

              // Check if application is fully paid (all fees)
              const getPaymentStatus = (app: any) => {
                const statuses = [];
                
                if (app.applicationFee && parseFloat(app.applicationFee) > 0) {
                  statuses.push({
                    type: 'Application Fee',
                    paid: app.isPaid || false
                  });
                }
                
                if (app.permitFee && parseFloat(app.permitFee) > 0) {
                  statuses.push({
                    type: 'Permit Fee',
                    paid: app.invoiceStatus === 'paid'
                  });
                }
                
                if (app.locationFee && parseFloat(app.locationFee) > 0) {
                  statuses.push({
                    type: 'Location Fee',
                    paid: app.locationFeePaid || false
                  });
                }
                
                return statuses;
              };

              const paymentStatuses = getPaymentStatus(application);
              const fullyPaid = paymentStatuses.length > 0 && paymentStatuses.every(status => status.paid);
              
              return (
                <Card 
                  key={application.id} 
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    fullyPaid ? 'border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg' :
                    isPaid ? 'border-green-200 bg-green-50/30' : 
                    isPending ? 'border-blue-200 bg-blue-50/30' : 
                    'border-orange-200 bg-orange-50/30'
                  }`}
                  onClick={() => setSelectedInvoice(application)}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {application?.eventTitle && (
                            <h3 className="text-lg font-semibold">{application.eventTitle}</h3>
                          )}
                          {fullyPaid ? (
                            <div className="flex items-center gap-1 text-green-700 bg-green-200 px-3 py-1 rounded-full">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-bold">FULLY PAID</span>
                            </div>
                          ) : isPaid ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">Invoice Paid</span>
                            </div>
                          ) : isPending ? (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Clock3 className="h-4 w-4" />
                              <span className="text-sm font-medium">Invoice Pending</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-orange-600">
                              <Clock3 className="h-4 w-4" />
                              <span className="text-sm font-medium">Payment Due</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{applicantName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`mailto:${application.email}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {application.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{application.applicationNumber || `#${application.id}`}</span>
                          </div>
                          {application.invoiceNumber && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">#{application.invoiceNumber}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p><strong>Park:</strong> {application.parkName}</p>
                          {(application as any).locationName && (
                            <p><strong>Location:</strong> {(application as any).locationName}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedInvoice(application)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>

                            {hasInvoice && !isPaid && application.invoiceId && (
                              <DropdownMenuItem 
                                onClick={() => handleMarkPaid(application.invoiceId as number)}
                                disabled={markPaidMutation.isPending}
                                className="text-green-600"
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Mark Paid
                              </DropdownMenuItem>
                            )}
                            {isPaid && (
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Dialog open={selectedInvoice?.id === application.id} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
                          <DialogTrigger asChild>
                            <div></div>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Invoice Details - {selectedInvoice?.eventTitle || 'Invoice'}
                              </DialogTitle>
                            </DialogHeader>
                            
                            {selectedInvoice && (
                              <div className="space-y-6">
                                {/* Status and Basic Info */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    {selectedInvoice.invoiceStatus === 'paid' ? (
                                      <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-medium">Paid</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-orange-600">
                                        <Clock3 className="h-5 w-5" />
                                        <span className="font-medium">Payment Due</span>
                                      </div>
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                      Invoice #{selectedInvoice.invoiceNumber || 'N/A'}
                                    </span>
                                  </div>
                                  {selectedInvoice.invoiceStatus !== 'paid' && selectedInvoice.invoiceId && (
                                    <Button
                                      onClick={() => handleMarkPaid(selectedInvoice.invoiceId)}
                                      disabled={markPaidMutation.isPending}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {markPaidMutation.isPending ? (
                                        <>
                                          <Clock3 className="h-4 w-4 mr-2 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <CreditCard className="h-4 w-4 mr-2" />
                                          Mark as Paid
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>

                                {/* Invoice Information */}
                                {selectedInvoice.hasInvoice && (
                                  <div>
                                    <h3 className="text-lg font-semibold mb-3">Invoice Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Amount:</span>
                                        <span className="font-semibold text-lg">{formatCurrency(selectedInvoice.invoiceAmount)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Status:</span>
                                        <Badge variant={selectedInvoice.invoiceStatus === 'paid' ? 'default' : 'secondary'}>
                                          {selectedInvoice.invoiceStatus}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Invoice #:</span>
                                        <span>{selectedInvoice.invoiceNumber}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <Separator />
                                {/* Applicant Information */}
                                <div>
                                  <h3 className="text-lg font-semibold mb-3">Applicant Information</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Name:</span>
                                        <span>{`${selectedInvoice.firstName || ''} ${selectedInvoice.lastName || ''}`.trim() || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Email:</span>
                                        <span>{selectedInvoice.email || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Phone:</span>
                                        <span>{selectedInvoice.phone || 'N/A'}</span>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div>
                                        <span className="font-medium">Event:</span>
                                        <span className="ml-2">{selectedInvoice.eventTitle || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium">Park:</span>
                                        <span className="ml-2">{selectedInvoice.parkName}</span>
                                      </div>
                                      {(selectedInvoice as any).locationName && (
                                        <div>
                                          <span className="font-medium">Location:</span>
                                          <span className="ml-2">{(selectedInvoice as any).locationName}</span>
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-medium">Event Date:</span>
                                        <span className="ml-2">{formatDate(selectedInvoice.eventDate)}</span>
                                      </div>
                                      {selectedInvoice.attendees && (
                                        <div>
                                          <span className="font-medium">Attendees:</span>
                                          <span className="ml-2">{selectedInvoice.attendees}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
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
import { useState } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Calendar, DollarSign, User, Mail, Phone, CheckCircle, Clock3, CreditCard } from "lucide-react";

export default function InvoicePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPark, setFilterPark] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const { toast } = useToast();

  // Fetch approved applications with invoice status
  const { data: approvedApplications = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/applications/approved-with-invoices"],
  });

  // Fetch parks for filter dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  // Mark invoice as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, {
        status: 'paid'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/approved-with-invoices"] });
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
  const uniqueStatuses = Array.from(new Set(invoices.map(invoice => invoice.status)));

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
              
              return (
                <Card key={application.id} className={`hover:shadow-lg transition-shadow ${isPaid ? 'border-green-200 bg-green-50/30' : isPending ? 'border-blue-200 bg-blue-50/30' : 'border-orange-200 bg-orange-50/30'}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {application?.eventTitle && (
                            <h3 className="text-lg font-semibold">{application.eventTitle}</h3>
                          )}
                          {isPaid ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">Paid</span>
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
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Due: {formatDate(invoice.dueDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">#{invoice.invoiceNumber}</span>
                          </div>
                        </div>
                        
                        {application && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            <strong>Park:</strong> {getParkName(application.parkId)}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {!isPaid && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaid(invoice.id)}
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
                                Mark Paid
                              </>
                            )}
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedInvoice({ ...invoice, application })}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Invoice Details - {selectedInvoice?.application?.eventTitle || 'Invoice'}
                              </DialogTitle>
                            </DialogHeader>
                            
                            {selectedInvoice && (
                              <div className="space-y-6">
                                {/* Status and Basic Info */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    {selectedInvoice.status.toLowerCase() === 'paid' ? (
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
                                      Invoice #{selectedInvoice.invoiceNumber}
                                    </span>
                                  </div>
                                  {selectedInvoice.status.toLowerCase() !== 'paid' && (
                                    <Button
                                      onClick={() => handleMarkPaid(selectedInvoice.id)}
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
                                <div>
                                  <h3 className="text-lg font-semibold mb-3">Invoice Information</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">Amount:</span>
                                      <span className="font-semibold text-lg">{formatCurrency(selectedInvoice.amount)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">Issue Date:</span>
                                      <span>{formatDate(selectedInvoice.issueDate)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">Due Date:</span>
                                      <span>{formatDate(selectedInvoice.dueDate)}</span>
                                    </div>
                                  </div>
                                </div>

                                {selectedInvoice.application && (
                                  <>
                                    <Separator />
                                    {/* Applicant Information */}
                                    <div>
                                      <h3 className="text-lg font-semibold mb-3">Applicant Information</h3>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Name:</span>
                                            <span>{`${selectedInvoice.application.firstName || ''} ${selectedInvoice.application.lastName || ''}`.trim() || 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Email:</span>
                                            <span>{selectedInvoice.application.email || 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Phone:</span>
                                            <span>{selectedInvoice.application.phone || 'N/A'}</span>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <div>
                                            <span className="font-medium">Event:</span>
                                            <span className="ml-2">{selectedInvoice.application.eventTitle || 'N/A'}</span>
                                          </div>
                                          <div>
                                            <span className="font-medium">Park:</span>
                                            <span className="ml-2">{getParkName(selectedInvoice.application.parkId)}</span>
                                          </div>
                                          <div>
                                            <span className="font-medium">Event Date:</span>
                                            <span className="ml-2">{formatDate(selectedInvoice.application.eventDate)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
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
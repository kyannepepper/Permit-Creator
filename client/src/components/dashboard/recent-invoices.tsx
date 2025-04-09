import { useQuery } from "@tanstack/react-query";
import { Invoice } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";

type RecentInvoicesProps = {
  className?: string;
};

type InvoiceWithDetails = Invoice & {
  permitteeName: string;
};

export default function RecentInvoices({ className }: RecentInvoicesProps) {
  const { data: invoices, isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices/recent"],
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "text-green-500";
      case "pending":
        return "text-yellow-500";
      case "cancelled":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2 flex justify-between items-center">
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center pb-3">
                <div>
                  <div className="h-5 bg-gray-300 rounded w-24 mb-1"></div>
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                </div>
                <div className="text-right">
                  <div className="h-5 bg-gray-300 rounded w-16 mb-1"></div>
                  <div className="h-4 bg-gray-300 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2 flex justify-between items-center">
        <CardTitle>Recent Invoices</CardTitle>
        <Link href="/invoices">
          <a className="text-primary hover:text-primary-dark text-sm">View All</a>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoices?.length === 0 ? (
            <p className="text-neutral-medium text-center py-4">No invoices found</p>
          ) : (
            invoices?.map((invoice) => (
              <div 
                key={invoice.id} 
                className="flex justify-between items-center border-b border-neutral-light pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-neutral-medium">{invoice.permitteeName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                  <p className={`text-sm ${getStatusColor(invoice.status)}`}>{invoice.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

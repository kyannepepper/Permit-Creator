import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import StatsCard from "@/components/dashboard/stats-card";
import PermitTable from "@/components/dashboard/permit-table";
import ParkStatus from "@/components/dashboard/park-status";
import RecentInvoices from "@/components/dashboard/recent-invoices";
import { ThumbsUp, Clock, CheckCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });
  
  // Fetch recent permits
  const { data: permits, isLoading: permitsLoading } = useQuery({
    queryKey: ["/api/permits/recent"],
  });
  
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
          icon={<ThumbsUp className="text-red-700 h-5 w-5" />}
          trend={{ value: "12% from last month", positive: true }}
        />
        
        <StatsCard
          title="Pending Review"
          value={statsLoading ? "..." : stats?.pendingPermits}
          icon={<Clock className="text-yellow-500 h-5 w-5" />}
          iconClassName="bg-yellow-500 bg-opacity-10"
          trend={{ value: "8% from last week", positive: false }}
        />
        
        <StatsCard
          title="Completed Permits"
          value={statsLoading ? "..." : stats?.completedPermits}
          icon={<CheckCircle className="text-green-500 h-5 w-5" />}
          iconClassName="bg-green-500 bg-opacity-10"
          trend={{ value: "24% from last month", positive: true }}
        />
        
        <StatsCard
          title="Total Revenue"
          value={statsLoading ? "..." : formatCurrency(stats?.totalRevenue || 0)}
          icon={<DollarSign className="text-blue-500 h-5 w-5" />}
          iconClassName="bg-blue-500 bg-opacity-10"
          trend={{ value: "18% from last month", positive: true }}
        />
      </div>
      
      {/* Recent Permits Table */}
      <div className="mb-8">
        <PermitTable permits={permits || []} isLoading={permitsLoading} />
      </div>
      
      {/* Two Column Layout for Park Status and Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ParkStatus />
        <RecentInvoices />
      </div>
    </Layout>
  );
}

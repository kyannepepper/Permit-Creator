import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BarChart, LineChart, PieChart, DownloadIcon, Calendar as CalendarIcon } from "lucide-react";
import { Park, Permit, Invoice } from "@shared/schema";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart as ReLineChart,
  Line,
} from "recharts";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("permits");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    to: new Date(),
  });
  const [selectedParkId, setSelectedParkId] = useState<string>("");
  
  // Fetch all parks
  const { data: parks } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });
  
  // Fetch all permits
  const { data: permits } = useQuery<(Permit & { parkName: string })[]>({
    queryKey: ["/api/permits"],
  });
  
  // Fetch all invoices
  const { data: invoices } = useQuery<(Invoice & { permitteeName: string, permitNumber: string })[]>({
    queryKey: ["/api/invoices"],
  });
  
  // Filter data based on selected date range and park
  const filteredPermits = permits?.filter(permit => {
    const permitDate = new Date(permit.createdAt);
    const isInDateRange = 
      (!dateRange.from || permitDate >= dateRange.from) && 
      (!dateRange.to || permitDate <= dateRange.to);
    
    const isInSelectedPark = !selectedParkId || permit.parkId.toString() === selectedParkId;
    
    return isInDateRange && isInSelectedPark;
  }) || [];
  
  const filteredInvoices = invoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.issueDate);
    const isInDateRange = 
      (!dateRange.from || invoiceDate >= dateRange.from) && 
      (!dateRange.to || invoiceDate <= dateRange.to);
    
    // Find the associated permit to check park
    const permit = permits?.find(p => p.id === invoice.permitId);
    const isInSelectedPark = !selectedParkId || (permit && permit.parkId.toString() === selectedParkId);
    
    return isInDateRange && isInSelectedPark;
  }) || [];
  
  // Prepare data for charts
  const permitsByStatus = countByProperty(filteredPermits, 'status');
  const permitsByPark = countByProperty(filteredPermits, 'parkName');
  const permitsByActivity = countByProperty(filteredPermits, 'activity');
  
  const invoicesByStatus = countByProperty(filteredInvoices, 'status');
  const revenueByPark = permits && invoices ? calculateRevenueByPark(filteredInvoices, permits) : [];
  
  const chartColors = [
    "#1E88E5", "#FFC107", "#00E676", "#FF5252", "#673AB7",
    "#2196F3", "#FF9800", "#009688", "#E91E63", "#607D8B"
  ];
  
  const statusColors: Record<string, string> = {
    approved: "#4CAF50",
    pending: "#FFC107",
    rejected: "#F44336",
    cancelled: "#F44336",
    completed: "#2196F3",
    paid: "#4CAF50",
    unpaid: "#F44336"
  };
  
  const handleExportCSV = () => {
    let csvContent = "";
    let headers = [];
    let data = [];
    
    if (reportType === "permits") {
      headers = ["Permit Number", "Park", "Permittee Name", "Activity", "Status", "Start Date", "End Date"];
      data = filteredPermits.map(permit => [
        permit.permitNumber,
        permit.parkName,
        permit.permitteeName,
        permit.activity,
        permit.status,
        formatDate(permit.startDate),
        formatDate(permit.endDate)
      ]);
    } else if (reportType === "invoices") {
      headers = ["Invoice Number", "Permit Number", "Permittee Name", "Amount", "Status", "Issue Date", "Due Date"];
      data = filteredInvoices.map(invoice => [
        invoice.invoiceNumber,
        invoice.permitNumber,
        invoice.permitteeName,
        formatCurrency(invoice.amount),
        invoice.status,
        formatDate(invoice.issueDate),
        formatDate(invoice.dueDate)
      ]);
    }
    
    csvContent = [
      headers.join(","),
      ...data.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportType}_report_${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Layout title="Reports" subtitle="Generate and export reports on permits and invoices">
      <div className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Report Type</label>
                <Tabs value={reportType} onValueChange={setReportType} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="permits">Permits</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
                          </>
                        ) : (
                          formatDate(dateRange.from)
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Park</label>
                <Select value={selectedParkId} onValueChange={setSelectedParkId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Parks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Parks</SelectItem>
                    {parks?.map((park) => (
                      <SelectItem key={park.id} value={park.id.toString()}>
                        {park.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleExportCSV}
                disabled={reportType === "permits" ? filteredPermits.length === 0 : filteredInvoices.length === 0}
              >
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* First Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {reportType === "permits" ? "Permits by Status" : "Invoices by Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportType === "permits" ? permitsByStatus : invoicesByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(reportType === "permits" ? permitsByStatus : invoicesByStatus).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={statusColors[entry.name.toLowerCase()] || chartColors[index % chartColors.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Second Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {reportType === "permits" ? "Permits by Park" : "Revenue by Park"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={reportType === "permits" ? permitsByPark : revenueByPark}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [
                      reportType === "permits" 
                        ? `${value} permits` 
                        : formatCurrency(value as number), 
                      reportType === "permits" ? "Count" : "Revenue"
                    ]} 
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    name={reportType === "permits" ? "Number of Permits" : "Revenue"} 
                    fill={reportType === "permits" ? "#1E88E5" : "#4CAF50"} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Third Chart (Full width) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            {reportType === "permits" ? "Permits by Activity" : "Monthly Revenue"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {reportType === "permits" ? (
                <BarChart
                  data={permitsByActivity}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} permits`, "Count"]} />
                  <Legend />
                  <Bar dataKey="value" name="Number of Permits" fill="#673AB7" />
                </BarChart>
              ) : (
                <LineChart
                  data={groupInvoicesByMonth(filteredInvoices)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), "Revenue"]} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Revenue"
                    stroke="#FF9800"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {reportType === "permits" ? "Total Permits" : "Total Invoices"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reportType === "permits" ? filteredPermits.length : filteredInvoices.length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {reportType === "permits" ? "Approved Permits" : "Total Revenue"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reportType === "permits" 
                ? filteredPermits.filter(p => p.status === "approved").length
                : formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0))
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {reportType === "permits" ? "Pending Permits" : "Paid Invoices"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reportType === "permits"
                ? filteredPermits.filter(p => p.status === "pending").length
                : filteredInvoices.filter(i => i.status === "paid").length
              }
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// Helper functions
function countByProperty<T>(items: T[], property: keyof T): { name: string, value: number }[] {
  const counts: Record<string, number> = {};
  
  items.forEach(item => {
    const key = String(item[property]);
    counts[key] = (counts[key] || 0) + 1;
  });
  
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function calculateRevenueByPark(
  invoices: (Invoice & { permitteeName: string, permitNumber: string })[], 
  permits: (Permit & { parkName: string })[]
): { name: string, value: number }[] {
  const revenueByPark: Record<string, number> = {};
  
  invoices.forEach(invoice => {
    const permit = permits.find(p => p.id === invoice.permitId);
    if (permit) {
      const parkName = permit.parkName;
      revenueByPark[parkName] = (revenueByPark[parkName] || 0) + invoice.amount;
    }
  });
  
  return Object.entries(revenueByPark).map(([name, value]) => ({ name, value }));
}

function groupInvoicesByMonth(
  invoices: (Invoice & { permitteeName: string, permitNumber: string })[]
): { name: string, value: number }[] {
  const months: Record<string, number> = {};
  
  invoices.forEach(invoice => {
    const date = new Date(invoice.issueDate);
    const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
    months[monthYear] = (months[monthYear] || 0) + invoice.amount;
  });
  
  return Object.entries(months)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const [aMonth, aYear] = a.name.split('/').map(Number);
      const [bMonth, bYear] = b.name.split('/').map(Number);
      
      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });
}

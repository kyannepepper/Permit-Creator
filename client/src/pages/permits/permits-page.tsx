import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Permit } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { DataTable } from "@/components/ui/data-table";
import StatusBadge from "@/components/ui/status-badge";
import ParkStatus from "@/components/permit/park-status";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Eye, Edit, Trash, PlusCircle, FileText, MapPin, Calendar, User, DollarSign, FileCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function PermitsPage() {
  const [permitToDelete, setPermitToDelete] = useState<number | null>(null);
  const [selectedPermitId, setSelectedPermitId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch all permits
  const { data: permits, isLoading } = useQuery<(Permit & { parkName: string })[]>({
    queryKey: ["/api/permits"],
  });

  // Fetch selected permit details
  const { data: selectedPermit } = useQuery<Permit & { parkName: string }>({
    queryKey: ["/api/permits", selectedPermitId],
    enabled: !!selectedPermitId,
  });
  
  // Delete permit mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/permits/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Permit deleted",
        description: "The permit has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting permit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setPermitToDelete(id);
  };

  const confirmDelete = () => {
    if (permitToDelete) {
      deleteMutation.mutate(permitToDelete);
      setPermitToDelete(null);
    }
  };

  const handleViewDetails = (id: number) => {
    setSelectedPermitId(id);
    setIsDetailModalOpen(true);
  };

  const columns = [
    {
      header: "Permit Number",
      accessorKey: "permitNumber",
      enableSorting: true,
    },
    {
      header: "Park",
      accessorKey: "parkName",
      enableSorting: true,
      cell: (row) => (
        <ParkStatus parkId={row.parkId} parkName={row.parkName} />
      ),
    },
    {
      header: "Permittee",
      accessorKey: "permitteeName",
      enableSorting: true,
    },
    {
      header: "Activity",
      accessorKey: "activity",
      enableSorting: true,
    },
    {
      header: "Start Date",
      accessorKey: "startDate",
      enableSorting: true,
      cell: (row: Permit) => formatDate(row.startDate),
    },
    {
      header: "End Date",
      accessorKey: "endDate",
      enableSorting: true,
      cell: (row: Permit) => formatDate(row.endDate),
    },
    {
      header: "Status",
      accessorKey: "status",
      enableSorting: true,
      cell: (row: Permit) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      accessorKey: (row: Permit) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleViewDetails(row.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/permits/edit/${row.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout title="Permits" subtitle="View and manage special use permits">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">All Permits</h3>
        </div>
        <Button asChild>
          <Link href="/permits/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Permit
          </Link>
        </Button>
      </div>
      
      <DataTable
        columns={columns}
        data={permits || []}
        searchField="permitteeName"
        isLoading={isLoading}
      />
      
      <AlertDialog open={permitToDelete !== null} onOpenChange={() => setPermitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the permit
              and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                      <p className="text-sm font-medium text-muted-foreground">Application Cost</p>
                      <p className="font-medium">${selectedPermit.applicationCost}</p>
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
                      <ParkStatus parkId={selectedPermit.parkId} parkName={selectedPermit.parkName} />
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
                    {selectedPermit.permitteeAddress && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Address</p>
                        <p className="font-medium">{selectedPermit.permitteeAddress}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Insurance Information */}
              {selectedPermit.insuranceProvider && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Insurance Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Provider</p>
                        <p className="font-medium">{selectedPermit.insuranceProvider}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Policy Number</p>
                        <p className="font-medium">{selectedPermit.insurancePolicyNumber}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Injury to One Person</p>
                        <Badge variant="outline">{selectedPermit.injuryToOnePersonAmount}</Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Injury to Multiple Persons</p>
                        <Badge variant="outline">{selectedPermit.injuryToMultiplePersonsAmount}</Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Property Damage</p>
                        <Badge variant="outline">{selectedPermit.propertyDamageAmount}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Information */}
              {(selectedPermit.notes || selectedPermit.specialRequirements) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedPermit.notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Notes</p>
                        <p className="text-sm">{selectedPermit.notes}</p>
                      </div>
                    )}
                    {selectedPermit.specialRequirements && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Special Requirements</p>
                        <p className="text-sm">{selectedPermit.specialRequirements}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

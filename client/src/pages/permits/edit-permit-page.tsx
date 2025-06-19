import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { Park, Permit } from "@shared/schema";

export default function EditPermitPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state
  const [permitType, setPermitType] = useState("");
  const [selectedParkId, setSelectedParkId] = useState("");
  const [applicationFee, setApplicationFee] = useState(0);
  const [permitFee, setPermitFee] = useState(35);
  const [refundableDeposit, setRefundableDeposit] = useState(0);
  const [maxPeople, setMaxPeople] = useState<number | undefined>(undefined);
  const [insuranceRequired, setInsuranceRequired] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState("");

  // Fetch permit data
  const { data: permit, isLoading } = useQuery<Permit>({
    queryKey: [`/api/permits/${id}`],
  });

  // Fetch parks
  const { data: parks = [] } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });

  // Set form values when permit data loads
  useEffect(() => {
    if (permit) {
      setPermitType(permit.permitType || "");
      setSelectedParkId(permit.parkId?.toString() || "");
      setApplicationFee(parseFloat(permit.applicationFee?.toString() || "0") || 0);
      setPermitFee(parseFloat(permit.permitFee?.toString() || "35") || 35);
      setRefundableDeposit(parseFloat(permit.refundableDeposit?.toString() || "0") || 0);
      setMaxPeople(permit.maxPeople || undefined);
      setInsuranceRequired(!!permit.insuranceRequired);
      setTermsAndConditions(permit.termsAndConditions || "");
    }
  }, [permit]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const processedData = {
        permitType: permitType,
        parkId: parseInt(selectedParkId),
        applicationFee: (applicationFee && !isNaN(applicationFee)) ? applicationFee.toString() : "0",
        permitFee: (permitFee && !isNaN(permitFee)) ? permitFee.toString() : "35",
        refundableDeposit: (refundableDeposit && !isNaN(refundableDeposit)) ? refundableDeposit.toString() : "0",
        maxPeople: maxPeople || null,
        insuranceRequired: insuranceRequired,
        termsAndConditions: termsAndConditions || null,
      };

      const response = await apiRequest("PATCH", `/api/permits/${id}`, processedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permit Updated",
        description: "The permit has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: [`/api/permits/${id}`] });
      setLocation("/permits");
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating permit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permitType || !selectedParkId) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <Layout title="Edit Permit" subtitle="Loading permit details...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!permit) {
    return (
      <Layout title="Edit Permit" subtitle="Permit not found">
        <div className="flex flex-col items-center justify-center h-64">
          <h3 className="text-lg font-medium mb-2">Permit not found</h3>
          <p className="text-neutral-medium mb-4">The requested permit could not be found.</p>
          <Button onClick={() => setLocation("/permits")}>Back to Permits</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Permit Template Information" subtitle="Update special use permit template">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Special Use Permit Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Special Use Permit Type</label>
              <Input
                placeholder="e.g., Wedding Photography, Commercial Filming"
                value={permitType}
                onChange={(e) => setPermitType(e.target.value)}
                required
              />
            </div>

            {/* Park */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Park</label>
              <Select value={selectedParkId} onValueChange={setSelectedParkId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a park" />
                </SelectTrigger>
                <SelectContent>
                  {parks.map((park) => (
                    <SelectItem key={park.id} value={park.id.toString()}>
                      {park.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Application Fee */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Application Fee</label>
              <Select value={applicationFee.toString()} onValueChange={(value) => setApplicationFee(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">$0</SelectItem>
                  <SelectItem value="10">$10</SelectItem>
                  <SelectItem value="50">$50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Permit Fee */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Permit Fee</label>
              <Select value={permitFee.toString()} onValueChange={(value) => setPermitFee(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="35">$35</SelectItem>
                  <SelectItem value="100">$100</SelectItem>
                  <SelectItem value="250">$250</SelectItem>
                  <SelectItem value="350">$350</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refundable Deposit */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Refundable Deposit (Optional)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={refundableDeposit}
                onChange={(e) => setRefundableDeposit(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Maximum Number of People */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Maximum Number of People (Optional)</label>
              <Input
                type="number"
                min="1"
                placeholder="No limit"
                value={maxPeople || ""}
                onChange={(e) => setMaxPeople(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            {/* Insurance Required */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="insurance"
                checked={insuranceRequired}
                onCheckedChange={(checked) => setInsuranceRequired(checked === true)}
              />
              <label htmlFor="insurance" className="text-sm font-medium">
                Insurance Required
              </label>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Terms and Conditions (Optional)</label>
              <Textarea
                placeholder="Enter specific terms and conditions for this permit type..."
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                rows={6}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/permits")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !permitType || !selectedParkId}
                className="bg-amber-700 hover:bg-amber-800 text-white"
              >
                {updateMutation.isPending ? "Updating Permit..." : "Update Permit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
}
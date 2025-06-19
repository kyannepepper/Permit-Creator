import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout/layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function EditPermitPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/permits/edit/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const permitId = match ? parseInt(params.id) : 0;
  
  // Local state for form values
  const [permitType, setPermitType] = useState("");
  const [selectedParkId, setSelectedParkId] = useState("");
  const [applicationFee, setApplicationFee] = useState(0);
  const [permitFee, setPermitFee] = useState(35);
  const [refundableDeposit, setRefundableDeposit] = useState(0);
  const [maxPeople, setMaxPeople] = useState<number | undefined>();
  const [insuranceRequired, setInsuranceRequired] = useState<string>("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  
  // Fetch permit data
  const { data: permit, isLoading: permitLoading } = useQuery<any>({
    queryKey: [`/api/permits/${permitId}`],
    enabled: !!permitId,
  });
  
  // Fetch parks for dropdown
  const { data: parks = [] } = useQuery<any[]>({
    queryKey: ["/api/parks"],
  });

  // Set form values when permit data loads
  useEffect(() => {
    if (permit) {
      setPermitType(permit.permitType || "");
      setSelectedParkId(permit.parkId?.toString() || "");
      setApplicationFee(permit.applicationFee || 0);
      setPermitFee(permit.permitFee || 35);
      setRefundableDeposit(permit.refundableDeposit || 0);
      setMaxPeople(permit.maxPeople || undefined);
      setInsuranceRequired(!permit.insuranceRequired || permit.insuranceRequired === "" ? "none" : permit.insuranceRequired);
      setTermsAndConditions(permit.termsAndConditions || "");
    }
  }, [permit]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const processedData = {
        permitType: permitType,
        parkId: parseInt(selectedParkId),
        applicationFee: applicationFee,
        permitFee: permitFee,
        refundableDeposit: refundableDeposit,
        maxPeople: maxPeople || null,
        insuranceRequired: insuranceRequired === "none" ? "" : insuranceRequired,
        termsAndConditions: termsAndConditions || null,
      };
      
      const response = await apiRequest("PATCH", `/api/permits/${permitId}`, processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({
        title: "Success",
        description: "Permit updated successfully",
      });
      setLocation("/permits");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permit",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  if (permitLoading) {
    return (
      <Layout title="Edit Permit" subtitle="Loading permit data">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
    <Layout title="Edit Permit" subtitle="Update special use permit details">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Permit Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Permit Type *</label>
                <Input
                  placeholder="e.g., Wedding, Photography, Commercial Event"
                  value={permitType}
                  onChange={(e) => setPermitType(e.target.value)}
                  required
                />
              </div>

              {/* Park Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Park *</label>
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
            </div>

            {/* Fee Configuration */}
            <div className="space-y-6">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold">Fee Configuration</h3>
                <p className="text-sm text-muted-foreground">Set application and permit fees</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Application Fee */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Application Fee</label>
                  <Select 
                    value={applicationFee.toString()} 
                    onValueChange={(value) => setApplicationFee(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">$0 (No Fee)</SelectItem>
                      <SelectItem value="10">$10 (Standard)</SelectItem>
                      <SelectItem value="50">$50 (Complex)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Permit Fee */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Permit Fee</label>
                  <Select 
                    value={permitFee.toString()} 
                    onValueChange={(value) => setPermitFee(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="35">$35 (Basic)</SelectItem>
                      <SelectItem value="100">$100 (Standard)</SelectItem>
                      <SelectItem value="250">$250 (Commercial)</SelectItem>
                      <SelectItem value="350">$350 (Large Event)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Refundable Deposit */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Refundable Deposit</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={refundableDeposit}
                    onChange={(e) => setRefundableDeposit(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Additional Configuration */}
            <div className="space-y-6">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold">Additional Configuration</h3>
                <p className="text-sm text-muted-foreground">Set capacity and insurance requirements</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Max People */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Maximum People (Optional)</label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={maxPeople || ""}
                    onChange={(e) => setMaxPeople(e.target.value ? parseInt(e.target.value) : undefined)}
                    min="1"
                  />
                </div>

                {/* Insurance Required */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Insurance Requirement</label>
                  <Select value={insuranceRequired} onValueChange={setInsuranceRequired}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select insurance level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Insurance Required</SelectItem>
                      <SelectItem value="Tier 1">Tier 1: $1M Liability</SelectItem>
                      <SelectItem value="Tier 2">Tier 2: $2M Liability + Property</SelectItem>
                      <SelectItem value="Tier 3">Tier 3: $5M Comprehensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold">Terms and Conditions</h3>
                <p className="text-sm text-muted-foreground">Specific requirements for this permit type</p>
              </div>

              <Textarea
                placeholder="Enter any specific terms, conditions, or requirements for this permit type..."
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                rows={6}
                className="min-h-[120px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={updateMutation.isPending || !permitType || !selectedParkId}
                className="flex-1 md:flex-none"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Permit"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/permits")}
                className="flex-1 md:flex-none"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
}
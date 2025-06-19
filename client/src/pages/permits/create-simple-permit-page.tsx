import { useState } from "react";
import { useLocation } from "wouter";
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
import type { Park } from "@shared/schema";

export default function CreateSimplePermitPage() {
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

  // Fetch parks
  const { data: parks = [] } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const processedData = {
        permitType: permitType,
        parkId: parseInt(selectedParkId),
        applicationFee: applicationFee,
        permitFee: permitFee,
        refundableDeposit: refundableDeposit,
        maxPeople: maxPeople || null,
        insuranceRequired: insuranceRequired,
        termsAndConditions: termsAndConditions || null,
      };

      const response = await apiRequest("POST", "/api/permit-templates/simple", processedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permit Template Created",
        description: "The permit template has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
      setLocation("/permit-templates");
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating permit template",
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
    createMutation.mutate();
  };

  return (
    <Layout title="Permit Template Information" subtitle="Create a new special use permit template">
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
                onClick={() => setLocation("/permit-templates")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !permitType || !selectedParkId}
                className="bg-amber-700 hover:bg-amber-800 text-white"
              >
                {createMutation.isPending ? "Creating Template..." : "Create Template"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
}
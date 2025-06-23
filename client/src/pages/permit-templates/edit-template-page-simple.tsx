import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { Park, Permit } from "@shared/schema";

export default function EditTemplatePageSimple() {
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
  const [imagePath, setImagePath] = useState("");

  // Fetch permit template data
  const { data: template, isLoading } = useQuery<Permit>({
    queryKey: [`/api/permit-templates/${id}`],
  });

  // Fetch parks
  const { data: parks = [] } = useQuery<Park[]>({
    queryKey: ["/api/parks"],
  });

  // Set form values when template data loads
  useEffect(() => {
    if (template) {
      setPermitType(template.permitType || "");
      setSelectedParkId(template.parkId?.toString() || "");
      setApplicationFee(parseFloat(template.applicationFee?.toString() || "0") || 0);
      setPermitFee(parseFloat(template.permitFee?.toString() || "35") || 35);
      setRefundableDeposit(parseFloat(template.refundableDeposit?.toString() || "0") || 0);
      setMaxPeople(template.maxPeople || undefined);
      setInsuranceRequired(template.insuranceRequired || false);
      setTermsAndConditions(template.termsAndConditions || "");
      setImagePath(template.imagePath || "");
    }
  }, [template]);

  // Fee options
  const APPLICATION_FEE_OPTIONS = [0, 10, 50];
  const PERMIT_FEE_OPTIONS = [35, 100, 250, 350];

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await apiRequest("PUT", `/api/permit-templates/${id}`, templateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permit-templates"] });
      queryClient.invalidateQueries({ queryKey: [`/api/permit-templates/${id}`] });
      toast({
        title: "Template updated",
        description: "Permit template has been updated successfully.",
      });
      setLocation("/permit-templates");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permit template",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (imagePath: string) => {
    setImagePath(imagePath);
  };

  const handleRemoveImage = () => {
    setImagePath("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!permitType.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a permit type",
        variant: "destructive",
      });
      return;
    }

    if (!selectedParkId) {
      toast({
        title: "Validation Error", 
        description: "Please select a park",
        variant: "destructive",
      });
      return;
    }

    const templateData = {
      permitType: permitType.trim(),
      parkId: parseInt(selectedParkId),
      applicationFee: applicationFee.toString(),
      permitFee: permitFee.toString(),
      refundableDeposit: refundableDeposit.toString(),
      maxPeople: maxPeople || null,
      insuranceRequired,
      termsAndConditions: termsAndConditions.trim() || null,
      imagePath: imagePath || null,
    };

    updateTemplateMutation.mutate(templateData);
  };

  if (isLoading) {
    return (
      <Layout title="Edit Permit Template" subtitle="Loading template...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!template) {
    return (
      <Layout title="Edit Permit Template" subtitle="Template not found">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Permit template not found</h3>
            <p className="text-muted-foreground mb-4">
              The requested permit template could not be found.
            </p>
            <Button onClick={() => setLocation("/permit-templates")}>
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Edit Permit Template" subtitle="Update permit template details">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Permit Template</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Permit Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Permit Type *</label>
                <Input
                  value={permitType}
                  onChange={(e) => setPermitType(e.target.value)}
                  placeholder="e.g., Wedding, Corporate Event, Photography"
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

              {/* Fees Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Fees</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Application Fee</label>
                    <Select value={applicationFee.toString()} onValueChange={(value) => setApplicationFee(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPLICATION_FEE_OPTIONS.map((fee) => (
                          <SelectItem key={fee} value={fee.toString()}>
                            ${fee}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Permit Fee</label>
                    <Select value={permitFee.toString()} onValueChange={(value) => setPermitFee(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERMIT_FEE_OPTIONS.map((fee) => (
                          <SelectItem key={fee} value={fee.toString()}>
                            ${fee}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Refundable Deposit</label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={refundableDeposit}
                    onChange={(e) => setRefundableDeposit(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Max People */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Maximum People (Optional)</label>
                <Input
                  type="number"
                  min="1"
                  value={maxPeople || ""}
                  onChange={(e) => setMaxPeople(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="No limit"
                />
              </div>

              {/* Insurance Required */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="insurance"
                  checked={insuranceRequired}
                  onCheckedChange={(checked) => setInsuranceRequired(checked === true)}
                />
                <label
                  htmlFor="insurance"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Require insurance coverage
                </label>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Terms and Conditions (Optional)</label>
                <Textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Enter specific terms and conditions for this permit type..."
                  rows={4}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/permit-templates")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTemplateMutation.isPending}
                  className="flex-1"
                >
                  {updateTemplateMutation.isPending ? "Updating..." : "Update Template"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
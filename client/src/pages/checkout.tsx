import { useEffect, useState } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from "wouter";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ applicationId }: { applicationId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?application=${applicationId}`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation('/applications')}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Now
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState("");
  const [applicationData, setApplicationData] = useState<any>(null);
  const [, setLocation] = useLocation();
  
  // Get application ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const applicationId = urlParams.get('application');

  useEffect(() => {
    if (!applicationId) {
      setLocation('/applications');
      return;
    }

    // Create PaymentIntent for the application
    const createPaymentIntent = async () => {
      try {
        const response = await apiRequest("POST", "/api/create-payment-intent", { 
          applicationId: parseInt(applicationId) 
        });
        const data = await response.json();
        setClientSecret(data.clientSecret);
        setApplicationData(data.application);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        setLocation('/applications');
      }
    };

    createPaymentIntent();
  }, [applicationId, setLocation]);

  if (!clientSecret || !applicationData) {
    return (
      <Layout title="Payment">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Setting up payment...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${(num / 100).toFixed(2)}`;
  };

  return (
    <Layout title="Payment">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Complete Your Payment</h1>
          <p className="text-muted-foreground mt-2">
            Secure payment processing powered by Stripe
          </p>
        </div>

        {/* Application Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Application Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Event:</span>
              <span>{applicationData.eventTitle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Applicant:</span>
              <span>{applicationData.firstName} {applicationData.lastName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Event Date:</span>
              <span>{new Date(applicationData.eventDate).toLocaleDateString()}</span>
            </div>
            <hr />
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Amount:</span>
              <span>{formatCurrency(applicationData.permitFee)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm applicationId={applicationId!} />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
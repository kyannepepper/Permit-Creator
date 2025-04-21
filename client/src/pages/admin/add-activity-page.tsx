import { useState } from "react";
import Layout from "@/components/layout/layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// Form schema with validation
const formSchema = z.object({
  activity: z.string().min(3, { message: "Activity name must be at least 3 characters" }),
  tier: z.string().min(1, { message: "Please select a tier" }),
  insuranceLimits: z.string().min(1, { message: "Please select insurance limits" })
});

type FormValues = z.infer<typeof formSchema>;

export default function AddActivityPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activity: "",
      tier: "",
      insuranceLimits: ""
    }
  });

  const onSubmit = (data: FormValues) => {
    // In a real implementation, this would be a database save
    toast({
      title: "Activity Added",
      description: `Successfully added ${data.activity} as a Tier ${data.tier} activity`
    });
    
    // Navigate back to the activities page
    setTimeout(() => {
      setLocation("/admin/activities");
    }, 1500);
  };

  return (
    <Layout title="Add Activity Type" subtitle="Add a new activity type to the insurance matrix">
      <Card className="max-w-2xl mx-auto p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="activity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter activity name" {...field} />
                  </FormControl>
                  <FormDescription>
                    The name of the activity requiring insurance
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Tier</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a risk tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="3">Tier 3 - Extremely High Risk</SelectItem>
                      <SelectItem value="2">Tier 2 - High Risk</SelectItem>
                      <SelectItem value="1">Tier 1 - Moderate Risk</SelectItem>
                      <SelectItem value="0">Tier 0 - Low Risk</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The risk level associated with this activity
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="insuranceLimits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Limits</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select insurance limits" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="$1M Per Person/$3M Per Occurrence">$1M Per Person/$3M Per Occurrence</SelectItem>
                      <SelectItem value="$1M Per Person/$2M Per Occurrence">$1M Per Person/$2M Per Occurrence</SelectItem>
                      <SelectItem value="$500K Per Person/$1M Per Occurrence">$500K Per Person/$1M Per Occurrence</SelectItem>
                      <SelectItem value="Personal Insurance">Personal Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Required insurance coverage for this activity
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation("/admin/activities")}
              >
                Cancel
              </Button>
              <Button type="submit">Save Activity</Button>
            </div>
          </form>
        </Form>
      </Card>
    </Layout>
  );
}
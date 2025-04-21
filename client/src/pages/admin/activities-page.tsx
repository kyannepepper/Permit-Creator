import { useState, useMemo } from "react";
import Layout from "@/components/layout/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, PlusCircle, Trash2, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { useActivities, InsuranceActivity } from "@/hooks/use-activities";

// This is just for reference, we're using the context now
// The actual list of activities is in use-activities.tsx
const _dummyActivities: InsuranceActivity[] = [
  { tier: 3, activity: "Zip-Lines", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Rock climbing guides", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "On-Park concerts", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Full-scale park concession contracts involving boat rentals, off-road and snowmobile rentals, food service, general stores, waterski/wakeboard instruction, etc", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Hang gliding and paragliding instructors", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Floating campgrounds and cabins", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Flyboard rentals / instruction", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Triathlons and other large sporting events including obstacle courses", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Cage fighting exhibitions", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Parasailing guides", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "ATV / motocross races", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Music festivals", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fireworks displays", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 2, activity: "Inflatable / Floating waterpark", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Wakeboard parks", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Large fishing tournaments with more than 20 boats", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Guided horse rides, hiking tours, biking tours, atv tours, guided cross-country ski tours", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Wedding ceremonies and receptions", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Marathon and running races", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Cycling events and races", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Group party/gathering with alcohol", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 1, activity: "Fishing guides that guide customers without the use of vessels", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Small-scale park concessions such as coffee shops, food carts", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Long-term camping agreements", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Commercial filming with drones or advanced equipment", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Art exhibitions or outdoor art installations", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 0, activity: "Small fishing tournaments with less than 20 boats", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Commercial photography or filming (basic)", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Recreational drone use", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Metal detecting in State Parks", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Group party/gathering without alcohol", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Educational tours and school field trips", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Religious ceremonies or group worship", insuranceLimits: "Personal Insurance" },
];

export default function InsurancePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { activities, deleteActivity } = useActivities();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<{index: number, name: string} | null>(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof InsuranceActivity;
    direction: 'ascending' | 'descending';
  } | null>(null);

  // Create sortable activities array
  const sortedActivities = useMemo(() => {
    let sortableActivities = [...activities];
    if (sortConfig !== null) {
      sortableActivities.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableActivities;
  }, [activities, sortConfig]);

  // Handle sort request
  const requestSort = (key: keyof InsuranceActivity) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (
      sortConfig && 
      sortConfig.key === key && 
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get the sort direction icon
  const getSortDirectionIcon = (key: keyof InsuranceActivity) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortConfig.direction === 'ascending' ? 
      <ChevronUp className="h-4 w-4 ml-1" /> : 
      <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const handleAddActivity = () => {
    setLocation("/admin/add-activity");
  };

  // Find the actual index in the original activities array 
  // since we're now using the sorted version for display
  const openDeleteDialog = (index: number, activityName: string) => {
    // Find the activity in the original array by matching its name
    const originalIndex = activities.findIndex(a => a.activity === activityName);
    setActivityToDelete({ index: originalIndex, name: activityName });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteActivity = () => {
    if (activityToDelete) {
      // Delete activity using context
      deleteActivity(activityToDelete.index);
      
      // Show toast notification
      toast({
        title: "Activity Deleted",
        description: `Successfully removed "${activityToDelete.name}" from activities`,
      });
      
      // Close the dialog
      setDeleteConfirmOpen(false);
      setActivityToDelete(null);
    }
  };

  return (
    <Layout title="Insurance Requirements" subtitle="Activity Risk Matrix and Insurance Requirements">
      <div className="flex justify-between items-center mb-4">
        <div></div>
        <Button onClick={handleAddActivity}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Activity Type
        </Button>
      </div>
      
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <Info className="h-5 w-5 text-blue-500 mt-1" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Insurance Tier Information</h3>
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">Tier 3:</span> Extremely high risk activities requiring stringent insurance coverage
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">Tier 2:</span> High risk activities with substantial insurance requirements
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">Tier 1:</span> Moderate risk activities with standard insurance coverage
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Tier 0:</span> Low risk activities requiring only personal insurance
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="w-[80px] cursor-pointer"
                onClick={() => requestSort('tier')}
              >
                <div className="flex items-center">
                  Tier
                  {getSortDirectionIcon('tier')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => requestSort('activity')}
              >
                <div className="flex items-center">
                  Activity
                  {getSortDirectionIcon('activity')}
                </div>
              </TableHead>
              <TableHead 
                className="w-[220px] cursor-pointer"
                onClick={() => requestSort('insuranceLimits')}
              >
                <div className="flex items-center">
                  Insurance Limits
                  {getSortDirectionIcon('insuranceLimits')}
                </div>
              </TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedActivities.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.tier}</TableCell>
                <TableCell>{item.activity}</TableCell>
                <TableCell>{item.insuranceLimits}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => openDeleteDialog(0, item.activity)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{activityToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteActivity} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
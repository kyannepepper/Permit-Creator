import { useMemo } from "react";
import Layout from "@/components/layout/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Info, ArrowUpDown, ChevronUp, ChevronDown, Shield } from "lucide-react";
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
  const { activities } = useActivities();

  // Sort activities by tier (highest to lowest) then by activity name
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      if (a.tier !== b.tier) {
        return b.tier - a.tier; // Sort by tier descending (3, 2, 1, 0)
      }
      return a.activity.localeCompare(b.activity); // Then by activity name ascending
    });
  }, [activities]);

  // Helper function to get tier color and badge
  const getTierBadgeColor = (tier: number) => {
    switch (tier) {
      case 3: return "bg-red-100 text-red-800 border-red-200";
      case 2: return "bg-orange-100 text-orange-800 border-orange-200";
      case 1: return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 0: return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTierDescription = (tier: number) => {
    switch (tier) {
      case 3: return "Extremely high risk";
      case 2: return "High risk";
      case 1: return "Moderate risk";
      case 0: return "Low risk";
      default: return "Unknown";
    }
  };

  return (
    <Layout title="Insurance Requirements" subtitle="Activity Risk Matrix and Insurance Requirements">
      <div className="space-y-6">
        {/* Tier Legend */}
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <Shield className="h-6 w-6 text-blue-500 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-4">Insurance Tier System</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-red-100 text-red-800 border border-red-200">
                      Tier 3
                    </span>
                  </div>
                  <p className="text-sm text-red-700 font-medium">Extremely High Risk</p>
                  <p className="text-xs text-red-600 mt-1">$1M Per Person / $3M Per Occurrence</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-orange-100 text-orange-800 border border-orange-200">
                      Tier 2
                    </span>
                  </div>
                  <p className="text-sm text-orange-700 font-medium">High Risk</p>
                  <p className="text-xs text-orange-600 mt-1">$1M Per Person / $2M Per Occurrence</p>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-yellow-100 text-yellow-800 border border-yellow-200">
                      Tier 1
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700 font-medium">Moderate Risk</p>
                  <p className="text-xs text-yellow-600 mt-1">$500K Per Person / $1M Per Occurrence</p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-green-100 text-green-800 border border-green-200">
                      Tier 0
                    </span>
                  </div>
                  <p className="text-sm text-green-700 font-medium">Low Risk</p>
                  <p className="text-xs text-green-600 mt-1">Personal Insurance Only</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Activities Table */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Info className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Utah State Parks Activity/Risk Matrix - Insurance Requirements</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Tier</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Activity</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Insurance Limits</th>
                </tr>
              </thead>
              <tbody>
                {sortedActivities.map((item, index) => {
                  const getRowBgColor = (tier: number) => {
                    switch (tier) {
                      case 3: return "bg-red-100";
                      case 2: return "bg-orange-100";
                      case 1: return "bg-yellow-100";
                      case 0: return "bg-green-50";
                      default: return "bg-gray-100";
                    }
                  };

                  return (
                    <tr key={index} className={getRowBgColor(item.tier)}>
                      <td className="border border-gray-300 px-2 py-1 font-semibold">{item.tier}</td>
                      <td className="border border-gray-300 px-2 py-1">{item.activity}</td>
                      <td className="border border-gray-300 px-2 py-1">{item.insuranceLimits}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-sm text-gray-600 mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-semibold mb-2">Insurance Requirement Guidelines:</h4>
            <ul className="space-y-1">
              <li><span className="inline-block w-4 h-4 bg-red-100 rounded mr-2 border"></span><strong>Tier 3 Activities:</strong> Highest risk - $1M Per Person/$3M Per Occurrence</li>
              <li><span className="inline-block w-4 h-4 bg-orange-100 rounded mr-2 border"></span><strong>Tier 2 Activities:</strong> Moderate risk - $1M Per Person/$2M Per Occurrence</li>
              <li><span className="inline-block w-4 h-4 bg-yellow-100 rounded mr-2 border"></span><strong>Tier 1 Activities:</strong> Lower risk - $500K Per Person/$1M Per Occurrence</li>
              <li><span className="inline-block w-4 h-4 bg-green-100 rounded mr-2 border"></span><strong>Tier 0 Activities:</strong> Minimal risk - Personal insurance coverage sufficient</li>
            </ul>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
import Layout from "@/components/layout/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";

type InsuranceActivity = {
  tier: number;
  activity: string;
  insuranceLimits: string;
};

const insuranceActivities: InsuranceActivity[] = [
  // Tier 3 Activities
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
  { tier: 3, activity: "Boat / PWC races", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Sailing competition", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fireworks displays such as 'Fire on the Water' at Jordanelle", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Crane use for sailboat launching and retrieving", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Commercial Drone Use", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Livestock Grazing", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Camping accommodations provided by 3rd party", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Food truck - ongoing operations", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Boat charters", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Canyoneering", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Rappelling", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },

  // Tier 2 Activities
  { tier: 2, activity: "Inflatable / Floating waterpark", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Wakeboard parks", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Large fishing tournaments with more than 20 boats requiring Certificate of Registration from Wildlife Resources", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Guided horse rides, hiking tours, biking tours, atv tours, guided cross-country ski tours", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Commercial photography or filming where props are used", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Fishing guides that guide customers with the use of vessels", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Christmas light show vendors at parks", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Medium-scale concessions offering bike rentals", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Group party/gathering with alcohol", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Paddleboard class", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Boy Scout Klondike", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Ice fishing tournaments", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Bus tours", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Archery competitions", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Dive instruction", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "5K/10K Fun Run Races", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Cross Country Team Training/Meets", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Organization Group Camping", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Golf corporate events", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Food truck - one-time event", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Company Training/Retreat", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },

  // Tier 1 Activities
  { tier: 1, activity: "Fishing guides that guide customers without the use of vessels", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Small-scale park concessions such as coffee shops, food carts", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Long-term camping agreements", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Firewood and ice sales", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },

  // Tier 0 Activities
  { tier: 0, activity: "Small fishing tournaments with less than 20 boats", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Commercial photography or filming where the use of the park facility does not go beyond what the normal customer uses", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Recreational drone use", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Metal detecting in State Parks", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Group party/gathering without alcohol", insuranceLimits: "Personal Insurance" }
  { tier: 2, activity: "Wakeboard parks", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Large fishing tournaments with more than 20 boats", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Guided horse rides, hiking tours, biking tours, atv tours, guided cross-country ski tours", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 1, activity: "Fishing guides that guide customers without the use of vessels", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Small-scale park concessions such as coffee shops, food carts", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Long-term camping agreements", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 0, activity: "Small fishing tournaments with less than 20 boats", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Commercial photography or filming (basic)", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Recreational drone use", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Metal detecting in State Parks", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Group party/gathering without alcohol", insuranceLimits: "Personal Insurance" },
];

export default function InsurancePage() {
  return (
    <Layout title="Insurance Requirements" subtitle="Activity Risk Matrix and Insurance Requirements">
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
              <TableHead className="w-[100px]">Tier</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead className="w-[250px]">Insurance Limits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {insuranceActivities.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.tier}</TableCell>
                <TableCell>{item.activity}</TableCell>
                <TableCell>{item.insuranceLimits}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Layout>
  );
}
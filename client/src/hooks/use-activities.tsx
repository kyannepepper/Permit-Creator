import { createContext, useState, useContext, useEffect, ReactNode } from "react";

export type InsuranceActivity = {
  tier: number;
  activity: string;
  insuranceLimits: string;
};

const initialActivities: InsuranceActivity[] = [
  // Tier 3 Activities - $1M Per Person/$3M Per Occurrence
  { tier: 3, activity: "Zip-Lines", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Rock climbing guides", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "On-Park concerts", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Full-scale park concession contracts involving boat rentals, off-road and snowmobile rentals, food service, general stores, waterski/wakeboard instruction, etc", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Hang gliding and paragliding instructors", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Boating campground and cabins", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Flyboard rentals / instruction", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Triathlons and other large sporting events including obstacle courses", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Cage fighting exhibitions", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Parasailing guides", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "ATV / motocross races", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Boat / PWC races", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Sailing competition", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fireworks displays such as \"Fire on the Water\" at Jordanelle", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Crane use for sailboat launching and retrieving", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Commercial Drone Use", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Livestock Grazing", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Camping accommodations provided by 3rd party", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Food truck - ongoing operations", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Boat charters", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Canyoneering", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Rappelling", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },

  // Tier 2 Activities - $1M Per Person/$2M Per Occurrence
  { tier: 2, activity: "Inflatable / Floating waterpark", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Wakeboard parks", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Large fishing tournaments with more than 20 boats requiring Certificate of Registration from Wildlife Resources and use of park facilities beyond what the regular customer requires", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Guided activities", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Commercial photography or filming where props are used, facilities or grounds are modified, or use is beyond what a regular customer experiences", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Fishing guides that guide customers with the use of vessels (IE boats, rafts, kayaks, float tubes, etc)", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
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
  { tier: 2, activity: "Food truck - one time event", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },
  { tier: 2, activity: "Company Training/Retreat", insuranceLimits: "$1M Per Person/$2M Per Occurrence" },

  // Tier 1 Activities - $500K Per Person/$1M Per Occurrence
  { tier: 1, activity: "Fishing guides that guide customers without the use of vessels (IE river fishing from shore or using waters)", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Small-scale park concessions such as coffee shops, food carts", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Long-term camping agreements", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  { tier: 1, activity: "Firewood and ice sales", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },

  // Tier 0 Activities - Personal Insurance
  { tier: 0, activity: "Small fishing tournaments with less than 20 boats and no use of park facilities beyond normal use", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Commercial photography or filming where the use of the park facility does not go beyond what the regular customer uses (no drones)", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Recreational drone use (permit required for all parks)", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Metal detecting in State Parks", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Group party/gathering without alcohol", insuranceLimits: "Personal Insurance" },
];

// In a real application, this would likely be stored in localStorage or a database
const STORAGE_KEY = 'parkspass_activities';

type ActivitiesContextType = {
  activities: InsuranceActivity[];
  addActivity: (activity: InsuranceActivity) => void;
  deleteActivity: (index: number) => void;
};

export const ActivitiesContext = createContext<ActivitiesContextType | null>(null);

export function ActivitiesProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<InsuranceActivity[]>(() => {
    // Try to get activities from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved activities', e);
        }
      }
    }
    return initialActivities;
  });

  // Save activities to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  }, [activities]);

  const addActivity = (activity: InsuranceActivity) => {
    setActivities(prev => [...prev, activity]);
  };

  const deleteActivity = (index: number) => {
    setActivities(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <ActivitiesContext.Provider
      value={{
        activities,
        addActivity,
        deleteActivity,
      }}
    >
      {children}
    </ActivitiesContext.Provider>
  );
}

export function useActivities() {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivitiesProvider');
  }
  return context;
}
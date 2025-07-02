import { createContext, useState, useContext, useEffect, ReactNode } from "react";

export type InsuranceActivity = {
  tier: number;
  activity: string;
  insuranceLimits: string;
};

const initialActivities: InsuranceActivity[] = [
  // Tier 3 Activities - $1M Per Person/$3M Per Occurrence
  { tier: 3, activity: "Boat slalom guides", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "On-Park concerts", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Full-scale park concession contracts involving boat rentals, off-road and snowmobile rentals, food service, general stores, waterski/wakeboard instruction, etc", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Hang gliding and paragliding instructors", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Building campgrounds and cabins", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Flyboard rentals / instruction", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Triathlons and other large sporting events including obstacle courses", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Cage fighting exhibitions", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Parasailing", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fireworks displays such as Fire-on-ice or ice sculpting", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Swimming Competition", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Sailing Competition", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Commercial Drone Use", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Livestock Racing", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fast Pitch - sloping operations", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Boat Hosting", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Motor boat recreational offering like tubing", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fishing guides that guide customers without the use of vessels on Sandy River", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Music festivals such as Coachella", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Photography that require customers defined the use of terrain on Sandy River", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Drone photography/filming activity", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Large fishing tournaments with more than 20 boats requiring Certificate of Registration from boaters including the use of a lift and/or dock, and marina", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Live fishing/tournament with more than 20 boats requiring Certificate of Registration from boaters", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Commercial photography or filming, where there are paid, full-time or grounds are confined, staged, and/or there's restricted from the general public", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Commercial photography or filming where paid, actors or models, lightning, grounds and reserved", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Boy Scout License", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Art Pavilion", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Organization Scout Camping", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Group camping event", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fishing events", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fishing guides that guide customers defined the use of motor on Flaming Gorge Effort at 3 minutes", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Small-scale park concessions such as coffee carts, food carts", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fireworks oil bells", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Ban Firing Movements that take of it park, schedule the fee park", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Recreational drones that take schedule the fee park", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Other photography without alcohol", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fireworks oil bells", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Fireworks and ice bells", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Bee filming tournaments that take two of each and its act of park, schedule filming festival", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Recreational games that take schedule the fee park", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Recreational activities on State Parks", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Group party gathering without alcohol", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Animal competitions", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "BBQ showcases", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Clay Pigeon State Tournaments", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Organization Scout Camping", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },
  { tier: 3, activity: "Apple competition events", insuranceLimits: "$1M Per Person/$3M Per Occurrence" },

  // Tier 2 Activities - $500K Per Person/$1M Per Occurrence
  { tier: 2, activity: "Archery competitions", insuranceLimits: "$500K Per Person/$1M Per Occurrence" },
  
  // Tier 1 Activities - $50K Per Person/$100K Per Occurrence
  { tier: 1, activity: "Bike races", insuranceLimits: "$50K Per Person/$100K Per Occurrence" },
  { tier: 1, activity: "Boat races", insuranceLimits: "$50K Per Person/$100K Per Occurrence" },
  { tier: 1, activity: "Recreational games such as cornhole or horseshoes", insuranceLimits: "$50K Per Person/$100K Per Occurrence" },
  
  // Tier 0 Activities - Personal Insurance
  { tier: 0, activity: "Small fishing tournaments with less than 20 boats", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Commercial photography or filming (basic)", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Recreational drone use", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Metal detecting in State Parks", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Group party/gathering without alcohol", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Educational tours and school field trips", insuranceLimits: "Personal Insurance" },
  { tier: 0, activity: "Religious ceremonies or group worship", insuranceLimits: "Personal Insurance" },
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
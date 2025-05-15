import { useState, useEffect } from "react";
import { Park } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "@/components/ui/status-badge";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ParkStatusProps {
  parkId: number;
  parkName?: string;
}

export default function ParkStatus({ parkId, parkName }: ParkStatusProps) {
  const [statusMessage, setStatusMessage] = useState<string>("");
  
  // Fetch park details to get current status
  const { data: park } = useQuery<Park>({
    queryKey: [`/api/parks/${parkId}`],
    enabled: !!parkId,
  });

  useEffect(() => {
    if (park?.status === "inactive") {
      setStatusMessage("This park is currently inactive. Permits may not be processed.");
    } else if (park?.status === "maintenance") {
      setStatusMessage("This park is currently under maintenance. There may be delays in permit processing.");
    } else {
      setStatusMessage("");
    }
  }, [park]);

  if (!park) {
    return <span>{parkName || "Unknown Park"}</span>;
  }

  // If park is active, just show the name
  if (park.status === "active") {
    return <span>{park.name}</span>;
  }

  // For inactive or maintenance status, show name with status indicator
  return (
    <div className="flex items-center space-x-2">
      <span>{park.name}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex">
              <StatusBadge status={park.status || "unknown"} className="scale-75" />
              <Info className="h-4 w-4 ml-1 text-gray-500" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{statusMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
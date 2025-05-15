import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { capitalizeFirstLetter } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

type StatusBadgeProps = {
  status: string;
  className?: string;
  onStatusChange?: (newStatus: string) => void;
  editable?: boolean;
  entity?: string;
};

export default function StatusBadge({ 
  status, 
  className, 
  onStatusChange, 
  editable = false,
  entity = "item"
}: StatusBadgeProps) {
  const statusColors: Record<string, string> = {
    approved: "bg-green-500 hover:bg-green-600",
    pending: "bg-yellow-500 hover:bg-yellow-600",
    rejected: "bg-red-500 hover:bg-red-600",
    cancelled: "bg-red-500 hover:bg-red-600",
    completed: "bg-blue-500 hover:bg-blue-600",
    paid: "bg-green-500 hover:bg-green-600",
    active: "bg-green-500 hover:bg-green-600",
    inactive: "bg-gray-500 hover:bg-gray-600",
    maintenance: "bg-orange-500 hover:bg-orange-600",
  };

  const color = statusColors[status.toLowerCase()] || "bg-gray-500 hover:bg-gray-600";

  if (!editable || !onStatusChange) {
    return (
      <Badge 
        className={cn(
          "text-white font-normal",
          color,
          className
        )}
      >
        {capitalizeFirstLetter(status)}
      </Badge>
    );
  }

  // Get available statuses based on entity type
  const getAvailableStatuses = () => {
    if (entity === 'park') {
      return [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'maintenance', label: 'Maintenance' }
      ];
    }
    
    // Default statuses
    return [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ];
  };

  const statuses = getAvailableStatuses();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer inline-flex items-center">
          <Badge 
            className={cn(
              "text-white font-normal",
              color,
              className
            )}
          >
            {capitalizeFirstLetter(status)}
          </Badge>
          <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statuses.map((statusOption) => (
          <DropdownMenuItem
            key={statusOption.value}
            onClick={() => onStatusChange(statusOption.value)}
            className={status === statusOption.value ? "font-bold" : ""}
          >
            {statusOption.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

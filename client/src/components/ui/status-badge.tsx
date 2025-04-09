import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { capitalizeFirstLetter } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusColors: Record<string, string> = {
    approved: "bg-green-500 hover:bg-green-600",
    pending: "bg-yellow-500 hover:bg-yellow-600",
    rejected: "bg-red-500 hover:bg-red-600",
    cancelled: "bg-red-500 hover:bg-red-600",
    completed: "bg-blue-500 hover:bg-blue-600",
    paid: "bg-green-500 hover:bg-green-600",
    active: "bg-green-500 hover:bg-green-600",
    inactive: "bg-gray-500 hover:bg-gray-600",
  };

  const color = statusColors[status.toLowerCase()] || "bg-gray-500 hover:bg-gray-600";

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

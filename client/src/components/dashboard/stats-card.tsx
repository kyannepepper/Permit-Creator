import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  iconClassName?: string;
};

export default function StatsCard({ title, value, icon, trend, iconClassName }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-neutral-medium text-sm">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={cn(
            "p-3 rounded-full bg-opacity-10",
            iconClassName || "bg-primary bg-opacity-10"
          )}>
            {icon}
          </div>
        </div>
        
        {trend && (
          <div className="mt-4">
            <span className={cn(
              "text-sm font-medium flex items-center",
              trend.positive ? "text-green-500" : "text-red-500"
            )}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={cn(
                  "h-4 w-4 mr-1",
                  trend.positive ? "rotate-0" : "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              {trend.value}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

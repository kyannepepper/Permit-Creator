import { useQuery } from "@tanstack/react-query";
import { Park } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ParkStatusProps = {
  className?: string;
};

type ParkWithPermitCount = Park & {
  permitCount: number;
};

export default function ParkStatus({ className }: ParkStatusProps) {
  const { data: parks, isLoading } = useQuery<ParkWithPermitCount[]>({
    queryKey: ["/api/parks/status"],
  });

  const getStatusColor = (count: number) => {
    if (count < 5) return "bg-green-500";
    if (count < 10) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle>Park Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center pb-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gray-300 mr-3"></div>
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                </div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Park Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {parks?.length === 0 ? (
            <p className="text-neutral-medium text-center py-4">No parks found</p>
          ) : (
            parks?.map((park) => (
              <div 
                key={park.id} 
                className="flex justify-between items-center border-b border-neutral-light pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(park.permitCount)} mr-3`}></div>
                  <span>{park.name}</span>
                </div>
                <div className="text-sm text-neutral-medium">
                  <span>{park.permitCount}</span> active permits
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { FileCheck, Clock, Eye, Edit } from "lucide-react";
import { Application } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import StatusBadge from "@/components/ui/status-badge";
import ParkStatus from "@/components/permit/park-status";

type ApplicationTableProps = {
  applications: (Application & { parkName: string })[];
  isLoading: boolean;
  onViewDetails?: (id: number) => void;
};

export default function ApplicationTable({ applications, isLoading, onViewDetails }: ApplicationTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-neutral-light">
          <h3 className="text-lg font-semibold">Applications Needing Approval</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-neutral-light flex justify-between items-center">
        <h3 className="text-lg font-semibold">Applications Needing Approval</h3>
        <Link href="/applications">
          <a className="text-primary hover:text-primary-dark text-sm">View All</a>
        </Link>
      </div>
      <div className="p-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm font-medium text-neutral-medium border-b border-neutral-light">
              <th className="pb-3 px-2">Application ID</th>
              <th className="pb-3 px-2">Park</th>
              <th className="pb-3 px-2">Applicant Name</th>
              <th className="pb-3 px-2">Activity</th>
              <th className="pb-3 px-2">Status</th>
              <th className="pb-3 px-2">Submit Date</th>
              <th className="pb-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-medium">
                  No pending applications found
                </td>
              </tr>
            ) : (
              applications.map((application) => (
                <tr key={application.id} className="border-b border-neutral-light hover:bg-neutral-lightest">
                  <td className="py-3 px-2">APP-{String(application.id).padStart(6, '0')}</td>
                  <td className="py-3 px-2">
                    <ParkStatus parkId={application.parkId} parkName={application.parkName} />
                  </td>
                  <td className="py-3 px-2">{application.firstName} {application.lastName}</td>
                  <td className="py-3 px-2">{application.eventTitle || 'N/A'}</td>
                  <td className="py-3 px-2">
                    <StatusBadge status={application.status} />
                  </td>
                  <td className="py-3 px-2">{formatDate(application.createdAt)}</td>
                  <td className="py-3 px-2">
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onViewDetails?.(application.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/applications/review/${application.id}`}>
                          <FileCheck className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
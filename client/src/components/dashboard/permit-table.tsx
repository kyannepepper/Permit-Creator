import { FileSignature, Clock, CheckCircle, FileText, Eye, Edit, Trash } from "lucide-react";
import { Permit } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import StatusBadge from "@/components/ui/status-badge";
import ParkStatus from "@/components/permit/park-status";

type PermitTableProps = {
  permits: (Permit & { parkName: string })[];
  isLoading: boolean;
  onDelete?: (id: number) => void;
};

export default function PermitTable({ permits, isLoading, onDelete }: PermitTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-neutral-light">
          <h3 className="text-lg font-semibold">Recent Permits</h3>
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
        <h3 className="text-lg font-semibold">Recent Permits</h3>
        <Link href="/permits">
          <a className="text-primary hover:text-primary-dark text-sm">View All</a>
        </Link>
      </div>
      <div className="p-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm font-medium text-neutral-medium border-b border-neutral-light">
              <th className="pb-3 px-2">Permit ID</th>
              <th className="pb-3 px-2">Park</th>
              <th className="pb-3 px-2">Permittee Name</th>
              <th className="pb-3 px-2">Activity</th>
              <th className="pb-3 px-2">Status</th>
              <th className="pb-3 px-2">Issue Date</th>
              <th className="pb-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {permits.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-medium">
                  No permits found
                </td>
              </tr>
            ) : (
              permits.map((permit) => (
                <tr key={permit.id} className="border-b border-neutral-light hover:bg-neutral-lightest">
                  <td className="py-3 px-2">{permit.permitNumber}</td>
                  <td className="py-3 px-2">
                    <ParkStatus parkId={permit.parkId} parkName={permit.parkName} />
                  </td>
                  <td className="py-3 px-2">{permit.permitteeName}</td>
                  <td className="py-3 px-2">{permit.activity}</td>
                  <td className="py-3 px-2">
                    <StatusBadge status={permit.status} />
                  </td>
                  <td className="py-3 px-2">{permit.issueDate ? formatDate(permit.issueDate) : 'N/A'}</td>
                  <td className="py-3 px-2">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/permits/${permit.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/permits/edit/${permit.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(permit.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
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

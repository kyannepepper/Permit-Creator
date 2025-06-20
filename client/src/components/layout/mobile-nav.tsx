import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Network,
  BarChart3,
  Menu,
  Calendar,
  Eye,
  MapPin,
  Receipt,
  Users,
  Shield,
  Settings,
  X,
} from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = location === "/applications/calendar" || 
                      location === "/permits/view" || 
                      location === "/parks/add" || 
                      location === "/invoices" || 
                      location === "/admin/staff" || 
                      location === "/admin/roles" || 
                      location === "/admin/insurance";

  return (
    <>
      {showMore && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-white border-t border-neutral-light p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">More Options</h3>
              <button 
                onClick={() => setShowMore(false)}
                className="text-neutral-medium hover:text-neutral-dark"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <MoreMenuItem 
                href="/applications/calendar" 
                icon={<Calendar className="h-5 w-5" />} 
                label="Calendar"
                onClick={() => setShowMore(false)}
              />
              <MoreMenuItem 
                href="/permits/view" 
                icon={<Eye className="h-5 w-5" />} 
                label="View Permits"
                onClick={() => setShowMore(false)}
              />
              <MoreMenuItem 
                href="/parks/add" 
                icon={<MapPin className="h-5 w-5" />} 
                label="Add Park"
                onClick={() => setShowMore(false)}
              />
              <MoreMenuItem 
                href="/invoices" 
                icon={<Receipt className="h-5 w-5" />} 
                label="Invoices"
                onClick={() => setShowMore(false)}
              />
              <MoreMenuItem 
                href="/admin/staff" 
                icon={<Users className="h-5 w-5" />} 
                label="Staff Accounts"
                onClick={() => setShowMore(false)}
              />
              <MoreMenuItem 
                href="/admin/roles" 
                icon={<Shield className="h-5 w-5" />} 
                label="Roles"
                onClick={() => setShowMore(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="md:hidden bg-white border-t border-neutral-light fixed bottom-0 left-0 right-0 z-10">
        <div className="flex justify-around">
          <NavLink 
            href="/" 
            icon={<LayoutDashboard className="h-4 w-4" />} 
            label="Dashboard"
            active={location === "/"}
          />
          <NavLink 
            href="/applications" 
            icon={<FileText className="h-4 w-4" />} 
            label="Applications"
            active={location === "/applications"}
          />
          <NavLink 
            href="/permits" 
            icon={<PlusCircle className="h-4 w-4" />} 
            label="Permits"
            active={location === "/permits" || location.startsWith("/permit")}
          />
          <NavLink 
            href="/parks" 
            icon={<Network className="h-4 w-4" />} 
            label="Parks"
            active={location === "/parks" || location.startsWith("/parks")}
          />
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center py-2 px-4"
          >
            <div className={cn(
              "text-neutral-medium",
              isMoreActive && "text-[#923C1F]"
            )}>
              <Menu className="h-4 w-4" />
            </div>
            <span className={cn(
              "text-xs mt-1 text-neutral-medium",
              isMoreActive && "text-[#923C1F]"
            )}>
              More
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

type NavLinkProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
};

function NavLink({ href, icon, label, active }: NavLinkProps) {
  return (
    <Link href={href}>
      <a className="flex flex-col items-center py-2 px-4">
        <div className={cn(
          "text-neutral-medium",
          active && "text-[#923C1F]"
        )}>
          {icon}
        </div>
        <span className={cn(
          "text-xs mt-1 text-neutral-medium",
          active && "text-[#923C1F]"
        )}>
          {label}
        </span>
      </a>
    </Link>
  );
}

type MoreMenuItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

function MoreMenuItem({ href, icon, label, onClick }: MoreMenuItemProps) {
  return (
    <Link href={href}>
      <a 
        className="flex flex-col items-center p-4 border border-neutral-light rounded-lg hover:bg-neutral-50 transition-colors"
        onClick={onClick}
      >
        <div className="text-neutral-medium mb-2">
          {icon}
        </div>
        <span className="text-sm text-neutral-dark text-center">
          {label}
        </span>
      </a>
    </Link>
  );
}
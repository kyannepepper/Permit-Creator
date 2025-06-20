import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Network,
  BarChart3,
} from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();

  return (
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
          active={location === "/applications" || location === "/applications/calendar"}
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
        <NavLink 
          href="/reports" 
          icon={<BarChart3 className="h-4 w-4" />} 
          label="Reports"
          active={location === "/reports" || location === "/invoices"}
        />
      </div>
    </div>
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
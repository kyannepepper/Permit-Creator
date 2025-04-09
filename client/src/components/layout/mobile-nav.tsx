import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Settings,
  BarChart3,
} from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();
  
  return (
    <div className="md:hidden bg-white border-t border-neutral-light fixed bottom-0 left-0 right-0 z-10">
      <div className="flex justify-around">
        <NavLink 
          href="/" 
          icon={<LayoutDashboard className="h-5 w-5" />} 
          label="Dashboard"
          active={location === "/"}
        />
        <NavLink 
          href="/permits" 
          icon={<FileText className="h-5 w-5" />} 
          label="Permits"
          active={location === "/permits"}
        />
        <NavLink 
          href="/permits/create" 
          icon={<PlusCircle className="h-5 w-5" />} 
          label="Create"
          active={location === "/permits/create"}
        />
        <NavLink 
          href="/reports" 
          icon={<BarChart3 className="h-5 w-5" />} 
          label="Reports"
          active={location === "/reports"}
        />
        <NavLink 
          href="/settings" 
          icon={<Settings className="h-5 w-5" />} 
          label="Settings"
          active={location === "/settings"}
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
          active && "text-primary"
        )}>
          {icon}
        </div>
        <span className={cn(
          "text-xs mt-1 text-neutral-medium",
          active && "text-primary"
        )}>
          {label}
        </span>
      </a>
    </Link>
  );
}

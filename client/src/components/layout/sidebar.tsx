import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Ban,
  Network,
  BarChart3,
  Users,
  Tag,
  Activity,
  Edit,
} from "lucide-react";

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
};

function NavItem({ href, icon, children, active }: NavItemProps) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center px-4 py-2 text-neutral-dark rounded-lg hover:bg-neutral-lightest transition-colors",
          active && "bg-[#923C1F] text-white hover:bg-[#923C1F]/90"
        )}
      >
        {icon}
        <span className="ml-2">{children}</span>
      </a>
    </Link>
  );
}

type NavSectionProps = {
  title: string;
  children: React.ReactNode;
};

function NavSection({ title, children }: NavSectionProps) {
  return (
    <div className="mb-2">
      <div className="flex items-center px-4 py-2 text-primary font-medium">
        <span>{title}</span>
      </div>
      <div className="pl-3">{children}</div>
    </div>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Check if the user has the required role
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  
  return (
    <aside className="w-64 bg-neutral-lightest border-r border-neutral-light overflow-y-auto hidden md:block">
      <nav className="p-4">
        <div className="mb-6">
          <NavItem 
            href="/" 
            icon={<LayoutDashboard className="w-5 h-5" />}
            active={location === "/"}
          >
            Dashboard
          </NavItem>
          
          <NavSection title="Applications">
            <NavItem 
              href="/permits" 
              icon={<FileText className="w-5 h-5" />}
              active={location === "/permits"}
            >
              View/Search
            </NavItem>
            <NavItem 
              href="/permits/create" 
              icon={<PlusCircle className="w-5 h-5" />}
              active={location === "/permits/create"}
            >
              Add Application
            </NavItem>
            {location.startsWith("/permits/edit") && (
              <NavItem 
                href={location} 
                icon={<Edit className="w-5 h-5" />}
                active={true}
              >
                Edit Application
              </NavItem>
            )}
          </NavSection>
          
          <NavSection title="Permit Templates">
            <NavItem 
              href="/permit-templates" 
              icon={<FileText className="w-5 h-5" />}
              active={location === "/permit-templates"}
            >
              View Permits
            </NavItem>
            <NavItem 
              href="/permit-templates/create" 
              icon={<PlusCircle className="w-5 h-5" />}
              active={location === "/permit-templates/create"}
            >
              Create Permit
            </NavItem>
            {location.startsWith("/permit-templates/edit") && (
              <NavItem 
                href={location} 
                icon={<Edit className="w-5 h-5" />}
                active={true}
              >
                Edit Template
              </NavItem>
            )}
          </NavSection>
          

          
          <NavSection title="State Parks">
            <NavItem 
              href="/parks" 
              icon={<Network className="w-5 h-5" />}
              active={location === "/parks"}
            >
              View Parks
            </NavItem>
            {isManager && (
              <NavItem 
                href="/parks/add" 
                icon={<PlusCircle className="w-5 h-5" />}
                active={location === "/parks/add"}
              >
                Add a Park
              </NavItem>
            )}
          </NavSection>
          
          <NavSection title="Reports">
            <NavItem 
              href="/reports" 
              icon={<BarChart3 className="w-5 h-5" />}
              active={location === "/reports"}
            >
              Generate Reports
            </NavItem>
            <NavItem 
              href="/invoices" 
              icon={<FileText className="w-5 h-5" />}
              active={location === "/invoices"}
            >
              Invoices
            </NavItem>
          </NavSection>
          
          {(isAdmin || isManager) && (
            <NavSection title="Administration">
              {isAdmin && (
                <>
                  <NavItem 
                    href="/staff-accounts" 
                    icon={<Users className="w-5 h-5" />}
                    active={location === "/staff-accounts"}
                  >
                    Staff Accounts
                  </NavItem>
                  <NavItem 
                    href="/roles" 
                    icon={<Tag className="w-5 h-5" />}
                    active={location === "/roles"}
                  >
                    Roles Information
                  </NavItem>
                </>
              )}
              <NavItem 
                href="/admin/activities" 
                icon={<Activity className="w-5 h-5" />}
                active={location === "/admin/activities"}
              >
                Insurance Requirements
              </NavItem>
            </NavSection>
          )}
        </div>
      </nav>
    </aside>
  );
}

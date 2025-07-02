import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Shield, User, UserCog } from "lucide-react";

type PermissionKey = "Create Permits" | "View Permits" | "Edit Permits" | "Delete Permits" | 
  "Create Blacklists" | "View Blacklists" | "Edit Blacklists" | "Delete Blacklists" |
  "Add Parks" | "Edit Parks" | "Delete Parks" | "Create Invoices" | "Edit Invoices" |
  "Access Reports" | "Manage Staff Accounts" | "Edit Activities";

type PermissionsMap = Record<PermissionKey, boolean>;

export default function RolesPage() {
  const roles: Array<{
    name: string;
    icon: React.ReactNode;
    description: string;
    permissions: PermissionsMap;
  }> = [
    {
      name: "Staff",
      icon: <User className="h-5 w-5 text-green-600" />,
      description: "General staff with basic access to create and view permits.",
      permissions: {
        "Create Permits": true,
        "View Permits": true,
        "Edit Permits": true,
        "Delete Permits": false,
        "Create Blacklists": true,
        "View Blacklists": true,
        "Edit Blacklists": true,
        "Delete Blacklists": true,
        "Add Parks": false,
        "Edit Parks": false,
        "Delete Parks": false,
        "Create Invoices": true,
        "Edit Invoices": true,
        "Access Reports": true,
        "Manage Staff Accounts": false,
        "Edit Activities": false
      }
    },
    {
      name: "Manager",
      icon: <UserCog className="h-5 w-5 text-blue-600" />,
      description: "Park managers with advanced permissions for park and activity management.",
      permissions: {
        "Create Permits": true,
        "View Permits": true,
        "Edit Permits": true,
        "Delete Permits": true,
        "Create Blacklists": true,
        "View Blacklists": true,
        "Edit Blacklists": true,
        "Delete Blacklists": true,
        "Add Parks": true,
        "Edit Parks": true,
        "Delete Parks": false,
        "Create Invoices": true,
        "Edit Invoices": true,
        "Access Reports": true,
        "Manage Staff Accounts": false,
        "Edit Activities": true
      }
    },
    {
      name: "Admin",
      icon: <Shield className="h-5 w-5 text-red-600" />,
      description: "System administrators with full access to all system features.",
      permissions: {
        "Create Permits": true,
        "View Permits": true,
        "Edit Permits": true,
        "Delete Permits": true,
        "Create Blacklists": true,
        "View Blacklists": true,
        "Edit Blacklists": true,
        "Delete Blacklists": true,
        "Add Parks": true,
        "Edit Parks": true,
        "Delete Parks": true,
        "Create Invoices": true,
        "Edit Invoices": true,
        "Access Reports": true,
        "Manage Staff Accounts": true,
        "Edit Activities": true
      }
    }
  ];
  
  const permissionGroups = {
    "Permits": ["Create Permits", "View Permits", "Edit Permits", "Delete Permits"],
    "Blacklists": ["Create Blacklists", "View Blacklists", "Edit Blacklists", "Delete Blacklists"],
    "Parks": ["Add Parks", "Edit Parks", "Delete Parks"],
    "Invoices": ["Create Invoices", "Edit Invoices"],
    "Reports": ["Access Reports"],
    "Administration": ["Manage Staff Accounts", "Edit Activities"]
  };

  return (
    <Layout title="Roles Information" subtitle="Overview of system roles and permissions">
      <div className="space-y-8">
        {/* Roles Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card key={role.name}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2">
                  {role.icon}
                  <span>{role.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                
                <div className="space-y-2">
                  {Object.entries(permissionGroups).map(([group, permissions]) => (
                    <div key={group} className="text-xs">
                      <div className="font-semibold text-primary mb-1">{group}</div>
                      <div className="grid grid-cols-2 gap-y-1">
                        {permissions.map(perm => (
                          <div key={perm} className="flex items-center space-x-1">
                            {role.permissions[perm as keyof PermissionsMap] ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                            <span>{perm.replace(/([A-Z])/g, ' $1').trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

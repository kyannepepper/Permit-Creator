import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Check, X, Shield, User, UserCog } from "lucide-react";

export default function RolesPage() {
  const roles = [
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
                            {role.permissions[perm] ? (
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
        
        {/* Permissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Permissions Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Permission</TableHead>
                    {roles.map(role => (
                      <TableHead key={role.name} className="text-center">{role.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(permissionGroups).map(([group, permissions]) => (
                    <>
                      <TableRow key={group} className="bg-gray-50">
                        <TableCell colSpan={4} className="font-medium text-primary">
                          {group}
                        </TableCell>
                      </TableRow>
                      
                      {permissions.map(perm => (
                        <TableRow key={perm}>
                          <TableCell>{perm}</TableCell>
                          {roles.map(role => (
                            <TableCell key={`${role.name}-${perm}`} className="text-center">
                              {role.permissions[perm] ? (
                                <Check className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-red-500 mx-auto" />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Role Descriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Role Descriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="flex items-center font-semibold mb-2 text-lg">
                <User className="h-5 w-5 text-green-600 mr-2" />
                Staff Role
              </h3>
              <p className="text-muted-foreground mb-2">
                Staff members are the primary users who handle day-to-day permit operations.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Create and manage permits for park activities</li>
                <li>Create and manage blacklists for unavailable locations</li>
                <li>Create invoices for permits</li>
                <li>View reports and statistics</li>
                <li>Cannot add or modify parks</li>
                <li>Cannot manage user accounts</li>
              </ul>
            </div>
            
            <div>
              <h3 className="flex items-center font-semibold mb-2 text-lg">
                <UserCog className="h-5 w-5 text-blue-600 mr-2" />
                Manager Role
              </h3>
              <p className="text-muted-foreground mb-2">
                Managers oversee operations at parks and have additional capabilities.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>All Staff permissions</li>
                <li>Add and modify park information</li>
                <li>Add and modify activity types</li>
                <li>Delete permits</li>
                <li>Cannot delete parks</li>
                <li>Cannot manage user accounts</li>
              </ul>
            </div>
            
            <div>
              <h3 className="flex items-center font-semibold mb-2 text-lg">
                <Shield className="h-5 w-5 text-red-600 mr-2" />
                Admin Role
              </h3>
              <p className="text-muted-foreground mb-2">
                Administrators have full system access and manage all aspects of the permit system.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>All Manager permissions</li>
                <li>Create, modify, and delete user accounts</li>
                <li>Delete parks</li>
                <li>System-wide configuration access</li>
                <li>Full reporting capabilities</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

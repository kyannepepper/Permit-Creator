import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";
import { User } from "@shared/schema";

// Type definitions
type UserWithoutPassword = Omit<User, 'password'>;

const createUserFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["staff", "manager", "admin"]),
  phone: z.string().optional(),
  assignedParkIds: z.array(z.number()).optional(),
});

const updateUserFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["staff", "manager", "admin"]),
  phone: z.string().optional(),
  assignedParkIds: z.array(z.number()).optional(),
});

type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
type UpdateUserFormValues = z.infer<typeof updateUserFormSchema>;

export default function StaffAccountsPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithoutPassword | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithoutPassword | null>(null);

  // Fetch users
  const { data: users, isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
  });

  // Fetch parks for assignment
  const { data: parks } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/parks"],
  });
  
  // Form setup for creating users
  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      phone: "",
      role: "staff",
      password: "",
      assignedParkIds: [],
    }
  });

  // Form setup for updating users
  const updateForm = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      phone: "",
      role: "staff",
      password: "",
      assignedParkIds: [],
    }
  });

  const [selectedParkIds, setSelectedParkIds] = useState<number[]>([]);
  
  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateUserFormValues) => {
      const requestData = {
        ...data,
        assignedParkIds: selectedParkIds,
      };
      return await apiRequest("POST", "/api/users", requestData);
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The new user account has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      setSelectedParkIds([]);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number, userData: Partial<UpdateUserFormValues> }) => {
      return await apiRequest("PATCH", `/api/users/${id}`, userData);
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user account has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setSelectedParkIds([]);
      updateForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user account has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditUser = async (user: UserWithoutPassword) => {
    setEditingUser(user);
    
    // Load user's assigned parks
    try {
      const response = await apiRequest("GET", `/api/users/${user.id}/parks`);
      const data = await response.json();
      const parkIds = data.map((park: any) => park.id);
      setSelectedParkIds(parkIds);
    } catch (error) {
      console.error("Failed to load user park assignments:", error);
      setSelectedParkIds([]);
    }
    
    // Pre-populate the form with user data
    updateForm.reset({
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role as "staff" | "manager" | "admin",
      password: "",
      assignedParkIds: [],
    });
    
    setIsEditDialogOpen(true);
  };
  
  const handleCreateSubmit = (data: CreateUserFormValues) => {
    createMutation.mutate(data);
  };
  
  const handleUpdateSubmit = (data: UpdateUserFormValues) => {
    if (!editingUser) return;
    
    // Filter out empty password
    const updateData = { ...data, assignedParkIds: selectedParkIds };
    if (!updateData.password || updateData.password.trim() === '') {
      delete updateData.password;
    }
    
    updateMutation.mutate({ id: editingUser.id, userData: updateData });
  };
  
  // Dialog open/close handlers
  const handleCreateUser = () => {
    createForm.reset();
    setSelectedParkIds([]);
    setIsCreateDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const columns = [
    {
      header: "Username",
      accessorKey: "username",
      enableSorting: true,
    },
    {
      header: "Name",
      accessorKey: "name",
      enableSorting: true,
    },
    {
      header: "Email",
      accessorKey: "email",
      enableSorting: true,
    },
    {
      header: "Role",
      accessorKey: "role",
      enableSorting: true,
      cell: (row: UserWithoutPassword) => (
        <span className={getRoleColor(row.role)}>
          {row.role.charAt(0).toUpperCase() + row.role.slice(1)}
        </span>
      ),
    },
    {
      header: "Phone",
      accessorKey: "phone",
      enableSorting: true,
      cell: (row: UserWithoutPassword) => row.phone || "N/A",
    },
    {
      header: "Actions",
      accessorKey: "actions",
      enableSorting: false,
      cell: (row: UserWithoutPassword) => (
        <div className="flex gap-2 min-w-fit">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditUser(row)}
            className="flex items-center gap-1"
          >
            <Edit className="h-3 w-3" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUserToDelete(row)}
            className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Layout title="Staff Accounts" subtitle="Manage user accounts and their park assignments">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading users...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Staff Accounts" subtitle="Manage user accounts and their park assignments">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={handleCreateUser} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column.accessorKey} className={column.accessorKey === 'actions' ? 'w-32' : ''}>
                        {column.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      {columns.map((column) => (
                        <TableCell key={`${user.id}-${column.accessorKey}`} className={column.accessorKey === 'actions' ? 'w-32' : ''}>
                          {column.cell ? column.cell(user) : (user as any)[column.accessorKey]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new staff user account. All fields are required.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  {...createForm.register("username")}
                  placeholder="Enter username"
                />
                {createForm.formState.errors.username && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  {...createForm.register("name")}
                  placeholder="Enter full name"
                />
                {createForm.formState.errors.name && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  {...createForm.register("email")}
                  type="email"
                  placeholder="Enter email address"
                />
                {createForm.formState.errors.email && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  {...createForm.register("phone")}
                  placeholder="Enter phone number"
                />
                {createForm.formState.errors.phone && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  onValueChange={(value) => createForm.setValue("role", value as "staff" | "manager" | "admin")}
                  defaultValue="staff"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.role && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  {...createForm.register("password")}
                  type="password"
                  placeholder="Enter password"
                />
                {createForm.formState.errors.password && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Park Assignment */}
            {createForm.watch("role") === "staff" && parks && (
              <div className="space-y-3">
                <Label>Park Access</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {parks.map((park) => (
                    <div key={park.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`park-${park.id}`}
                        checked={selectedParkIds.includes(park.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedParkIds([...selectedParkIds, park.id]);
                          } else {
                            setSelectedParkIds(selectedParkIds.filter(id => id !== park.id));
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`park-${park.id}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {park.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select parks this user can access. Leave empty for all parks access.
                </p>
                {createForm.formState.errors.assignedParkIds && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.assignedParkIds.message}</p>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                setSelectedParkIds([]);
                createForm.reset();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user account information and park assignments.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={updateForm.handleSubmit(handleUpdateSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  {...updateForm.register("username")}
                  placeholder="Enter username"
                />
                {updateForm.formState.errors.username && (
                  <p className="text-sm text-red-500">{updateForm.formState.errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  {...updateForm.register("name")}
                  placeholder="Enter full name"
                />
                {updateForm.formState.errors.name && (
                  <p className="text-sm text-red-500">{updateForm.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  {...updateForm.register("email")}
                  type="email"
                  placeholder="Enter email address"
                />
                {updateForm.formState.errors.email && (
                  <p className="text-sm text-red-500">{updateForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  {...updateForm.register("phone")}
                  placeholder="Enter phone number"
                />
                {updateForm.formState.errors.phone && (
                  <p className="text-sm text-red-500">{updateForm.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  onValueChange={(value) => updateForm.setValue("role", value as "staff" | "manager" | "admin")}
                  value={updateForm.watch("role")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {updateForm.formState.errors.role && (
                  <p className="text-sm text-red-500">{updateForm.formState.errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">New Password (Leave empty to keep current)</Label>
                <Input
                  {...updateForm.register("password")}
                  type="password"
                  placeholder="Enter new password"
                />
                {updateForm.formState.errors.password && (
                  <p className="text-sm text-red-500">{updateForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Park Assignment for Staff */}
            {updateForm.watch("role") === "staff" && parks && (
              <div className="space-y-3">
                <Label>Park Access</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {parks.map((park) => (
                    <div key={park.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-park-${park.id}`}
                        checked={selectedParkIds.includes(park.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedParkIds([...selectedParkIds, park.id]);
                          } else {
                            setSelectedParkIds(selectedParkIds.filter(id => id !== park.id));
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`edit-park-${park.id}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {park.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select parks this user can access. Leave empty for all parks access.
                </p>
                {updateForm.formState.errors.assignedParkIds && (
                  <p className="text-sm text-red-500">{updateForm.formState.errors.assignedParkIds.message}</p>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setEditingUser(null);
                setSelectedParkIds([]);
                updateForm.reset();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user account? This action cannot be undone.
              All park assignments for this user will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setUserToDelete(null)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDeleteUser}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// Helper function to get role badge color
function getRoleColor(role: string): string {
  switch (role) {
    case "admin":
      return "text-red-600 font-medium";
    case "manager":
      return "text-blue-600 font-medium";
    default:
      return "text-green-600";
  }
}
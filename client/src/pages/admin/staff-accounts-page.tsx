import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import Layout from "@/components/layout/layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Edit, Trash, PlusCircle, UserCog } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Skip the password for user updates
type UserWithoutPassword = Omit<User, 'password'>;

// Schema for creating or updating users
const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.enum(["staff", "manager", "admin"]),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  assignedParkIds: z.array(z.number()).optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function StaffAccountsPage() {
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithoutPassword | null>(null);
  const { toast } = useToast();
  
  // Fetch all users
  const { data: users, isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all parks for the dropdown
  const { data: parks } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/parks"],
  });
  
  // Form setup
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
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
    mutationFn: async (data: UserFormValues) => {
      return await apiRequest("POST", "/api/register", data);
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user account has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      reset();
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
    mutationFn: async ({ id, data }: { id: number, data: Partial<UserFormValues> }) => {
      return await apiRequest("PATCH", `/api/users/${id}`, { data });
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
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleEditUser = async (user: UserWithoutPassword) => {
    setEditingUser(user);
    
    // Load user's current park assignments
    try {
      const response = await fetch(`/api/users/${user.id}/parks`);
      if (response.ok) {
        const userParks = await response.json();
        const parkIds = userParks.map((park: any) => park.id);
        setSelectedParkIds(parkIds);
      } else {
        setSelectedParkIds([]);
      }
    } catch (error) {
      console.error("Failed to load user park assignments:", error);
      setSelectedParkIds([]);
    }
    
    // Pre-populate the form with user data
    reset({
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role as "staff" | "manager" | "admin",
    });
    
    setIsEditDialogOpen(true);
  };
  
  const handleCreateSubmit = (data: UserFormValues) => {
    if (!data.password) {
      toast({
        title: "Password required",
        description: "Password is required when creating a new user",
        variant: "destructive",
      });
      return;
    }
    
    // Include selected park IDs in the form data
    const formData = {
      ...data,
      assignedParkIds: selectedParkIds
    };
    createMutation.mutate(formData);
  };
  
  const handleUpdateSubmit = (data: UserFormValues) => {
    if (editingUser) {
      // Remove password if it's empty (no password change)
      const updateData = { ...data };
      if (!updateData.password) {
        delete updateData.password;
      }
      
      // Include selected park IDs
      const formData = {
        ...updateData,
        assignedParkIds: selectedParkIds
      };
      
      updateMutation.mutate({ id: editingUser.id, data: formData });
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
      header: "Phone",
      accessorKey: "phone",
      enableSorting: true,
      cell: (row: UserWithoutPassword) => row.phone || "N/A",
    },
    {
      header: "Role",
      accessorKey: "role",
      enableSorting: true,
      cell: (row: UserWithoutPassword) => (
        <span className={`capitalize ${getRoleColor(row.role)}`}>
          {row.role}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      enableSorting: false,
      cell: (row: UserWithoutPassword) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditUser(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setUserToDelete(row.id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout title="Staff Accounts" subtitle="Manage staff user accounts">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <UserCog className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Staff Accounts</h3>
        </div>
        <Button onClick={() => {
          reset(); // Reset form
          setIsCreateDialogOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create User Account
        </Button>
      </div>
      
      <DataTable
        columns={columns as any}
        data={users || []}
        searchField="name"
        isLoading={isLoading}
      />
      
      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new staff user account. All fields are required.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleCreateSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  {...register("username")}
                  placeholder="username"
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="John Smith"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="email@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="555-123-4567"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  defaultValue="staff"
                  onValueChange={(value) => {
                    setValue("role", value as "staff" | "manager" | "admin");
                  }}
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
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Park Access (Optional)</Label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 space-y-2">
                  {parks?.map((park) => (
                    <div key={park.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`park-${park.id}`}
                        checked={selectedParkIds.includes(park.id)}
                        onChange={(e) => {
                          const newSelectedParkIds = e.target.checked
                            ? [...selectedParkIds, park.id]
                            : selectedParkIds.filter(id => id !== park.id);
                          setSelectedParkIds(newSelectedParkIds);
                          setValue("assignedParkIds", newSelectedParkIds);
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`park-${park.id}`} className="text-sm font-normal">
                        {park.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Select parks this user can access. Leave empty for all parks access.
                </p>
                {errors.assignedParkIds && (
                  <p className="text-sm text-red-500">{errors.assignedParkIds.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setIsCreateDialogOpen(false)}
              >
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
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user account information. Leave password blank to keep existing password.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleUpdateSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  {...register("username")}
                  placeholder="username"
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="John Smith"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="email@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="555-123-4567"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  defaultValue={editingUser?.role}
                  onValueChange={(value) => {
                    register("role").onChange({ target: { value } });
                  }}
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
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder="Leave blank to keep current"
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={userToDelete !== null} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                // Would typically delete the user here
                toast({
                  title: "Not implemented",
                  description: "User deletion is not implemented in this version.",
                  variant: "destructive",
                });
                setUserToDelete(null);
              }} 
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User Account</DialogTitle>
            <DialogDescription>
              Update user information and park assignments.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleUpdateSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  {...register("username")}
                  placeholder="username"
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  {...register("name")}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...register("email")}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone (Optional)</Label>
                <Input
                  id="edit-phone"
                  {...register("phone")}
                  placeholder="555-123-4567"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={watch("role")}
                  onValueChange={(value) => {
                    setValue("role", value as "staff" | "manager" | "admin");
                  }}
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
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-password">Password (Optional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  {...register("password")}
                  placeholder="Leave empty to keep current password"
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Park Access (Optional)</Label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 space-y-2">
                {parks?.map((park) => (
                  <div key={park.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-park-${park.id}`}
                      checked={selectedParkIds.includes(park.id)}
                      onChange={(e) => {
                        const newSelectedParkIds = e.target.checked
                          ? [...selectedParkIds, park.id]
                          : selectedParkIds.filter(id => id !== park.id);
                        setSelectedParkIds(newSelectedParkIds);
                        setValue("assignedParkIds", newSelectedParkIds);
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`edit-park-${park.id}`} className="text-sm font-normal">
                      {park.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Select parks this user can access. Leave empty for all parks access.
              </p>
              {errors.assignedParkIds && (
                <p className="text-sm text-red-500">{errors.assignedParkIds.message}</p>
              )}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setEditingUser(null);
                setSelectedParkIds([]);
                reset();
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

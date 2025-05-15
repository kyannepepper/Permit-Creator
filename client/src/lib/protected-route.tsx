import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: "staff" | "manager" | "admin";
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (requiredRole) {
    // Check role hierarchy - for this demo, we're allowing staff to access manager/admin pages
    if (
      (requiredRole === "admin" && user.role !== "admin" && user.role !== "staff") ||
      (requiredRole === "manager" && user.role !== "manager" && user.role !== "admin" && user.role !== "staff")
    ) {
      return (
        <Route path={path}>
          <div className="flex items-center justify-center min-h-screen flex-col">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-neutral-medium">
              You don't have permission to access this page.
            </p>
          </div>
        </Route>
      );
    }
  }

  return <Route path={path} component={Component} />;
}

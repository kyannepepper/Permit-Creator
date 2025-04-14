import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import { ProtectedRoute } from "@/lib/protected-route";

// Permits
import PermitsPage from "@/pages/permits/permits-page";
import CreatePermitPage from "@/pages/permits/create-permit-page";
import EditPermitPage from "@/pages/permits/edit-permit-page";

// Blacklists
import BlacklistsPage from "@/pages/blacklists/blacklists-page";
import CreateBlacklistPage from "@/pages/blacklists/create-blacklist-page";

// Parks
import ParksPage from "@/pages/parks/parks-page";
import AddParkPage from "@/pages/parks/add-park-page";
import EditParkPage from "@/pages/parks/edit-park-page";

// Reports
import ReportsPage from "@/pages/reports/reports-page";

// Invoices
import InvoicePage from "@/pages/invoices/invoice-page";

// Permit Templates
import PermitTemplatesPage from "@/pages/permit-templates/permit-templates-page";
import CreateTemplatePage from "@/pages/permit-templates/create-template-page";
import EditTemplatePage from "@/pages/permit-templates/edit-template-page";

// Admin
import StaffAccountsPage from "@/pages/admin/staff-accounts-page";
import RolesPage from "@/pages/admin/roles-page";
import ActivitiesPage from "@/pages/admin/activities-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      
      {/* Permits */}
      <ProtectedRoute path="/permits" component={PermitsPage} />
      <ProtectedRoute path="/permits/create" component={CreatePermitPage} />
      <ProtectedRoute path="/permits/edit/:id" component={EditPermitPage} />
      
      {/* Blacklists */}
      <ProtectedRoute path="/blacklists" component={BlacklistsPage} />
      <ProtectedRoute path="/blacklists/create" component={CreateBlacklistPage} />
      
      {/* Parks */}
      <ProtectedRoute path="/parks" component={ParksPage} />
      <ProtectedRoute path="/parks/add" component={AddParkPage} requiredRole="manager" />
      <ProtectedRoute path="/parks/edit/:id" component={EditParkPage} requiredRole="manager" />
      
      {/* Reports */}
      <ProtectedRoute path="/reports" component={ReportsPage} />
      
      {/* Invoices */}
      <ProtectedRoute path="/invoices" component={InvoicePage} />
      
      {/* Permit Templates */}
      <ProtectedRoute path="/permit-templates" component={PermitTemplatesPage} />
      <ProtectedRoute path="/permit-templates/create" component={CreateTemplatePage} />
      <ProtectedRoute path="/permit-templates/edit/:id" component={EditTemplatePage} />
      
      {/* Admin */}
      <ProtectedRoute path="/staff-accounts" component={StaffAccountsPage} requiredRole="admin" />
      <ProtectedRoute path="/roles" component={RolesPage} requiredRole="admin" />
      <ProtectedRoute path="/activities" component={ActivitiesPage} requiredRole="manager" />
      
      {/* Auth */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

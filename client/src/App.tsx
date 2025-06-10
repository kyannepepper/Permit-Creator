import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ActivitiesProvider } from "@/hooks/use-activities";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import { ProtectedRoute } from "@/lib/protected-route";

// Applications
import ApplicationsPage from "@/pages/applications/applications-page";
import CreateApplicationPage from "@/pages/applications/create-application-page";

// Permits
import PermitsPage from "@/pages/permits/permits-page";
import CreatePermitPage from "@/pages/permits/create-permit-page";
import EditPermitPage from "@/pages/permits/edit-permit-page";

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
import TemplateDetailPage from "@/pages/permit-templates/template-detail-page";
import CreateTemplatePage from "@/pages/permit-templates/create-template-page";
import EditTemplatePage from "@/pages/permit-templates/edit-template-page";

// Admin
import StaffAccountsPage from "@/pages/admin/staff-accounts-page";
import RolesPage from "@/pages/admin/roles-page";
import ActivitiesPage from "@/pages/admin/activities-page";
import AddActivityPage from "@/pages/admin/add-activity-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      
      {/* Applications */}
      <ProtectedRoute path="/applications" component={ApplicationsPage} />
      
      {/* Permits */}
      <ProtectedRoute path="/permits" component={PermitsPage} />
      <ProtectedRoute path="/permits/create" component={CreatePermitPage} />
      <ProtectedRoute path="/permits/edit/:id" component={EditPermitPage} />
      
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
      <ProtectedRoute path="/permit-templates/view/:id" component={TemplateDetailPage} />
      <ProtectedRoute path="/permit-templates/create" component={CreateTemplatePage} />
      <ProtectedRoute path="/permit-templates/edit/:id" component={EditTemplatePage} />
      
      {/* Admin */}
      <ProtectedRoute path="/staff-accounts" component={StaffAccountsPage} requiredRole="admin" />
      <ProtectedRoute path="/roles" component={RolesPage} requiredRole="admin" />
      <ProtectedRoute path="/admin/activities" component={ActivitiesPage} requiredRole="manager" />
      <ProtectedRoute path="/admin/add-activity" component={AddActivityPage} requiredRole="manager" />
      
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
        <ActivitiesProvider>
          <Router />
          <Toaster />
        </ActivitiesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

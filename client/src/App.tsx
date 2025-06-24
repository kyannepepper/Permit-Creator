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
import ApplicationsCalendarPage from "@/pages/applications/applications-calendar-page";

// Permits
import PermitsPage from "@/pages/permit-templates/permit-templates-page";
import CreatePermitPage from "@/pages/permit-templates/create-template-page";
import CreateSimplePermitPage from "@/pages/permit-templates/create-simple-template-page";
import EditPermitPage from "@/pages/permits/edit-permit-page";
import EditTemplatePageSimple from "@/pages/permit-templates/edit-template-page-simple";

// Parks
import ParksPage from "@/pages/parks/parks-page";
import AddParkPage from "@/pages/parks/add-park-page";
import EditParkPage from "@/pages/parks/edit-park-page";

// Reports
import ReportsPage from "@/pages/reports/reports-page";

// Invoices
import InvoicePage from "@/pages/invoices/invoice-page";

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
      <ProtectedRoute path="/applications/calendar" component={ApplicationsCalendarPage} />
      
      {/* Permits */}
      <ProtectedRoute path="/permits" component={PermitsPage} />
      <ProtectedRoute path="/permits/create" component={CreateSimplePermitPage} />
      <ProtectedRoute path="/permits/edit/:id" component={EditPermitPage} />
      
      {/* Permit Templates */}
      <ProtectedRoute path="/permit-templates" component={PermitsPage} />
      <ProtectedRoute path="/permit-templates/create" component={CreateSimplePermitPage} />
      <ProtectedRoute path="/permit-templates/edit/:id" component={EditTemplatePageSimple} />
      
      {/* Parks */}
      <ProtectedRoute path="/parks" component={ParksPage} />
      <ProtectedRoute path="/parks/add" component={AddParkPage} requiredRole="manager" />
      <ProtectedRoute path="/parks/edit/:id" component={EditParkPage} requiredRole="manager" />
      
      {/* Reports */}
      <ProtectedRoute path="/reports" component={ReportsPage} />
      
      {/* Invoices */}
      <ProtectedRoute path="/invoices" component={InvoicePage} />
      

      
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

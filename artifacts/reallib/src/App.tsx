import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AdminLayout } from "@/components/layout/admin-layout";
import { isAuthenticated } from "@/lib/auth";

// Import pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students/index";
import NewStudent from "@/pages/students/new";
import EditStudent from "@/pages/students/edit";
import Seats from "@/pages/seats/index";
import Allocations from "@/pages/allocations/index";
import Attendance from "@/pages/attendance/index";
import Reports from "@/pages/reports/index";
import Settings from "@/pages/settings/index";
import PublicSeat from "@/pages/public-seat";

const queryClient = new QueryClient();

// Protected Route Wrapper
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  if (!isAuthenticated()) {
    return <Redirect to="/login" />;
  }
  return (
    <AdminLayout>
      <Component {...rest} />
    </AdminLayout>
  );
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to={isAuthenticated() ? "/dashboard" : "/login"} />} />
      <Route path="/login" component={Login} />
      
      {/* Protected Admin Routes */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/students"><ProtectedRoute component={Students} /></Route>
      <Route path="/students/new"><ProtectedRoute component={NewStudent} /></Route>
      <Route path="/students/:id/edit"><ProtectedRoute component={EditStudent} /></Route>
      <Route path="/seats"><ProtectedRoute component={Seats} /></Route>
      <Route path="/allocations"><ProtectedRoute component={Allocations} /></Route>
      <Route path="/attendance"><ProtectedRoute component={Attendance} /></Route>
      <Route path="/reports"><ProtectedRoute component={Reports} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>

      {/* Public Routes */}
      <Route path="/seat/:id" component={PublicSeat} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

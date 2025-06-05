import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DeveloperDashboard from "@/pages/developer-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import MyLogs from "@/pages/my-logs";
import TeamLogs from "@/pages/team-logs";
import TeamManagement from "@/pages/team-management";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DeveloperDashboard} />
      <ProtectedRoute path="/manager" component={ManagerDashboard} />
      <ProtectedRoute path="/my-logs" component={MyLogs} />
      <ProtectedRoute path="/team-logs" component={TeamLogs} />
      <ProtectedRoute path="/team-management" component={TeamManagement} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/layout/MainLayout";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { AlertProvider } from "@/context/alert-context";
import { EmergencyAlert } from "@/components/ui/emergency-alert";

import Dashboard from "@/pages/Dashboard/Dashboard";
import ClientList from "@/pages/Clients/ClientList";
import ClientForm from "@/pages/Clients/ClientForm";
import ClientDetails from "@/pages/Clients/ClientDetails";
import Login from "@/pages/Login";
import Reports from "@/pages/Reports";
import TeamList from "@/pages/Team/TeamList";
import AdditionalInfo from "@/pages/AdditionalInfo";
import UniversityDatabase from "@/pages/UniversityDatabase";
import Activity from "@/pages/Activity";
import CalendarDemo from "@/pages/CalendarDemo";
import ChangePassword from "@/pages/ChangePassword";

import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  // If auth is still checking (initial refresh), show nothing or a loader
  // This prevents the redirect below from firing too early
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Restoring session...</p>
        </div>
      </div>
    );
  }

  // Only redirect if we are CERTAIN the user is not logged in (isLoading is false and user is null)
  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <MainLayout>
      <Component {...rest} />
    </MainLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        {params => <ProtectedRoute component={Dashboard} />}
      </Route>

      <Route path="/activity">
        {params => <ProtectedRoute component={Activity} />}
      </Route>

      <Route path="/calendar">
        {params => <ProtectedRoute component={CalendarDemo} />}
      </Route>

      <Route path="/change-password">
        {params => <ProtectedRoute component={ChangePassword} />}
      </Route>
      
      {/* Client Routes */}
      <Route path="/clients">
        {params => <ProtectedRoute component={ClientList} />}
      </Route>
      <Route path="/clients/new">
        {params => <ProtectedRoute component={ClientForm} />}
      </Route>
      <Route path="/clients/:id/edit">
        {params => <ProtectedRoute component={ClientForm} params={params} />}
      </Route>
      <Route path="/clients/:id">
        {params => <ProtectedRoute component={ClientDetails} params={params} />}
      </Route>
      
      {/* Placeholder for other sidebar links to avoid 404s during demo */}
      <Route path="/reports">
        {params => <ProtectedRoute component={Reports} />}
      </Route>
      <Route path="/team">
        {params => <ProtectedRoute component={TeamList} />}
      </Route>
      <Route path="/additional-info">
        {params => <ProtectedRoute component={AdditionalInfo} />}
      </Route>

      <Route path="/university-db">
        {params => <ProtectedRoute component={UniversityDatabase} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

import { ThemeProvider } from "@/components/theme-provider"

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AlertProvider>
              <EmergencyAlert />
              <Router />
              <Toaster />
            </AlertProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/layout/MainLayout";
import { AuthProvider, useAuth } from "@/context/auth-context";

import Dashboard from "@/pages/Dashboard/Dashboard";
import ClientList from "@/pages/Clients/ClientList";
import ClientForm from "@/pages/Clients/ClientForm";
import ClientDetails from "@/pages/Clients/ClientDetails";
import Login from "@/pages/Login";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import TeamList from "@/pages/Team/TeamList";
import Activity from "@/pages/Activity";
import CalendarDemo from "@/pages/CalendarDemo";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

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
      <Route path="/settings">
        {params => <ProtectedRoute component={Settings} />}
      </Route>
      <Route path="/team">
        {params => <ProtectedRoute component={TeamList} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

import { LayoutProvider } from "@/layout/LayoutContext";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LayoutProvider>
            <Router />
            <Toaster />
          </LayoutProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

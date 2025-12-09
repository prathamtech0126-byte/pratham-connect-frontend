import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/layout/MainLayout";
import { AuthProvider, useAuth } from "@/context/auth-context";

import Dashboard from "@/pages/Dashboard/Dashboard";
import StudentList from "@/pages/Students/StudentList";
import StudentForm from "@/pages/Students/StudentForm";
import StudentDetails from "@/pages/Students/StudentDetails";
import Login from "@/pages/Login";
import Activity from "@/pages/Activity";

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
      
      {/* Student Routes */}
      <Route path="/students">
        {params => <ProtectedRoute component={StudentList} />}
      </Route>
      <Route path="/students/new">
        {params => <ProtectedRoute component={StudentForm} />}
      </Route>
      <Route path="/students/:id/edit">
        {params => <ProtectedRoute component={StudentForm} params={params} />}
      </Route>
      <Route path="/students/:id">
        {params => <ProtectedRoute component={StudentDetails} params={params} />}
      </Route>
      
      {/* Placeholder for other sidebar links to avoid 404s during demo */}
      <Route path="/reports">
         <Redirect to="/" />
      </Route>
      <Route path="/settings">
         <Redirect to="/" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/layout/MainLayout";

import Dashboard from "@/pages/Dashboard/Dashboard";
import StudentList from "@/pages/Students/StudentList";
import StudentForm from "@/pages/Students/StudentForm";
import StudentDetails from "@/pages/Students/StudentDetails";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        
        {/* Student Routes */}
        <Route path="/students" component={StudentList} />
        <Route path="/students/new" component={StudentForm} />
        <Route path="/students/:id/edit" component={StudentForm} />
        <Route path="/students/:id" component={StudentDetails} />
        
        {/* Placeholder for other sidebar links to avoid 404s during demo */}
        <Route path="/reports">
           <Redirect to="/" />
        </Route>
        <Route path="/settings">
           <Redirect to="/" />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

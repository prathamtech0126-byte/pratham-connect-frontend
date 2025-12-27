import { Switch, Route } from "wouter";
import { AuthProvider } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import Dashboard from "@/pages/Dashboard/Dashboard";
import Login from "@/pages/Login";
import ClientList from "@/pages/Clients/ClientList";
import ClientForm from "@/pages/Clients/ClientForm";
import ClientDetails from "@/pages/Clients/ClientDetails";
import Reports from "@/pages/Reports";
import TeamList from "@/pages/Team/TeamList";
import AdditionalInfo from "@/pages/AdditionalInfo";
import UniversityDatabase from "@/pages/UniversityDatabase";
import Activity from "@/pages/Activity";
import CalendarDemo from "@/pages/CalendarDemo";
import ChangePassword from "@/pages/ChangePassword";
import { MainLayout } from "@/layout/MainLayout";

function ProtectedWrapper({ component: Component, ...rest }: any) {
  return (
    <MainLayout>
      <ProtectedRoute component={Component} {...rest} />
    </MainLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        <ProtectedWrapper component={Dashboard} />
      </Route>

      <Route path="/activity">
        <ProtectedWrapper component={Activity} />
      </Route>

      <Route path="/calendar">
        <ProtectedWrapper component={CalendarDemo} />
      </Route>

      <Route path="/change-password">
        <ProtectedWrapper component={ChangePassword} />
      </Route>
      
      <Route path="/clients">
        <ProtectedWrapper component={ClientList} />
      </Route>
      <Route path="/clients/new">
        <ProtectedWrapper component={ClientForm} />
      </Route>
      <Route path="/clients/:id/edit">
        {params => <ProtectedWrapper component={ClientForm} params={params} />}
      </Route>
      <Route path="/clients/:id">
        {params => <ProtectedWrapper component={ClientDetails} params={params} />}
      </Route>
      
      <Route path="/reports">
        <ProtectedWrapper component={Reports} />
      </Route>
      <Route path="/team">
        <ProtectedWrapper component={TeamList} />
      </Route>
      <Route path="/additional-info">
        <ProtectedWrapper component={AdditionalInfo} />
      </Route>

      <Route path="/university-db">
        <ProtectedWrapper component={UniversityDatabase} />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
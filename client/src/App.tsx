import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/layout/MainLayout";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { SocketProvider } from "@/context/socket-context";
import { AlertProvider } from "@/context/alert-context";
import { EmergencyAlert } from "@/components/ui/emergency-alert";
import { MessageProvider } from "@/components/message-provider";
import { MessageErrorBoundary } from "@/components/message-error-boundary";

import { Loader2 } from "lucide-react";

// Lazy-load route components so initial bundle is smaller and first paint is faster
const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/Dashboard/Dashboard"));
const ClientList = lazy(() => import("@/pages/Clients/ClientList"));
const CounsellorClientsPage = lazy(() => import("@/pages/Clients/CounsellorClientsPage"));
const AllCounsellorClientsPage = lazy(() => import("@/pages/Clients/AllCounsellorClientsPage"));
const ClientForm = lazy(() => import("@/pages/Clients/ClientForm"));
const ClientDetails = lazy(() => import("@/pages/Clients/ClientDetails"));
const ClientView = lazy(() => import("@/pages/Clients/ClientView"));
const ClientArchive = lazy(() => import("@/pages/Clients/ClientArchive"));
const Login = lazy(() => import("@/pages/Login"));
const TeamList = lazy(() => import("@/pages/Team/TeamList"));
const AdditionalInfo = lazy(() => import("@/pages/AdditionalInfo"));
const UniversityDatabase = lazy(() => import("@/pages/UniversityDatabase"));
const Activity = lazy(() => import("@/pages/Activity"));
const Messages = lazy(() => import("@/pages/Messages"));
const CalendarDemo = lazy(() => import("@/pages/CalendarDemo"));
const ChangePassword = lazy(() => import("@/pages/ChangePassword"));
const CounsellorLeaderboard = lazy(() => import("@/pages/CounsellorLeaderboard/CounsellorLeaderboard"));
const ManagerLeaderboard = lazy(() => import("@/pages/ManagerLeaderboard/ManagerLeaderboard"));
const Reports = lazy(() => import("@/pages/Reports"));
const CounsellorReportPage = lazy(() => import("@/pages/Reports/CounsellorReportPage"));
const ChecklistPage = lazy(() => import("@/pages/ChecklistPage"));
// const LeadList = lazy(() => import("@/pages/Leads/LeadList"));
// const LeadDetail = lazy(() => import("@/pages/Leads/LeadDetail"));
// const LeadKanban = lazy(() => import("@/pages/Leads/LeadKanban"));
// const LeadAutomation = lazy(() => import("@/pages/Leads/LeadAutomation"));
// const LeadAutomationConfigure = lazy(() => import("@/pages/Leads/LeadAutomationConfigure"));
// const LeadImport = lazy(() => import("@/pages/Leads/LeadImport"));
// const LeadReports = lazy(() => import("@/pages/Leads/LeadReports"));

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  // ✅ STRICT AUTHENTICATION CHECK
  // If auth is still checking (initial refresh), show loading state
  // This prevents the redirect below from firing too early
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // ✅ CRITICAL: Only allow access if user is authenticated
  // If no user after loading completes, redirect to login immediately
  // This ensures NO pages can be accessed without proper authentication
  if (!user) {
    // Clear any stale/invalid data
    localStorage.removeItem('auth_user');
    localStorage.removeItem('accessToken');
    // Force redirect to login
    return <Redirect to="/login" />;
  }

  // ✅ User is authenticated, render the protected component
  return (
    <MainLayout>
      <Component {...rest} />
    </MainLayout>
  );
}

const PageLoadFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground animate-pulse">Loading...</p>
    </div>
  </div>
);

function Router() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageLoadFallback />}>
      <Switch>
        {/* ✅ If user is logged in and tries to access /login, redirect to dashboard */}
        <Route path="/login">
          {() => {
            if (user) {
              return <Redirect to="/" />;
            }
            return <Login />;
          }}
        </Route>

        <Route path="/">
          {params => <ProtectedRoute component={Dashboard} />}
        </Route>

        <Route path="/dashboard">
          {params => <Redirect to="/" />}
        </Route>

        <Route path="/activity">
          {params => <ProtectedRoute component={Activity} />}
        </Route>

        <Route path="/reports">
          {params => <ProtectedRoute component={Reports} />}
        </Route>
        <Route path="/reports/counsellor/:id">
          {params => <ProtectedRoute component={CounsellorReportPage} params={params} />}
        </Route>

        <Route path="/messages">
          {params => <ProtectedRoute component={Messages} />}
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
        <Route path="/clients/all-counsellor-clients">
          {params => <ProtectedRoute component={AllCounsellorClientsPage} />}
        </Route>
        <Route path="/clients/counsellor/:counsellorId">
          {params => <ProtectedRoute component={CounsellorClientsPage} params={params} />}
        </Route>
        <Route path="/clients/archive">
          {params => <ProtectedRoute component={ClientArchive} />}
        </Route>
        <Route path="/clients/archive/counsellor/:counsellorId">
          {params => <ProtectedRoute component={CounsellorClientsPage} params={params} />}
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
        <Route path="/clients/:id/view">
          {params => <ProtectedRoute component={ClientView} params={params} />}
        </Route>

        {/* <Route path="/leads/kanban">
          {() => <ProtectedRoute component={LeadKanban} />}
        </Route>
        <Route path="/leads/automation/configure/:id">
          {(params) => <ProtectedRoute component={LeadAutomationConfigure} params={params} />}
        </Route>
        <Route path="/leads/automation">
          {() => <ProtectedRoute component={LeadAutomation} />}
        </Route>
        <Route path="/leads/import">
          {() => <ProtectedRoute component={LeadImport} />}
        </Route>
        <Route path="/leads/reports">
          {() => <ProtectedRoute component={LeadReports} />}
        </Route>
        <Route path="/leads/:id">
          {(params) => <ProtectedRoute component={LeadDetail} params={params} />}
        </Route>
        <Route path="/leads">
          {() => <ProtectedRoute component={LeadList} />}
        </Route> */}

        <Route path="/overall-report">
          {params => <ProtectedRoute component={OverallReport} />}
        </Route>

        <Route path="/team">
          {params => <ProtectedRoute component={TeamList} />}
        </Route>
        <Route path="/manager-leaderboard">
          {params => <ProtectedRoute component={ManagerLeaderboard} />}
        </Route>
        <Route path="/counsellor-leaderboard">
          {params => <ProtectedRoute component={CounsellorLeaderboard} />}
        </Route>
        <Route path="/additional-info">
          {params => <ProtectedRoute component={AdditionalInfo} />}
        </Route>

        <Route path="/university-db">
          {params => <ProtectedRoute component={UniversityDatabase} />}
        </Route>

        <Route path="/checklists">
          {params => <ProtectedRoute component={ChecklistPage} />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

import { ThemeProvider } from "@/components/theme-provider"
import { FaviconUpdater } from "@/components/favicon-updater"
import OverallReport from "./pages/OverallReport";

/** In production: fetch deployed version and reload if newer so users don't stay on cached old build. */
function useVersionCheck() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const currentVersion = (import.meta as any).env?.VITE_APP_VERSION;
    if (!currentVersion) return;

    const check = () => {
      fetch("/version.json", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { version?: string } | null) => {
          if (data?.version && data.version !== currentVersion) {
            window.location.reload();
          }
        })
        .catch(() => {});
    };

    check();
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
}

function App() {
  useVersionCheck();
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <FaviconUpdater />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <SocketProvider>
              <AlertProvider>
                <MessageErrorBoundary>
                  <MessageProvider>
                    <EmergencyAlert />
                    <Router />
                    <Toaster />
                  </MessageProvider>
                </MessageErrorBoundary>
              </AlertProvider>
            </SocketProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

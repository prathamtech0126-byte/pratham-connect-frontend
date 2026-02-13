import { lazy, Suspense } from "react";
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
        <Route path="/clients/archive">
          {params => <ProtectedRoute component={ClientArchive} />}
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

        <Route path="/team">
          {params => <ProtectedRoute component={TeamList} />}
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

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

import { ThemeProvider } from "@/components/theme-provider"
import { FaviconUpdater } from "@/components/favicon-updater"

function App() {
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

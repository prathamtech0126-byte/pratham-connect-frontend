

import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/layout/MainLayout";
import { AuthProvider, useAuth, UserRole } from "@/context/auth-context";
import {
  APPLICATION_ALLOWED_ROLES,
  BACKEND_ALLOWED_ROLES,
  BACKEND_CHECKLIST_ADMIN_ROLES,
  BINDING_ALLOWED_ROLES,
  CLIENT_FOLDER_ALLOWED_ROLES,
  CX_ALLOWED_ROLES,
  INCENTIVE_ROLES,
  LEAD_AUTOMATION_ALLOWED_ROLES,
} from "@/constants/roles";
import { canAccessByRole } from "@/lib/role-access";
import { SocketProvider } from "@/context/socket-context";
import { AlertProvider } from "@/context/alert-context";
import { EmergencyAlert } from "@/components/ui/emergency-alert";
import { NotificationProvider } from "@/notification/context/notification-context";
import { MessageProvider } from "@/components/message-provider";
import { MessageErrorBoundary } from "@/components/message-error-boundary";

import { LoadingScreen } from "@/components/ui/loading-screen";

// Lazy-load route components so initial bundle is smaller and first paint is faster
const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/Dashboard/Dashboard"));
const TelecalerDashbord = lazy(() => import("@/pages/Dashboard/TelecalerDashbord"));
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
const TelecallerLeaderboard = lazy(() => import("@/pages/TelecallerLeaderboard/TelecallerLeaderboard"));
const ManagerLeaderboard = lazy(() => import("@/pages/ManagerLeaderboard/ManagerLeaderboard"));
const Reports = lazy(() => import("@/pages/Reports"));
const CounsellorReportPage = lazy(() => import("@/pages/Reports/CounsellorReportPage"));

const ChecklistPage = lazy(() => import("@/pages/ChecklistPage"));
const AddChecklistPage = lazy(() => import("@/pages/AddChecklistPage"));
const TechSupportPage = lazy(() => import("@/pages/tech-support/TechSupportPage"));
const DeviceInfoPage = lazy(() => import("@/pages/tech-support/DeviceInfo"));
const PaymentsPage = lazy(() => import("@/pages/Reports/PaymentsPage"));
const BackendReportPage = lazy(() => import("@/pages/Reports/BackendReportPage"));
const IncentivesPage = lazy(() => import("@/pages/IncentivesPage"))
const IncentivesApprovedPage = lazy(() => import("@/pages/IncentivesApprovedPage"))
const IncentiveRulesPage = lazy(() => import("@/pages/IncentiveRulesPage"))

const LeadList = lazy(() => import("@/pages/Leads/LeadList"));
const CounsellorLeadsPage = lazy(() => import("@/pages/Leads/CounsellorLeadsPage"));
const LeadDetail = lazy(() => import("@/pages/Leads/LeadDetail"));
const LeadKanban = lazy(() => import("@/pages/Leads/LeadKanban"));
const LeadAutomation = lazy(() => import("@/pages/Leads/LeadAutomation"));
const LeadAutomationConfigure = lazy(() => import("@/pages/Leads/LeadAutomationConfigure"));
const FacebookLeadAutomation = lazy(() => import("@/pages/Leads/FacebookLeadAutomation"));
const MetaConversionsPage = lazy(() => import("@/pages/Leads/MetaConversionsPage"));
const FacebookManualDistribution = lazy(() => import("@/pages/Leads/FacebookManualDistribution"));
const FacebookMasterDistribution = lazy(() => import("@/pages/Leads/FacebookMasterDistribution"));
const LeadImport = lazy(() => import("@/pages/Leads/LeadImport"));
const LeadReports = lazy(() => import("@/pages/Leads/LeadReports"));
const DailyLeadReport = lazy(() => import("@/pages/Leads/DailyLeadReport"));
const IndividualTelecallerAnalysis = lazy(() => import("@/pages/Leads/IndividualTelecallerAnalysis"));
const CounsellorLeadReport = lazy(() => import("@/pages/Leads/CounsellorLeadReport"));
const TelecallerWiseLead = lazy(() => import("@/pages/Leads/TelecallerWiseLead"));
const FrontDeskPortal = lazy(() => import("@/pages/FrontDesk/FrontDeskPortal"));
const FrontDeskActivity = lazy(() => import("@/pages/FrontDesk/FrontDeskActivity"));
const LeadSelfEditPage = lazy(() => import("@/pages/LeadSelfEdit/LeadSelfEditPage"));
const MarketingHeadDashboard = lazy(() => import("@/pages/Dashboard/MarketingHeadDashboard"));
const MaintenanceSettingsPage = lazy(() => import("@/pages/MaintenanceSettingsPage"));
const BackendClientsPage = lazy(() => import("@/pages/Bakend Team/Backend Team/BK_Clients"));
const CxDashboardPage    = lazy(() => import("@/pages/Bakend Team/CX Team/CX_Dashboard"));
const CxClientsPage      = lazy(() => import("@/pages/Bakend Team/CX Team/CX_Clients"));
const CxVisaTrackerPage  = lazy(() => import("@/pages/Bakend Team/CX Team/CX_VisaTracker"));
const CxDocumentsPage    = lazy(() => import("@/pages/Bakend Team/CX Team/CX_Documents"));
const CxActivityFeedPage = lazy(() => import("@/pages/Bakend Team/CX Team/CX_ActivityFeed"));
const CxEscalationsPage  = lazy(() => import("@/pages/Bakend Team/CX Team/CX_Escalations"));
const CxDocumentRequestsPage = lazy(() => import("@/pages/Bakend Team/CX Team/CX_DocumentRequests"));
const CxKanbanPage       = lazy(() => import("@/pages/Bakend Team/CX Team/CX_Kanban"));
const CxMyReportPage          = lazy(() => import("@/pages/Bakend Team/CX Team/CX_MyReport"));
const CxDocumentReviewPage    = lazy(() => import("@/pages/Bakend Team/CX Team/CX_DocumentReview"));

const BtDashboardPage         = lazy(() => import("@/pages/Bakend Team/Binding Team/BT_Dashboard"));
const BtClientsPage           = lazy(() => import("@/pages/Bakend Team/Binding Team/BT_Clients"));
const BtKanbanPage            = lazy(() => import("@/pages/Bakend Team/Binding Team/BT_Kanban"));
const BtClientDetailPage      = lazy(() => import("@/pages/Bakend Team/Binding Team/BT_ClientDetail"));
const BtBindingStudioPage     = lazy(() => import("@/pages/Bakend Team/Binding Team/BT_BindingStudio"));
const BtMyReportPage          = lazy(() => import("@/pages/Bakend Team/Binding Team/BT_MyReport"));


// const ChecklistPage = lazy(() => import("@/pages/ChecklistPage"));
// const AddChecklistPage = lazy(() => import("@/pages/AddChecklistPage"));
// const LeadList = lazy(() => import("@/pages/Leads/LeadList"));
// const LeadDetail = lazy(() => import("@/pages/Leads/LeadDetail"));
// const LeadKanban = lazy(() => import("@/pages/Leads/LeadKanban"));
// const LeadAutomation = lazy(() => import("@/pages/Leads/LeadAutomation"));
// const LeadAutomationConfigure = lazy(() => import("@/pages/Leads/LeadAutomationConfigure"));
// const LeadImport = lazy(() => import("@/pages/Leads/LeadImport"));
// const LeadReports = lazy(() => import("@/pages/Leads/LeadReports"));

// // CX module pages
// const CxDashboardPage = lazy(() => import("@/modules/cx/pages/DashboardPage"));
// const CxClientListPage = lazy(() => import("@/modules/cx/pages/ClientListPage"));
// const CxActivityPage = lazy(() => import("@/modules/cx/pages/ActivityPage"));
// const CxReportsPage = lazy(() => import("@/modules/cx/pages/ReportsPage"));

// // Binding module pages
// const BindingDashboardPage = lazy(() => import("@/modules/binding/pages/DashboardPage"));
// const BindingClientListPage = lazy(() => import("@/modules/binding/pages/ClientListPage"));
const BindingActivityPage = lazy(() => import("@/pages/Bakend Team/Binding Team/BT_ActivityFeed"));
// const BindingReportsPage = lazy(() => import("@/modules/binding/pages/ReportsPage"));

// // Application module pages
// const ApplicationDashboardPage = lazy(() => import("@/modules/application/pages/DashboardPage"));
// const ApplicationClientListPage = lazy(() => import("@/modules/application/pages/ClientListPage"));
// const ApplicationActivityPage = lazy(() => import("@/modules/application/pages/ActivityPage"));
// const ApplicationReportsPage = lazy(() => import("@/modules/application/pages/ReportsPage"));

// // Backend module pages
// const BackendFillingClientPage = lazy(() => import("@/modules/backend/pages/FillingClientPage"));

function ProtectedRoute({ component: Component, allowedRoles, ...rest }: any) {
  const { user, isLoading } = useAuth();

  // ✅ STRICT AUTHENTICATION CHECK
  // If auth is still checking (initial refresh), show loading state
  // This prevents the redirect below from firing too early
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
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

  if (allowedRoles && !canAccessByRole(user.role, allowedRoles as UserRole[])) {
    return <Redirect to="/" />;
  }

  // ✅ User is authenticated, render the protected component
  return (
    <MainLayout>
      <Component {...rest} />
    </MainLayout>
  );
}

const PageLoadFallback = () => <LoadingScreen message="Loading..." />;

function Router() {
  const { user } = useAuth();
  const { isActive: isMaintenanceLive, armed, startTime, endTime } = useMaintenance();
  const { isActive: isBlockingAlertActive } = useAlert();
  const isTechSupportOnlyUser = user?.role === "tech_support";
  const isFrontDeskUser = user?.role === "front_desk";
  const isMarketingHeadUser = user?.role === "marketing_head";

  const liveSessionKey = buildMaintenanceSessionKey(armed, true, startTime, endTime);

  // After user acknowledges the live maintenance alert, show the full maintenance screen.
  if (
    user &&
    user.role !== "developer" &&
    isMaintenanceLive &&
    !isBlockingAlertActive &&
    hasAcknowledgedMaintenanceSession(liveSessionKey)
  ) {
    return <MaintenancePage />;
  }

  return (
    <Suspense fallback={<PageLoadFallback />}>
      <Switch>
        <Route path="/lead/edit">
          {() => <LeadSelfEditPage />}
        </Route>
        <Route>
          {() =>
      isFrontDeskUser ? (
        <Switch>
          <Route path="/login">
            {() => <Redirect to="/front-desk" />}
          </Route>
          <Route path="/front-desk/leads/:id">
            {() => <ProtectedRoute component={FrontDeskPortal} allowedRoles={["front_desk", "developer"] as UserRole[]} />}
          </Route>
          <Route path="/front-desk/activity">
            {() => <ProtectedRoute component={FrontDeskActivity} allowedRoles={["front_desk", "developer", "superadmin"] as UserRole[]} />}
          </Route>
          <Route path="/front-desk">
            {() => <ProtectedRoute component={FrontDeskPortal} allowedRoles={["front_desk", "developer"] as UserRole[]} />}
          </Route>
          <Route path="/change-password">
            {params => <ProtectedRoute component={ChangePassword} />}
          </Route>
          <Route>
            {() => <Redirect to="/front-desk" />}
          </Route>
        </Switch>
      ) : isTechSupportOnlyUser ? (
        <Switch>
          <Route path="/login">
            {() => <Redirect to="/tech-support" />}
          </Route>
          <Route path="/">
            {params => <ProtectedRoute component={Dashboard} />}
          </Route>
          <Route path="/dashboard">
            {params => <Redirect to="/" />}
          </Route>
          <Route path="/tech-support">
            {params => <ProtectedRoute component={TechSupportPage} />}
          </Route>
          <Route path="/tech-support/device-info">
            {params => <ProtectedRoute component={DeviceInfoPage} />}
          </Route>
          <Route>
            {() => <Redirect to="/tech-support" />}
          </Route>
        </Switch>
      ) : (
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
          {params => <ProtectedRoute component={
            user?.role === "telecaller" ? TelecalerDashbord :
            user?.role === "marketing_head" ? MarketingHeadDashboard :
            user?.role === "customer_experience" ? CxDashboardPage :
            user?.role === "binding_team" ? BtDashboardPage :
            Dashboard
          } />}
        </Route>

        <Route path="/cx-dashboard">
          {() => <ProtectedRoute component={CxDashboardPage} allowedRoles={["customer_experience", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/cx/clients">
          {() => <ProtectedRoute component={CxClientsPage} allowedRoles={["customer_experience", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/backend/clients">
          {() => <ProtectedRoute component={BackendClientsPage} allowedRoles={["backend_manager", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/cx/visa-tracker">
          {() => <ProtectedRoute component={CxVisaTrackerPage} allowedRoles={["customer_experience", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/cx/documents">
          {() => <ProtectedRoute component={CxDocumentsPage} allowedRoles={["customer_experience", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/cx/activity-feed">
          {() => <ProtectedRoute component={CxActivityFeedPage} allowedRoles={["customer_experience", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/cx/escalations">
          {() => <ProtectedRoute component={CxEscalationsPage} allowedRoles={["customer_experience", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/cx/document-requests">
          {() => <ProtectedRoute component={CxDocumentRequestsPage} allowedRoles={["customer_experience", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        {/* <Route path="/cx/kanban">
          {() => <ProtectedRoute component={CxKanbanPage} allowedRoles={["customer_experience", "superadmin", "developer"] as UserRole[]} />}
        </Route> */}
        {/* <Route path="/binding/kanban">
          {() => <ProtectedRoute component={BtKanbanPage} allowedRoles={["binding_team", "superadmin", "developer"] as UserRole[]} />}
        </Route> */}
        <Route path="/cx/my-report">
          {() => <ProtectedRoute component={CxMyReportPage} allowedRoles={["customer_experience", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/cx/documents/:clientId">
          {(params) => <ProtectedRoute component={CxDocumentReviewPage} params={params} allowedRoles={["customer_experience", "superadmin", "developer"] as UserRole[]} />}
        </Route>

        <Route path="/binding/dashboard">
          {() => <ProtectedRoute component={BtDashboardPage} allowedRoles={["binding_team", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/binding/clients">
          {() => <ProtectedRoute component={BtClientsPage} allowedRoles={["binding_team", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/binding/client/:id">
          {(params) => <ProtectedRoute component={BtClientDetailPage} params={params} allowedRoles={["binding_team", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/binding/studio/:clientId">
          {(params) => <ProtectedRoute component={BtBindingStudioPage} params={params} allowedRoles={["binding_team", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/binding/my-report">
          {() => <ProtectedRoute component={BtMyReportPage} allowedRoles={["binding_team", "superadmin", "developer"] as UserRole[]} />}
        </Route>
        <Route path="/binding/activity">
          {() => <ProtectedRoute component={BindingActivityPage} allowedRoles={["binding_team", "superadmin", "developer"] as UserRole[]} />}
        </Route>

        <Route path="/dashboard">
          {params => <Redirect to="/" />}
        </Route>

        <Route path="/telecaller-dashboard">
          {params => <ProtectedRoute component={TelecalerDashbord} allowedRoles={["telecaller"] as UserRole[]} />}
        </Route>

        <Route path="/marketing-dashboard">
          {params => <ProtectedRoute component={MarketingHeadDashboard} allowedRoles={["marketing_head", "superadmin", "developer"] as UserRole[]} />}
        </Route>

        <Route path="/activity">
          {params => <ProtectedRoute component={Activity} />}
        </Route>

        <Route path="/cx/dashboard">
          {params => <ProtectedRoute component={CxDashboardPage} allowedRoles={CX_ALLOWED_ROLES} />}
        </Route>
        {/* <Route path="/cx/clients">
          {params => <ProtectedRoute component={CxClientListPage} allowedRoles={CX_ALLOWED_ROLES} />}
        </Route>
        <Route path="/cx/clients/:id">
          {params => <ProtectedRoute component={BackendFillingClientPage} params={params} allowedRoles={CX_ALLOWED_ROLES} />}
        </Route>
        <Route path="/cx/activity">
          {params => <ProtectedRoute component={CxActivityPage} allowedRoles={CX_ALLOWED_ROLES} />}
        </Route>
        <Route path="/cx/reports">
          {params => <ProtectedRoute component={CxReportsPage} allowedRoles={CX_ALLOWED_ROLES} />}
        </Route>

        <Route path="/binding/dashboard">
          {params => <ProtectedRoute component={BindingDashboardPage} allowedRoles={BINDING_ALLOWED_ROLES} />}
        </Route>
        <Route path="/binding/clients">
          {params => <ProtectedRoute component={BindingClientListPage} allowedRoles={BINDING_ALLOWED_ROLES} />}
        </Route>
        <Route path="/binding/clients/:id">
          {params => <ProtectedRoute component={BackendFillingClientPage} params={params} allowedRoles={BINDING_ALLOWED_ROLES} />}
        </Route>
        <Route path="/binding/activity">
          {params => <ProtectedRoute component={BindingActivityPage} allowedRoles={BINDING_ALLOWED_ROLES} />}
        </Route>
        <Route path="/binding/reports">
          {params => <ProtectedRoute component={BindingReportsPage} allowedRoles={BINDING_ALLOWED_ROLES} />}
        </Route>

        <Route path="/application/dashboard">
          {params => <ProtectedRoute component={ApplicationDashboardPage} allowedRoles={APPLICATION_ALLOWED_ROLES} />}
        </Route>
        <Route path="/application/clients">
          {params => <ProtectedRoute component={ApplicationClientListPage} allowedRoles={APPLICATION_ALLOWED_ROLES} />}
        </Route>
        <Route path="/application/clients/:id">
          {params => <ProtectedRoute component={BackendFillingClientPage} params={params} allowedRoles={APPLICATION_ALLOWED_ROLES} />}
        </Route>
        <Route path="/application/activity">
          {params => <ProtectedRoute component={ApplicationActivityPage} allowedRoles={APPLICATION_ALLOWED_ROLES} />}
        </Route>
        <Route path="/application/reports">
          {params => <ProtectedRoute component={ApplicationReportsPage} allowedRoles={APPLICATION_ALLOWED_ROLES} />}
        </Route> */}

      <Route path="/reports/payments">
          {params => <ProtectedRoute component={PaymentsPage} />}
        </Route>
        <Route path="/reports/backend">
          {() => <ProtectedRoute component={BackendReportPage} allowedRoles={BACKEND_ALLOWED_ROLES} />}
        </Route>
        <Route path="/incentives">
          {() => <ProtectedRoute component={IncentivesPage} allowedRoles={INCENTIVE_ROLES} />}
        </Route>
        <Route path="/incentives/approved">
          {() => <ProtectedRoute component={IncentivesApprovedPage} allowedRoles={INCENTIVE_ROLES} />}
        </Route>
        <Route path="/incentives/rules">
          {() => <ProtectedRoute component={IncentiveRulesPage} allowedRoles={INCENTIVE_ROLES} />}
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

        <Route path="/tech-support">
          {params => <ProtectedRoute component={TechSupportPage} />}
        </Route>

        <Route
          path="/tech-support/device-info"
          // Admin and tech support users can view device inventory details.
        >
          {params => (
            <ProtectedRoute
              component={DeviceInfoPage}
              allowedRoles={["tech_support", "superadmin", "manager", "director"] as UserRole[]}
            />
          )}
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

        <Route path="/leads/counsellor">
          {() => (
            <ProtectedRoute
              component={CounsellorLeadsPage}
              allowedRoles={["counsellor"] as UserRole[]}
            />
          )}
        </Route>
        <Route path="/leads/kanban">
          {() => <ProtectedRoute component={LeadKanban} />}
        </Route>
        <Route path="/leads/automation/configure/:id">
          {(params) => (
            <ProtectedRoute
              component={LeadAutomationConfigure}
              params={params}
              allowedRoles={LEAD_AUTOMATION_ALLOWED_ROLES}
            />
          )}
        </Route>
        <Route path="/leads/automation/meta-conversions">
          {() => <ProtectedRoute component={MetaConversionsPage} allowedRoles={LEAD_AUTOMATION_ALLOWED_ROLES} />}
        </Route>
        <Route path="/leads/automation/facebook/master-distribution">
          {() => <ProtectedRoute component={FacebookMasterDistribution} allowedRoles={LEAD_AUTOMATION_ALLOWED_ROLES} />}
        </Route>
        <Route path="/leads/automation/facebook/manual-distribution">
          {() => <ProtectedRoute component={FacebookManualDistribution} allowedRoles={LEAD_AUTOMATION_ALLOWED_ROLES} />}
        </Route>
        <Route path="/leads/automation/facebook">
          {() => <ProtectedRoute component={FacebookLeadAutomation} allowedRoles={LEAD_AUTOMATION_ALLOWED_ROLES} />}
        </Route>
        <Route path="/leads/automation">
          {() => <ProtectedRoute component={LeadAutomation} allowedRoles={LEAD_AUTOMATION_ALLOWED_ROLES} />}
        </Route>
        <Route path="/leads/import">
          {() => <ProtectedRoute component={LeadImport} />}
        </Route>
        <Route path="/leads/reports">
          {() => <ProtectedRoute component={LeadReports} />}
        </Route>
        <Route path="/leads/counsellor-report/:counsellorId">
          {() => (
            <ProtectedRoute
              component={CounsellorLeadReport}
              allowedRoles={
                [
                  "superadmin",
                  "admin",
                  "developer",
                  "manager",
                  "marketing_head",
                  "backend_manager",
                  "counsellor",
                ] as UserRole[]
              }
            />
          )}
        </Route>
        <Route path="/leads/counsellor-report">
          {() => (
            <ProtectedRoute
              component={CounsellorLeadReport}
              allowedRoles={["counsellor"] as UserRole[]}
            />
          )}
        </Route>
        <Route path="/leads/daily-report">
          {() => <ProtectedRoute component={DailyLeadReport} allowedRoles={["manager", "marketing_head"] as UserRole[]} />}
        </Route>
        <Route path="/leads/telecaller-wise">
          {() => (
            <ProtectedRoute
              component={TelecallerWiseLead}
              allowedRoles={["superadmin", "manager", "backend_manager"] as UserRole[]}
            />
          )}
        </Route>
        <Route path="/leads/telecaller/:id">
          {(params) => <ProtectedRoute component={IndividualTelecallerAnalysis} params={params} />}
        </Route>
        <Route path="/leads/:id">
          {(params) => <ProtectedRoute component={LeadDetail} params={params} />}
        </Route>
        <Route path="/leads">
          {() => <ProtectedRoute component={LeadList} />}
        </Route>

        <Route path="/front-desk/leads/:id">
          {() => (
            <ProtectedRoute
              component={FrontDeskPortal}
              allowedRoles={["front_desk", "developer"] as UserRole[]}
            />
          )}
        </Route>
        <Route path="/front-desk/activity">
          {() => (
            <ProtectedRoute
              component={FrontDeskActivity}
              allowedRoles={["front_desk", "developer", "superadmin"] as UserRole[]}
            />
          )}
        </Route>
        <Route path="/front-desk">
          {() => (
            <ProtectedRoute
              component={FrontDeskPortal}
              allowedRoles={["front_desk", "developer"] as UserRole[]}
            />
          )}
        </Route>

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
        <Route path="/telecaller-leaderboard">
          {params => (
            <ProtectedRoute
              component={TelecallerLeaderboard}
              allowedRoles={["superadmin", "developer", "manager", "admin"] as UserRole[]}
            />
          )}
        </Route>
        <Route path="/additional-info">
          {params => <ProtectedRoute component={AdditionalInfo} />}
        </Route>

        <Route path="/university-db">
          {params => <ProtectedRoute component={UniversityDatabase} />}
        </Route>

        <Route path="/maintenance">
          {() => (
            <ProtectedRoute
              component={MaintenanceSettingsPage}
              allowedRoles={["developer"] as UserRole[]}
            />
          )}
        </Route>

        {/* Checklist Routes */}
        <Route path="/checklists">
          {params => <ProtectedRoute component={ChecklistPage} allowedRoles={["superadmin", "developer", "manager"]} />}
        </Route>
        <Route path="/add-checklist">
          {params => <ProtectedRoute component={AddChecklistPage} allowedRoles={["superadmin", "developer", "manager"]} />}
        </Route>



        <Route path="/university-db">
          {params => <ProtectedRoute component={UniversityDatabase} />}
        </Route>

        <Route component={NotFound} />
      </Switch>
      )}
        </Route>
      </Switch>
    </Suspense>
  );
}

import { ThemeProvider } from "@/components/theme-provider"
import { FaviconUpdater } from "@/components/favicon-updater"
import OverallReport from "./pages/OverallReport";
import { MaintenanceProvider, useMaintenance } from "@/context/maintenance-context";
import MaintenancePage from "@/pages/MaintenancePage";
import { MaintenanceAlertSync } from "@/components/maintenance-alert-sync";
import { useAlert } from "@/context/alert-context";
import {
  buildMaintenanceSessionKey,
  hasAcknowledgedMaintenanceSession,
} from "@/lib/maintenance-alert";

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
            <MaintenanceProvider>
            <SocketProvider>
              <NotificationProvider>
              <AlertProvider>
                <MessageErrorBoundary>
                  <MessageProvider>
                    <EmergencyAlert />
                    <MaintenanceAlertSync />
                    <Router />
                    <Toaster />
                  </MessageProvider>
                </MessageErrorBoundary>
              </AlertProvider>
              </NotificationProvider>
            </SocketProvider>
            </MaintenanceProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
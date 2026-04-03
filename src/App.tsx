import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ContentsPage from "@/pages/ContentsPage";
import ClientDashboardPage from "@/pages/ClientDashboardPage";
import ProjectsPage from "@/pages/ProjectsPage";
import CalendarPage from "@/pages/CalendarPage";
import WorkflowPage from "@/pages/WorkflowPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import MediaLibraryPage from "@/pages/MediaLibraryPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import SettingsTeamPage from "@/pages/SettingsTeamPage";
import SettingsPermissionsPage from "@/pages/SettingsPermissionsPage";
import SettingsNotificationsPage from "@/pages/SettingsNotificationsPage";
import SettingsAppearancePage from "@/pages/SettingsAppearancePage";
import SettingsIntegrationsPage from "@/pages/SettingsIntegrationsPage";
import ClientMembersPage from "@/pages/ClientMembersPage";
import ClientSettingsPage from "@/pages/ClientSettingsPage";
import UsersPage from "@/pages/UsersPage";
import TasksPage from "@/pages/TasksPage";
import TaskListDetailsPage from "@/pages/TaskListDetailsPage";
import IdeasBankPage from "@/pages/IdeasBankPage";
import PostReportsPage from "@/pages/PostReportsPage";
import ReviewPage from "@/pages/ReviewPage";
import SchedulingPage from "@/pages/SchedulingPage";
import ClientAppearancePage from "@/pages/ClientAppearancePage";
import ClientPlatformsPage from "@/pages/ClientPlatformsPage";
import AllTasksPage from "@/pages/AllTasksPage";
import MyCalendarPage from "@/pages/MyCalendarPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import NotificationsPage from "@/pages/NotificationsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route element={
              <ProtectedRoute>
                <AppProvider>
                  <NotificationsProvider>
                    <AppLayout />
                  </NotificationsProvider>
                </AppProvider>
              </ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/all-tasks" element={<AllTasksPage />} />
              <Route path="/my-calendar" element={<MyCalendarPage />} />
              <Route path="/clients" element={<ProjectsPage />} />
              {/* Client-scoped routes */}
              <Route path="/clients/:id/contents" element={<ContentsPage />} />
              <Route path="/clients/:id/dashboard" element={<ClientDashboardPage />} />
              <Route path="/clients/:id/calendar" element={<CalendarPage />} />
              <Route path="/clients/:id/workflow" element={<WorkflowPage />} />
              <Route path="/clients/:id/approvals" element={<ApprovalsPage />} />
              <Route path="/clients/:id/media" element={<MediaLibraryPage />} />
              <Route path="/clients/:id/reports" element={<ReportsPage />} />
              <Route path="/clients/:id/members" element={<ClientMembersPage />} />
              <Route path="/clients/:id/tasks" element={<TasksPage />} />
              <Route path="/clients/:id/tasks/:listId" element={<TaskListDetailsPage />} />
              <Route path="/clients/:id/ideas" element={<IdeasBankPage />} />
              <Route path="/clients/:id/post-reports" element={<PostReportsPage />} />
              <Route path="/clients/:id/review" element={<ReviewPage />} />
              <Route path="/clients/:id/scheduling" element={<SchedulingPage />} />
              <Route path="/clients/:id/settings" element={<ClientSettingsPage />} />
              <Route path="/clients/:id/appearance" element={<ClientAppearancePage />} />
              <Route path="/clients/:id/platforms" element={<ClientPlatformsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/team" element={<SettingsTeamPage />} />
              <Route path="/settings/permissions" element={<SettingsPermissionsPage />} />
              <Route path="/settings/notifications" element={<SettingsNotificationsPage />} />
              <Route path="/settings/appearance" element={<SettingsAppearancePage />} />
              <Route path="/settings/integrations" element={<SettingsIntegrationsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
